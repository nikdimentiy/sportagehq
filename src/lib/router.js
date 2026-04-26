import { renderNavbar } from '../components/navbar.js';

const routes = {
  '/': () => import('../views/home.js').then(m => m.renderHome()),
  '/dashboard': () => import('../views/dashboard.js').then(m => m.renderDashboard()),
  '/fuel': () => import('../views/fuel.js').then(m => m.renderFuelView()),
  '/mileage': () => import('../views/mileage.js').then(m => m.renderMileageView()),
  '/maintenance': () => import('../views/maintenance.js').then(m => m.renderMaintenanceView()),
  '/data': () => import('../views/data.js').then(m => m.renderDataView()),
};

export function navigate(path) {
  window.history.pushState({}, '', path);
  render();
}

export async function render() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const view = routes[path];

  const app = document.getElementById('app');

  if (!view) {
    app.innerHTML = '<h1>404 - Page Not Found</h1>';
    return;
  }

  const navbar = renderNavbar();
  const content = await view();

  app.innerHTML = navbar + content;
  attachEventListeners();
}

function attachEventListeners() {
  // Attach click handlers to nav links
  document.querySelectorAll('[data-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.link);
    });
  });
}
