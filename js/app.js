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
                if ($('#chartdiv').length > 0) initCharts();
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

    function initCharts() {
        am4core.disposeAllCharts();
        am4core.useTheme(am4themes_animated);

        if ($('#chartdiv').length > 0) {
            var chart = am4core.create("chartdiv", am4charts.XYChart);
            chart.data = [
                { "year": "2009", "income": 23.5, "expenses": 21.1 },
                { "year": "2010", "income": 26.2, "expenses": 30.5 },
                { "year": "2011", "income": 30.1, "expenses": 34.9 },
                { "year": "2012", "income": 29.5, "expenses": 31.1 },
                { "year": "2013", "income": 30.6, "expenses": 28.2, "lineDash": "5,5" },
                { "year": "2014", "income": 34.1, "expenses": 32.9, "strokeWidth": 1, "columnDash": "5,5", "fillOpacity": 0.2, "additional": "(projection)" }
            ];
            var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
            categoryAxis.dataFields.category = "year";
            var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
            var columnSeries = chart.series.push(new am4charts.ColumnSeries());
            columnSeries.dataFields.valueY = "income";
            columnSeries.dataFields.categoryX = "year";
            columnSeries.name = "Income";
            var lineSeries = chart.series.push(new am4charts.LineSeries());
            lineSeries.dataFields.valueY = "expenses";
            lineSeries.dataFields.categoryX = "year";
            lineSeries.name = "Expenses";
            lineSeries.stroke = am4core.color("#fdd400");
        }

        if ($('#chartdiv2').length > 0) {
            var chart2 = am4core.create("chartdiv2", am4charts.XYChart);
            chart2.scrollbarX = new am4core.Scrollbar();
            chart2.data = [
                { "country": "2018", "visits": 3025 }, { "country": "2019", "visits": 1882 },
                { "country": "2020", "visits": 1809 }, { "country": "2021", "visits": 1322 },
                { "country": "2022", "visits": 1122 }, { "country": "2023", "visits": 1114 }
            ];
            var categoryAxis2 = chart2.xAxes.push(new am4charts.CategoryAxis());
            categoryAxis2.dataFields.category = "country";
            categoryAxis2.renderer.labels.template.rotation = 270;
            var valueAxis2 = chart2.yAxes.push(new am4charts.ValueAxis());
            var series2 = chart2.series.push(new am4charts.ColumnSeries());
            series2.dataFields.valueY = "visits";
            series2.dataFields.categoryX = "country";
            series2.columns.template.tooltipText = "{categoryX}: [bold]{valueY}[/]";
            series2.columns.template.adapter.add("fill", (fill, target) => chart2.colors.getIndex(target.dataItem.index));
        }

        if ($('#chartdiv5').length > 0) {
            var chart5 = am4core.create("chartdiv5", am4charts.XYChart);
            chart5.data = [{ "date": "2023-01-01", "value": 81 }, { "date": "2023-01-02", "value": 50 }, { "date": "2023-01-03", "value": 90 }];
            chart5.dateFormatter.inputDateFormat = "yyyy-MM-dd";
            var dateAxis = chart5.xAxes.push(new am4charts.DateAxis());
            var valueAxis5 = chart5.yAxes.push(new am4charts.ValueAxis());
            var series5 = chart5.series.push(new am4charts.LineSeries());
            series5.dataFields.valueY = "value";
            series5.dataFields.dateX = "date";
            series5.tooltipText = "{value}";
            chart5.cursor = new am4charts.XYCursor();
            chart5.scrollbarX = new am4charts.XYChartScrollbar();
            chart5.scrollbarX.series.push(series5);
        }

        if ($('#chartdiv8').length > 0) {
            var chart8 = am4core.create("chartdiv8", am4charts.PieChart);
            chart8.data = [{ "country": "Tabungan", "litres": 500 }, { "country": "Investasi", "litres": 300 }, { "country": "Cash", "litres": 200 }];
            var pieSeries = chart8.series.push(new am4charts.PieSeries());
            pieSeries.dataFields.value = "litres";
            pieSeries.dataFields.category = "country";
        }

        if ($('#chartdiv9').length > 0) {
            var chart9 = am4core.create("chartdiv9", am4charts.RadarChart);
            chart9.data = [
                { "category": "Hutang Bank", "value": 80, "full": 100 },
                { "category": "Kartu Kredit", "value": 35, "full": 100 },
                { "category": "Pinjaman", "value": 92, "full": 100 }
            ];
            chart9.startAngle = -90; chart9.endAngle = 180;
            chart9.innerRadius = am4core.percent(20);
            var categoryAxis9 = chart9.yAxes.push(new am4charts.CategoryAxis());
            categoryAxis9.dataFields.category = "category";
            var valueAxis9 = chart9.xAxes.push(new am4charts.ValueAxis());
            valueAxis9.min = 0; valueAxis9.max = 100;
            var series9 = chart9.series.push(new am4charts.RadarColumnSeries());
            series9.dataFields.valueX = "value";
            series9.dataFields.categoryY = "category";
            series9.columns.template.radarColumn.cornerRadius = 20;
            series9.columns.template.adapter.add("fill", (fill, target) => chart9.colors.getIndex(target.dataItem.index));
        }

        console.log("All Financial Charts Initialized.");
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

    initDashboard();
});