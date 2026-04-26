import { loadFuel } from '../services/fuel.js';
import { showToast } from '../components/toast.js';

export async function renderFuelView() {
  try {
    if (!window.currentUser) {
      return buildLoginPrompt('FuelOS');
    }

    const data = await loadFuel(window.currentUser.$id);
    return buildFuelHTML(data);
  } catch (error) {
    console.error('Fuel view error:', error);
    showToast('Failed to load fuel data', 'error');
    return buildErrorHTML('FuelOS');
  }
}

function buildFuelHTML(fuel) {
  const totalSpend = fuel.reduce((s, r) => s + (r.totalCost || 0), 0);
  const totalGallons = fuel.reduce((s, r) => s + (r.gallons || 0), 0);
  const avgMpg = fuel.length > 0
    ? (fuel.filter(r => r.mpg > 0).reduce((s, r) => s + r.mpg, 0) /
       Math.max(1, fuel.filter(r => r.mpg > 0).length)).toFixed(1)
    : '--';
  const avgCostPerGallon = totalGallons > 0
    ? (totalSpend / totalGallons).toFixed(2)
    : '0.00';

  const html = `
    <div style="padding: 20px;">
      <!-- Header -->
      <div style="margin-bottom: 28px;">
        <h1 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: var(--cyan); letter-spacing: 1px; margin-bottom: 6px;">
          FuelOS
        </h1>
        <p style="font-size: 0.85rem; color: var(--text-2); font-family: var(--font-body);">
          Complete fuel tracking overview
        </p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid" style="margin-bottom: 24px;">
        <div class="summary-card">
          <h3>Total Fills</h3>
          <div class="summary-big">${fuel.length}</div>
          <div class="summary-sub">$${totalSpend.toFixed(2)} total</div>
        </div>
        <div class="summary-card">
          <h3>Avg MPG</h3>
          <div class="summary-big">${avgMpg}</div>
          <div class="summary-sub">across all fills</div>
        </div>
        <div class="summary-card">
          <h3>Total Gallons</h3>
          <div class="summary-big">${totalGallons.toFixed(1)}</div>
          <div class="summary-sub">$${avgCostPerGallon}/gal avg</div>
        </div>
      </div>

      <!-- Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px;">
        <div class="gauge cyan">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-gas-pump"></i> Cost/Gallon</div>
          <div class="gauge-val cyan">$${avgCostPerGallon}</div>
          <div class="gauge-unit">average</div>
        </div>
        <div class="gauge emerald">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-chart-line"></i> Total Spent</div>
          <div class="gauge-val emerald">$${totalSpend.toFixed(0)}</div>
          <div class="gauge-unit">all time</div>
        </div>
      </div>

      <!-- Export -->
      <div style="margin-bottom: 24px;">
        <button onclick="window.exportFuelJSON && window.exportFuelJSON()" style="padding: 10px 16px; background: rgba(0,229,255,0.15); border: 1px solid rgba(0,229,255,0.3); border-radius: 4px; color: var(--cyan); cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s;">
          <i class="fas fa-download"></i> Export as JSON
        </button>
      </div>

      <!-- Records Table -->
      <div class="panel">
        <div class="panel-header">
          <i class="fas fa-list"></i> All Fuel Records (${fuel.length})
        </div>
        <div class="panel-body">
          ${fuel.length === 0
            ? '<p style="color: var(--text-2); text-align: center; padding: 20px;">No fuel records yet</p>'
            : buildFuelTable(fuel)
          }
        </div>
      </div>
    </div>
  `;

  return html;
}

function buildFuelTable(fuel) {
  const rows = fuel.map((r, i) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--cyan);">${i + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">${r.date || '—'}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">${r.station || 'Unknown'}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${r.gallons?.toFixed(2) || '—'} gal</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right; color: var(--emerald);">$${r.totalCost?.toFixed(2) || '—'}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${r.mpg?.toFixed(1) || '—'} mpg</td>
    </tr>
  `).join('');

  return `
    <table style="width: 100%; font-size: 0.85rem;">
      <thead>
        <tr style="border-bottom: 2px solid rgba(255,255,255,0.1);">
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">#</th>
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">Date</th>
          <th style="padding: 8px; text-align: left; color: var(--text-2); font-weight: 600;">Station</th>
          <th style="padding: 8px; text-align: right; color: var(--text-2); font-weight: 600;">Gallons</th>
          <th style="padding: 8px; text-align: right; color: var(--text-2); font-weight: 600;">Cost</th>
          <th style="padding: 8px; text-align: right; color: var(--text-2); font-weight: 600;">MPG</th>
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
            Please log in to view your fuel records.
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
