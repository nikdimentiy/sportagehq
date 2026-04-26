import { loadFuel } from '../services/fuel.js';
import { loadMileage } from '../services/mileage.js';
import { loadMaintenance } from '../services/maintenance.js';
import { wipeAllDataWithConfirmation } from '../services/data.js';
import { showToast } from '../components/toast.js';

export async function renderDataView() {
  try {
    if (!window.currentUser) {
      return buildLoginPrompt('DataVault');
    }

    // Expose wipe handler to window for onclick
    window.handleWipeAllData = async (userId) => {
      try {
        await wipeAllDataWithConfirmation(userId);
        // Reload the data view after successful wipe
        setTimeout(() => {
          const { render } = await import('../lib/router.js');
          render();
        }, 1500);
      } catch (error) {
        console.error('Wipe failed:', error);
      }
    };

    // Setup individual file upload handlers
    setTimeout(() => {
      setupIndividualUploads(window.currentUser.$id);
    }, 100);

    const fuel = await loadFuel(window.currentUser.$id);
    const mileage = await loadMileage(window.currentUser.$id);
    const maintenance = await loadMaintenance(window.currentUser.$id);

    return buildDataHTML(fuel, mileage, maintenance, window.currentUser.$id);
  } catch (error) {
    console.error('Data view error:', error);
    showToast('Failed to load data statistics', 'error');
    return buildErrorHTML('DataVault');
  }
}

