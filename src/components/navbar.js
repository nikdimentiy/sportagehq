export function renderNavbar() {
  return `
    <nav class="navbar">
      <div class="navbar-container">
        <a href="/" class="navbar-brand" data-link="/">MyApp</a>
        <ul class="navbar-menu">
          <li><a href="/" class="nav-link" data-link="/">Home</a></li>
          <li><a href="/dashboard" class="nav-link" data-link="/dashboard">Dashboard</a></li>
        </ul>
      </div>
    </nav>
  `;
}
