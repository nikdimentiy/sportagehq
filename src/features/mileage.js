import { state } from '../state.js';
import { toast, nowPacific, ptDateStr, ptDayName, getWeekId, TZ } from '../utils/helpers.js';

let fpMileMain, fpMileStart, fpMileEnd;

document.addEventListener('DOMContentLoaded', () => {
    fpMileMain  = flatpickr('#mileDateTime', { enableTime:true, dateFormat:'Y-m-d H:i', time_24hr:true, defaultDate:nowPacific() });
    fpMileStart = flatpickr('#mileStartDate', { dateFormat:'Y-m-d' });
    fpMileEnd   = flatpickr('#mileEndDate',   { dateFormat:'Y-m-d' });
});

export async function loadMileage() {
    if (!window.currentUser) {
        state.mileageData = [];
        processAndRenderMileage([]);
        return;
    }
    state.mileageData = await window.loadMileageFromAppwrite();
    if (state.mileageData.length > 0) processAndRenderMileage(state.mileageData);
}

export async function addMileageRecord() {
    const dt = document.getElementById('mileDateTime').value;
    const odo = parseInt(document.getElementById('mileOdo').value, 10);
    if (!dt || isNaN(odo) || odo < 0) { toast('Invalid input.'); return; }

    const record = { dateTime: dt, currentMileage: odo };
    try {
        await window.createMileageRecord(record);
        await loadMileage();
        resetMileageFilter();
        document.getElementById('mileOdo').value = '';
        fpMileMain.setDate(nowPacific(), true);
        toast('Mileage entry logged');
    } catch (err) {
        console.error("Error saving mileage record:", err);
        toast('Error: ' + (err.message || 'Failed to save'));
    }
}

export function recalcMileage(data) {
    if (!data.length) return [];
    const sorted = [...data].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    const before = state.mileageData.find(d => new Date(d.dateTime) < new Date(sorted[0].dateTime));
    let prevMile = before ? before.currentMileage : sorted[0].currentMileage;
    let total = 0;
    return sorted.map((r, i) => {
        const prev = i > 0 ? sorted[i-1].currentMileage : prevMile;
        const diff = Math.max(0, r.currentMileage - prev);
        total += diff;
        return { ...r, mileageDifference: diff, totalMileage: total };
    });
}

export function processAndRenderMileage(data) {
    const calc = recalcMileage(data);
    renderMileageTable(calc);
    updateMileageGauges(calc);
    updateMileageChips(calc);
}

