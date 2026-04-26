export async function renderHome() {
  return `
    <div class="container">
      <section class="hero">
        <h1>Welcome to My App</h1>
        <p>A simple, fast single-page application.</p>
        <a href="/dashboard" class="btn btn-primary" data-link="/dashboard">Get Started</a>
      </section>
    </div>
  `;
}
