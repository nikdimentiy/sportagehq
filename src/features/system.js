import { state } from '../state.js';
import { toast, getPSTDate } from '../utils/helpers.js';
import { renderFuelTable } from './fuel.js';
import { processAndRenderMileage, resetMileageFilter } from './mileage.js';
import { renderMaintTable, updateMaintSummary } from './maintenance.js';
import { refreshOverview } from './overview.js';

const FUEL_KEY  = 'sportageSmoothRecords';
const MILE_KEY  = 'mileageData';
const MAINT_KEY = 'sportageMaintenanceData';

export function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

export function exportMaintJSON() {
    if (!state.maintRecords.length) { toast('No maintenance data'); return; }
    const payload = { version: 1, type: 'maintenance', exportDate: new Date().toISOString(), maintenance: state.maintRecords };
    downloadBlob(JSON.stringify(payload, null, 2), `sportage_maintenance_${getPSTDate()}.json`, 'application/json');
    toast('Maintenance data exported');
}

export function exportFullBackup() {
    const total = state.fuelRecords.length + state.mileageData.length + state.maintRecords.length;
    if (!total) { toast('No data to back up'); return; }
    const payload = {
        version: 2,
        type: 'full_backup',
        exportDate: new Date().toISOString(),
        exportedBy: window.currentUser?.email ?? 'unknown',
        summary: {
            fuelRecords:  state.fuelRecords.length,
            mileageRecords: state.mileageData.length,
            maintenanceRecords: state.maintRecords.length,
            totalRecords: total,
        },
        data: {
            fuel:        state.fuelRecords,
            mileage:     state.mileageData,
            maintenance: state.maintRecords,
        },
    };
    downloadBlob(JSON.stringify(payload, null, 2), `sportage_backup_${getPSTDate()}.json`, 'application/json');
    toast(`Backup saved — ${total} records`);
}

export async function purgeAllData() {
    if (confirm('⚠️ FULL SYSTEM PURGE\n\nDelete ALL fuel and mileage data?\nThis cannot be undone.')) {
        try {
            const fuelRes = await window.appwriteDB.listDocuments(window.DB_ID, window.FUEL_COL, [
                window.appwriteQuery.equal("userId", window.currentUser.$id)
            ]);
            for (const doc of fuelRes.documents) {
                await window.appwriteDB.deleteDocument(window.DB_ID, window.FUEL_COL, doc.$id);
            }
            await window.deleteMileageRecordsForUser();
            state.fuelRecords = []; state.mileageData = [];
            renderFuelTable();
            processAndRenderMileage([]);
            updateVaultCounts();
            toast('All data purged');
        } catch (err) {
            console.error("Error purging all data:", err);
            toast('Error: ' + (err.message || 'Failed to purge'));
        }
    }
}

export function updateVaultCounts() {
    const fuelEl = document.getElementById('vaultFuelCount');
    const mileEl = document.getElementById('vaultMileCount');
    if (fuelEl) fuelEl.textContent = state.fuelRecords.length;
    if (mileEl) mileEl.textContent = state.mileageData.length;
}

export function updateSystemCounts() {
    const pairs = [
        ['sysWipeFuelCount',  'backupFuelCount',  state.fuelRecords.length],
        ['sysWipeMileCount',  'backupMileCount',  state.mileageData.length],
        ['sysWipeMaintCount', 'backupMaintCount', state.maintRecords.length],
    ];
    pairs.forEach(([wipeId, backupId, val]) => {
        const w = document.getElementById(wipeId);
        const b = document.getElementById(backupId);
        if (w) w.textContent = val;
        if (b) b.textContent = val;
    });
}

export async function wipeAllData() {
    if (!window.currentUser) { toast('Not logged in'); return; }
    if (!confirm('⚠️ NUCLEAR WIPE\n\nPermanently delete ALL data from Appwrite cloud and local cache:\n\n• All fuel records\n• All mileage logs\n• All maintenance records\n\nThis CANNOT be undone.')) return;
    if (!confirm('Final confirmation — delete everything?')) return;

    const btn = document.getElementById('systemWipeBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp; Wiping...'; }

    try {
        let offset = 0;
        while (true) {
            const res = await window.appwriteDB.listDocuments(window.DB_ID, window.FUEL_COL, [
                window.appwriteQuery.equal('userId', window.currentUser.$id),
                window.appwriteQuery.limit(100),
                window.appwriteQuery.offset(offset)
            ]);
            if (!res.documents || !res.documents.length) break;
            for (const doc of res.documents) {
                await window.appwriteDB.deleteDocument(window.DB_ID, window.FUEL_COL, doc.$id);
            }
            if (res.documents.length < 100) break;
            offset += 100;
        }

        await window.deleteMileageRecordsForUser();
        await window.deleteMaintRecordsForUser();

        const uid = window.currentUser.$id;
        ['fuel_records_cache', 'mileage_records_cache', 'maintenance_records_cache']
            .forEach(k => { try { localStorage.removeItem(k + '_' + uid); } catch(e) {} });
        [FUEL_KEY, MILE_KEY, MAINT_KEY]
            .forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });

        state.fuelRecords = []; state.mileageData = []; state.maintRecords = [];
        renderFuelTable();
        processAndRenderMileage([]);
        renderMaintTable();
        updateMaintSummary();
        updateVaultCounts();
        updateSystemCounts();
        refreshOverview();
        document.getElementById('fuelReport').style.display = 'none';

        toast('All data wiped');
    } catch (err) {
        console.error('Wipe error:', err);
        toast('Error: ' + (err.message || 'Wipe failed'));
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-skull-crossbones"></i>&nbsp; Wipe All Data'; }
    }
}
