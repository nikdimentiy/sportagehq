import { state } from '../state.js';
import { esc, toast, getPSTDate, formatDisplayDate } from '../utils/helpers.js';

export async function loadFuel() {
    if (!window.currentUser) {
        state.fuelRecords = [];
        renderFuelTable();
        return;
    }
    state.fuelRecords = await window.loadFuelFromAppwrite();
    renderFuelTable();
}

document.getElementById('fuelDate').value = getPSTDate();

document.getElementById('fuelForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const gallons = parseFloat(document.getElementById('fuelGallons').value);
    const miles   = parseFloat(document.getElementById('fuelMiles').value);
    const ppg     = parseFloat(document.getElementById('fuelPrice').value);
    const total   = parseFloat((ppg * gallons).toFixed(2));

    const record = {
        date: document.getElementById('fuelDate').value,
        station: document.getElementById('fuelStation').value.trim(),
        type: document.getElementById('fuelType').value,
        pricePerGallon: ppg,
        gallons,
        mileage: parseInt(document.getElementById('fuelOdo').value),
        milesDriven: miles,
        totalCost: total,
        mpg: (gallons > 0 && miles > 0) ? parseFloat((miles / gallons).toFixed(1)) : 0,
        costPerMile: (miles > 0 && total > 0) ? parseFloat((total / miles).toFixed(3)) : 0
    };

    try {
        await window.createFuelRecord(record);
        await loadFuel();
        document.getElementById('fuelReport').style.display = 'none';
        this.reset();
        document.getElementById('fuelDate').value = getPSTDate();
        toast('Fuel stop logged');
    } catch (err) {
        console.error("Error saving fuel record:", err);
        toast('Error: ' + (err.message || 'Failed to save'));
    }
});

export function renderFuelTable() {
    const tb = document.getElementById('fuelTableBody');
    tb.innerHTML = '';
    state.fuelRecords.forEach((r, i) => {
        const prev = state.fuelRecords[i+1];
        let mpgClass = '';
        if (r.mpg > 0 && prev && prev.mpg > 0) {
            if (r.mpg > prev.mpg) mpgClass = 'td-cyan';
            else if (r.mpg < prev.mpg) mpgClass = 'td-rose';
        }
        const tr = document.createElement('tr');
        tr.dataset.id = r.$id;
        tr.innerHTML = `
            <td class="td-highlight">${formatDisplayDate(r.date)}</td>
            <td style="text-transform:capitalize">${esc(r.station)}</td>
            <td>${esc(r.type)}</td>
            <td>${r.gallons ? r.gallons.toFixed(3) : '-'}</td>
            <td>${r.pricePerGallon ? r.pricePerGallon.toFixed(3) : '-'}</td>
            <td class="td-highlight">$${r.totalCost.toFixed(2)}</td>
            <td>${r.milesDriven ? r.milesDriven.toFixed(1) : '-'}</td>
            <td class="${mpgClass}" style="font-weight:600">${r.mpg ? r.mpg.toFixed(1) : '-'}</td>
            <td>${r.costPerMile ? r.costPerMile.toFixed(3) : '-'}</td>
            <td class="td-mono" style="color:var(--text-3)">${r.mileage}</td>
            <td><button class="btn-sm" style="padding:2px 7px;font-size:0.7rem" onclick="editFuelRow('${r.$id}')"><i class="fas fa-pencil-alt"></i></button></td>
        `;
        tb.appendChild(tr);
    });

    const cpmRecs = state.fuelRecords.filter(r => r.costPerMile > 0);
    if (cpmRecs.length) {
        const vals = cpmRecs.map(r => r.costPerMile);
        document.getElementById('fuelCpmMin').textContent = '$' + Math.min(...vals).toFixed(3);
        document.getElementById('fuelCpmMax').textContent = '$' + Math.max(...vals).toFixed(3);
        document.getElementById('fuelCpmAvg').textContent = '$' + (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3);
    } else {
        document.getElementById('fuelCpmMin').textContent = '--';
        document.getElementById('fuelCpmMax').textContent = '--';
        document.getElementById('fuelCpmAvg').textContent = '--';
    }
}

