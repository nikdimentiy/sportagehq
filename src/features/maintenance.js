import { state } from '../state.js';
import { esc, toast } from '../utils/helpers.js';

export async function loadMaint() {
    if (!window.currentUser) {
        state.maintRecords = [];
        renderMaintTable();
        updateMaintSummary();
        return;
    }
    state.maintRecords = await window.loadMaintFromAppwrite();
    renderMaintTable();
    updateMaintSummary();
}

export async function addMaintRecord() {
    const date      = document.getElementById('maintDate').value.trim();
    const type      = document.getElementById('maintType').value;
    const notes     = document.getElementById('maintNotes').value.trim();
    const shop      = document.getElementById('maintShop').value.trim();
    const odo       = document.getElementById('maintOdo').value;
    const cost      = document.getElementById('maintCost').value;
    const nextDate  = document.getElementById('maintNextDate').value.trim();
    const nextMiles = document.getElementById('maintNextMiles').value;

    if (!date || !type) { toast('Date and Service Type are required.'); return; }

    const record = {
        date, type, notes, shop,
        odo:       odo       ? parseInt(odo)       : null,
        cost:      cost      ? parseFloat(cost)    : null,
        nextDate:  nextDate  || null,
        nextMiles: nextMiles ? parseInt(nextMiles) : null
    };

    try {
        await window.createMaintRecord(record);
        await loadMaint();
        ['maintDate','maintType','maintNotes','maintShop','maintOdo','maintCost','maintNextDate','maintNextMiles']
            .forEach(id => { const el = document.getElementById(id); el.value = ''; });
        toast('Service logged.');
    } catch (err) {
        console.error("Error saving maintenance record:", err);
        toast('Error: ' + (err.message || 'Failed to save'));
    }
}

export async function deleteMaintRecord(docId) {
    try {
        await window.deleteMaintRecordFromAppwrite(docId);
        await loadMaint();
    } catch (err) {
        console.error("Error deleting maintenance record:", err);
        toast('Error: ' + (err.message || 'Failed to delete'));
    }
}

export function renderMaintTable() {
    const tbody = document.getElementById('maintTableBody');
    if (!tbody) return;
    if (!state.maintRecords.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-2);padding:24px;">No records yet</td></tr>';
        return;
    }
    tbody.innerHTML = state.maintRecords.map(r => `
        <tr data-id="${r.$id}">
            <td>${r.date || '—'}</td>
            <td>${esc(r.type) || '—'}</td>
            <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.notes)}">${esc(r.notes) || '—'}</td>
            <td>${esc(r.shop) || '—'}</td>
            <td style="text-align:right">${r.odo != null ? r.odo.toLocaleString() : '—'}</td>
            <td style="text-align:right">${r.cost != null ? '$' + r.cost.toFixed(2) : '—'}</td>
            <td>${r.nextDate || '—'}</td>
            <td style="text-align:right">${r.nextMiles != null ? r.nextMiles.toLocaleString() : '—'}</td>
            <td style="text-align:center;white-space:nowrap">
                <button class="btn-sm" style="padding:2px 7px;font-size:0.7rem;margin-right:2px" onclick="editMaintRow('${r.$id}')">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="btn-sm danger" style="padding:2px 8px;font-size:0.7rem;" onclick="deleteMaintRecord('${r.$id}')">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

export function editMaintRow(docId) {
    const r = state.maintRecords.find(r => r.$id === docId);
    if (!r) return;
    const tr = document.querySelector(`#maintTableBody tr[data-id="${docId}"]`);
    if (!tr) return;
    tr.classList.add('editing');
    const inp = (type, field, val, extra = '') =>
        `<input type="${type}" data-field="${field}" value="${esc(val != null ? val : '')}" class="row-edit-input" ${extra}>`;
    const serviceTypes = ['Oil Change','Tire Rotation','Tire Replacement','Brake Service','Air Filter','Cabin Filter','Battery','Spark Plugs','Transmission Service','Coolant Flush','Alignment','Inspection','Scheduled Maintenance','Other'];
    const typeOpts = serviceTypes.map(t => `<option value="${t}"${r.type === t ? ' selected' : ''}>${t}</option>`).join('');
    tr.innerHTML = `
        <td>${inp('date', 'date', r.date || '')}</td>
        <td><select data-field="type" class="row-edit-input">${typeOpts}</select></td>
        <td>${inp('text', 'notes', r.notes || '')}</td>
        <td>${inp('text', 'shop', r.shop || '')}</td>
        <td>${inp('number', 'odo', r.odo != null ? r.odo : '', 'step="1" min="0"')}</td>
        <td>${inp('number', 'cost', r.cost != null ? r.cost : '', 'step="0.01" min="0"')}</td>
        <td>${inp('date', 'nextDate', r.nextDate || '')}</td>
        <td>${inp('number', 'nextMiles', r.nextMiles != null ? r.nextMiles : '', 'step="1" min="0"')}</td>
        <td style="white-space:nowrap">
            <button class="btn-sm" style="padding:2px 7px;font-size:0.7rem" onclick="saveMaintRow('${docId}')"><i class="fas fa-check"></i></button>
            <button class="btn-sm" style="padding:2px 7px;font-size:0.7rem;margin-left:3px" onclick="renderMaintTable()"><i class="fas fa-times"></i></button>
        </td>
    `;
}

