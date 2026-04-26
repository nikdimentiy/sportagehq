import { databases, DB_ID, FUEL_COL, MILE_COL, MAINT_COL } from '../services/appwrite.js';
import { Query } from 'appwrite';
import { showToast } from '../components/toast.js';

export async function renderDashboard() {
  try {
    const data = await fetchDashboardData();
    return buildDashboardHTML(data);
  } catch (error) {
    console.error('Dashboard error:', error);
    showToast('Failed to load dashboard data', 'error');
    return buildErrorHTML();
  }
}

async function fetchDashboardData() {
  if (!window.currentUser) {
    return { fuel: [], mileage: [], maintenance: [] };
  }

  try {
    const [fuelRes, mileRes, maintRes] = await Promise.all([
      databases.listDocuments(DB_ID, FUEL_COL, [
        Query.equal("userId", window.currentUser.$id),
        Query.orderDesc("date"),
        Query.limit(100)
      ]),
      databases.listDocuments(DB_ID, MILE_COL, [
        Query.equal("userId", window.currentUser.$id),
        Query.orderDesc("dateTime"),
        Query.limit(100)
      ]),
      databases.listDocuments(DB_ID, MAINT_COL, [
        Query.equal("userId", window.currentUser.$id),
        Query.orderDesc("date"),
        Query.limit(100)
      ])
    ]);

    return {
      fuel: fuelRes.documents || [],
      mileage: mileRes.documents || [],
      maintenance: maintRes.documents || []
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

function buildDashboardHTML(data) {
  const fuelCount = data.fuel.length;
  const mileCount = data.mileage.length;
  const maintCount = data.maintenance.length;

  const totalSpend = data.fuel.reduce((s, r) => s + (r.totalCost || 0), 0);
  const totalGallons = data.fuel.reduce((s, r) => s + (r.gallons || 0), 0);
  const avgMpg = fuelCount > 0
    ? (data.fuel.filter(r => r.mpg > 0).reduce((s, r) => s + r.mpg, 0) /
       Math.max(1, data.fuel.filter(r => r.mpg > 0).length)).toFixed(1)
    : '--';

  const lastOdo = mileCount > 0 ? data.mileage[0]?.currentMileage?.toLocaleString() : '0';
  const totalMiles = calculateTotalMiles(data.mileage);
  const totalMaintCost = data.maintenance.reduce((s, r) => s + (r.cost || 0), 0);

  const html = `
    <div style="padding: 20px;">
      <!-- Header -->
      <div style="margin-bottom: 28px;">
        <h1 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: var(--cyan); letter-spacing: 1px; margin-bottom: 6px;">
          Command Dashboard
        </h1>
        <p style="font-size: 0.85rem; color: var(--text-2); font-family: var(--font-body);">
          Real-time overview of your Sportage tracking data
        </p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid" style="margin-bottom: 24px;">
        <div class="summary-card">
          <h3>Total Fuel Stops</h3>
          <div class="summary-big">${fuelCount}</div>
          <div class="summary-sub">$${totalSpend.toFixed(2)} spent</div>
        </div>
        <div class="summary-card">
          <h3>Mileage Entries</h3>
          <div class="summary-big">${mileCount}</div>
          <div class="summary-sub">${totalMiles?.toLocaleString() || '0'} mi tracked</div>
        </div>
        <div class="summary-card">
          <h3>Maintenance Records</h3>
          <div class="summary-big">${maintCount}</div>
          <div class="summary-sub">$${totalMaintCost.toFixed(2)} spent</div>
        </div>
      </div>

      <!-- Key Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px;">
        <div class="gauge cyan">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-tachometer-alt"></i> Current ODO</div>
          <div class="gauge-val cyan">${lastOdo}</div>
          <div class="gauge-unit">miles</div>
        </div>
        <div class="gauge emerald">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-gas-pump"></i> Avg MPG</div>
          <div class="gauge-val emerald">${avgMpg}</div>
          <div class="gauge-unit">mpg</div>
        </div>
        <div class="gauge amber">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-dollar-sign"></i> Avg Gallons</div>
          <div class="gauge-val amber">${(totalGallons / Math.max(1, fuelCount)).toFixed(1)}</div>
          <div class="gauge-unit">gal/fill</div>
        </div>
        <div class="gauge rose">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-wrench"></i> Maint Avg</div>
          <div class="gauge-val rose">$${(totalMaintCost / Math.max(1, maintCount)).toFixed(0)}</div>
          <div class="gauge-unit">per service</div>
        </div>
      </div>

      <!-- Recent Records -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px;">
        ${buildRecentFuelPanel(data.fuel)}
        ${buildRecentMileagePanel(data.mileage)}
        ${buildRecentMaintenancePanel(data.maintenance)}
      </div>
    </div>
  `;

  return html;
}

function buildRecentFuelPanel(fuel) {
  const recent = fuel.slice(0, 3);
  const html = `
    <div class="panel">
      <div class="panel-header">
        <i class="fas fa-gas-pump"></i> Recent Fuel Stops
      </div>
      <div class="panel-body" style="font-size: 0.8rem;">
        ${recent.length === 0
          ? '<p style="color: var(--text-2); text-align: center;">No fuel records yet</p>'
          : recent.map(r => `
              <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="color: var(--cyan); font-weight: 600;">${r.date || '—'}</div>
                  <div style="color: var(--text-3); font-size: 0.75rem;">${r.station || 'Unknown'} • ${r.gallons?.toFixed(2) || '—'} gal</div>
                </div>
                <div style="text-align: right;">
                  <div style="color: var(--text-1); font-weight: 600;">$${r.totalCost?.toFixed(2) || '—'}</div>
                  <div style="color: var(--text-2); font-size: 0.7rem;">${r.mpg?.toFixed(1) || '—'} mpg</div>
                </div>
              </div>
            `).join('')
        }
      </div>
    </div>
  `;
  return html;
}

function buildRecentMileagePanel(mileage) {
  const recent = mileage.slice(0, 3);
  const html = `
    <div class="panel">
      <div class="panel-header">
        <i class="fas fa-road"></i> Recent Trips
      </div>
      <div class="panel-body" style="font-size: 0.8rem;">
        ${recent.length === 0
          ? '<p style="color: var(--text-2); text-align: center;">No mileage entries yet</p>'
          : recent.map(r => {
              const dt = new Date(r.dateTime);
              const fmt = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              return `
                <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="color: var(--cyan); font-weight: 600;">${fmt}</div>
                    <div style="color: var(--text-3); font-size: 0.75rem;">Odometer: ${r.currentMileage?.toLocaleString() || '—'} mi</div>
                  </div>
                  <div style="text-align: right; color: var(--emerald); font-weight: 600;">
                    ${r.mileageDifference?.toLocaleString() || '?'} mi
                  </div>
                </div>
              `;
            }).join('')
        }
      </div>
    </div>
  `;
  return html;
}

function buildRecentMaintenancePanel(maintenance) {
  const recent = maintenance.slice(0, 3);
  const html = `
    <div class="panel">
      <div class="panel-header">
        <i class="fas fa-wrench"></i> Recent Services
      </div>
      <div class="panel-body" style="font-size: 0.8rem;">
        ${recent.length === 0
          ? '<p style="color: var(--text-2); text-align: center;">No maintenance records yet</p>'
          : recent.map(r => `
              <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                <div style="color: var(--cyan); font-weight: 600;">${r.date || '—'}</div>
                <div style="color: var(--text-1); margin-top: 3px;">${r.type || 'Service'}</div>
                <div style="color: var(--text-3); font-size: 0.7rem; margin-top: 2px;">
                  ${r.shop ? r.shop + ' • ' : ''}${r.cost ? '$' + r.cost.toFixed(2) : 'No cost recorded'}
                </div>
              </div>
            `).join('')
        }
      </div>
    </div>
  `;
  return html;
}

function calculateTotalMiles(mileage) {
  if (mileage.length === 0) return 0;
  const sorted = [...mileage].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  if (sorted.length === 0) return 0;
  const latest = sorted[sorted.length - 1];
  return latest.currentMileage || 0;
}

function buildErrorHTML() {
  return `
    <div style="padding: 20px; text-align: center;">
      <div class="panel" style="max-width: 400px; margin: 0 auto;">
        <div class="panel-header">
          <i class="fas fa-exclamation-triangle"></i> Load Error
        </div>
        <div class="panel-body">
          <p style="color: var(--text-2); margin-bottom: 14px;">
            Failed to load dashboard data. Please refresh the page or check your connection.
          </p>
          <button onclick="location.reload()" class="btn-primary" style="width: 100%;">
            <i class="fas fa-sync"></i> Refresh
          </button>
        </div>
      </div>
    </div>
  `;
}
