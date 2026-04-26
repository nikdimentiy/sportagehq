import { renderHome } from '../views/home.js';
import { renderDashboard } from '../views/dashboard.js';
import { renderNavbar } from '../components/navbar.js';

const routes = {
  '/': renderHome,
  '/dashboard': renderDashboard,
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
