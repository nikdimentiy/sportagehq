import { loadMaintenance } from '../services/maintenance.js';
import { showToast } from '../components/toast.js';

export async function renderMaintenanceView() {
  try {
    if (!window.currentUser) {
      return buildLoginPrompt('Maintenance');
    }

    const data = await loadMaintenance(window.currentUser.$id);
    return buildMaintenanceHTML(data);
  } catch (error) {
    console.error('Maintenance view error:', error);
    showToast('Failed to load maintenance data', 'error');
    return buildErrorHTML('Maintenance');
  }
}

function buildMaintenanceHTML(maintenance) {
  const totalCost = maintenance.reduce((s, r) => s + (r.cost || 0), 0);
  const avgCost = maintenance.length > 0 ? (totalCost / maintenance.length).toFixed(0) : 0;

  // Group by type
  const typeMap = {};
  maintenance.forEach(r => {
    const type = r.type || 'Other';
    if (!typeMap[type]) typeMap[type] = [];
    typeMap[type].push(r);
  });

  const html = `
    <div style="padding: 20px;">
      <!-- Header -->
      <div style="margin-bottom: 28px;">
        <h1 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: var(--cyan); letter-spacing: 1px; margin-bottom: 6px;">
          Maintenance
        </h1>
        <p style="font-size: 0.85rem; color: var(--text-2); font-family: var(--font-body);">
          Complete service and maintenance tracking
        </p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid" style="margin-bottom: 24px;">
        <div class="summary-card">
          <h3>Total Services</h3>
          <div class="summary-big">${maintenance.length}</div>
          <div class="summary-sub">completed</div>
        </div>
        <div class="summary-card">
          <h3>Total Spent</h3>
          <div class="summary-big">$${totalCost.toFixed(0)}</div>
          <div class="summary-sub">all maintenance</div>
        </div>
        <div class="summary-card">
          <h3>Average Cost</h3>
          <div class="summary-big">$${avgCost}</div>
          <div class="summary-sub">per service</div>
        </div>
      </div>

      <!-- Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px;">
        <div class="gauge rose">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-wrench"></i> Service Types</div>
          <div class="gauge-val rose">${Object.keys(typeMap).length}</div>
          <div class="gauge-unit">categories</div>
        </div>
      </div>

      <!-- Records Table -->
      <div class="panel">
        <div class="panel-header">
          <i class="fas fa-list"></i> All Maintenance Records (${maintenance.length})
        </div>
        <div class="panel-body">
          ${maintenance.length === 0
            ? '<p style="color: var(--text-2); text-align: center; padding: 20px;">No maintenance records yet</p>'
            : buildMaintenanceTable(maintenance)
          }
        </div>
      </div>
    </div>
  `;

  return html;
}

function buildMaintenanceTable(maintenance) {
  const sorted = [...maintenance].sort((a, b) => new Date(b.date) - new Date(a.date));

  const rows = sorted.map((r, i) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--cyan);">${i + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">${r.date || '—'}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">${r.type || 'Service'}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">${r.shop || '—'}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right; color: var(--rose);">$${r.cost?.toFixed(2) || '0.00'}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--text-3); font-size: 0.8rem;">${r.notes ? r.notes.substring(0, 30) + (r.notes.length > 30 ? '...' : '') : '—'}</td>
    </tr>
  `).join('');

  return `
    <table style="width: 100%; font-size: 0.85rem;">
      <thead>
        <tr style="border-bottom: 2px solid rgba(255,255,255,0.1);">
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">#</th>
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">Date</th>
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">Type</th>
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">Shop</th>
          <th style="padding: 8px; text-align: right; color: var(--text-2); font-weight: 600;">Cost</th>
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function buildLoginPrompt(title) {
  return `
    <div style="padding: 20px; text-align: center;">
      <div class="panel" style="max-width: 400px; margin: 0 auto;">
        <div class="panel-header">
          <i class="fas fa-lock"></i> ${title}
        </div>
        <div class="panel-body">
          <p style="color: var(--text-2); margin-bottom: 14px;">
            Please log in to view your maintenance records.
          </p>
          <button onclick="window.showUI()" class="btn-primary" style="width: 100%;">
            <i class="fas fa-sign-in-alt"></i> Log In
          </button>
        </div>
      </div>
    </div>
  `;
}

function buildErrorHTML(title) {
  return `
    <div style="padding: 20px; text-align: center;">
      <div class="panel" style="max-width: 400px; margin: 0 auto;">
        <div class="panel-header">
          <i class="fas fa-exclamation-triangle"></i> Load Error
        </div>
        <div class="panel-body">
          <p style="color: var(--text-2); margin-bottom: 14px;">
            Failed to load ${title} data. Please refresh and try again.
          </p>
          <button onclick="location.reload()" class="btn-primary" style="width: 100%;">
            <i class="fas fa-sync"></i> Refresh
          </button>
        </div>
      </div>
    </div>
  `;
}
