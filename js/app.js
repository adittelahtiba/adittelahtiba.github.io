$(document).ready(function() {
    const $appContainer = $('#app');
    const $pageName = $('#page-name');
    const $pageMenuName = $('#page-menu-name');
    const $userNameElement = $('#user-name');
    const $mainMenu = $('#mainMenu');

    function showsAlert(message, type = 'danger', container = '#alert-container') {
        const $container = $(container);
        $container.html(`
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <span id="alert-message">${message}</span>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `);
    }

    $(document).on('submit', '#form1', async function(e) {
        e.preventDefault();

        const $form = $(this);
        const formData = new FormData(this);

        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');

        if (password !== confirmPassword) {
            showsAlert("Password dan Konfirmasi Password tidak cocok!");
            return;
        }

        try {
            const regResponse = await fetch(`${BASE_URL}/user`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    name: username,
                    email: email,
                    password: password,
                    user_parent: JSON.parse(localStorage.getItem('user_session')).id
                })
            });

            const result = await regResponse.json();

            if (regResponse.ok) {
                showsAlert('User berhasil ditambahkan!', 'success');

                const $modalElement = $('#modal');
                if ($modalElement.length) {
                    const modal = bootstrap.Modal.getOrCreateInstance($modalElement[0]);
                    modal.hide();
                }

                $form[0].reset();
                initDataTableMaster();

            } else {
                showsAlert('Gagal: ' + (result.message || 'Terjadi kesalahan'));
            }
        } catch (error) {
            console.error('Error:', error);
            showsAlert('Terjadi kesalahan koneksi ke database.');
        }
    });

    $(document).on('click', '.icon-eye-off, .icon-eye', function() {
        const $inputGroup = $(this).closest('.input-group');
        const $input = $inputGroup.find('input');
        if ($input.attr('type') === "password") {
            $input.attr('type', "text");
            $(this).removeClass('icon-eye-off').addClass('icon-eye');
        } else {
            $input.attr('type', "password");
            $(this).removeClass('icon-eye').addClass('icon-eye-off');
        }
    });

    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(sessionData);

    if ($userNameElement.length) {
        $userNameElement.text(user.name);
    }

    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcnJraGlpd3ZsaW5hbnhzaW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNTEzOTIsImV4cCI6MjA4MjYyNzM5Mn0.vygEL8BYGK_UXPwMrvgpRkk7RVQQ5Q0AB1n5uk1IYi0';
    const MENU_API = `https://worrkhiiwvlinanxsimn.supabase.co/rest/v1/user_menu_view?select=*&id=eq.${user.id}`;
    const BASE_URL = `https://worrkhiiwvlinanxsimn.supabase.co/rest/v1/`;

    let currentPage = '';

    async function loadPage(page, title) {
        if ($pageName.length) $pageName.text(title || "Dashboard");
        if ($pageMenuName.length) $pageMenuName.text(title ? `Page Menu ${title}` : "Main Menu");
        if (currentPage === page && $('#calendar').length > 0) return;

        try {
            currentPage = page;
            $appContainer.html('<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading content...</p></div>');

            const res = await fetch(`pages/${page}.html`);
            if (!res.ok) throw new Error(`File pages/${page}.html tidak ditemukan (404)`);

            const html = await res.text();
            $appContainer.html(html);

            setTimeout(() => {
                if ($('#calendar').length > 0) initCalendar();
                console.log(page);
                if (page === 'dashboard') initCharts();
                if ($('#datatable').length > 0) {
                    if (page === 'master-data' || page === 'user-access') {
                        initDataTableMaster();
                        initDataTableWallets();
                        initDataTableCategories();
                    } else if (page === 'transactions') {
                        initDataTableTransactions();
                    } else {
                        initDataTable();
                    }
                }
                if ($('#debtTable').length > 0 && page === 'debt') {
                    initDataTableDebt();
                }
                if (typeof INSPIRO !== 'undefined' && INSPIRO.elements) {
                    INSPIRO.elements.buttons();
                }
            }, 200);

        } catch (err) {
            console.error("LoadPage Error:", err);
            $appContainer.html(`
                <div class="alert alert-danger m-5">
                    <h5><i class="icon-alert-triangle"></i> Error Loading Page</h5>
                    <p>${err.message}</p>
                    <button class="btn btn-sm btn-secondary" onclick="location.reload()">Reload Dashboard</button>
                </div>`);
        }
    }

    async function initDashboard() {
        try {
            const response = await fetch(MENU_API, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const menus = await response.json();

            if (response.ok && menus.length > 0) {
                renderNavbar(menus);
            } else {
                $mainMenu.html('<li><a href="#">No Menu Access</a></li>');
            }
        } catch (err) {
            console.error("Error loading menu:", err);
            $mainMenu.html('<li><a href="#">Error Loading Menu</a></li>');
        }
    }


    function initCalendar() {
        const $calendarEl = $('#calendar');
        if ($calendarEl.length > 0 && typeof $().fullCalendar === 'function') {
            $calendarEl.fullCalendar({
                header: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'listDay,listWeek,month'
                },
                views: {
                    listDay: { buttonText: 'list day' },
                    listWeek: { buttonText: 'list week' }
                },
                defaultView: 'listWeek',
                defaultDate: '2021-01-12',
                navLinks: true,
                editable: true,
                eventLimit: true,
                events: [
                    { title: 'All Day Event', start: '2021-01-01' },
                    { title: 'Long Event', start: '2021-01-07', end: '2021-01-10', className: 'fc-event-primary' },
                    { id: 999, title: 'Repeating Event', start: '2021-01-09T16:00:00' },
                    { id: 999, title: 'Repeating Event', start: '2021-01-16T16:00:00' },
                    { title: 'Conference', start: '2021-01-11', end: '2021-01-13', className: 'fc-event-warning' },
                    { title: 'Meeting', start: '2021-01-12T10:30:00', end: '2021-01-12T12:30:00', className: 'fc-event-success' },
                    { title: 'Lunch', start: '2021-01-12T12:00:00' },
                    { title: 'Meeting', start: '2021-01-12T14:30:00', className: 'fc-event-info' },
                    { title: 'Happy Hour', start: '2021-01-12T17:30:00' },
                    { title: 'Dinner', start: '2021-01-12T20:00:00', className: 'fc-event-success' },
                    { title: 'Birthday Party', start: '2021-01-13T07:00:00', className: 'fc-event-danger' },
                    { title: 'Click for Google', url: 'http://google.com/', start: '2021-01-28', className: 'fc-event-info' }
                ]
            });
            console.log("Calendar initialized successfully.");
        } else {
            console.error("Gagal Inisialisasi: Elemen #calendar tidak ditemukan di DOM.");
        }
    }

    function initDataTable() {
        const $tableEl = $('#datatable');
        if ($tableEl.length > 0) {
            if ($.fn.DataTable.isDataTable('#datatable')) {
                $tableEl.DataTable().destroy();
            }

            const table = $tableEl.DataTable({
                buttons: [
                    { extend: 'print', title: 'Test Data export', exportOptions: { columns: "thead th:not(.noExport)" } },
                    { extend: 'pdf', title: 'Test Data export', exportOptions: { columns: "thead th:not(.noExport)" } },
                    { extend: 'excel', title: 'Test Data export', exportOptions: { columns: "thead th:not(.noExport)" } },
                    { extend: 'csv', title: 'Test Data export', exportOptions: { columns: "thead th:not(.noExport)" } },
                    { extend: 'copy', title: 'Test Data export', exportOptions: { columns: "thead th:not(.noExport)" } }
                ]
            });

            if ($('#export_buttons').length > 0) {
                table.buttons().container().appendTo('#export_buttons');
                $("#export_buttons .btn").removeClass('btn-secondary').addClass('btn-light');
            }
        }
    }

    async function initDataTableMaster() {
        const $tableEl = $('#datatable');
        if ($tableEl.length === 0) return;

        if ($.fn.DataTable.isDataTable('#datatable')) {
            $tableEl.DataTable().destroy();
        }

        const sessionData = JSON.parse(localStorage.getItem('user_session'));
        const userId = sessionData.id;

        const FETCH_USER_API = `https://worrkhiiwvlinanxsimn.supabase.co/rest/v1/user?select=id,name,email,menu_user(menu_id,can_edit,menu(name))&or=(id.eq.${userId},user_parent.eq.${userId})`;

        try {
            const response = await fetch(FETCH_USER_API, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            const table = $tableEl.DataTable({
                data: data,
                columns: [
                    { data: 'name' },
                    { data: 'email' },
                    {
                        data: 'menu_user',
                        render: function(data) {
                            if (!data || data.length === 0) return '<span class="text-muted small">No Access</span>';
                            const colors = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-danger'];
                            return data.map(m => {
                                const colorClass = colors[m.menu_id % colors.length];
                                return `<span class="badge ${colorClass} me-1" style="font-size: 10px; text-transform: uppercase;">${m.menu.name}</span>`;
                            }).join(' ');
                        }
                    },
                    {
                        data: null,
                        className: 'noExport',
                        render: function(data) {
                            return `
                                <div class="btn-group">
                                    <a class="ms-2 text-primary" href="#" onclick="editUser(${data.id})"><i class="icon-edit"></i></a>
                                    <a class="ms-2 text-danger" href="#" onclick="deleteUser(${data.id})"><i class="icon-trash-2"></i></a>
                                    <a class="ms-2 text-dark" href="#" onclick="settingsUser(${data.id})"><i class="icon-settings"></i></a>
                                </div>
                            `;
                        }
                    }
                ],
                buttons: [
                    { extend: 'print', className: 'btn-light' },
                    { extend: 'pdf', className: 'btn-light' },
                    { extend: 'excel', className: 'btn-light' }
                ],
                responsive: true
            });

            if ($('#export_buttons').length > 0) {
                table.buttons().container().appendTo('#export_buttons');
            }

        } catch (err) {
            console.error("Error loading user data:", err);
        }
    }

    function renderNavbar(menus) {
        $mainMenu.empty();

        menus.forEach((item, index) => {
            const $li = $('<li>');
            if (index === 1) $li.addClass('active');

            const $a = $('<a>', {
                href: "#",
                text: item.menu_name,
                'data-page': item.html
            });

            $a.on('click', function(e) {
                e.preventDefault();
                $('#mainMenu li').removeClass('active');
                $li.addClass('active');
                loadPage(item.html, item.menu_name);
            });

            $li.append($a);
            $mainMenu.append($li);
        });

        if (menus.length > 1) {
            loadPage(menus[1].html, menus[1].menu_name);
        } else if (menus.length > 0) {
            loadPage(menus[0].html, menus[0].menu_name);
        }
    }

    $('.logout-lur').on('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('user_session');
        window.location.href = 'login.html';
    });

    // Fungsi untuk Edit User
    window.editUser = async function(id) {
        try {
            const response = await fetch(`${BASE_URL}/user?id=eq.${id}`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const user = await response.json();
            if (user.length > 0) {
                $('#editUserId').val(user[0].id);
                $('#editUsername').val(user[0].name);
                $('#editEmail').val(user[0].email);
                $('#editModal').modal('show');
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    // Handler untuk submit Edit Form
    $(document).on('submit', '#editForm', async function(e) {
        e.preventDefault();
        const id = $('#editUserId').val();
        const name = $('#editUsername').val();
        const email = $('#editEmail').val();

        try {
            const response = await fetch(`${BASE_URL}/user?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ name, email })
            });

            if (response.ok) {
                showsAlert('User updated successfully!', 'success', '#edit-alert-container');
                $('#editModal').modal('hide');
                initDataTableMaster();
            } else {
                showsAlert('Failed to update user.', 'danger', '#edit-alert-container');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            showsAlert('Error updating user.', 'danger', '#edit-alert-container');
        }
    });

    // Fungsi untuk Delete User
    window.deleteUser = function(id) {
        $('#deleteUserId').val(id);
        $('#deleteModal').modal('show');
    };

    // Handler untuk Confirm Delete
    $(document).on('click', '#confirmDelete', async function() {
        console.log('Confirm delete clicked');
        const id = $('#deleteUserId').val();
        console.log('User ID to delete:', id);
        const timestamp = new Date().toISOString();

        try {
            const response = await fetch(`${BASE_URL}/user?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ deleted_date: timestamp })
            });

            console.log('Delete response status:', response.status);
            if (response.ok) {
                showsAlert('User deleted successfully!', 'success');
                $('#deleteModal').modal('hide');
                initDataTableMaster();
            } else {
                showsAlert('Failed to delete user.', 'danger');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showsAlert('Error deleting user.', 'danger');
        }
    });

    // Fungsi untuk Settings User
    window.settingsUser = async function(id) {
        $('#settingsUserId').val(id);
        try {
            // Fetch all menus
            const menuResponse = await fetch(`${BASE_URL}/menu`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const menus = await menuResponse.json();

            // Fetch current user menu access
            const accessResponse = await fetch(`${BASE_URL}/menu_user?user_id=eq.${id}`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const currentAccess = await accessResponse.json();

            // Create checkboxes
            let html = '';
            menus.forEach(menu => {
                const access = currentAccess.find(a => a.menu_id === menu.id);
                const checked = access ? 'checked' : '';
                const canEditChecked = access && access.can_edit ? 'checked' : '';
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="form-check">
                            <input class="form-check-input menu-checkbox" type="checkbox" id="menu_${menu.id}" value="${menu.id}" ${checked}>
                            <label class="form-check-label" for="menu_${menu.id}">${menu.name}</label>
                        </div>
                        <div class="form-check ms-3">
                            <input class="form-check-input can-edit-checkbox" type="checkbox" id="edit_${menu.id}" ${canEditChecked}>
                            <label class="form-check-label" for="edit_${menu.id}">Can Edit</label>
                        </div>
                    </div>
                `;
            });
            $('#menuList').html(html);
            $('#settingsModal').modal('show');
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    // Handler untuk Save Settings
    $(document).on('click', '#saveSettings', async function() {
        console.log('Save settings clicked');
        const userId = $('#settingsUserId').val();
        console.log('User ID:', userId);
        const selectedMenus = [];

        $('.menu-checkbox:checked').each(function() {
            const menuId = $(this).val();
            const canEdit = $(`#edit_${menuId}`).is(':checked');
            selectedMenus.push({ user_id: parseInt(userId), menu_id: parseInt(menuId), can_edit: canEdit });
        });

        console.log('Selected menus:', selectedMenus);

        try {
            // First, delete existing access
            const deleteResponse = await fetch(`${BASE_URL}/menu_user?user_id=eq.${userId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            console.log('Delete response status:', deleteResponse.status);

            // Then, insert new access
            if (selectedMenus.length > 0) {
                const response = await fetch(`${BASE_URL}/menu_user`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(selectedMenus)
                });

                console.log('Insert response status:', response.status);
                if (!response.ok) {
                    throw new Error('Failed to save menu access');
                }
            }

            showsAlert('Settings saved successfully!', 'success', '#settings-alert-container');
            $('#settingsModal').modal('hide');
            initDataTableMaster();
        } catch (error) {
            console.error('Error saving settings:', error);
            showsAlert('Error saving settings.', 'danger', '#settings-alert-container');
        }
    });

    // Fungsi untuk Transactions
    async function initDataTableTransactions() {
        const $tableEl = $('#datatable');
        if ($tableEl.length === 0) return;

        if ($.fn.DataTable.isDataTable('#datatable')) {
            $tableEl.DataTable().destroy();
        }

        const sessionData = JSON.parse(localStorage.getItem('user_session'));
        const userId = sessionData.id;

        const FETCH_TRANSACTIONS_API = `https://worrkhiiwvlinanxsimn.supabase.co/rest/v1/transactions?select=id,init,trx_date,type_id,amount,note,wallet_id,category_id,init,attachment_url,transaction_type(wallet_name),categories(name),wallets(name)&user_id=eq.${userId}`;

        try {
            const response = await fetch(FETCH_TRANSACTIONS_API, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            const table = $tableEl.DataTable({
                data: data,
                columns: [
                    { 
                        data: 'trx_date',
                        render: function (data, type, row) {
                            // Jika asset awal
                            if (row.init === true) {
                                return `
                                    <div>
                                        <strong>Asset</strong><br>
                                        <small class="text-muted">
                                            Wallet: ${row.wallets?.name ?? '-'}
                                        </small>
                                    </div>
                                `;
                            }

                            const date = new Date(data).toLocaleDateString('id-ID');
                            const walletName = row.wallets?.name ?? '-';
                            const categoryName = row.categories?.name ?? '-';

                            return `
                                <div>
                                    <div>${date}</div>
                                    <small class="text-muted">
                                        ${walletName} • ${categoryName}
                                    </small>
                                </div>
                            `;
                        }
                    },
                    { 
                        data: 'transaction_type.wallet_name',
                        render: function (data, type, row) {
                            let cls = 'text-muted';

                            if (row.type_id === 1) {
                                cls = 'text-success fw-semibold';
                            } else if (row.type_id === 2) {
                                cls = 'text-danger fw-semibold';
                            }

                            return `<span class="${cls}">${data ?? '-'}</span>`;
                        }
                    },
                    { 
                        data: 'amount',
                        render: function(data) {
                            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data);
                        }
                    },
                    { data: 'note' },
                    {
                        data: null,
                        className: 'noExport',
                        render: function(data) {
                            return `
                                <div class="btn-group">
                                    <a class="ms-2 text-primary" href="#" onclick="editTransaction(${data.id})"><i class="icon-edit"></i></a>
                                    <a class="ms-2 text-danger" href="#" onclick="deleteTransaction(${data.id})"><i class="icon-trash-2"></i></a>
                                </div>
                            `;
                        }
                    }
                ],
                buttons: [
                    { extend: 'print', className: 'btn-light' },
                    { extend: 'pdf', className: 'btn-light' },
                    { extend: 'excel', className: 'btn-light' }
                ],
                responsive: true
            });

            if ($('#export_buttons').length > 0) {
                table.buttons().container().appendTo('#export_buttons');
            }

            // Load transaction types for dropdowns
            loadTransactionTypes();
            loadCategories();
            loadWallets();

        } catch (err) {
            console.error("Error loading transactions data:", err);
        }
    }

    async function loadTransactionTypes() {
        try {
            const response = await fetch(`${BASE_URL}/transaction_type`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const types = await response.json();
            
            const $typeSelect = $('#type_id');
            const $editTypeSelect = $('#edit_type_id');
            
            $typeSelect.empty().append('<option value="">Select Type</option>');
            $editTypeSelect.empty().append('<option value="">Select Type</option>');
            
            types.forEach(type => {
                $typeSelect.append(`<option value="${type.id}">${type.wallet_name}</option>`);
                $editTypeSelect.append(`<option value="${type.id}">${type.wallet_name}</option>`);
            });
        } catch (error) {
            console.error('Error loading transaction types:', error);
        }
    }

    async function loadCategories() {
        try {
            const response = await fetch(`${BASE_URL}/categories?id=gt.1`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const categories = await response.json();
            
            const $categorySelect = $('#category_id');
            const $editCategorySelect = $('#edit_category_id');
            
            $categorySelect.empty().append('<option value="">Select Category</option>');
            $editCategorySelect.empty().append('<option value="">Select Category</option>');
            
            categories.forEach(category => {
                $categorySelect.append(`<option value="${category.id}">${category.name}</option>`);
                $editCategorySelect.append(`<option value="${category.id}">${category.name}</option>`);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async function loadWallets() {
        try {
            const response = await fetch(`${BASE_URL}/wallets?id=gt.1`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const wallets = await response.json();
            
            const $walletSelect        = $('#wallet_id');
            const $editWalletSelect    = $('#edit_wallet_id');
            const $assetWalletSelect   = $('#asset_wallet_id');
            const $senderWalletSelect  = $('#sender_wallet');
            const $receiverWalletSelect= $('#receiver_wallet');

            [
                $walletSelect,
                $editWalletSelect,
                $assetWalletSelect,
                $senderWalletSelect,
                $receiverWalletSelect
            ].forEach($select => {
                $select.empty().append('<option value="">Select Wallet</option>');
            });

            wallets.forEach(wallet => {
                const option = `<option value="${wallet.id}">${wallet.name}</option>`;
                $walletSelect.append(option);
                $editWalletSelect.append(option);
                $assetWalletSelect.append(option);
                $senderWalletSelect.append(option);
                $receiverWalletSelect.append(option);
            });

        } catch (error) {
            console.error('Error loading wallets:', error);
        }
    }

    // Handler untuk submit Add Transaction Form
    $(document).on('submit', '#addTransactionForm', async function(e) {
        e.preventDefault();

        const $form = $(this);
        const formData = new FormData(this);

        const trx_date = formData.get('trx_date');
        const type_id = formData.get('type_id');
        const amount = parseFloat(formData.get('amount'));
        const note = formData.get('note');
        const wallet_id = formData.get('wallet_id') || null;
        const category_id = formData.get('category_id') || null;

        const sessionData = JSON.parse(localStorage.getItem('user_session'));
        const userId = sessionData.id;

        try {
            const response = await fetch(`${BASE_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    trx_date: trx_date,
                    type_id: parseInt(type_id),
                    amount: amount,
                    note: note,
                    wallet_id: wallet_id ? parseInt(wallet_id) : null,
                    category_id: category_id ? parseInt(category_id) : null,
                    user_id: userId
                })
            });

            const result = await response.json();

            if (response.ok) {
                showsAlert('Transaction added successfully!', 'success');

                const $modalElement = $('#transactionModal');
                if ($modalElement.length) {
                    const modal = bootstrap.Modal.getOrCreateInstance($modalElement[0]);
                    modal.hide();
                }

                $form[0].reset();
                initDataTableTransactions();

            } else {
                showsAlert('Failed to add transaction: ' + (result.message || 'Unknown error'), 'danger');
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
            showsAlert('Error adding transaction.', 'danger');
        }
    });

    $(document).on('submit', '#transferForm', async function (e) {
        e.preventDefault();

        const $form = $(this);
        const formData = new FormData(this);

        const transfer_date   = formData.get('transfer_date');
        const amount          = parseFloat(formData.get('transfer_amount'));
        const admin_fee       = parseFloat(formData.get('admin_fee')) || 0;
        const sender_wallet   = formData.get('sender_wallet');
        const receiver_wallet = formData.get('receiver_wallet');
        const note            = formData.get('transfer_note');

        if (sender_wallet === receiver_wallet) {
            showsAlert('Sender and receiver wallet cannot be the same!', 'danger');
            return;
        }

        const sessionData = JSON.parse(localStorage.getItem('user_session'));
        const userId = sessionData.id;

        const transactionsPayload = [
            // OUT - Sender
            {
                trx_date: transfer_date,
                type_id: 2, // OUT
                amount: amount + admin_fee,
                note: note ? `[Transfer Out] ${note}` : 'Transfer Out',
                wallet_id: parseInt(sender_wallet),
                user_id: userId
            },
            // IN - Receiver
            {
                trx_date: transfer_date,
                type_id: 1, // IN
                amount: amount,
                note: note ? `[Transfer In] ${note}` : 'Transfer In',
                wallet_id: parseInt(receiver_wallet),
                user_id: userId
            }
        ];

        try {
            const response = await fetch(`${BASE_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(transactionsPayload)
            });

            const result = await response.json();

            if (response.ok) {
                showsAlert('Transfer successful!', 'success');

                const $modalElement = $('#transferModal');
                if ($modalElement.length) {
                    const modal = bootstrap.Modal.getOrCreateInstance($modalElement[0]);
                    modal.hide();
                }

                $form[0].reset();
                initDataTableTransactions();
            } else {
                showsAlert('Transfer failed: ' + (result.message || 'Unknown error'), 'danger');
            }
        } catch (error) {
            console.error('Error transferring funds:', error);
            showsAlert('Error processing transfer.', 'danger');
        }
    });


    // Handler untuk submit Add Asset Form
    $(document).on('submit', '#addAssetForm', async function(e) {
        e.preventDefault();

        const $form = $(this);
        const formData = new FormData(this);

        const amount = parseFloat(formData.get('amount'));
        const note = formData.get('note');
        const wallet_id = formData.get('wallet_id');

        const sessionData = JSON.parse(localStorage.getItem('user_session'));
        const userId = sessionData.id;

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        try {
            const response = await fetch(`${BASE_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    trx_date: today,
                    type_id: 1,
                    amount: amount,
                    note: note,
                    wallet_id: parseInt(wallet_id),
                    category_id: 1,
                    init: true,
                    user_id: userId
                })
            });

            const result = await response.json();

            if (response.ok) {
                showsAlert('Asset added successfully!', 'success', '#asset-alert-container');

                const $modalElement = $('#assetModal');
                if ($modalElement.length) {
                    const modal = bootstrap.Modal.getOrCreateInstance($modalElement[0]);
                    modal.hide();
                }

                $form[0].reset();
                initDataTableTransactions();

            } else {
                showsAlert('Failed to add asset: ' + (result.message || 'Unknown error'), 'danger', '#asset-alert-container');
            }
        } catch (error) {
            console.error('Error adding asset:', error);
            showsAlert('Error adding asset.', 'danger', '#asset-alert-container');
        }
    });

    // Fungsi untuk Edit Transaction
    window.editTransaction = async function(id) {
        try {
            const response = await fetch(`${BASE_URL}/transactions?id=eq.${id}&select=*,transaction_type(name)`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const transaction = await response.json();
            if (transaction.length > 0) {
                const trx = transaction[0];
                $('#editTransactionId').val(trx.id);
                $('#edit_trx_date').val(trx.trx_date.split('T')[0]);
                $('#edit_type_id').val(trx.type_id);
                $('#edit_amount').val(trx.amount);
                $('#edit_note').val(trx.note);
                $('#edit_wallet_id').val(trx.wallet_id || '');
                $('#edit_category_id').val(trx.category_id || '');
                $('#editModal').modal('show');
            }
        } catch (error) {
            console.error('Error fetching transaction:', error);
        }
    };

    // Handler untuk submit Edit Transaction Form
    $(document).on('submit', '#editForm', async function(e) {
        e.preventDefault();
        const id = $('#editTransactionId').val();
        const trx_date = $('#edit_trx_date').val();
        const type_id = $('#edit_type_id').val();
        const amount = parseFloat($('#edit_amount').val());
        const note = $('#edit_note').val();
        const wallet_id = $('#edit_wallet_id').val() || null;
        const category_id = $('#edit_category_id').val() || null;

        try {
            const response = await fetch(`${BASE_URL}/transactions?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ 
                    trx_date, 
                    type_id: parseInt(type_id), 
                    amount, 
                    note, 
                    wallet_id: wallet_id ? parseInt(wallet_id) : null, 
                    category_id: category_id ? parseInt(category_id) : null
                })
            });

            if (response.ok) {
                showsAlert('Transaction updated successfully!', 'success', '#edit-alert-container');
                $('#editModal').modal('hide');
                initDataTableTransactions();
            } else {
                showsAlert('Failed to update transaction.', 'danger', '#edit-alert-container');
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            showsAlert('Error updating transaction.', 'danger', '#edit-alert-container');
        }
    });

    // Fungsi untuk Delete Transaction
    window.deleteTransaction = function(id) {
        $('#deleteTransactionId').val(id);
        $('#deleteModal').modal('show');
    };

    // Handler untuk Confirm Delete Transaction
    $(document).on('click', '#confirmDelete', async function() {
        const id = $('#deleteTransactionId').val();

        try {
            const response = await fetch(`${BASE_URL}/transactions?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (response.ok) {
                showsAlert('Transaction deleted successfully!', 'success');
                $('#deleteModal').modal('hide');
                initDataTableTransactions();
            } else {
                showsAlert('Failed to delete transaction.', 'danger');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showsAlert('Error deleting transaction.', 'danger');
        }
    });

    // Wallets CRUD Functions
    async function initDataTableWallets() {
        const $tableEl = $('#wallet_datatable');
        if ($tableEl.length === 0) return;

        if ($.fn.DataTable.isDataTable('#wallet_datatable')) {
            $tableEl.DataTable().destroy();
        }

        try {
            const response = await fetch(`${BASE_URL}/wallets`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Wallet data loaded:', data);

            const table = $tableEl.DataTable({
                data: data,
                columns: [
                    { data: 'name', title: 'Wallet Name' },
                    { data: 'created_at', title: 'Created At', render: function(data) { return new Date(data).toLocaleDateString(); } },
                    {
                        data: null,
                        title: 'Actions',
                        orderable: false,
                        className: 'noExport',
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group">
                                    <a class="ms-2 text-primary" href="#" onclick="editWallet(${row.id})"><i class="icon-edit"></i></a>
                                    <a class="ms-2 text-danger" href="#" onclick="deleteWallet(${row.id})"><i class="icon-trash-2"></i></a>
                                </div>
                            `;
                        }
                    }
                ],
                responsive: true,
                pageLength: 10
            });

        } catch (err) {
            console.error("Error loading wallet data:", err);
        }
    }

    // Add Wallet
    $(document).on('submit', '#addWalletForm', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const name = formData.get('name');

        try {
            const response = await fetch(`${BASE_URL}/wallets`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    name: name,
                    user_id: JSON.parse(localStorage.getItem('user_session')).id
                })
            });

            if (response.ok) {
                showsAlert('Wallet added successfully!', 'success', '#wallet-alert-container');
                $('#walletModal').modal('hide');
                $('#addWalletForm')[0].reset();
                initDataTableWallets();
            } else {
                showsAlert('Failed to add wallet.', 'danger', '#wallet-alert-container');
            }
        } catch (error) {
            console.error('Error adding wallet:', error);
            showsAlert('Error adding wallet.', 'danger', '#wallet-alert-container');
        }
    });

    // Edit Wallet
    window.editWallet = function(id) {
        // First get the wallet data
        fetch(`${BASE_URL}/wallets?id=eq.${id}`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const wallet = data[0];
                $('#editWalletId').val(wallet.id);
                $('#edit_wallet_name').val(wallet.name);
                $('#editWalletModal').modal('show');
            }
        })
        .catch(error => {
            console.error('Error fetching wallet:', error);
        });
    };

    $(document).on('submit', '#editWalletForm', async function(e) {
        e.preventDefault();

        const id = $('#editWalletId').val();
        const name = $('#edit_wallet_name').val();

        try {
            const response = await fetch(`${BASE_URL}/wallets?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    name: name
                })
            });

            if (response.ok) {
                showsAlert('Wallet updated successfully!', 'success', '#edit-wallet-alert-container');
                $('#editWalletModal').modal('hide');
                initDataTableWallets();
            } else {
                showsAlert('Failed to update wallet.', 'danger', '#edit-wallet-alert-container');
            }
        } catch (error) {
            console.error('Error updating wallet:', error);
            showsAlert('Error updating wallet.', 'danger', '#edit-wallet-alert-container');
        }
    });

    // Delete Wallet
    window.deleteWallet = function(id) {
        $('#deleteWalletId').val(id);
        $('#deleteWalletModal').modal('show');
    };

    $(document).on('click', '#confirmDeleteWallet', async function() {
        const id = $('#deleteWalletId').val();

        try {
            const response = await fetch(`${BASE_URL}/wallets?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (response.ok) {
                showsAlert('Wallet deleted successfully!', 'success');
                $('#deleteWalletModal').modal('hide');
                initDataTableWallets();
            } else {
                showsAlert('Failed to delete wallet.', 'danger');
            }
        } catch (error) {
            console.error('Error deleting wallet:', error);
            showsAlert('Error deleting wallet.', 'danger');
        }
    });

    // Categories CRUD Functions
    async function initDataTableCategories() {
        const $tableEl = $('#category_datatable');
        if ($tableEl.length === 0) return;

        if ($.fn.DataTable.isDataTable('#category_datatable')) {
            $tableEl.DataTable().destroy();
        }

        try {
            const response = await fetch(`${BASE_URL}/categories`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Category data loaded:', data);

            const table = $tableEl.DataTable({
                data: data,
                columns: [
                    { data: 'name', title: 'Category Name' },
                    { data: 'created_at', title: 'Created At', render: function(data) { return new Date(data).toLocaleDateString(); } },
                    {
                        data: null,
                        title: 'Actions',
                        orderable: false,
                        className: 'noExport',
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group">
                                    <a class="ms-2 text-primary" href="#" onclick="editCategory(${row.id})"><i class="icon-edit"></i></a>
                                    <a class="ms-2 text-danger" href="#" onclick="deleteCategory(${row.id})"><i class="icon-trash-2"></i></a>
                                </div>
                            `;
                        }
                    }
                ],
                responsive: true,
                pageLength: 10
            });

        } catch (err) {
            console.error("Error loading category data:", err);
        }
    }

    // Add Category
    $(document).on('submit', '#addCategoryForm', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const name = formData.get('name');

        try {
            const response = await fetch(`${BASE_URL}/categories`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    name: name,
                    user_id: JSON.parse(localStorage.getItem('user_session')).id
                })
            });

            if (response.ok) {
                showsAlert('Category added successfully!', 'success', '#category-alert-container');
                $('#categoryModal').modal('hide');
                $('#addCategoryForm')[0].reset();
                initDataTableCategories();
            } else {
                showsAlert('Failed to add category.', 'danger', '#category-alert-container');
            }
        } catch (error) {
            console.error('Error adding category:', error);
            showsAlert('Error adding category.', 'danger', '#category-alert-container');
        }
    });

    $(document).on('click', '#confirmDeleteWallet', async function() {
        const id = $('#deleteWalletId').val();

        try {
            const response = await fetch(`${BASE_URL}/wallets?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (response.ok) {
                showsAlert('Wallet deleted successfully!', 'success');
                $('#deleteWalletModal').modal('hide');
                initDataTableWallets();
            } else {
                showsAlert('Failed to delete wallet.', 'danger');
            }
        } catch (error) {
            console.error('Error deleting wallet:', error);
            showsAlert('Error deleting wallet.', 'danger');
        }
    });

    // Edit Category
    window.editCategory = function(id) {
        // First get the category data
        fetch(`${BASE_URL}/categories?id=eq.${id}`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const category = data[0];
                $('#editCategoryId').val(category.id);
                $('#edit_category_name').val(category.name);
                $('#editCategoryModal').modal('show');
            }
        })
        .catch(error => {
            console.error('Error fetching category:', error);
        });
    };

    $(document).on('submit', '#editCategoryForm', async function(e) {
        e.preventDefault();

        const id = $('#editCategoryId').val();
        const name = $('#edit_category_name').val();

        try {
            const response = await fetch(`${BASE_URL}/categories?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    name: name
                })
            });

            if (response.ok) {
                showsAlert('Category updated successfully!', 'success', '#edit-category-alert-container');
                $('#editCategoryModal').modal('hide');
                initDataTableCategories();
            } else {
                showsAlert('Failed to update category.', 'danger', '#edit-category-alert-container');
            }
        } catch (error) {
            console.error('Error updating category:', error);
            showsAlert('Error updating category.', 'danger', '#edit-category-alert-container');
        }
    });

    // Delete Category
    window.deleteCategory = function(id) {
        $('#deleteCategoryId').val(id);
        $('#deleteCategoryModal').modal('show');
    };

    $(document).on('click', '#confirmDeleteCategory', async function() {
        const id = $('#deleteCategoryId').val();

        try {
            const response = await fetch(`${BASE_URL}/categories?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (response.ok) {
                showsAlert('Category deleted successfully!', 'success');
                $('#deleteCategoryModal').modal('hide');
                initDataTableCategories();
            } else {
                showsAlert('Failed to delete category.', 'danger');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showsAlert('Error deleting category.', 'danger');
        }
    });

    // Debt Management Functions
    async function initDataTableDebt() {
        const $tableEl = $('#debtTable');
        if ($tableEl.length === 0) return;

        if ($.fn.DataTable.isDataTable('#debtTable')) {
            $tableEl.DataTable().destroy();
        }

        const sessionData = JSON.parse(localStorage.getItem('user_session'));
        const userId = sessionData.id;

        const FETCH_DEBT_API = `${BASE_URL}/debt?user_id=eq.${userId}&order=id.desc`;

        try {
            const response = await fetch(FETCH_DEBT_API, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            const processedData = data.map(debt => {
                const typeText = debt.type_id == 1 ? 'Receivable' : 'Payable';
                const statusText = debt.status ? 'Active' : 'Completed';
                const installmentText = debt.is_installment ? 
                    `${debt.installment_interval} (${debt.installment_total} installments)` : 'No';

                return {
                    ...debt,
                    type_text: typeText,
                    status_text: statusText,
                    installment_text: installmentText
                };
            });

            const table = $tableEl.DataTable({
                data: processedData,
                columns: [
                    { data: 'person_name' },
                    { data: 'type_text' },
                    { data: 'ammount', render: function(data) { return 'Rp ' + parseFloat(data).toLocaleString('id-ID'); } },
                    { data: 'due_date', render: function(data) { return data ? new Date(data).toLocaleDateString('id-ID') : '-'; } },
                    { data: 'status_text' },
                    { data: 'installment_text' },
                    {
                        data: null,
                        className: 'noExport',
                        render: function(data, type, row) {
                            let actions = `
                                <div class="btn-group">
                                    <a class="ms-2 text-primary" href="#" onclick="editDebt(${row.id})"><i class="icon-edit"></i></a>
                                    <a class="ms-2 text-danger" href="#" onclick="deleteDebt(${row.id})"><i class="icon-trash-2"></i></a>
                            `;
                            if (row.is_installment && row.status) {
                                actions += `<a class="ms-2 text-success" href="#" onclick="payInstallment(${row.id})"><i class="icon-credit-card"></i></a>`;
                            }
                            actions += `</div>`;
                            return actions;
                        }
                    }
                ],
                buttons: [
                    { extend: 'print', className: 'btn-light' },
                    { extend: 'pdf', className: 'btn-light' },
                    { extend: 'excel', className: 'btn-light' }
                ],
                responsive: true,
                pageLength: 10,
                order: [[3, 'asc']] // Order by due date ascending
            });

            if ($('#export_buttons').length > 0) {
                table.buttons().container().appendTo('#export_buttons');
            }

        } catch (err) {
            console.error("Error loading debt data:", err);
        }
    }

    // Add Debt
    $(document).on('submit', '#addDebtForm', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const debtData = {
            person_name: formData.get('person_name'),
            type_id: parseInt(formData.get('type_id')),
            ammount: parseFloat(formData.get('amount')),
            due_date: formData.get('due_date') || null,
            status: formData.get('status') === 'true',
            is_installment: $('#is_installment').is(':checked'),
            installment_interval: $('#is_installment').is(':checked') ? formData.get('installment_interval') : null,
            installment_total: $('#is_installment').is(':checked') ? parseInt(formData.get('installment_count')) : null,
            note: formData.get('note'),
            user_id: JSON.parse(localStorage.getItem('user_session')).id
        };

        try {
            const response = await fetch(`${BASE_URL}/debt`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(debtData)
            });

            if (response.ok) {
                showsAlert('Debt added successfully!', 'success', '#debt-alert-container');
                $('#debtModal').modal('hide');
                $('#addDebtForm')[0].reset();
                initDataTableDebt();
            } else {
                const error = await response.json();
                showsAlert('Failed to add debt: ' + (error.message || 'Unknown error'), 'danger', '#debt-alert-container');
            }
        } catch (error) {
            console.error('Error adding debt:', error);
            showsAlert('Error adding debt.', 'danger', '#debt-alert-container');
        }
    });

    // Edit Debt
    window.editDebt = function(id) {
        fetch(`${BASE_URL}/debt?id=eq.${id}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const debt = data[0];
                $('#editDebtId').val(debt.id);
                $('#edit_person_name').val(debt.person_name);
                $('#edit_type_id').val(debt.type_id);
                $('#edit_amount').val(debt.ammount);
                $('#edit_due_date').val(debt.due_date ? debt.due_date.split('T')[0] : '');
                $('#edit_status').val(debt.status.toString());
                $('#edit_is_installment').prop('checked', debt.is_installment);
                $('#edit_installment_interval').val(debt.installment_interval || '');
                $('#edit_installment_count').val(debt.installment_total || '');
                $('#edit_note').val(debt.note || '');

                // Show/hide installment fields
                if (debt.is_installment) {
                    $('.edit-installment-fields').show();
                } else {
                    $('.edit-installment-fields').hide();
                }

                $('#editDebtModal').modal('show');
            }
        })
        .catch(error => {
            console.error('Error fetching debt:', error);
            showsAlert('Error loading debt data.', 'danger');
        });
    };

    // Update Debt
    $(document).on('submit', '#editDebtForm', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const id = $('#editDebtId').val();
        const debtData = {
            person_name: formData.get('person_name'),
            type_id: parseInt(formData.get('type_id')),
            ammount: parseFloat(formData.get('amount')),
            due_date: formData.get('due_date') || null,
            status: formData.get('status') === 'true',
            is_installment: $('#edit_is_installment').is(':checked'),
            installment_interval: $('#edit_is_installment').is(':checked') ? formData.get('installment_interval') : null,
            installment_total: $('#edit_is_installment').is(':checked') ? parseInt(formData.get('installment_count')) : null,
            note: formData.get('note')
        };

        try {
            const response = await fetch(`${BASE_URL}/debt?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(debtData)
            });

            if (response.ok) {
                showsAlert('Debt updated successfully!', 'success', '#edit-debt-alert-container');
                $('#editDebtModal').modal('hide');
                initDataTableDebt();
            } else {
                const error = await response.json();
                showsAlert('Failed to update debt: ' + (error.message || 'Unknown error'), 'danger', '#edit-debt-alert-container');
            }
        } catch (error) {
            console.error('Error updating debt:', error);
            showsAlert('Error updating debt.', 'danger', '#edit-debt-alert-container');
        }
    });

    // Delete Debt
    window.deleteDebt = function(id) {
        $('#deleteDebtId').val(id);
        $('#deleteDebtModal').modal('show');
    };

    $(document).on('click', '#confirmDeleteDebt', async function() {
        const id = $('#deleteDebtId').val();

        try {
            const response = await fetch(`${BASE_URL}/debt?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (response.ok) {
                showsAlert('Debt deleted successfully!', 'success');
                $('#deleteDebtModal').modal('hide');
                initDataTableDebt();
            } else {
                showsAlert('Failed to delete debt.', 'danger');
            }
        } catch (error) {
            console.error('Error deleting debt:', error);
            showsAlert('Error deleting debt.', 'danger');
        }
    });

    // Pay Installment
    window.payInstallment = function(debtId) {
        $('#payInstallmentDebtId').val(debtId);
        $('#payment_date').val(new Date().toISOString().split('T')[0]); // Set today's date
        $('#payInstallmentModal').modal('show');
    };

    $(document).on('submit', '#payInstallmentForm', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const debtId = $('#payInstallmentDebtId').val();
        const paymentData = {
            debt_id: parseInt(debtId),
            amount: parseFloat(formData.get('payment_amount')),
            payment_date: formData.get('payment_date'),
            note: formData.get('payment_note')
        };

        try {
            const response = await fetch(`${BASE_URL}/debt_payments`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(paymentData)
            });

            if (response.ok) {
                showsAlert('Payment recorded successfully!', 'success', '#pay-installment-alert-container');
                $('#payInstallmentModal').modal('hide');
                $('#payInstallmentForm')[0].reset();
                initDataTableDebt(); // Refresh to show updated status
            } else {
                const error = await response.json();
                showsAlert('Failed to record payment: ' + (error.message || 'Unknown error'), 'danger', '#pay-installment-alert-container');
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            showsAlert('Error recording payment.', 'danger', '#pay-installment-alert-container');
        }
    });

    // Toggle installment fields
    $(document).on('change', '#is_installment', function() {
        if ($(this).is(':checked')) {
            $('.installment-fields').show();
        } else {
            $('.installment-fields').hide();
        }
    });

    $(document).on('change', '#edit_is_installment', function() {
        if ($(this).is(':checked')) {
            $('.edit-installment-fields').show();
        } else {
            $('.edit-installment-fields').hide();
        }
    });

    // Initialize debt table if on debt page
    if (window.location.pathname.includes('debt.html')) {
        initDataTableDebt();
    }

    // Alias for backward compatibility
    window.initTableMasterDebt = initDataTableDebt;

    function initCharts() {
        am4core.disposeAllCharts();
        am4core.useTheme(am4themes_animated);

        // Cash Flow Chart - Line Chart
        if ($('#cashFlowChart').length > 0) {
            var chart = am4core.create("cashFlowChart", am4charts.XYChart);
            chart.data = [
                { "date": "2024-01-01", "income": 15000000, "expenses": 12500000 },
                { "date": "2024-01-02", "income": 16000000, "expenses": 13000000 },
                { "date": "2024-01-03", "income": 14000000, "expenses": 13500000 },
                { "date": "2024-01-04", "income": 17000000, "expenses": 14000000 },
                { "date": "2024-01-05", "income": 15500000, "expenses": 12800000 },
                { "date": "2024-01-06", "income": 16500000, "expenses": 13200000 },
                { "date": "2024-01-07", "income": 15800000, "expenses": 12900000 }
            ];
            
            var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
            dateAxis.dataFields.dateX = "date";
            dateAxis.title.text = "Date";
            
            var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
            valueAxis.title.text = "Amount (IDR)";
            
            var incomeSeries = chart.series.push(new am4charts.LineSeries());
            incomeSeries.dataFields.valueY = "income";
            incomeSeries.dataFields.dateX = "date";
            incomeSeries.name = "Income";
            incomeSeries.stroke = am4core.color("#28a745");
            incomeSeries.strokeWidth = 3;
            
            var expensesSeries = chart.series.push(new am4charts.LineSeries());
            expensesSeries.dataFields.valueY = "expenses";
            expensesSeries.dataFields.dateX = "date";
            expensesSeries.name = "Expenses";
            expensesSeries.stroke = am4core.color("#dc3545");
            expensesSeries.strokeWidth = 3;
            
            chart.legend = new am4charts.Legend();
            chart.cursor = new am4charts.XYCursor();
        }

        // Expense by Category - Donut Chart
        if ($('#expenseCategoryChart').length > 0) {
            var chart = am4core.create("expenseCategoryChart", am4charts.PieChart);
            chart.data = [
                { "category": "Makanan", "amount": 4500000 },
                { "category": "Transport", "amount": 3200000 },
                { "category": "Hiburan", "amount": 2800000 },
                { "category": "Belanja", "amount": 2100000 },
                { "category": "Lainnya", "amount": 1400000 }
            ];
            
            var pieSeries = chart.series.push(new am4charts.PieSeries());
            pieSeries.dataFields.value = "amount";
            pieSeries.dataFields.category = "category";
            pieSeries.innerRadius = am4core.percent(50);
            
            pieSeries.labels.template.disabled = true;
            pieSeries.ticks.template.disabled = true;
            
            var label = pieSeries.createChild(am4core.Label);
            label.text = "Total\nRp 14,000,000";
            label.horizontalCenter = "middle";
            label.verticalCenter = "middle";
            label.fontSize = 14;
        }

        // Daily Spending Trend - Bar Chart
        if ($('#dailySpendingChart').length > 0) {
            var chart = am4core.create("dailySpendingChart", am4charts.XYChart);
            chart.data = [
                { "day": "Senin", "amount": 850000 },
                { "day": "Selasa", "amount": 920000 },
                { "day": "Rabu", "amount": 780000 },
                { "day": "Kamis", "amount": 1050000 },
                { "day": "Jumat", "amount": 1200000 },
                { "day": "Sabtu", "amount": 1350000 },
                { "day": "Minggu", "amount": 950000 }
            ];
            
            var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
            categoryAxis.dataFields.category = "day";
            
            var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
            valueAxis.title.text = "Amount (IDR)";
            
            var series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.valueY = "amount";
            series.dataFields.categoryX = "day";
            series.columns.template.fill = am4core.color("#ffc107");
        }

        // Debt Composition - Donut Chart
        if ($('#debtCompositionChart').length > 0) {
            var chart = am4core.create("debtCompositionChart", am4charts.PieChart);
            chart.data = [
                { "source": "Bank", "amount": 25000000 },
                { "source": "Kartu Kredit", "amount": 15000000 },
                { "source": "Teman", "amount": 8000000 },
                { "source": "Keluarga", "amount": 2000000 }
            ];
            
            var pieSeries = chart.series.push(new am4charts.PieSeries());
            pieSeries.dataFields.value = "amount";
            pieSeries.dataFields.category = "source";
            pieSeries.innerRadius = am4core.percent(50);
            
            pieSeries.labels.template.disabled = true;
            pieSeries.ticks.template.disabled = true;
        }

        // Debt Over Time - Line Chart
        if ($('#debtOverTimeChart').length > 0) {
            var chart = am4core.create("debtOverTimeChart", am4charts.XYChart);
            chart.data = [
                { "month": "Jan", "debt": 50000000 },
                { "month": "Feb", "debt": 48000000 },
                { "month": "Mar", "debt": 45000000 },
                { "month": "Apr", "debt": 42000000 },
                { "month": "May", "debt": 38000000 },
                { "month": "Jun", "debt": 35000000 }
            ];
            
            var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
            categoryAxis.dataFields.category = "month";
            
            var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
            valueAxis.title.text = "Debt Amount (IDR)";
            
            var series = chart.series.push(new am4charts.LineSeries());
            series.dataFields.valueY = "debt";
            series.dataFields.categoryX = "month";
            series.stroke = am4core.color("#dc3545");
            series.strokeWidth = 3;
            
            series.bullets.push(new am4charts.CircleBullet());
        }

        // Asset Allocation - Donut Chart
        if ($('#assetAllocationChart').length > 0) {
            var chart = am4core.create("assetAllocationChart", am4charts.PieChart);
            chart.data = [
                { "asset": "Cash", "amount": 20000000 },
                { "asset": "Emas", "amount": 15000000 },
                { "asset": "Properti", "amount": 30000000 },
                { "asset": "Saham", "amount": 25000000 },
                { "asset": "Crypto", "amount": 10000000 }
            ];
            
            var pieSeries = chart.series.push(new am4charts.PieSeries());
            pieSeries.dataFields.value = "amount";
            pieSeries.dataFields.category = "asset";
            pieSeries.innerRadius = am4core.percent(50);
            
            pieSeries.labels.template.disabled = true;
            pieSeries.ticks.template.disabled = true;
        }

        // Asset Comparison - Bar Chart
        if ($('#assetComparisonChart').length > 0) {
            var chart = am4core.create("assetComparisonChart", am4charts.XYChart);
            chart.data = [
                { "asset": "Cash", "value": 20000000 },
                { "asset": "Emas", "value": 15000000 },
                { "asset": "Properti", "value": 30000000 },
                { "asset": "Saham", "value": 25000000 },
                { "asset": "Crypto", "value": 10000000 }
            ];
            
            var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
            categoryAxis.dataFields.category = "asset";
            categoryAxis.renderer.labels.template.rotation = 45;
            
            var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
            valueAxis.title.text = "Value (IDR)";
            
            var series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.valueY = "value";
            series.dataFields.categoryX = "asset";
            series.columns.template.fill = am4core.color("#28a745");
        }

        // Net Worth Growth - Area Chart
        if ($('#netWorthChart').length > 0) {
            var chart = am4core.create("netWorthChart", am4charts.XYChart);
            chart.data = [
                { "month": "Jan", "networth": 100000000 },
                { "month": "Feb", "networth": 105000000 },
                { "month": "Mar", "networth": 108000000 },
                { "month": "Apr", "networth": 112000000 },
                { "month": "May", "networth": 115000000 },
                { "month": "Jun", "networth": 118000000 }
            ];
            
            var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
            categoryAxis.dataFields.category = "month";
            
            var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
            valueAxis.title.text = "Net Worth (IDR)";
            
            var series = chart.series.push(new am4charts.LineSeries());
            series.dataFields.valueY = "networth";
            series.dataFields.categoryX = "month";
            series.stroke = am4core.color("#007bff");
            series.strokeWidth = 3;
            series.fill = am4core.color("#007bff");
            series.fillOpacity = 0.3;
        }

        // Transaction Heatmap (Bonus)
        if ($('#transactionHeatmap').length > 0) {
            var chart = am4core.create("transactionHeatmap", am4charts.HeatLegend);
            // Simplified heatmap data
            chart.data = [
                { "hour": 0, "weekday": "Mon", "transactions": 5 },
                { "hour": 1, "weekday": "Mon", "transactions": 2 },
                // Add more data as needed
            ];
        }

        // Top 5 Spending Categories (Bonus)
        if ($('#topCategoriesChart').length > 0) {
            var chart = am4core.create("topCategoriesChart", am4charts.XYChart);
            chart.data = [
                { "category": "Makanan", "amount": 4500000 },
                { "category": "Transport", "amount": 3200000 },
                { "category": "Hiburan", "amount": 2800000 },
                { "category": "Belanja", "amount": 2100000 },
                { "category": "Tagihan", "amount": 1800000 }
            ];
            
            var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
            categoryAxis.dataFields.category = "category";
            categoryAxis.renderer.inversed = true;
            
            var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
            
            var series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.valueX = "amount";
            series.dataFields.categoryY = "category";
            series.columns.template.fill = am4core.color("#6f42c1");
        }

        console.log("All Dashboard Charts Initialized with Dummy Data.");
    }

    initDashboard();
});