const app = document.getElementById('app');
const links = document.querySelectorAll('nav a');

async function loadPage(page) {
  try {
    app.innerHTML = '<p>Loading...</p>';
    const res = await fetch(`pages/${page}.html`);
    if (!res.ok) throw new Error('Page not found');
    const html = await res.text();
    app.innerHTML = html;
  } catch (err) {
    app.innerHTML = '<p>Halaman tidak ditemukan</p>';
  }
}

// Klik menu
links.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    loadPage(page);
  });
});

// Load default page
loadPage('dashboard');