function buildDataHTML(fuel, mileage, maintenance, userId) {
  const stats = {
    fuel: {
      count: fuel.length,
      totalSpent: fuel.reduce((s, r) => s + (r.totalCost || 0), 0),
      totalGallons: fuel.reduce((s, r) => s + (r.gallons || 0), 0),
    },
    mileage: {
      count: mileage.length,
    },
    maintenance: {
      count: maintenance.length,
      totalSpent: maintenance.reduce((s, r) => s + (r.cost || 0), 0),
    },
  };

  const totalRecords = stats.fuel.count + stats.mileage.count + stats.maintenance.count;

  const html = `
    <div style="padding: 20px;">
      <!-- Header -->
      <div style="margin-bottom: 28px;">
        <h1 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: var(--cyan); letter-spacing: 1px; margin-bottom: 6px;">
          DataVault
        </h1>
        <p style="font-size: 0.85rem; color: var(--text-2); font-family: var(--font-body);">
          Export, import, and manage your complete dataset
        </p>
      </div>

      <!-- Statistics -->
      <div class="summary-grid" style="margin-bottom: 24px;">
        <div class="summary-card">
          <h3>Total Records</h3>
          <div class="summary-big">${totalRecords}</div>
          <div class="summary-sub">across all types</div>
        </div>
        <div class="summary-card">
          <h3>Total Investment</h3>
          <div class="summary-big">$${(stats.fuel.totalSpent + stats.maintenance.totalSpent).toFixed(0)}</div>
          <div class="summary-sub">fuel + maintenance</div>
        </div>
        <div class="summary-card">
          <h3>Database Size</h3>
          <div class="summary-big">${formatBytes(estimateSize(fuel, mileage, maintenance))}</div>
          <div class="summary-sub">estimated</div>
        </div>
      </div>

      <!-- Detail Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px;">
        <div class="gauge cyan">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-gas-pump"></i> Fuel Records</div>
          <div class="gauge-val cyan">${stats.fuel.count}</div>
          <div class="gauge-unit">$${stats.fuel.totalSpent.toFixed(0)} spent</div>
        </div>
        <div class="gauge emerald">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-road"></i> Mileage Entries</div>
          <div class="gauge-val emerald">${stats.mileage.count}</div>
          <div class="gauge-unit">${stats.fuel.totalGallons.toFixed(1)} gal tracked</div>
        </div>
        <div class="gauge rose">
          <div class="glow"></div>
          <div class="gauge-label"><i class="fas fa-wrench"></i> Maintenance Records</div>
          <div class="gauge-val rose">${stats.maintenance.count}</div>
          <div class="gauge-unit">$${stats.maintenance.totalSpent.toFixed(0)} spent</div>
        </div>
      </div>

      <!-- Export/Import Section -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px;">
        <!-- Export Panel -->
        <div class="panel">
          <div class="panel-header">
            <i class="fas fa-download"></i> Export Data
          </div>
          <div class="panel-body">
            <p style="color: var(--text-2); margin-bottom: 12px; font-size: 0.85rem;">
              Download all your records as JSON. Keep this file safe as a backup.
            </p>
            <button onclick="window.exportAllJSON && window.exportAllJSON()" class="btn-primary" style="width: 100%;">
              <i class="fas fa-file-download"></i> Export as JSON
            </button>
            <p style="color: var(--text-3); font-size: 0.75rem; margin-top: 10px; text-align: center;">
              Includes fuel, mileage, and maintenance records
            </p>
          </div>
        </div>

      </div>

      <!-- Separate Upload Section -->
      <div style="margin-top: 24px; margin-bottom: 24px;">
        <h3 style="color: var(--cyan); font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; letter-spacing: 1px;">
          RESTORE INDIVIDUAL DATA
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
          <!-- FuelOS Upload -->
          <div class="panel" style="border-color: rgba(0,229,255,0.3); background: rgba(0,229,255,0.03);">
            <div class="panel-header" style="border-bottom-color: rgba(0,229,255,0.2);">
              <i class="fas fa-gas-pump" style="color: var(--cyan);"></i> FuelOS Upload
            </div>
            <div class="panel-body" style="text-align: center;">
              <input type="file" id="fuelJsonInput" accept=".json" style="display: none;">
              <button onclick="document.getElementById('fuelJsonInput').click()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.1)); border: 2px solid rgba(0,229,255,0.3); border-radius: 6px; color: var(--cyan); font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">
                <i class="fas fa-cloud-upload-alt"></i> Upload Fuel Records
              </button>
              <p style="color: var(--text-3); font-size: 0.75rem; margin-top: 8px;">Import fuel_records.json</p>
            </div>
          </div>

          <!-- MileageOS Upload -->
          <div class="panel" style="border-color: rgba(0,224,150,0.3); background: rgba(0,224,150,0.03);">
            <div class="panel-header" style="border-bottom-color: rgba(0,224,150,0.2);">
              <i class="fas fa-road" style="color: var(--emerald);"></i> MileageOS Upload
            </div>
            <div class="panel-body" style="text-align: center;">
              <input type="file" id="mileageJsonInput" accept=".json" style="display: none;">
              <button onclick="document.getElementById('mileageJsonInput').click()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, rgba(0,224,150,0.2), rgba(0,224,150,0.1)); border: 2px solid rgba(0,224,150,0.3); border-radius: 6px; color: var(--emerald); font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">
                <i class="fas fa-cloud-upload-alt"></i> Upload Mileage Records
              </button>
              <p style="color: var(--text-3); font-size: 0.75rem; margin-top: 8px;">Import mileage_records.json</p>
            </div>
          </div>

          <!-- Maintenance Upload -->
          <div class="panel" style="border-color: rgba(255,61,113,0.3); background: rgba(255,61,113,0.03);">
            <div class="panel-header" style="border-bottom-color: rgba(255,61,113,0.2);">
              <i class="fas fa-wrench" style="color: var(--rose);"></i> Maintenance Upload
            </div>
            <div class="panel-body" style="text-align: center;">
              <input type="file" id="maintJsonInput" accept=".json" style="display: none;">
              <button onclick="document.getElementById('maintJsonInput').click()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, rgba(255,61,113,0.2), rgba(255,61,113,0.1)); border: 2px solid rgba(255,61,113,0.3); border-radius: 6px; color: var(--rose); font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">
                <i class="fas fa-cloud-upload-alt"></i> Upload Maintenance Records
              </button>
              <p style="color: var(--text-3); font-size: 0.75rem; margin-top: 8px;">Import maintenance_records.json</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Import Panel -->
      <div class="panel">
        <div class="panel-header">
          <i class="fas fa-upload"></i> Import Combined Backup
        </div>
        <div class="panel-body">
          <p style="color: var(--text-2); margin-bottom: 12px; font-size: 0.85rem;">
            Restore all data from a complete backup file.
          </p>
          <input type="file" id="jsonImportInput" accept=".json" style="display: none;">
          <button onclick="document.getElementById('jsonImportInput').click()" class="btn-primary" style="width: 100%;">
            <i class="fas fa-file-upload"></i> Choose Backup File
          </button>
          <p style="color: var(--text-3); font-size: 0.75rem; margin-top: 10px; text-align: center;">
            Select a complete JSON backup to import
          </p>
        </div>
      </div>

      <!-- Data Info -->
      <div class="panel" style="margin-top: 24px;">
        <div class="panel-header">
          <i class="fas fa-info-circle"></i> Data Information
        </div>
        <div class="panel-body" style="font-size: 0.85rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <div style="color: var(--text-2); font-weight: 600; margin-bottom: 4px;">Fuel Summary</div>
              <div style="color: var(--text-3); font-size: 0.8rem;">
                <div>Total fills: ${stats.fuel.count}</div>
                <div>Total spent: $${stats.fuel.totalSpent.toFixed(2)}</div>
                <div>Total gallons: ${stats.fuel.totalGallons.toFixed(1)}</div>
              </div>
            </div>
            <div>
              <div style="color: var(--text-2); font-weight: 600; margin-bottom: 4px;">Maintenance Summary</div>
              <div style="color: var(--text-3); font-size: 0.8rem;">
                <div>Total services: ${stats.maintenance.count}</div>
                <div>Total spent: $${stats.maintenance.totalSpent.toFixed(2)}</div>
                <div>Average cost: $${stats.maintenance.count > 0 ? (stats.maintenance.totalSpent / stats.maintenance.count).toFixed(2) : '0.00'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="panel" style="margin-top: 24px; border-color: rgba(255,61,113,0.3); background: rgba(255,61,113,0.02);">
        <div class="panel-header" style="border-bottom-color: rgba(255,61,113,0.2);">
          <i class="fas fa-exclamation-circle" style="color: var(--rose);"></i> Danger Zone
        </div>
        <div class="panel-body">
          <div style="margin-bottom: 16px;">
            <h4 style="color: var(--rose); font-size: 0.9rem; font-weight: 600; margin-bottom: 6px;">
              <i class="fas fa-trash-alt"></i> Wipe All Data
            </h4>
            <p style="color: var(--text-3); font-size: 0.8rem; margin-bottom: 12px;">
              Permanently delete ALL records from the cloud and local storage. This action cannot be undone.
            </p>
            <button onclick="handleWipeAllData('${userId}')" class="btn-primary" style="width: 100%; background: linear-gradient(135deg, var(--rose), #d80028); box-shadow: 0 4px 18px rgba(255,61,113,0.2);">
              <i class="fas fa-exclamation-triangle"></i> Wipe All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return html;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function estimateSize(fuel, mileage, maintenance) {
  let size = 0;
  size += fuel.reduce((s, r) => s + JSON.stringify(r).length, 0);
  size += mileage.reduce((s, r) => s + JSON.stringify(r).length, 0);
  size += maintenance.reduce((s, r) => s + JSON.stringify(r).length, 0);
  return size;
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
            Please log in to access your data.
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
            Failed to load ${title}. Please refresh and try again.
          </p>
          <button onclick="location.reload()" class="btn-primary" style="width: 100%;">
            <i class="fas fa-sync"></i> Refresh
          </button>
        </div>
      </div>
    </div>
  `;
}

