/* ═══════════════════════════════════════════════════
   SPORTAGE HQ — UNIFIED COMMAND CENTER
   TZ: America/Los_Angeles
   ═══════════════════════════════════════════════════ */

import { state } from './state.js';
import { refreshOverview } from './features/overview.js';
import {
    loadFuel, renderFuelTable, editFuelRow, saveFuelRow,
    fuelMonthlyReport, resetFuelData, toggleFuelInput
} from './features/fuel.js';
import {
    loadMileage, processAndRenderMileage, cancelMileageEdit,
    editMileageRow, saveMileageRow, addMileageRecord,
    applyMileageFilter, mileFilterLastWeek, mileFilterLastMonth,
    mileFilterLastQuarter, resetMileageFilter, purgeMileageData, toggleMileageInput
} from './features/mileage.js';
import {
    loadMaint, renderMaintTable, editMaintRow, saveMaintRow,
    addMaintRecord, deleteMaintRecord, purgeMaintData,
    updateMaintSummary, toggleMaintInput
} from './features/maintenance.js';
import {
    exportMaintJSON, exportFullBackup, updateVaultCounts, updateSystemCounts, wipeAllData
} from './features/system.js';

// ── TABS ──
document.getElementById('navTabs').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'overview') refreshOverview();
    if (btn.dataset.tab === 'system') updateSystemCounts();
});

// ── INIT ──
async function initAppData() {
    try {
        await loadFuel();
        await loadMileage();
        await loadMaint();
        updateVaultCounts();
        updateSystemCounts();
        refreshOverview();
    } catch (err) {
        console.error("Error initializing app data:", err);
    }
}

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const tabMap = { '1': 'overview', '2': 'fuel', '3': 'mileage', '4': 'maintenance', '5': 'system' };
        const tab = tabMap[e.key];
        if (tab) {
            e.preventDefault();
            document.querySelector(`.nav-tabs button[data-tab="${tab}"]`)?.click();
        }
        return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.ctrlKey || e.metaKey) return;

    if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const btn = document.querySelector('.nav-tabs button[data-tab="mileage"]');
        if (btn && !btn.classList.contains('active')) btn.click();
        if (document.getElementById('mileageCockpit').classList.contains('input-hidden')) toggleMileageInput();
        setTimeout(() => document.getElementById('mileOdo').focus(), 50);
    }

    if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        const btn = document.querySelector('.nav-tabs button[data-tab="fuel"]');
        if (btn && !btn.classList.contains('active')) btn.click();
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
window.applyMileageFilter   = applyMileageFilter;
window.mileFilterLastWeek   = mileFilterLastWeek;
window.mileFilterLastMonth  = mileFilterLastMonth;
window.mileFilterLastQuarter = mileFilterLastQuarter;
window.resetMileageFilter   = resetMileageFilter;
window.purgeMileageData     = purgeMileageData;
window.toggleMileageInput   = toggleMileageInput;
window.addMaintRecord       = addMaintRecord;
window.deleteMaintRecord    = deleteMaintRecord;
window.purgeMaintData       = purgeMaintData;
window.toggleMaintInput     = toggleMaintInput;
window.wipeAllData          = wipeAllData;
window.updateSystemCounts   = updateSystemCounts;
