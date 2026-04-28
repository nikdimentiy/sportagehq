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

function calcWMADailyRate(mileageData, windowDays) {
    if (mileageData.length < 2) return 0;
    const sorted = [...mileageData].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);
    cutoff.setHours(0, 0, 0, 0);

    // Sum miles per calendar day from consecutive odometer diffs
    const dailyMiles = {};
    for (let i = 1; i < sorted.length; i++) {
        const diff = Math.max(0, sorted[i].currentMileage - sorted[i - 1].currentMileage);
        const d = new Date(sorted[i].dateTime);
        if (d < cutoff) continue;
        const key = d.toISOString().slice(0, 10);
        dailyMiles[key] = (dailyMiles[key] || 0) + diff;
    }

    // Build per-calendar-day array (0 for days with no driving)
    const days = [];
    const cur = new Date(cutoff);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    while (cur <= today) {
        days.push(dailyMiles[cur.toISOString().slice(0, 10)] || 0);
        cur.setDate(cur.getDate() + 1);
    }
    if (!days.length) return 0;

    // WMA: weight = index+1 (oldest=1, newest=n)
    let wSum = 0, wMiles = 0;
    days.forEach((m, i) => { const w = i + 1; wMiles += w * m; wSum += w; });
    return wSum > 0 ? wMiles / wSum : 0;
}

