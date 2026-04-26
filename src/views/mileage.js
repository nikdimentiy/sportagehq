import { loadMileage } from '../services/mileage.js';
import { showToast } from '../components/toast.js';

export async function renderMileageView() {
  try {
    if (!window.currentUser) {
      return buildLoginPrompt('MileageOS');
    }

    const data = await loadMileage(window.currentUser.$id);
    return buildMileageHTML(data);
  } catch (error) {
    console.error('Mileage view error:', error);
    showToast('Failed to load mileage data', 'error');
    return buildErrorHTML('MileageOS');
  }
}

function buildMileageHTML(mileage) {
  const sorted = [...mileage].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  const currentOdo = sorted.length > 0 ? sorted[sorted.length - 1].currentMileage : 0;
  const startOdo = sorted.length > 0 ? sorted[0].currentMileage : 0;
  const totalMiles = Math.max(0, currentOdo - startOdo);

  let avgMilesPerTrip = 0;
  if (mileage.length > 0) {
    const totalTrips = mileage.reduce((sum, r) => sum + (r.mileageDifference || 0), 0);
    avgMilesPerTrip = (totalTrips / mileage.length).toFixed(1);
  }

  const html = `
    <div style="padding: 20px;">
      <!-- Header -->
      <div style="margin-bottom: 28px;">
        <h1 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: var(--cyan); letter-spacing: 1px; margin-bottom: 6px;">
          MileageOS
        </h1>
        <p style="font-size: 0.85rem; color: var(--text-2); font-family: var(--font-body);">
          Complete mileage tracking overview
        </p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid" style="margin-bottom: 24px;">
        <div class="summary-card">
          <h3>Total Entries</h3>
          <div class="summary-big">${mileage.length}</div>
          <div class="summary-sub">miles logged</div>
        </div>
        <div class="summary-card">
          <h3>Current Odometer</h3>
          <div class="summary-big">${currentOdo.toLocaleString()}</div>
          <div class="summary-sub">miles</div>
        </div>
        <div class="summary-card">
          <h3>Avg Trip Distance</h3>
          <div class="summary-big">${avgMilesPerTrip}</div>
          <div class="summary-sub">miles per entry</div>
        </div>
      </div>

      <!-- Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px;">
        <div class="gauge cyan">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-tachometer-alt"></i> Starting Odo</div>
          <div class="gauge-val cyan">${startOdo.toLocaleString()}</div>
          <div class="gauge-unit">miles</div>
        </div>
        <div class="gauge emerald">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-road"></i> Total Tracked</div>
          <div class="gauge-val emerald">${totalMiles.toLocaleString()}</div>
          <div class="gauge-unit">miles</div>
        </div>
      </div>

      <!-- Export -->
      <div style="margin-bottom: 24px;">
        <button onclick="window.exportMileageJSON && window.exportMileageJSON()" style="padding: 10px 16px; background: rgba(0,224,150,0.15); border: 1px solid rgba(0,224,150,0.3); border-radius: 4px; color: var(--emerald); cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s;">
          <i class="fas fa-download"></i> Export as JSON
        </button>
      </div>

      <!-- Records Table -->
      <div class="panel">
        <div class="panel-header">
          <i class="fas fa-list"></i> All Mileage Records (${mileage.length})
        </div>
        <div class="panel-body">
          ${mileage.length === 0
            ? '<p style="color: var(--text-2); text-align: center; padding: 20px;">No mileage records yet</p>'
            : buildMileageTable(mileage)
          }
        </div>
      </div>
    </div>
  `;

  return html;
}

function buildMileageTable(mileage) {
  const sorted = [...mileage].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

  const rows = sorted.map((r, i) => {
    const dt = new Date(r.dateTime);
    const fmt = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--cyan);">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">${fmt}</td>
        <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${r.currentMileage?.toLocaleString() || '—'}</td>
        <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right; color: var(--emerald);">${r.mileageDifference?.toLocaleString() || '0'}</td>
        <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">${r.location || '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <table style="width: 100%; font-size: 0.85rem;">
      <thead>
        <tr style="border-bottom: 2px solid rgba(255,255,255,0.1);">
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">#</th>
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">Date/Time</th>
          <th style="padding: 8px; text-align: right; color: var(--text-2); font-weight: 600;">Odometer</th>
          <th style="padding: 8px; text-align: right; color: var(--text-2); font-weight: 600;">Distance</th>
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">Location</th>
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
            Please log in to view your mileage records.
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