function setupIndividualUploads(userId) {
  const fuelInput = document.getElementById('fuelJsonInput');
  const mileageInput = document.getElementById('mileageJsonInput');
  const maintInput = document.getElementById('maintJsonInput');

  if (fuelInput) {
    fuelInput.addEventListener('change', (e) => handleIndividualUpload(e, 'fuel', userId));
  }
  if (mileageInput) {
    mileageInput.addEventListener('change', (e) => handleIndividualUpload(e, 'mileage', userId));
  }
  if (maintInput) {
    maintInput.addEventListener('change', (e) => handleIndividualUpload(e, 'maintenance', userId));
  }
}

async function handleIndividualUpload(event, type, userId) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      let imported = 0;

      // Import fuel records
      if (type === 'fuel' && data.fuel && Array.isArray(data.fuel)) {
        for (const rec of data.fuel) {
          try {
            if (window.createFuelRecord) {
              await window.createFuelRecord(rec);
              imported++;
            }
          } catch (err) {
            console.error('Error saving fuel record:', err);
          }
        }
      }

      // Import mileage records
      if (type === 'mileage' && (data.mileage && Array.isArray(data.mileage) || Array.isArray(data))) {
        const records = data.mileage || data;
        const mileRecords = records.map(r => ({
          dateTime: r.dateTime,
          currentMileage: r.currentMileage,
        }));
        for (const rec of mileRecords) {
          try {
            if (window.createMileageRecord) {
              await window.createMileageRecord(rec);
              imported++;
            }
          } catch (err) {
            console.error('Error saving mileage record:', err);
          }
        }
      }

      // Import maintenance records
      if (type === 'maintenance' && data.maintenance && Array.isArray(data.maintenance)) {
        for (const rec of data.maintenance) {
          try {
            if (window.createMaintRecord) {
              await window.createMaintRecord(rec);
              imported++;
            }
          } catch (err) {
            console.error('Error saving maintenance record:', err);
          }
        }
      }

      if (imported === 0) {
        showToast(`No ${type} records found in file`, 'warn');
      } else {
        showToast(`Successfully imported ${imported} ${type} records`, 'info');
      }

      // Reload the data view to show updated counts after a delay
      setTimeout(async () => {
        const { render } = await import('../lib/router.js');
        render();
      }, 800);
    } catch (err) {
      console.error('Error importing file:', err);
      showToast(`Failed to import ${type} data: ${err.message}`, 'error');
    }
    event.target.value = null;
  };
  reader.readAsText(file);
}
