// shared.js

// ── Auth Guard (runs immediately) ─────────────────────────
(function() {
    if (!localStorage.getItem('adminToken')) {
        window.location.replace('/admin/login.html');
    }
})();

window.adminFetch = function(method, url, body) {
    var token = localStorage.getItem('adminToken');
    var opts = { method: method, headers: { 'Authorization': 'Bearer ' + (token || ''), 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(url, opts).then(function(r) {
        if (r.status === 401) { window.location.replace('/admin/login.html'); return Promise.reject('Unauthorized'); }
        return r;
    });
};

window.adminLogout = function() {
    var token = localStorage.getItem('adminToken');
    fetch('/api/auth/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + (token || ''), 'Content-Type': 'application/json' }
    }).finally(function() {
        ['adminToken','adminRefreshToken','adminUserId','adminUser'].forEach(function(k){ localStorage.removeItem(k); });
        window.location.replace('/admin/login.html');
    });
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Toggle Logic
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const overlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
        if(sidebar) sidebar.classList.remove('-translate-x-full');
        if(overlay) overlay.classList.remove('hidden');
    }

    function closeSidebar() {
        if(sidebar) sidebar.classList.add('-translate-x-full');
        if(overlay) overlay.classList.add('hidden');
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // 2. Enforce Dark Mode
    document.documentElement.classList.add('dark');

    // 3. Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // 4. Sidebar Active State
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('#sidebar a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('text-gold-500', 'bg-navy-800/50', 'border-r-4', 'border-gold-500');
            link.classList.remove('text-gray-400', 'hover:bg-navy-800', 'hover:text-white');
            const icon = link.querySelector('i');
            if (icon) icon.classList.add('text-gold-500');
        }
    });

    // 5. Skeleton Loaders Removal
    const skeletons = document.querySelectorAll('.skeleton-loader');
    if (skeletons.length > 0) {
        setTimeout(() => {
            skeletons.forEach(el => {
                el.classList.remove('skeleton-loader', 'animate-pulse', 'dark:bg-navy-700', 'bg-navy-700', 'text-transparent');
                const children = el.querySelectorAll('.opacity-0');
                children.forEach(child => child.classList.remove('opacity-0'));
            });
        }, 800);
    }

    // 6. Tabs Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    if (tabBtns.length > 0 && tabPanes.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => {
                    b.classList.remove('border-gold-500', 'text-gold-500');
                    b.classList.add('border-transparent', 'text-gray-400', 'hover:text-gray-300', 'hover:border-navy-600');
                });
                tabPanes.forEach(p => p.classList.add('hidden'));
                btn.classList.remove('border-transparent', 'text-gray-400', 'hover:text-gray-300', 'hover:border-navy-600');
                btn.classList.add('border-gold-500', 'text-gold-500');
                const targetId = btn.getAttribute('data-target');
                const targetPane = document.getElementById(targetId);
                if (targetPane) {
                    targetPane.classList.remove('hidden');
                    const table = targetPane.querySelector('table');
                    if (table && table.id && typeof filterTable === 'function') {
                        filterTable(table.id);
                    }
                }
            });
        });
    }

    // 7. Modal Logic (with backdrop and ESC close)
    const modalTriggers = document.querySelectorAll('[data-modal-target]');
    const modalCloses = document.querySelectorAll('[data-modal-close]');
    
    function closeModal(modal) {
        if(modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
    }

    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = trigger.getAttribute('data-modal-target');
            const targetModal = document.getElementById(targetId);
            if (targetModal) {
                targetModal.classList.remove('hidden');
                targetModal.classList.add('flex');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    modalCloses.forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(closeBtn.closest('.modal-container'));
        });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-container').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if(e.target === modal) closeModal(modal);
        });
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal-container.flex');
            if (openModal) closeModal(openModal);
        }
    });

    // 8. Toasts
    window.showToast = function(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container') || (() => {
            const div = document.createElement('div');
            div.id = 'toast-container';
            div.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(div);
            return div;
        })();
        
        const toast = document.createElement('div');
        let bg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
        let icon = 'check-circle';
        
        if (type === 'error') {
            bg = 'bg-red-500/10 border-red-500/20 text-red-400';
            icon = 'alert-circle';
        } else if (type === 'info') {
            bg = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
            icon = 'info';
        } else if (type === 'warning') {
            bg = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
            icon = 'alert-triangle';
        }
        
        toast.className = "flex items-center gap-2 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg transition-all transform translate-x-full " + bg;
        toast.innerHTML = "<i data-lucide=\"" + icon + "\" class=\"w-5 h-5\"></i><span>" + message + "</span>";
        
        toastContainer.appendChild(toast);
        if (window.lucide) lucide.createIcons();
        
        setTimeout(() => toast.classList.remove('translate-x-full'), 10);
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // 9. Form Validation & Loading States
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;
            
            form.querySelectorAll('.error-msg').forEach(el => el.remove());
            form.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));

            // Validate required fields and email formats
            form.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    showError(input, 'This field is required');
                } else if (input.type === 'email' && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(input.value)) {
                    isValid = false;
                    showError(input, 'Invalid email format');
                }
            });

            // Password matching using data-match attribute
            form.querySelectorAll('input[data-match]').forEach(confirm => {
                const matchTarget = confirm.getAttribute('data-match');
                let targetInput = form.querySelector(`#${matchTarget}`) || 
                                  form.querySelector(`[name="${matchTarget}"]`);
                // Fallback: if data-match is "password" or empty, match the first other password field
                if (!targetInput && (matchTarget === 'password' || !matchTarget)) {
                    const pwFields = Array.from(form.querySelectorAll('input[type="password"]'));
                    targetInput = pwFields.find(input => input !== confirm);
                }
                if (targetInput && targetInput.value !== confirm.value) {
                    isValid = false;
                    showError(confirm, 'Passwords do not match');
                }
            });

            if (isValid) {
                const btn = form.querySelector('button[type="submit"]');
                if (btn) {
                    const originalHtml = btn.innerHTML;
                    btn.disabled = true;
                    btn.classList.add('opacity-75', 'cursor-not-allowed');
                    
                    const loadingText = form.getAttribute('data-loading-text') || "Saving...";
                    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${loadingText}`;
                    if (window.lucide) lucide.createIcons();
                    
                    const delay = parseInt(form.getAttribute('data-delay')) || 2500;
                    const successMessage = form.getAttribute('data-success-toast') || "Action completed successfully!";
                    
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.classList.remove('opacity-75', 'cursor-not-allowed');
                        btn.innerHTML = originalHtml;
                        if (window.lucide) lucide.createIcons();
                        
                        window.showToast(successMessage, 'success');
                        
                        // Reset only password fields to empty for security
                        form.querySelectorAll('input[type="password"]').forEach(input => {
                            input.value = '';
                        });
                    }, delay);
                }
            } else {
                window.showToast('Please fix the errors in the form', 'error');
            }
        });
    });

    function showError(input, msg) {
        input.classList.add('border-red-500');
        const err = document.createElement('p');
        err.className = 'error-msg text-red-500 text-xs mt-1';
        err.innerText = msg;
        input.parentElement.appendChild(err);
    }

    // 10. Table Filtering, Sorting, and Pagination
    const paginationState = {};

    function initTablePagination(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const paginationContainer = document.querySelector(`[data-table-pagination="${tableId}"]`);
        if (!paginationContainer) return;

        const pageSize = parseInt(table.getAttribute('data-page-size')) || 10;
        
        paginationState[tableId] = {
            currentPage: 1,
            pageSize: pageSize
        };

        // Initialize state attributes on rows
        table.querySelectorAll('tbody tr').forEach(row => {
            row.dataset.searchMatch = 'true';
        });

        // Add event listeners to search/filter controls
        const searchInput = document.querySelector(`input[data-table-search="${tableId}"]`) || 
                            (document.querySelectorAll('input[data-table-search]').length === 1 ? document.querySelector('input[data-table-search]') : null);
        if (searchInput) {
            searchInput.addEventListener('input', () => filterTable(tableId));
        }

        const statusSelect = document.querySelector(`select[data-table-filter-status="${tableId}"]`);
        const categorySelect = document.querySelector(`select[data-table-filter-category="${tableId}"]`);
        const filterBtn = document.querySelector(`button[data-table-filter-trigger="${tableId}"]`);

        if (filterBtn) {
            const lastApplied = {
                status: statusSelect ? statusSelect.value : '',
                category: categorySelect ? categorySelect.value : ''
            };

            filterBtn.disabled = true;
            filterBtn.classList.add('opacity-50', 'cursor-not-allowed');

            function highlightFilter(el) {
                if (!el) return;
                if (el.value !== '') {
                    el.classList.remove('border-navy-700');
                    el.classList.add('border-gold-500', 'ring-1', 'ring-gold-500/20');
                } else {
                    el.classList.remove('border-gold-500', 'ring-1', 'ring-gold-500/20');
                    el.classList.add('border-navy-700');
                }
            }

            function checkChanges() {
                const currentStatus = statusSelect ? statusSelect.value : '';
                const currentCategory = categorySelect ? categorySelect.value : '';
                
                const hasChanges = (currentStatus !== lastApplied.status || currentCategory !== lastApplied.category);
                
                filterBtn.disabled = !hasChanges;
                if (hasChanges) {
                    filterBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                } else {
                    filterBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
                
                highlightFilter(statusSelect);
                highlightFilter(categorySelect);
            }

            if (statusSelect) {
                statusSelect.addEventListener('change', checkChanges);
                highlightFilter(statusSelect);
            }
            if (categorySelect) {
                categorySelect.addEventListener('change', checkChanges);
                highlightFilter(categorySelect);
            }

            filterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                const originalHtml = filterBtn.innerHTML;
                filterBtn.disabled = true;
                filterBtn.classList.add('opacity-50', 'cursor-not-allowed');
                filterBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> Applying...';
                if (window.lucide) lucide.createIcons();

                setTimeout(() => {
                    lastApplied.status = statusSelect ? statusSelect.value : '';
                    lastApplied.category = categorySelect ? categorySelect.value : '';
                    
                    filterTable(tableId);
                    
                    if (paginationState[tableId]) {
                        paginationState[tableId].currentPage = 1;
                    }
                    updateTablePagination(tableId);

                    if (window.showToast) {
                        window.showToast("Filters applied", "success");
                    }

                    filterBtn.innerHTML = originalHtml;
                    if (window.lucide) lucide.createIcons();
                    checkChanges();
                }, 1000);
            });
        } else {
            if (statusSelect) {
                statusSelect.addEventListener('change', () => filterTable(tableId));
            }
            if (categorySelect) {
                categorySelect.addEventListener('change', () => filterTable(tableId));
            }
        }

        updateTablePagination(tableId);
    }
    window.initTablePagination = initTablePagination;

    function filterTable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const searchInput = document.querySelector(`input[data-table-search="${tableId}"]`);
        const statusSelect = document.querySelector(`select[data-table-filter-status="${tableId}"]`);
        const categorySelect = document.querySelector(`select[data-table-filter-category="${tableId}"]`);

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const statusFilter = statusSelect ? statusSelect.value.toLowerCase() : '';
        const categoryFilter = categorySelect ? categorySelect.value.toLowerCase() : '';

        table.querySelectorAll('tbody tr').forEach(row => {
            const rowText = row.innerText.toLowerCase();
            const matchesSearch = rowText.includes(searchTerm);
            
            let matchesStatus = true;
            if (statusFilter) {
                const statusVal = row.getAttribute('data-status') || '';
                if (statusVal) {
                    matchesStatus = statusVal.toLowerCase() === statusFilter;
                } else {
                    matchesStatus = rowText.includes(statusFilter);
                }
            }

            let matchesCategory = true;
            if (categoryFilter) {
                const categoryVal = row.getAttribute('data-category') || '';
                if (categoryVal) {
                    matchesCategory = categoryVal.toLowerCase() === categoryFilter;
                } else {
                    matchesCategory = rowText.includes(categoryFilter);
                }
            }

            row.dataset.searchMatch = (matchesSearch && matchesStatus && matchesCategory) ? 'true' : 'false';
        });

        if (paginationState[tableId]) {
            paginationState[tableId].currentPage = 1;
        }
        updateTablePagination(tableId);
    }

    function updateTablePagination(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const paginationContainer = document.querySelector(`[data-table-pagination="${tableId}"]`);
        if (!paginationContainer) return;

        const state = paginationState[tableId];
        if (!state) return;

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const visibleRows = rows.filter(row => row.dataset.searchMatch !== 'false');
        const totalItems = visibleRows.length;
        const totalPages = Math.ceil(totalItems / state.pageSize) || 1;

        if (state.currentPage > totalPages) {
            state.currentPage = totalPages;
        }
        if (state.currentPage < 1) {
            state.currentPage = 1;
        }

        // Hide/Show rows
        rows.forEach(row => {
            row.style.display = 'none';
        });

        const startIdx = (state.currentPage - 1) * state.pageSize;
        const endIdx = Math.min(startIdx + state.pageSize, totalItems);

        for (let i = startIdx; i < endIdx; i++) {
            visibleRows[i].style.display = '';
        }

        // Update counts
        const startText = totalItems === 0 ? 0 : startIdx + 1;
        const endText = endIdx;
        const startSpan = paginationContainer.querySelector('.pagination-start');
        const endSpan = paginationContainer.querySelector('.pagination-end');
        const totalSpan = paginationContainer.querySelector('.pagination-total');
        if (startSpan) startSpan.innerText = startText;
        if (endSpan) endSpan.innerText = endText;
        if (totalSpan) totalSpan.innerText = totalItems;

        // Update buttons
        const buttonContainer = paginationContainer.querySelector('.pagination-buttons');
        if (buttonContainer) {
            buttonContainer.innerHTML = '';

            // Prev button
            const prevBtn = document.createElement('button');
            prevBtn.className = 'px-3 py-1.5 rounded-md border border-navy-700 text-gray-300 hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
            prevBtn.innerText = 'Prev';
            if (state.currentPage === 1) {
                prevBtn.disabled = true;
            } else {
                prevBtn.addEventListener('click', () => {
                    state.currentPage--;
                    updateTablePagination(tableId);
                });
            }
            buttonContainer.appendChild(prevBtn);

            // Page Number buttons
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('button');
                if (i === state.currentPage) {
                    pageBtn.className = 'px-3 py-1.5 rounded-md bg-gold-500 text-navy-900 font-medium border border-gold-500';
                } else {
                    pageBtn.className = 'px-3 py-1.5 rounded-md border border-navy-700 text-gray-300 hover:bg-navy-800 transition-colors';
                }
                pageBtn.innerText = i;
                pageBtn.addEventListener('click', () => {
                    state.currentPage = i;
                    updateTablePagination(tableId);
                });
                buttonContainer.appendChild(pageBtn);
            }

            // Next button
            const nextBtn = document.createElement('button');
            nextBtn.className = 'px-3 py-1.5 rounded-md border border-navy-700 text-gray-300 hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
            nextBtn.innerText = 'Next';
            if (state.currentPage === totalPages) {
                nextBtn.disabled = true;
            } else {
                nextBtn.addEventListener('click', () => {
                    state.currentPage++;
                    updateTablePagination(tableId);
                });
            }
            buttonContainer.appendChild(nextBtn);
        }
    }

    const sortableHeaders = document.querySelectorAll('th[data-sort]');
    sortableHeaders.forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const table = th.closest('table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const idx = Array.from(th.parentNode.children).indexOf(th);
            const isAsc = th.classList.contains('asc');
            
            rows.sort((a, b) => {
                const aText = a.children[idx].innerText.trim();
                const bText = b.children[idx].innerText.trim();
                return isAsc ? bText.localeCompare(aText) : aText.localeCompare(bText);
            });
            
            th.classList.toggle('asc');
            rows.forEach(row => tbody.appendChild(row));
            
            // Re-paginate if pagination is initialized
            if (table.id && paginationState[table.id]) {
                updateTablePagination(table.id);
            }
        });
    });

    // 11. User Directory Action Buttons (Event Delegation)
    document.addEventListener('click', (e) => {
        // Toggle Status Handler
        const toggleBtn = e.target.closest('[data-action="toggle-status"]');
        if (toggleBtn) {
            e.preventDefault();
            const row = toggleBtn.closest('tr');
            if (row) {
                const currentStatus = row.getAttribute('data-status') || 'active';
                const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
                row.setAttribute('data-status', newStatus);

                // Find status badge and update
                const badge = row.querySelector('td span.rounded-full') || row.querySelector('td span');
                if (badge) {
                    if (newStatus === 'active') {
                        badge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400";
                        badge.innerText = "Active";
                    } else {
                        badge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400";
                        badge.innerText = "Suspended";
                    }
                }

                // Update toggle button icon and title
                if (newStatus === 'suspended') {
                    toggleBtn.className = "p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition-colors";
                    toggleBtn.title = "Activate";
                    toggleBtn.innerHTML = '<i data-lucide="play-circle" class="w-4 h-4"></i>';
                } else {
                    toggleBtn.className = "p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded transition-colors";
                    toggleBtn.title = "Deactivate";
                    toggleBtn.innerHTML = '<i data-lucide="pause-circle" class="w-4 h-4"></i>';
                }
                if (window.lucide) lucide.createIcons();

                // Show toast notification
                const capitalizedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                window.showToast(`User status updated to ${capitalizedStatus}`, 'success');
            }
        }

        // Delete Button Handler
        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
            e.preventDefault();
            const row = deleteBtn.closest('tr');
            const table = row ? row.closest('table') : null;
            if (row && table) {
                window.rowToDelete = row;
                window.tableToDeleteId = table.id;

                const deleteModal = document.getElementById('deleteConfirmModal');
                if (deleteModal) {
                    deleteModal.classList.remove('hidden');
                    deleteModal.classList.add('flex');
                    document.body.style.overflow = 'hidden';
                }
            }
        }
    });

    // Confirm Delete Modal Action Button Click
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.rowToDelete) {
                const deleteModal = document.getElementById('deleteConfirmModal');
                const originalText = confirmDeleteBtn.innerHTML;
                
                // Set loading state
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.classList.add('opacity-75', 'cursor-not-allowed');
                confirmDeleteBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-1"></i> Deleting...';
                if (window.lucide) lucide.createIcons();

                // Simulate processing delay (1-2 seconds)
                setTimeout(() => {
                    if (window.rowToDelete) {
                        const row = window.rowToDelete;
                        const tableId = window.tableToDeleteId;
                        row.remove();
                        if (tableId && typeof updateTablePagination === 'function') {
                            updateTablePagination(tableId);
                        }
                        let msg = 'User deleted successfully';
                        if (tableId === 'packages-table') {
                            msg = 'Package deleted successfully';
                        } else if (['categories-table', 'countries-table', 'regions-table', 'cities-table', 'areas-table'].includes(tableId)) {
                            msg = 'Record deleted successfully';
                        }
                        window.showToast(msg, 'success');
                    }

                    // Reset and close
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                    confirmDeleteBtn.innerHTML = originalText;
                    if (window.lucide) lucide.createIcons();
                    
                    if (deleteModal) {
                        deleteModal.classList.add('hidden');
                        deleteModal.classList.remove('flex');
                        document.body.style.overflow = '';
                    }

                    window.rowToDelete = null;
                    window.tableToDeleteId = null;
                }, 1200);
            }
        });
    }

    // Auto-initialize any pagination containers on page load
    document.querySelectorAll('[data-table-pagination]').forEach(container => {
        const tableId = container.getAttribute('data-table-pagination');
        initTablePagination(tableId);
    });

    // --- Notifications Dropdown System ---
    const defaultNotifications = [
        {
            id: 1,
            type: "listing-approved",
            title: "Listing Approved",
            description: "Luxury Villa in Beverly Hills",
            time: "2 hours ago",
            read: false
        },
        {
            id: 2,
            type: "new-seller",
            title: "New Seller Registered",
            description: "Sophia Martinez (Private Seller)",
            time: "5 hours ago",
            read: false
        },
        {
            id: 3,
            type: "payment-received",
            title: "Payment Received",
            description: "$499.00 - Premium Agent Package",
            time: "1 day ago",
            read: false
        },
        {
            id: 4,
            type: "package-expiring",
            title: "Package Expiring Soon",
            description: "Gold Plan for John Doe expires in 3 days",
            time: "2 days ago",
            read: true
        },
        {
            id: 5,
            type: "new-agent",
            title: "New Agent Registered",
            description: "Marcus Vance - Realty Partners",
            time: "3 days ago",
            read: false
        }
    ];

    function getNotifications() {
        try {
            const data = localStorage.getItem('admin_notifications');
            if (data) return JSON.parse(data);
        } catch (e) {
            console.error(e);
        }
        localStorage.setItem('admin_notifications', JSON.stringify(defaultNotifications));
        return defaultNotifications;
    }

    function saveNotifications(notifications) {
        localStorage.setItem('admin_notifications', JSON.stringify(notifications));
    }

    function initNotifications() {
        const container = document.getElementById('notification-bell-container');
        if (!container) return;

        container.innerHTML = `
            <button id="notification-bell-btn" class="p-2 text-gray-400 hover:text-gray-200 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-navy-700 transition-colors relative focus:outline-none" aria-label="Notifications">
                <i data-lucide="bell" class="w-5 h-5"></i>
                <span id="notification-badge" class="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-navy-900 px-1 transform translate-x-1 -translate-y-1 hidden">0</span>
            </button>
            <div id="notification-dropdown" class="absolute right-0 mt-3 w-80 sm:w-96 glass-card bg-navy-800/95 border border-navy-700 rounded-xl shadow-premium z-50 py-2 hidden flex-col">
                <div class="flex items-center justify-between px-4 py-3 border-b border-navy-700/50">
                    <h3 class="font-semibold text-sm text-white">Notifications</h3>
                    <span id="unread-count-text" class="text-xs text-gold-500 font-medium"></span>
                </div>
                <div id="notifications-list" class="max-h-80 overflow-y-auto divide-y divide-navy-700/30">
                    <!-- Notifications list dynamically built -->
                </div>
                <div class="px-4 py-2 border-t border-navy-700/50 flex justify-center bg-navy-900/30">
                    <button id="mark-all-read-btn" class="text-xs font-semibold text-gold-500 hover:text-gold-400 hover:underline transition-colors py-1 w-full text-center">
                        Mark All as Read
                    </button>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        const bellBtn = document.getElementById('notification-bell-btn');
        const dropdown = document.getElementById('notification-dropdown');
        const listContainer = document.getElementById('notifications-list');
        const badge = document.getElementById('notification-badge');
        const unreadCountText = document.getElementById('unread-count-text');
        const markAllBtn = document.getElementById('mark-all-read-btn');

        function updateUI() {
            const notifications = getNotifications();
            const unreadCount = notifications.filter(n => !n.read).length;

            if (unreadCount > 0) {
                badge.innerText = unreadCount;
                badge.classList.remove('hidden');
                unreadCountText.innerText = `${unreadCount} unread`;
            } else {
                badge.classList.add('hidden');
                unreadCountText.innerText = `No unread`;
            }

            if (notifications.length === 0) {
                listContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-8 px-4 text-center text-gray-500">
                        <i data-lucide="bell-off" class="w-8 h-8 mb-2 opacity-50"></i>
                        <p class="text-xs">No notifications found</p>
                    </div>
                `;
            } else {
                listContainer.innerHTML = notifications.map(n => {
                    let iconName = 'bell';
                    let iconColorClass = 'bg-navy-700 text-gray-300';
                    if (n.type === 'listing-approved') {
                        iconName = 'check-circle';
                        iconColorClass = 'bg-emerald-500/10 text-emerald-400';
                    } else if (n.type === 'new-seller' || n.type === 'new-agent') {
                        iconName = 'user-plus';
                        iconColorClass = 'bg-blue-500/10 text-blue-400';
                    } else if (n.type === 'payment-received') {
                        iconName = 'credit-card';
                        iconColorClass = 'bg-amber-500/10 text-gold-500';
                    } else if (n.type === 'package-expiring') {
                        iconName = 'alert-triangle';
                        iconColorClass = 'bg-orange-500/10 text-orange-400';
                    }

                    return `
                        <div class="notification-item flex items-start gap-3 p-3 hover:bg-navy-700/20 transition-all duration-200 cursor-pointer ${n.read ? 'opacity-50' : 'relative font-medium bg-navy-800/20'}" data-id="${n.id}">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColorClass}">
                                <i data-lucide="${iconName}" class="w-4 h-4"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs text-white truncate">${n.title}</p>
                                <p class="text-[11px] text-gray-400 mt-0.5 truncate">${n.description}</p>
                                <span class="text-[9px] text-gray-500 mt-1 block">${n.time}</span>
                            </div>
                            ${!n.read ? `
                                <button class="mark-single-read-btn p-1 text-gray-500 hover:text-gold-500 hover:bg-navy-700/50 rounded transition-all focus:outline-none" title="Mark as Read" data-id="${n.id}">
                                    <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            }

            if (window.lucide) lucide.createIcons();

            // Bind single read action buttons
            document.querySelectorAll('.mark-single-read-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'));
                    markAsRead(id);
                });
            });

            // Bind notification items click
            document.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const id = parseInt(item.getAttribute('data-id'));
                    markAsRead(id);
                    dropdown.classList.add('hidden');
                });
            });
        }

        function markAsRead(id) {
            const notifications = getNotifications();
            const updated = notifications.map(n => {
                if (n.id === id) {
                    return { ...n, read: true };
                }
                return n;
            });
            saveNotifications(updated);
            updateUI();
        }

        function markAllAsRead() {
            const notifications = getNotifications();
            const updated = notifications.map(n => ({ ...n, read: true }));
            saveNotifications(updated);
            updateUI();
        }

        // Click to toggle dropdown
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // Click to mark all read
        markAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

        // ESC to close dropdown
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
            }
        });

        updateUI();
    }

    initNotifications();
});

