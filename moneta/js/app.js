document.addEventListener("DOMContentLoaded", function () {
    const appContainer = document.getElementById('app');
    const pageName = document.getElementById('page-name');
    const pageMenuName = document.getElementById('page-menu-name');
    const userNameElement = document.getElementById('user-name');
    const mainMenu = document.getElementById('mainMenu');

    // 1. Ambil Session User dari LocalStorage
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(sessionData);

    if (userNameElement) {
        userNameElement.textContent = user.name;
    }

    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcnJraGlpd3ZsaW5hbnhzaW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNTEzOTIsImV4cCI6MjA4MjYyNzM5Mn0.vygEL8BYGK_UXPwMrvgpRkk7RVQQ5Q0AB1n5uk1IYi0';
    const MENU_API = `https://worrkhiiwvlinanxsimn.supabase.co/rest/v1/user_menu_view?select=*&id=eq.${user.id}`;

    // 2. Fungsi Load Konten Halaman (dari folder pages/)
    let currentPage = '';

async function loadPage(page, title) {
    // Cegah loading halaman yang sama berkali-kali secara bersamaan
    if (pageName) pageName.textContent = title || "Dashboard";
    if (pageMenuName) pageMenuName.textContent = title ? `Page Menu ${title}` : "Main Menu";
    if (currentPage === page && $('#calendar').length > 0) return; 
    
    try {
        currentPage = page;
        appContainer.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading content...</p></div>';
        
        const res = await fetch(`pages/${page}.html`);
        
        if (!res.ok) {
            throw new Error(`File pages/${page}.html tidak ditemukan (404)`);
        }
        
        const html = await res.text();
        appContainer.innerHTML = html;

        // Berikan delay sedikit lebih lama agar DOM benar-benar siap
        setTimeout(() => {
            // Hapus inisialisasi lama sebelum membuat yang baru
            if ($('#calendar').length > 0) {
                // Pastikan initCalendar hanya dijalankan jika elemennya ada di HTML yang baru di-load
                initCalendar();
            }
            
            // Logika untuk DataTable
            if ($('#datatable').length > 0) {
                if (page === 'master-data' || page === 'user-access') {
                    initDataTableMaster();
                } else {
                    initDataTable();
                }
            }

            if ($('#chartdiv').length > 0) {
                initCharts();
            }
            
            // Polo Template Refresh (Jika ada plugin tooltip/hover dari template)
            if (typeof INSPIRO !== 'undefined' && INSPIRO.elements) {
                INSPIRO.elements.buttons(); // Contoh merefresh elemen template
            }
        }, 200);

    } catch (err) {
        console.error("LoadPage Error:", err);
        appContainer.innerHTML = `
            <div class="alert alert-danger m-5">
                <h5><i class="icon-alert-triangle"></i> Error Loading Page</h5>
                <p>${err.message}</p>
                <button class="btn btn-sm btn-secondary" onclick="location.reload()">Reload Dashboard</button>
            </div>`;
    }
}

    // 3. Fungsi Load Menu Dinamis dari API
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
                mainMenu.innerHTML = '<li><a href="#">No Menu Access</a></li>';
            }
        } catch (err) {
            console.error("Error loading menu:", err);
            mainMenu.innerHTML = '<li><a href="#">Error Loading Menu</a></li>';
        }
    }

    function initCharts() {
        // Bersihkan chart lama jika ada untuk menghemat RAM
        am4core.disposeAllCharts();
        
        am4core.useTheme(am4themes_animated);

        // --- 1. INCOME & EXPENSES (XY Chart) ---
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

        // --- 2. PEMASUKAN TAHUNAN (Rotated Column - chartdiv2) ---
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

        // --- 3. PENGELUARAN HARIAN (Date Based - chartdiv5) ---
        if ($('#chartdiv5').length > 0) {
            var chart5 = am4core.create("chartdiv5", am4charts.XYChart);
            chart5.data = [{ "date": "2023-01-01", "value": 81 }, { "date": "2023-01-02", "value": 50 }, { "date": "2023-01-03", "value": 90 }]; // Data singkat
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

        // --- 4. SALDO CHART (Pie Chart - chartdiv8) ---
        if ($('#chartdiv8').length > 0) {
            var chart8 = am4core.create("chartdiv8", am4charts.PieChart);
            chart8.data = [{ "country": "Tabungan", "litres": 500 }, { "country": "Investasi", "litres": 300 }, { "country": "Cash", "litres": 200 }];
            var pieSeries = chart8.series.push(new am4charts.PieSeries());
            pieSeries.dataFields.value = "litres";
            pieSeries.dataFields.category = "country";
        }

        // --- 5. DEBT CHART (Radar/Gauge - chartdiv9) ---
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

    // FUNGSI INIT CALENDAR (Pastikan dipanggil di loadPage)
    function initCalendar() {
        const calendarEl = $('#calendar');
        
        // Cek apakah elemen ada dan library sudah terload
        if (calendarEl.length > 0 && typeof $().fullCalendar === 'function') {
            calendarEl.fullCalendar({
                header: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'listDay,listWeek,month'
                },
                // customize the button names,
                // otherwise they'd all just say "list"
                views: {
                    listDay: {
                        buttonText: 'list day'
                    },
                    listWeek: {
                        buttonText: 'list week'
                    }
                },
                defaultView: 'listWeek',
                defaultDate: '2021-01-12',
                navLinks: true, // can click day/week names to navigate views
                editable: true,
                eventLimit: true, // allow "more" link when too many events
                events: [{
                    title: 'All Day Event',
                    start: '2021-01-01',
                }, {
                    title: 'Long Event',
                    start: '2021-01-07',
                    end: '2021-01-10',
                    className: 'fc-event-primary'
                }, {
                    id: 999,
                    title: 'Repeating Event',
                    start: '2021-01-09T16:00:00'
                }, {
                    id: 999,
                    title: 'Repeating Event',
                    start: '2021-01-16T16:00:00'
                }, {
                    title: 'Conference',
                    start: '2021-01-11',
                    end: '2021-01-13',
                    className: 'fc-event-warning',
                }, {
                    title: 'Meeting',
                    start: '2021-01-12T10:30:00',
                    end: '2021-01-12T12:30:00',
                    className: 'fc-event-success'
                }, {
                    title: 'Lunch',
                    start: '2021-01-12T12:00:00'
                }, {
                    title: 'Meeting',
                    start: '2021-01-12T14:30:00',
                    className: 'fc-event-info'
                }, {
                    title: 'Happy Hour',
                    start: '2021-01-12T17:30:00'
                }, {
                    title: 'Dinner',
                    start: '2021-01-12T20:00:00',
                    className: 'fc-event-success'
                }, {
                    title: 'Birthday Party',
                    start: '2021-01-13T07:00:00',
                    className: 'fc-event-danger'
                }, {
                    title: 'Click for Google',
                    url: 'http://google.com/',
                    start: '2021-01-28',
                    className: 'fc-event-info'
                }]
            });
            console.log("Calendar initialized successfully.");
        } else {
            console.error("Gagal Inisialisasi: Elemen #calendar tidak ditemukan di DOM.");
        }
    }

    function initDataTable() {
        const tableEl = $('#datatable');
        if (tableEl.length > 0) {
            // Hancurkan instance lama jika ada (mencegah error re-initialize)
            if ($.fn.DataTable.isDataTable('#datatable')) {
                tableEl.DataTable().destroy();
            }

            const table = tableEl.DataTable({
                buttons: [{
                    extend: 'print',
                    title: 'Test Data export',
                    exportOptions: { columns: "thead th:not(.noExport)" }
                }, {
                    extend: 'pdf',
                    title: 'Test Data export',
                    exportOptions: { columns: "thead th:not(.noExport)" }
                }, {
                    extend: 'excel',
                    title: 'Test Data export',
                    exportOptions: { columns: "thead th:not(.noExport)" }
                }, {
                    extend: 'csv',
                    title: 'Test Data export',
                    exportOptions: { columns: "thead th:not(.noExport)" }
                }, {
                    extend: 'copy',
                    title: 'Test Data export',
                    exportOptions: { columns: "thead th:not(.noExport)" }
                }]
            });

            // Pindahkan tombol ke container khusus jika elemennya ada
            if ($('#export_buttons').length > 0) {
                table.buttons().container().appendTo('#export_buttons');
                $("#export_buttons .btn").removeClass('btn-secondary').addClass('btn-light');
            }
        }
    }

    async function initDataTableMaster() {
        const tableEl = $('#datatable');
        if (tableEl.length === 0) return;

        // Hancurkan instance lama jika ada
        if ($.fn.DataTable.isDataTable('#datatable')) {
            tableEl.DataTable().destroy();
        }

        // Ambil user_id dari session untuk filter API
        const sessionData = JSON.parse(localStorage.getItem('user_session'));
        const userId = sessionData.id;

        // URL API dengan filter OR (id kita sendiri atau bawahan kita)
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

            // Inisialisasi DataTable
            const table = tableEl.DataTable({
                data: data,
                columns: [
                    { data: 'name' },
                    { data: 'email' },
                    { 
                        data: 'menu_user',
                        render: function(data) {
                            if (!data || data.length === 0) return '<span class="text-muted small">No Access</span>';
                            
                            // Buat Badge untuk setiap menu
                            return data.map(m => {
                                // Warna random/tetap berdasarkan nama menu agar menarik
                                const colors = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-danger'];
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
                // Masukkan konfigurasi button export yang tadi
                buttons: [
                    { extend: 'print', className: 'btn-light' },
                    { extend: 'pdf', className: 'btn-light' },
                    { extend: 'excel', className: 'btn-light' }
                ],
                responsive: true
            });

            // Pindahkan tombol export ke container
            if ($('#export_buttons').length > 0) {
                table.buttons().container().appendTo('#export_buttons');
            }

        } catch (err) {
            console.error("Error loading user data:", err);
        }
    }

    // 4. Fungsi Render Navbar dan Logika Klik
    function renderNavbar(menus) {
        mainMenu.innerHTML = ''; 

        menus.forEach((item, index) => {
            const li = document.createElement('li');
            if (index === 1) li.classList.add('active'); 

            const a = document.createElement('a');
            a.href = "#";
            a.textContent = item.menu_name;
            a.dataset.page = item.html; 

            a.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelectorAll('#mainMenu li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                
                // Panggil loadPage berdasarkan data dari API (item.html)
                loadPage(item.html, item.menu_name);
            });

            li.appendChild(a);
            mainMenu.appendChild(li);
        });

        if (menus.length > 1) {
            loadPage(menus[1].html, menus[1].menu_name);
        } else if (menus.length > 0) {
            loadPage(menus[0].html, menus[0].menu_name);
        }
    }

    // 5. Fungsi Logout
    const logoutBtn = document.querySelector('.logout-lur');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('user_session');
            window.location.href = 'login.html';
        });
    }

    // Jalankan inisialisasi
    initDashboard();
});