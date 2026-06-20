using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using RealtorsPortal.Data;
using RealtorsPortal.Models.Entities;
using RealtorsPortal.Services;
using RealtorsPortal.Services.Implementations;
using RealtorsPortal.Services.Interfaces;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── CORS ────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    var origins = builder.Configuration["Cors:AllowedOrigins"]
        ?.Split(',', StringSplitOptions.RemoveEmptyEntries)
        ?? new[] { "https://localhost:50872", "http://localhost:50872" };

    options.AddPolicy("AdminPanel", policy =>
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ── Controllers ─────────────────────────────────────────────
builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// ── Database ─────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// ── Identity ─────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.SignIn.RequireConfirmedAccount = false;
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// ── Authentication: Cookie (MVC) + JWT Bearer (API) ─────────
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey     = Encoding.UTF8.GetBytes(jwtSection["SecretKey"]!);

builder.Services.AddAuthentication(options =>
{
    // MVC views keep cookie as default
    options.DefaultAuthenticateScheme = "Identity.Application";
    options.DefaultChallengeScheme    = "Identity.Application";
})
.AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = jwtSection["Issuer"],
        ValidAudience            = jwtSection["Audience"],
        IssuerSigningKey         = new SymmetricSecurityKey(jwtKey),
        ClockSkew                = TimeSpan.FromSeconds(30)
    };
    // Let the Bearer token arrive from Authorization header (not cookie)
    options.Events = new JwtBearerEvents
    {
        OnChallenge = ctx =>
        {
            ctx.HandleResponse();
            ctx.Response.StatusCode  = 401;
            ctx.Response.ContentType = "application/json";
            return ctx.Response.WriteAsync(
                """{"error":"Unauthorized. Provide a valid Bearer token."}""");
        },
        OnForbidden = ctx =>
        {
            ctx.Response.StatusCode  = 403;
            ctx.Response.ContentType = "application/json";
            return ctx.Response.WriteAsync(
                """{"error":"Forbidden. Admin role required."}""");
        }
    };
});

// Cookie config (for MVC views)
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath       = "/Account/Login";
    options.LogoutPath      = "/Account/Logout";
    options.AccessDeniedPath = "/Account/AccessDenied";
    options.ExpireTimeSpan  = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

// ── Email service + daily expiry job ────────────────────────
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHostedService<PackageExpiryBackgroundService>();

// ── Build ────────────────────────────────────────────────────
var app = builder.Build();

await SeedDataAsync(app.Services);

if (!app.Environment.IsDevelopment())
    app.UseExceptionHandler("/Home/Error");

app.UseStaticFiles();

// ── Serve Admin Panel static files at /admin/* ───────────
var adminPanelPath = Path.GetFullPath(
    Path.Combine(app.Environment.ContentRootPath, "..", "Admin Panel"));

if (Directory.Exists(adminPanelPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(adminPanelPath),
        RequestPath  = "/admin"
    });
}

app.UseRouting();
app.UseCors("AdminPanel");
app.UseAuthentication();
app.UseAuthorization();

// /admin  →  /admin/login.html
app.MapGet("/admin", () => Results.Redirect("/admin/login.html"));

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

// ── Seed ─────────────────────────────────────────────────────
static async Task SeedDataAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Seller", "Agent", "Admin" })
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));
    }

    // ── Default admin user ───────────────────────────────────
    var userManager = scope.ServiceProvider
        .GetRequiredService<UserManager<RealtorsPortal.Models.Entities.ApplicationUser>>();

    const string adminEmail    = "admin@realtorsportal.com";
    const string adminPassword = "Admin@123";

    var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
    if (existingAdmin is null)
    {
        var admin = new RealtorsPortal.Models.Entities.ApplicationUser
        {
            UserName    = adminEmail,
            Email       = adminEmail,
            FullName    = "Super Admin",
            AccountType = "Admin",
            CreatedAt   = DateTime.UtcNow,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(admin, adminPassword);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(admin, "Admin");
    }
    else
    {
        // Fix existing admin: ensure UserName = email, reset password, clear lockout
        existingAdmin.UserName = adminEmail;
        existingAdmin.EmailConfirmed = true;
        await userManager.UpdateAsync(existingAdmin);

        var resetToken = await userManager.GeneratePasswordResetTokenAsync(existingAdmin);
        await userManager.ResetPasswordAsync(existingAdmin, resetToken, adminPassword);
        await userManager.SetLockoutEndDateAsync(existingAdmin, null);
        await userManager.ResetAccessFailedCountAsync(existingAdmin);

        if (!await userManager.IsInRoleAsync(existingAdmin, "Admin"))
            await userManager.AddToRoleAsync(existingAdmin, "Admin");
    }

    // ── Default categories ───────────────────────────────────
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (!db.Categories.Any())
    {
        db.Categories.AddRange(
            new RealtorsPortal.Models.Entities.Category { Name = "House",      Slug = "house" },
            new RealtorsPortal.Models.Entities.Category { Name = "Apartment",  Slug = "apartment" },
            new RealtorsPortal.Models.Entities.Category { Name = "Plot",       Slug = "plot" },
            new RealtorsPortal.Models.Entities.Category { Name = "Commercial", Slug = "commercial" }
        );
        await db.SaveChangesAsync();
    }
}
