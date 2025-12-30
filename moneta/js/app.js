document.addEventListener("DOMContentLoaded", function () {
    const appContainer = document.getElementById('app');
    const mainMenu = document.getElementById('mainMenu');

    // 1. Ambil Session User dari LocalStorage
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(sessionData);

    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcnJraGlpd3ZsaW5hbnhzaW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNTEzOTIsImV4cCI6MjA4MjYyNzM5Mn0.vygEL8BYGK_UXPwMrvgpRkk7RVQQ5Q0AB1n5uk1IYi0';
    const MENU_API = `https://worrkhiiwvlinanxsimn.supabase.co/rest/v1/user_menu_view?select=*&id=eq.${user.id}`;

    // 2. Fungsi Load Konten Halaman (dari folder pages/)
    async function loadPage(page) {
        try {
            appContainer.innerHTML = '<p class="text-center">Loading content...</p>';
            const res = await fetch(`pages/${page}.html`);
            if (!res.ok) throw new Error('Page not found');
            const html = await res.text();
            
            // Masukkan HTML ke dalam main container
            appContainer.innerHTML = html;

            // --- LOGIKA PENYEBAB KALENDER TIDAK MUNCUL ---
            // Kita harus panggil initCalendar hanya jika halaman yang dimuat adalah 'schedule'
            // dan dipanggil SETELAH innerHTML diisi.
            if (page === 'schedule' || page === 'scheduler') { 
                // Gunakan setTimeout kecil untuk memastikan DOM sudah siap dirender browser
                setTimeout(() => {
                    initCalendar();
                    if ($('#datatable').length > 0) {
                        initDataTable();
                    }
                }, 100);
            }

            

        } catch (err) {
            console.error(err);
            appContainer.innerHTML = '<div class="alert alert-warning">Halaman tidak ditemukan atau gagal dimuat.</div>';
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

    // 4. Fungsi Render Navbar dan Logika Klik
    function renderNavbar(menus) {
        mainMenu.innerHTML = ''; 

        menus.forEach((item, index) => {
            const li = document.createElement('li');
            if (index === 0) li.classList.add('active'); 

            const a = document.createElement('a');
            a.href = "#";
            a.textContent = item.menu_name;
            a.dataset.page = item.html; 

            a.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelectorAll('#mainMenu li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                
                // Panggil loadPage berdasarkan data dari API (item.html)
                loadPage(item.html);
            });

            li.appendChild(a);
            mainMenu.appendChild(li);
        });

        if (menus.length > 0) {
            loadPage(menus[0].html);
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