export function renderMileageTable(data) {
    const tb = document.getElementById('mileTableBody');
    tb.innerHTML = '';
    const dc = {};
    data.forEach(r => { const d = ptDateStr(new Date(r.dateTime)); dc[d] = (dc[d]||0)+1; r._isGas = dc[d] > 1; });
    [...data].reverse().forEach(r => {
        const d = new Date(r.dateTime);
        const day = ptDayName(d);
        const tr = document.createElement('tr');
        tr.dataset.id = r.$id;
        if (day === 'Friday') tr.classList.add('friday-row');
        if (day === 'Monday') tr.classList.add('monday-row');
        const gas = r._isGas ? `<span class="gas-icon"><i class="fas fa-gas-pump"></i></span>` : '';
        const fmt = d.toLocaleString('en-US', { timeZone: TZ, year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        tr.innerHTML = `
            <td>${fmt}${gas}</td>
            <td>${day}</td>
            <td class="td-mono td-cyan">${r.currentMileage.toLocaleString()}</td>
            <td class="td-mono td-highlight">+${r.mileageDifference.toLocaleString()}</td>
            <td>${r.totalMileage.toLocaleString()}</td>
            <td><button class="btn-sm" style="padding:2px 7px;font-size:0.7rem" onclick="editMileageRow('${r.$id}')"><i class="fas fa-pencil-alt"></i></button></td>
        `;
        tb.appendChild(tr);
    });
}

export function editMileageRow(docId) {
    const r = state.mileageData.find(r => r.$id === docId);
    if (!r) return;
    const tr = document.querySelector(`#mileTableBody tr[data-id="${docId}"]`);
    if (!tr) return;
    tr.classList.add('editing');
    const dtVal = r.dateTime ? r.dateTime.replace(' ', 'T').substring(0, 16) : '';
    tr.innerHTML = `
        <td><input type="datetime-local" data-field="dateTime" value="${dtVal}" class="row-edit-input" style="min-width:160px"></td>
        <td style="color:var(--text-3);font-size:0.75rem">—</td>
        <td><input type="number" data-field="currentMileage" value="${r.currentMileage || 0}" class="row-edit-input" step="1" min="0" style="width:80px"></td>
        <td style="color:var(--text-3);font-size:0.75rem">recalc</td>
        <td style="color:var(--text-3);font-size:0.75rem">recalc</td>
        <td style="white-space:nowrap">
            <button class="btn-sm" style="padding:2px 7px;font-size:0.7rem" onclick="saveMileageRow('${docId}')"><i class="fas fa-check"></i></button>
            <button class="btn-sm" style="padding:2px 7px;font-size:0.7rem;margin-left:3px" onclick="cancelMileageEdit()"><i class="fas fa-times"></i></button>
        </td>
    `;
}

export async function saveMileageRow(docId) {
    const tr = document.querySelector(`#mileTableBody tr[data-id="${docId}"]`);
    if (!tr) return;
    const dtRaw = tr.querySelector('[data-field="dateTime"]').value;
    const odo = parseInt(tr.querySelector('[data-field="currentMileage"]').value);
    if (!dtRaw || isNaN(odo) || odo < 0) { toast('Invalid input.'); return; }
    const dateTime = dtRaw.replace('T', ' ');
    try {
        await window.updateMileageRecord(docId, { dateTime, currentMileage: odo });
        await loadMileage();
        resetMileageFilter();
        toast('Mileage record updated');
    } catch (err) {
        console.error('Error updating mileage record:', err);
        toast('Error: ' + (err.message || 'Failed to update'));
    }
}

export function updateMileageGauges(data) {
    if (!data.length) { ['mlOdometer','mlWeekly','mlLastTrip','mlWeekAvg'].forEach(id => document.getElementById(id).textContent = '0'); return; }
    document.getElementById('mlOdometer').textContent = data[data.length-1].currentMileage.toLocaleString();
    document.getElementById('mlLastTrip').textContent = data[data.length-1].mileageDifference.toLocaleString();
    const now = new Date();
    const sundayStart = new Date(now);
    sundayStart.setDate(now.getDate() - now.getDay());
    sundayStart.setHours(0, 0, 0, 0);
    const mondayStart = new Date(sundayStart);
    mondayStart.setDate(sundayStart.getDate() + 1);
    let weekBaseline = null;
    for (let i = data.length - 1; i >= 0; i--) {
        if (new Date(data[i].dateTime) < mondayStart) { weekBaseline = data[i].currentMileage; break; }
    }
    const latestMileage = data[data.length-1].currentMileage;
    document.getElementById('mlWeekly').textContent = (weekBaseline !== null ? Math.max(0, latestMileage - weekBaseline) : 0).toLocaleString();
    const wk = {};
    data.forEach(r => { const w = getWeekId(new Date(r.dateTime)); wk[w] = (wk[w]||0) + r.mileageDifference; });
    const wks = Object.keys(wk).length || 1;
    document.getElementById('mlWeekAvg').textContent = Math.round(data[data.length-1].totalMileage / wks).toLocaleString();
}

export function updateMileageChips(data) {
    const el = id => document.getElementById(id);
    el('mlEntries').textContent = data.length;
    if (!data.length) { ['mlAvgTrip','mlLongestTrip','mlBusiestDay','mlTotalDriven','mlDailyAvg'].forEach(id => el(id).textContent = '—'); return; }
    const trips = data.map(d => d.mileageDifference);
    const totalT = trips.reduce((s,t) => s+t, 0);
    el('mlAvgTrip').textContent = `${(totalT/trips.length).toFixed(1)} mi`;
    el('mlLongestTrip').textContent = `${Math.max(...trips).toLocaleString()} mi`;
    el('mlTotalDriven').textContent = `${totalT.toLocaleString()} mi`;
    const udays = new Set(data.map(r => new Date(r.dateTime).toDateString())).size || 1;
    el('mlDailyAvg').textContent = `${Math.round(totalT/udays).toLocaleString()} mi`;
    const dm = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
    const dn = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    data.forEach(r => { dm[new Date(r.dateTime).getDay()] += r.mileageDifference; });
    let bi=-1, mx=-1; for(const d in dm){if(dm[d]>mx){mx=dm[d];bi=d;}} el('mlBusiestDay').textContent = mx>0?dn[bi]:'—';
}

export function applyMileageFilter() {
    const s = fpMileStart.selectedDates[0], e = fpMileEnd.selectedDates[0];
    if (!s || !e) { toast('Select both dates.'); return; }
    const start = new Date(s).setHours(0,0,0,0), end = new Date(e).setHours(23,59,59,999);
    processAndRenderMileage(state.mileageData.filter(r => { const d = new Date(r.dateTime); return d >= start && d <= end; }));
}

export function setMileFilter(s, e) { fpMileStart.setDate(s,true); fpMileEnd.setDate(e,true); applyMileageFilter(); }

export function mileFilterLastWeek() {
    const now = new Date(); const t = now.getDay();
    const end = new Date(now.setDate(now.getDate()-t-1));
    const start = new Date(new Date().setDate(end.getDate()-6));
    setMileFilter(start, end);
}

export function mileFilterLastMonth() {
    const n = new Date();
    setMileFilter(new Date(n.getFullYear(),n.getMonth()-1,1), new Date(n.getFullYear(),n.getMonth(),0));
}

export function mileFilterLastQuarter() {
    const n = new Date(), q = Math.floor(n.getMonth()/3);
    let s, e;
    if (q===0) { s=new Date(n.getFullYear()-1,9,1); e=new Date(n.getFullYear()-1,11,31); }
    else { const sm=(q-1)*3; s=new Date(n.getFullYear(),sm,1); e=new Date(n.getFullYear(),sm+3,0); }
    setMileFilter(s, e);
}

export function resetMileageFilter() {
    fpMileStart.clear(); fpMileEnd.clear();
    processAndRenderMileage(state.mileageData);
}

export function cancelMileageEdit() {
    processAndRenderMileage(state.mileageData);
}

export async function purgeMileageData() {
    if (confirm('Permanently delete all mileage logs?')) {
        try {
            await window.deleteMileageRecordsForUser();
            state.mileageData = [];
            processAndRenderMileage([]);
            toast('Mileage data purged');
        } catch (err) {
            console.error("Error purging mileage data:", err);
            toast('Error: ' + (err.message || 'Failed to purge'));
        }
    }
}

export function toggleMileageInput() {
    const hidden = document.getElementById('mileageCockpit').classList.toggle('input-hidden');
    document.getElementById('mileageToggleLabel').textContent = hidden ? 'Show Input' : 'Hide Input';
    localStorage.setItem('sportagehq_mileage_input_hidden', hidden ? '1' : '0');
}

export function restoreMileageInputState() {
    if (localStorage.getItem('sportagehq_mileage_input_hidden') === '1') {
        document.getElementById('mileageCockpit').classList.add('input-hidden');
        document.getElementById('mileageToggleLabel').textContent = 'Show Input';
    }
}