export function editFuelRow(docId) {
    const r = state.fuelRecords.find(r => r.$id === docId);
    if (!r) return;
    const tr = document.querySelector(`#fuelTableBody tr[data-id="${docId}"]`);
    if (!tr) return;
    tr.classList.add('editing');
    const inp = (type, field, val, extra = '') =>
        `<input type="${type}" data-field="${field}" value="${esc(val)}" class="row-edit-input" ${extra}>`;
    tr.innerHTML = `
        <td>${inp('date', 'date', r.date || '')}</td>
        <td>${inp('text', 'station', r.station || '')}</td>
        <td><select data-field="type" class="row-edit-input">
            <option value="Regular"${r.type === 'Regular' ? ' selected' : ''}>Regular</option>
            <option value="Mid-Grade"${r.type === 'Mid-Grade' ? ' selected' : ''}>Mid-Grade</option>
            <option value="Premium"${r.type === 'Premium' ? ' selected' : ''}>Premium</option>
        </select></td>
        <td>${inp('number', 'gallons', r.gallons || 0, 'step="0.001" min="0"')}</td>
        <td>${inp('number', 'ppg', r.pricePerGallon || 0, 'step="0.001" min="0"')}</td>
        <td style="color:var(--text-3);font-size:0.75rem">$${r.totalCost?.toFixed(2) || '—'}</td>
        <td>${inp('number', 'miles', r.milesDriven || 0, 'step="0.1" min="0"')}</td>
        <td style="color:var(--text-3);font-size:0.75rem">${r.mpg?.toFixed(1) || '—'}</td>
        <td style="color:var(--text-3);font-size:0.75rem">${r.costPerMile?.toFixed(3) || '—'}</td>
        <td>${inp('number', 'odo', r.mileage || 0, 'step="1" min="0"')}</td>
        <td style="white-space:nowrap">
            <button class="btn-sm" style="padding:2px 7px;font-size:0.7rem" onclick="saveFuelRow('${docId}')"><i class="fas fa-check"></i></button>
            <button class="btn-sm" style="padding:2px 7px;font-size:0.7rem;margin-left:3px" onclick="renderFuelTable()"><i class="fas fa-times"></i></button>
        </td>
    `;
}

export async function saveFuelRow(docId) {
    const tr = document.querySelector(`#fuelTableBody tr[data-id="${docId}"]`);
    if (!tr) return;
    const get = field => tr.querySelector(`[data-field="${field}"]`).value;
    const date = get('date');
    const station = get('station').trim().toUpperCase();
    const type = get('type');
    const gallons = parseFloat(get('gallons'));
    const ppg = parseFloat(get('ppg'));
    const miles = parseFloat(get('miles'));
    const odo = parseInt(get('odo'));
    if (!date || !station || !type || isNaN(gallons) || isNaN(ppg) || isNaN(miles) || isNaN(odo)) {
        toast('Please fill all required fields.');
        return;
    }
    const totalCost = parseFloat((ppg * gallons).toFixed(2));
    const mpg = (gallons > 0 && miles > 0) ? parseFloat((miles / gallons).toFixed(1)) : 0;
    const costPerMile = (miles > 0 && totalCost > 0) ? parseFloat((totalCost / miles).toFixed(3)) : 0;
    try {
        await window.updateFuelRecord(docId, { date, station, type, gallons, pricePerGallon: ppg, milesDriven: miles, mileage: odo, totalCost, mpg, costPerMile });
        await loadFuel();
        toast('Fuel record updated');
    } catch (err) {
        console.error('Error updating fuel record:', err);
        toast('Error: ' + (err.message || 'Failed to update'));
    }
}

export function fuelMonthlyReport() {
    const area = document.getElementById('fuelReport');
    if (area.style.display === 'block') { area.style.display = 'none'; return; }
    if (!state.fuelRecords.length) { area.innerHTML = 'No data.'; area.style.display = 'block'; return; }
    const mt = {};
    state.fuelRecords.forEach(r => { if (r.date && r.totalCost) { const my = r.date.substring(0, 7); mt[my] = (mt[my] || 0) + r.totalCost; } });
    if (!Object.keys(mt).length) { area.innerHTML = 'No monthly data available.'; area.style.display = 'block'; return; }
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-weight:700;font-family:var(--font-display);color:var(--cyan);">MONTHLY EXPENDITURE</div><button class="btn-sm" style="padding:2px 8px;font-size:0.7rem" onclick="document.getElementById('fuelReport').style.display='none'">&#x2715;</button></div>`;
    Object.keys(mt).sort().reverse().forEach(my => {
        const [y, m] = my.split('-');
        const mn = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long' });
        html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>${mn} ${y}</span><span style="font-weight:600">$${mt[my].toFixed(2)}</span></div>`;
    });
    area.innerHTML = html; area.style.display = 'block';
}

export async function resetFuelData() {
    if (!state.fuelRecords.length) return;
    if (confirm('Wipe all fuel data? This cannot be undone.')) {
        try {
            const fuelRes = await window.appwriteDB.listDocuments(window.DB_ID, window.FUEL_COL, [
                window.appwriteQuery.equal("userId", window.currentUser.$id)
            ]);
            for (const doc of fuelRes.documents) {
                await window.appwriteDB.deleteDocument(window.DB_ID, window.FUEL_COL, doc.$id);
            }
            state.fuelRecords = [];
            renderFuelTable();
            document.getElementById('fuelReport').style.display = 'none';
            toast('Fuel data wiped');
        } catch (err) {
            console.error("Error resetting fuel data:", err);
            toast('Error: ' + (err.message || 'Failed to reset'));
        }
    }
}

export function toggleFuelInput() {
    const hidden = document.getElementById('fuelCockpit').classList.toggle('input-hidden');
    document.getElementById('fuelToggleLabel').textContent = hidden ? 'Show Input' : 'Hide Input';
}