export function updateSmartAlerts() {
    const el = document.getElementById('smartAlertsBody');
    if (!el) return;

    const data = state.mileageData;
    const INTERVAL = 8000;

    if (!data || data.length < 2) {
        el.innerHTML = `<div style="text-align:center;padding:18px 12px;color:var(--text-3);">
            <i class="fas fa-database" style="font-size:1.2rem;margin-bottom:8px;display:block;opacity:0.5;"></i>
            <span style="font-size:0.7rem;letter-spacing:1px;text-transform:uppercase;">Need more mileage data</span>
        </div>`;
        return;
    }

    const sorted = [...data].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    const currentOdo = sorted[sorted.length - 1].currentMileage;

    const nextMilestone = Math.ceil((currentOdo + 1) / INTERVAL) * INTERVAL;
    const milesRemaining = nextMilestone - currentOdo;

    // Try 60-day WMA first, fall back to 30-day
    let rate = calcWMADailyRate(data, 60);
    let windowUsed = 60;
    if (rate < 0.1) { rate = calcWMADailyRate(data, 30); windowUsed = 30; }

    if (rate < 0.1) {
        el.innerHTML = `<div style="text-align:center;padding:18px 12px;color:var(--text-3);">
            <i class="fas fa-exclamation-triangle" style="font-size:1.2rem;margin-bottom:8px;display:block;"></i>
            <span style="font-size:0.7rem;letter-spacing:1px;text-transform:uppercase;">Insufficient recent data</span>
        </div>`;
        return;
    }

    const daysUntil = Math.round(milesRemaining / rate);
    const predicted = new Date();
    predicted.setDate(predicted.getDate() + daysUntil);
    const dateStr = predicted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let urgColor = 'var(--emerald)', urgLabel = 'On Track';
    if (daysUntil < 14) { urgColor = 'var(--rose)'; urgLabel = 'Soon!'; }
    else if (daysUntil < 30) { urgColor = 'var(--amber)'; urgLabel = 'Upcoming'; }

    el.innerHTML = `
        <div style="margin-bottom:12px;">
            <div style="font-size:0.6rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-3);margin-bottom:4px;">Next Maintenance at ${nextMilestone.toLocaleString()} mi</div>
            <div style="font-size:1.35rem;font-weight:700;color:${urgColor};font-family:'JetBrains Mono',monospace;line-height:1.2;">${dateStr}</div>
            <div style="font-size:0.72rem;color:var(--text-2);margin-top:3px;">in ~${daysUntil} days &nbsp;<span style="color:${urgColor};font-weight:600;">${urgLabel}</span></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <div class="chip"><div class="chip-label">Miles Left</div><div class="chip-val">${milesRemaining.toLocaleString()} mi</div></div>
            <div class="chip"><div class="chip-label">Current Odo</div><div class="chip-val">${currentOdo.toLocaleString()} mi</div></div>
            <div class="chip"><div class="chip-label">WMA Rate</div><div class="chip-val">${rate.toFixed(1)} mi/day</div></div>
            <div class="chip"><div class="chip-label">Window</div><div class="chip-val">Last ${windowUsed}d</div></div>
        </div>`;
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

// ── ISO week helpers ──────────────────────────────────────────────────────────

function isoWeekKey(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
    return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function isoWeekLabel(wkStr) {
    const [yr, wn] = wkStr.split('-W');
    const jan4 = new Date(Date.UTC(+yr, 0, 4));
    const mon = new Date(jan4);
    mon.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (+wn - 1) * 7);
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return `${fmt(mon)} – ${fmt(sun)}`;
}

// ── Cost Analytics ────────────────────────────────────────────────────────────

export function refreshCostAnalytics() {
    const el = id => document.getElementById(id);
    if (!el('caCostPerDay')) return;

    const records = state.fuelRecords;
    const noData = '<span style="color:var(--text-3);font-size:0.8rem;">No data yet</span>';

    if (!records.length) {
        ['caCostPerDay', 'caCostPerMile', 'caVolWeightedPrice', 'caFuelPriceTrend']
            .forEach(id => { const e = el(id); if (e) e.textContent = '—'; });
        if (el('caWeeklyTable')) el('caWeeklyTable').innerHTML = noData;
        if (el('caMonthlyTable')) el('caMonthlyTable').innerHTML = noData;
        return;
    }

    const totalSpend = records.reduce((s, r) => s + (r.totalCost || 0), 0);
    const totalGallons = records.reduce((s, r) => s + (r.gallons || 0), 0);
    const totalMiles = records.reduce((s, r) => s + (r.milesDriven || 0), 0);

    // Avg cost per unique trip day
    const uniqueDays = new Set(records.map(r => r.date).filter(Boolean));
    el('caCostPerDay').textContent = uniqueDays.size > 0
        ? '$' + (totalSpend / uniqueDays.size).toFixed(2) : '—';

    // Cost per mile (volume-weighted across all records)
    el('caCostPerMile').textContent = totalMiles > 0
        ? '$' + (totalSpend / totalMiles).toFixed(3) : '—';

    // Real average price per gallon (volume-weighted — accounts for fill size)
    el('caVolWeightedPrice').textContent = totalGallons > 0
        ? '$' + (totalSpend / totalGallons).toFixed(3) : '—';

    // Fuel price trend: earliest N fills vs latest N fills
    const sorted = [...records].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const priced = sorted.filter(r => r.pricePerGallon > 0);
    if (priced.length >= 2) {
        const n = Math.min(5, Math.floor(priced.length / 2));
        const earlyAvg = priced.slice(0, n).reduce((s, r) => s + r.pricePerGallon, 0) / n;
        const recentAvg = priced.slice(-n).reduce((s, r) => s + r.pricePerGallon, 0) / n;
        const delta = recentAvg - earlyAvg;
        const pct = (delta / earlyAvg * 100).toFixed(1);
        const sign = delta >= 0 ? '+' : '';
        const color = delta > 0 ? 'var(--rose)' : 'var(--emerald)';
        el('caFuelPriceTrend').innerHTML =
            `<span style="color:${color}">${sign}${pct}%</span>`;
    } else {
        el('caFuelPriceTrend').textContent = '—';
    }

    // Weekly fuel spend (last 12 weeks)
    const weeks = {};
    records.forEach(r => {
        if (r.date && r.totalCost) {
            const wk = isoWeekKey(r.date);
            weeks[wk] = (weeks[wk] || 0) + r.totalCost;
        }
    });
    const wkKeys = Object.keys(weeks).sort().reverse().slice(0, 12);
    el('caWeeklyTable').innerHTML = wkKeys.length
        ? wkKeys.map(w =>
            `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.82rem">
                <span style="color:var(--text-2)">${isoWeekLabel(w)}</span>
                <span style="color:var(--cyan);font-weight:600">$${weeks[w].toFixed(2)}</span>
            </div>`).join('')
        : noData;

    // Monthly fuel spend (all months)
    const months = {};
    records.forEach(r => {
        if (r.date && r.totalCost) {
            const m = r.date.substring(0, 7);
            months[m] = (months[m] || 0) + r.totalCost;
        }
    });
    const mKeys = Object.keys(months).sort().reverse();
    el('caMonthlyTable').innerHTML = mKeys.length
        ? mKeys.map(m => {
            const [y, mo] = m.split('-');
            const mn = new Date(parseInt(y), parseInt(mo) - 1)
                .toLocaleString('default', { month: 'long' });
            return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.82rem">
                <span style="color:var(--text-2)">${mn} ${y}</span>
                <span style="color:var(--emerald);font-weight:600">$${months[m].toFixed(2)}</span>
            </div>`;
          }).join('')
        : noData;
}
