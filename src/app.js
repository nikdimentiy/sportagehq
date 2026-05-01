/* ═══════════════════════════════════════════════════
   SPORTAGE HQ — UNIFIED COMMAND CENTER
   TZ: America/Los_Angeles
   ═══════════════════════════════════════════════════ */

import { state } from './state.js';
import { refreshOverview } from './features/overview.js';
import {
    loadFuel, renderFuelTable, editFuelRow, saveFuelRow,
    fuelMonthlyReport, resetFuelData, toggleFuelInput, restoreFuelInputState
} from './features/fuel.js';
import {
    loadMileage, processAndRenderMileage, cancelMileageEdit,
    editMileageRow, saveMileageRow, addMileageRecord,
    purgeMileageData, toggleMileageInput, restoreMileageInputState
} from './features/mileage.js';
import {
    loadMaint, renderMaintTable, editMaintRow, saveMaintRow,
    addMaintRecord, deleteMaintRecord, purgeMaintData,
    updateMaintSummary, toggleMaintInput, restoreMaintInputState
} from './features/maintenance.js';
import {
    exportMaintJSON, exportFullBackup, updateVaultCounts, updateSystemCounts, wipeAllData, updateSmartAlerts, refreshCostAnalytics,
    routeTrackerFilter, applyRouteCustomFilter, refreshRouteTracker, initNuclearToggle, toggleNuclearOption
} from './features/system.js';

// ── RESTORE TOGGLE STATES ──
restoreFuelInputState();
restoreMileageInputState();
restoreMaintInputState();

// ── TABS ──
function switchTab(tabName) {
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-tabs button[data-tab="${tabName}"]`);
    const bottomBtn = document.querySelector(`.bottom-nav-item[data-tab="${tabName}"]`);
    if (navBtn) navBtn.classList.add('active');
    if (bottomBtn) bottomBtn.classList.add('active');
    document.getElementById('page-' + tabName)?.classList.add('active');
    if (tabName === 'overview') refreshOverview();
    if (tabName === 'system') { initNuclearToggle(); updateSystemCounts(); updateSmartAlerts(); refreshCostAnalytics(); refreshRouteTracker(); }
}

document.getElementById('navTabs').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    switchTab(btn.dataset.tab);
});

document.getElementById('bottomNav').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    switchTab(btn.dataset.tab);
});

// ── INIT ──
async function initAppData() {
    try {
        await loadFuel();
        await loadMileage();
        await loadMaint();
        updateVaultCounts();
        updateSystemCounts();
        updateSmartAlerts();
        refreshCostAnalytics();
        refreshOverview();
    } catch (err) {
        console.error("Error initializing app data:", err);
    }
}

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
    if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const tabMap = { '1': 'overview', '2': 'fuel', '3': 'mileage', '4': 'maintenance', '5': 'system' };
        const tab = tabMap[e.key];
        if (tab) {
            e.preventDefault();
            switchTab(tab);
        }
        return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.ctrlKey || e.metaKey) return;

    if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const active = document.querySelector('.nav-tabs button[data-tab="mileage"]');
        if (!active?.classList.contains('active')) switchTab('mileage');
        if (document.getElementById('mileageCockpit').classList.contains('input-hidden')) toggleMileageInput();
        setTimeout(() => document.getElementById('mileOdo').focus(), 50);
    }

    if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        const active = document.querySelector('.nav-tabs button[data-tab="fuel"]');
        if (!active?.classList.contains('active')) switchTab('fuel');
        if (document.getElementById('fuelCockpit').classList.contains('input-hidden')) toggleFuelInput();
        setTimeout(() => document.getElementById('fuelStation').focus(), 50);
    }
});

// ── WINDOW EXPORTS (for HTML onclick handlers and appwrite-init.js callbacks) ──
window.initAppData          = initAppData;
window.exportMaintJSON      = exportMaintJSON;
window.exportFullBackup     = exportFullBackup;
window.renderFuelTable      = renderFuelTable;
window.renderMaintTable     = renderMaintTable;
window.processAndRenderMileage = processAndRenderMileage;
window.cancelMileageEdit    = cancelMileageEdit;
window.updateVaultCounts    = updateVaultCounts;
window.updateMaintSummary   = updateMaintSummary;
window.refreshOverview      = refreshOverview;
window.editFuelRow          = editFuelRow;
window.saveFuelRow          = saveFuelRow;
window.editMileageRow       = editMileageRow;
window.saveMileageRow       = saveMileageRow;
window.editMaintRow         = editMaintRow;
window.saveMaintRow         = saveMaintRow;
window.toggleFuelInput      = toggleFuelInput;
window.fuelMonthlyReport    = fuelMonthlyReport;
window.resetFuelData        = resetFuelData;
window.addMileageRecord     = addMileageRecord;
window.purgeMileageData     = purgeMileageData;
window.toggleMileageInput   = toggleMileageInput;
window.addMaintRecord       = addMaintRecord;
window.deleteMaintRecord    = deleteMaintRecord;
window.purgeMaintData       = purgeMaintData;
window.toggleMaintInput     = toggleMaintInput;
window.wipeAllData          = wipeAllData;
window.updateSystemCounts   = updateSystemCounts;
window.updateSmartAlerts    = updateSmartAlerts;
window.refreshCostAnalytics = refreshCostAnalytics;
window.routeTrackerFilter   = routeTrackerFilter;
window.applyRouteCustomFilter = applyRouteCustomFilter;
window.toggleNuclearOption  = toggleNuclearOption;