export async function saveMaintRow(docId) {
    const tr = document.querySelector(`#maintTableBody tr[data-id="${docId}"]`);
    if (!tr) return;
    const get = field => tr.querySelector(`[data-field="${field}"]`).value;
    const date = get('date');
    const type = get('type');
    if (!date || !type) { toast('Date and type are required.'); return; }
    const odoVal = get('odo');
    const costVal = get('cost');
    const nextMilesVal = get('nextMiles');
    const record = {
        date,
        type,
        notes: get('notes').trim() || null,
        shop: get('shop').trim() || null,
        odo: odoVal !== '' ? parseInt(odoVal) : null,
        cost: costVal !== '' ? parseFloat(costVal) : null,
        nextDate: get('nextDate') || null,
        nextMiles: nextMilesVal !== '' ? parseInt(nextMilesVal) : null
    };
    try {
        await window.updateMaintRecord(docId, record);
        await loadMaint();
        toast('Service record updated');
    } catch (err) {
        console.error('Error updating maintenance record:', err);
        toast('Error: ' + (err.message || 'Failed to update'));
    }
}

export function updateMaintSummary() {
    document.getElementById('maintCount').textContent = state.maintRecords.length;
    const total = state.maintRecords.reduce((s, r) => s + (r.cost || 0), 0);
    document.getElementById('maintTotalCost').textContent = total.toFixed(2);
    const sorted = [...state.maintRecords].filter(r => r.date).sort((a,b) => b.date.localeCompare(a.date));
    document.getElementById('maintLastDate').textContent = sorted.length ? sorted[0].date : '—';
    const withOdo = sorted.filter(r => r.odo != null);
    document.getElementById('maintLastOdo').textContent = withOdo.length ? withOdo[0].odo.toLocaleString() + ' mi' : '—';
}

export async function purgeMaintData() {
    if (!confirm('Delete all maintenance records? This cannot be undone.')) return;
    try {
        await window.deleteMaintRecordsForUser();
        state.maintRecords = [];
        renderMaintTable();
        updateMaintSummary();
        toast('Maintenance data cleared.');
    } catch (err) {
        console.error("Error purging maintenance data:", err);
        toast('Error: ' + (err.message || 'Failed to purge'));
    }
}

export function toggleMaintInput() {
    const col = document.querySelector('#page-maintenance .panel-col-input');
    const lbl = document.getElementById('maintToggleLabel');
    if (!col) return;
    const hidden = col.style.display === 'none';
    col.style.display = hidden ? '' : 'none';
    lbl.textContent = hidden ? 'Hide Input' : 'Show Input';
}
