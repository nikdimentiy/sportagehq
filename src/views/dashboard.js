import { databases } from '../services/appwrite.js';
import { handleError } from '../lib/utils.js';

export async function renderDashboard() {
  let content = '<div class="container"><h1>Dashboard</h1><p>Loading data...</p></div>';

  try {
    // Example: fetch data from AppWrite
    // const response = await databases.listDocuments('db_id', 'collection_id');
    // content = buildDashboardHTML(response.documents);
    content = `
      <div class="container">
        <h1>Dashboard</h1>
        <p>Connect your AppWrite database to see data here.</p>
        <div class="card">
          <h2>Getting Started</h2>
          <p>Update <code>renderDashboard()</code> with your database ID and collection ID.</p>
        </div>
      </div>
    `;
  } catch (error) {
    handleError(error);
  }

  return content;
}

function buildDashboardHTML(documents) {
  const items = documents.map(doc => `
    <div class="card">
      <h3>${doc.title || 'Untitled'}</h3>
      <p>${doc.description || ''}</p>
    </div>
  `).join('');

  return `
    <div class="container">
      <h1>Dashboard</h1>
      <div class="grid">
        ${items}
      </div>
    </div>
  `;
}
