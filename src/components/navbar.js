export function renderNavbar() {
  const currentPath = window.location.pathname || '/';

  const isActive = (path) => {
    const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');
    const normalizedCurrent = currentPath === '/' ? '/' : currentPath.replace(/\/$/, '');
    return normalizedPath === normalizedCurrent;
  };

  const navItems = [
    { path: '/', label: 'Home', icon: 'fa-home' },
    { path: '/dashboard', label: 'Overview', icon: 'fa-tachometer-alt' },
    { path: '/fuel', label: 'Fuel', icon: 'fa-gas-pump' },
    { path: '/mileage', label: 'Mileage', icon: 'fa-road' },
    { path: '/maintenance', label: 'Maintenance', icon: 'fa-wrench' },
  ];

  const navLinks = navItems.map(item => {
    const activeClass = isActive(item.path) ? 'active' : '';
    return `<li><a href="${item.path}" class="nav-link ${activeClass}" data-link="${item.path}"><i class="fas ${item.icon}"></i> ${item.label}</a></li>`;
  }).join('');

  return `
    <nav class="navbar">
      <div class="navbar-container">
        <a href="/" class="navbar-brand" data-link="/">SportageHQ</a>
        <ul class="navbar-menu">
          ${navLinks}
        </ul>
      </div>
    </nav>
  `;
}
