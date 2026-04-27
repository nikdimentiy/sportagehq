/* ═══════════════════════════════════════════════════
   SPORTAGE HQ — UNIFIED COMMAND CENTER
   TZ: America/Los_Angeles
   ═══════════════════════════════════════════════════ */

const TZ = 'America/Los_Angeles';
const FUEL_KEY  = 'sportageSmoothRecords';
const MILE_KEY  = 'mileageData';

let fuelRecords   = [];
let mileageData   = [];
let chartMonthly  = null;
let chartMpg      = null;
let fpMileMain, fpMileStart, fpMileEnd;

// ── TIMEZONE HELPERS ──
function getPSTDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function nowPacific() {
    const p = {};
    new Intl.DateTimeFormat('en-US', {
        timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', hour12:false
    }).formatToParts(new Date()).forEach(({type, value}) => { p[type] = value; });
    const hh = p.hour === '24' ? '00' : p.hour;
    return `${p.year}-${p.month}-${p.day} ${hh}:${p.minute}`;
}

function ptDateStr(d) { return d.toLocaleDateString('en-CA', { timeZone: TZ }); }
function ptDayName(d) { return d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long' }); }

function formatDisplayDate(ds) {
    if (!ds) return '';
    const p = ds.split('-');
    return p.length === 3 ? `${p[1]}/${p[2]}/${p[0].slice(2)}` : ds;
}

function getWeekId(d) {
    const date = new Date(d);
    const diff = date.getDate() - date.getDay();
    const sun = new Date(date.setDate(diff));
    return `${sun.getFullYear()}-${sun.getMonth()}-${sun.getDate()}`;
}

// ── TOAST ──
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
}

// ── PANEL TOGGLES ──
function toggleFuelInput() {
    const hidden = document.getElementById('fuelCockpit').classList.toggle('input-hidden');
    document.getElementById('fuelToggleLabel').textContent = hidden ? 'Show Input' : 'Hide Input';
}

function toggleMileageInput() {
    const hidden = document.getElementById('mileageCockpit').classList.toggle('input-hidden');
    document.getElementById('mileageToggleLabel').textContent = hidden ? 'Show Input' : 'Hide Input';
}

// ── TABS ──
document.getElementById('navTabs').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'overview') refreshOverview();
});

// ══════════════════════════════════════════════════
// FUEL OS
// ══════════════════════════════════════════════════

async function loadFuel() {
    if (!window.currentUser) {
        fuelRecords = [];
        renderFuelTable();
        return;
    }
    fuelRecords = await window.loadFuelFromAppwrite();
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

function renderFuelTable() {
    const tb = document.getElementById('fuelTableBody');
    tb.innerHTML = '';
    fuelRecords.forEach((r, i) => {
        const prev = fuelRecords[i+1];
        let mpgClass = '';
        if (r.mpg > 0 && prev && prev.mpg > 0) {
            if (r.mpg > prev.mpg) mpgClass = 'td-cyan';
            else if (r.mpg < prev.mpg) mpgClass = 'td-rose';
        }
        const tr = document.createElement('tr');
        tr.dataset.id = r.$id;
        tr.innerHTML = `
            <td class="td-highlight">${formatDisplayDate(r.date)}</td>
            <td style="text-transform:capitalize">${r.station}</td>
            <td>${r.type}</td>
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
}

function editFuelRow(docId) {
    const r = fuelRecords.find(r => r.$id === docId);
    if (!r) return;
    const tr = document.querySelector(`#fuelTableBody tr[data-id="${docId}"]`);
    if (!tr) return;
    tr.classList.add('editing');
    const inp = (type, field, val, extra = '') =>
        `<input type="${type}" data-field="${field}" value="${val}" class="row-edit-input" ${extra}>`;
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

async function saveFuelRow(docId) {
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

function fuelMonthlyReport() {
    const area = document.getElementById('fuelReport');
    if (!fuelRecords.length) { area.innerHTML='No data.'; area.style.display='block'; return; }
    const mt = {};
    fuelRecords.forEach(r => { if(r.date && r.totalCost) { const my = r.date.substring(0,7); mt[my] = (mt[my]||0) + r.totalCost; } });
    let html = '<div style="margin-bottom:10px;font-weight:700;font-family:var(--font-display);color:var(--cyan);">MONTHLY EXPENDITURE</div>';
    Object.keys(mt).sort().reverse().forEach(my => {
        const [y,m] = my.split('-');
        const mn = new Date(parseInt(y), parseInt(m)-1).toLocaleString('default',{month:'long'});
        html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span>${mn} ${y}</span><span style="font-weight:600">$${mt[my].toFixed(2)}</span></div>`;
    });
    area.innerHTML = html; area.style.display = 'block';
}

function fuelPeakDay() {
    const area = document.getElementById('fuelReport');
    if (!fuelRecords.length) { area.innerHTML='No data.'; area.style.display='block'; return; }
    const dc = {};
    fuelRecords.forEach(r => {
        try { const d = new Date(r.date+'T00:00:00'); const day = d.toLocaleDateString('en-US',{weekday:'long'}); dc[day] = (dc[day]||0)+1; } catch(e){}
    });
    let max=0, peak='N/A';
    for (const d in dc) { if(dc[d]>max){max=dc[d];peak=d;} }
    area.innerHTML = `<span style="color:var(--cyan);font-family:var(--font-display);font-weight:700;">PEAK ACTIVITY:</span> <strong style="color:white;text-transform:uppercase;">${peak}</strong> (${max} stops)`;
    area.style.display = 'block';
}

async function resetFuelData() {
    if (!fuelRecords.length) return;
    if (confirm('Wipe all fuel data? This cannot be undone.')) {
        try {
            const fuelRes = await window.appwriteDB.listDocuments(DB_ID, FUEL_COL, [
                window.appwriteQuery.equal("userId", window.currentUser.$id)
            ]);
            for (const doc of fuelRes.documents) {
                await window.appwriteDB.deleteDocument(DB_ID, FUEL_COL, doc.$id);
            }
            fuelRecords = [];
            renderFuelTable();
            document.getElementById('fuelReport').style.display = 'none';
            toast('Fuel data wiped');
        } catch (err) {
            console.error("Error resetting fuel data:", err);
            toast('Error: ' + (err.message || 'Failed to reset'));
        }
    }
}

// ══════════════════════════════════════════════════
// MILEAGE OS
// ══════════════════════════════════════════════════

async function loadMileage() {
    if (!window.currentUser) {
        mileageData = [];
        processAndRenderMileage([]);
        return;
    }
    mileageData = await window.loadMileageFromAppwrite();
    if (mileageData.length > 0) processAndRenderMileage(mileageData);
}

async function addMileageRecord() {
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

function recalcMileage(data) {
    if (!data.length) return [];
    const first = new Date(data[0].dateTime);
    const before = mileageData.slice().reverse().find(d => new Date(d.dateTime) < first);
    let prevMile = before ? before.currentMileage : data[0].currentMileage;
    let total = 0;
    return data.map((r, i) => {
        const prev = i > 0 ? data[i-1].currentMileage : prevMile;
        const diff = Math.max(0, r.currentMileage - prev);
        total += diff;
        return { ...r, mileageDifference: diff, totalMileage: total };
    });
}

function processAndRenderMileage(data) {
    const calc = recalcMileage(data);
    renderMileageTable(calc);
    updateMileageGauges(calc);
    updateMileageChips(calc);
}

function renderMileageTable(data) {
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

function editMileageRow(docId) {
    const r = mileageData.find(r => r.$id === docId);
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

async function saveMileageRow(docId) {
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

function updateMileageGauges(data) {
    if (!data.length) { ['mlOdometer','mlWeekly','mlLastTrip','mlWeekAvg'].forEach(id => document.getElementById(id).textContent = '0'); return; }
    document.getElementById('mlOdometer').textContent = data[data.length-1].currentMileage.toLocaleString();
    document.getElementById('mlLastTrip').textContent = data[data.length-1].mileageDifference.toLocaleString();
    // "This Week" = latest odometer − Sunday's odometer (the week's starting baseline)
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

function updateMileageChips(data) {
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

// Mileage Filters
function applyMileageFilter() {
    const s = fpMileStart.selectedDates[0], e = fpMileEnd.selectedDates[0];
    if (!s || !e) { toast('Select both dates.'); return; }
    const start = new Date(s).setHours(0,0,0,0), end = new Date(e).setHours(23,59,59,999);
    processAndRenderMileage(mileageData.filter(r => { const d = new Date(r.dateTime); return d >= start && d <= end; }));
}

function setMileFilter(s, e) { fpMileStart.setDate(s,true); fpMileEnd.setDate(e,true); applyMileageFilter(); }

function mileFilterLastWeek() {
    const now = new Date(); const t = now.getDay();
    const end = new Date(now.setDate(now.getDate()-t-1));
    const start = new Date(new Date().setDate(end.getDate()-6));
    setMileFilter(start, end);
}

function mileFilterLastMonth() {
    const n = new Date();
    setMileFilter(new Date(n.getFullYear(),n.getMonth()-1,1), new Date(n.getFullYear(),n.getMonth(),0));
}

function mileFilterLastQuarter() {
    const n = new Date(), q = Math.floor(n.getMonth()/3);
    let s, e;
    if (q===0) { s=new Date(n.getFullYear()-1,9,1); e=new Date(n.getFullYear()-1,11,31); }
    else { const sm=(q-1)*3; s=new Date(n.getFullYear(),sm,1); e=new Date(n.getFullYear(),sm+3,0); }
    setMileFilter(s, e);
}

function resetMileageFilter() {
    fpMileStart.clear(); fpMileEnd.clear();
    processAndRenderMileage(mileageData);
}

async function purgeMileageData() {
    if (confirm('Permanently delete all mileage logs?')) {
        try {
            await window.deleteMileageRecordsForUser();
            mileageData = [];
            processAndRenderMileage([]);
            toast('Mileage data purged');
        } catch (err) {
            console.error("Error purging mileage data:", err);
            toast('Error: ' + (err.message || 'Failed to purge'));
        }
    }
}

// ══════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════

function refreshOverview() {
    const el = id => document.getElementById(id);

    // Fuel stats
    const fc = fuelRecords.length;
    el('ovFuelCount').textContent = fc;
    const totalSpend = fuelRecords.reduce((s,r) => s + (r.totalCost||0), 0);
    el('ovTotalSpend').textContent = '$' + totalSpend.toFixed(2);
    const totalGal = fuelRecords.reduce((s,r) => s + (r.gallons||0), 0);
    el('ovTotalGallons').textContent = totalGal.toFixed(1);

    // Monthly avg spend
    if (fc > 0) {
        const months = {};
        fuelRecords.forEach(r => { if(r.date) { const m = r.date.substring(0,7); months[m] = (months[m]||0) + r.totalCost; }});
        const mc = Object.keys(months).length || 1;
        el('ovMonthlyAvgSpend').textContent = `Monthly avg: $${(totalSpend / mc).toFixed(2)}`;
    } else { el('ovMonthlyAvgSpend').textContent = 'Monthly avg: --'; }

    // Avg price
    const priced = fuelRecords.filter(r => r.pricePerGallon > 0);
    el('ovAvgPrice').textContent = priced.length ? '$' + (priced.reduce((s,r)=>s+r.pricePerGallon,0)/priced.length).toFixed(3) : '--';

    // MPG
    const mpgRecs = fuelRecords.filter(r => r.mpg > 0);
    const avgMpg = mpgRecs.length ? (mpgRecs.reduce((s,r)=>s+r.mpg,0)/mpgRecs.length) : 0;
    el('ovAvgMpg').textContent = avgMpg > 0 ? avgMpg.toFixed(1) : '--';
    el('ovBestMpg').textContent = mpgRecs.length ? 'Best: ' + Math.max(...mpgRecs.map(r=>r.mpg)).toFixed(1) + ' mpg' : 'Best: --';

    // Cost per mile (fuel)
    const totalFuelMi = fuelRecords.reduce((s,r)=>s+(r.milesDriven||0),0);
    el('ovCostPerMile').textContent = totalFuelMi > 0 ? '$' + (totalSpend/totalFuelMi).toFixed(3) : '--';

    // Avg trip from fuel
    const tripped = fuelRecords.filter(r => r.milesDriven > 0);
    el('ovAvgTrip').textContent = tripped.length ? (tripped.reduce((s,r)=>s+r.milesDriven,0)/tripped.length).toFixed(1)+' mi' : '--';

    // Peak fuel day
    const fdc = {};
    fuelRecords.forEach(r => { try{ const d = new Date(r.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short'}); fdc[d]=(fdc[d]||0)+1; }catch(e){} });
    let pfd='--', pfm=0; for(const d in fdc){if(fdc[d]>pfm){pfm=fdc[d];pfd=d;}} el('ovPeakFuelDay').textContent = pfd;

    // Mileage stats
    const mc2 = mileageData.length;
    el('ovMileCount').textContent = mc2;

    if (mc2 > 0) {
        const calc = recalcMileage(mileageData);
        const lastOdo = calc[calc.length-1].currentMileage;
        el('ovOdometer').textContent = lastOdo.toLocaleString();
        const totalDriven = calc[calc.length-1].totalMileage;
        el('ovTotalDriven').textContent = `Total tracked: ${totalDriven.toLocaleString()} mi`;

        const wk = {};
        calc.forEach(r => { const w = getWeekId(new Date(r.dateTime)); wk[w]=(wk[w]||0)+r.mileageDifference; });
        const wks = Object.keys(wk).length||1;
        el('ovWeeklyMiAvg').textContent = Math.round(totalDriven/wks).toLocaleString()+' mi';

        const trips = calc.map(d => d.mileageDifference);
        el('ovLongestTrip').textContent = Math.max(...trips).toLocaleString()+' mi';
    } else {
        el('ovOdometer').textContent = '0';
        el('ovTotalDriven').textContent = 'Total tracked: --';
        el('ovWeeklyMiAvg').textContent = '--';
        el('ovLongestTrip').textContent = '--';
    }

    // Days tracked
    const allDates = new Set();
    fuelRecords.forEach(r => { if(r.date) allDates.add(r.date); });
    mileageData.forEach(r => { if(r.dateTime) allDates.add(r.dateTime.split(' ')[0]); });
    el('ovDaysTracked').textContent = allDates.size;

    // Charts
    renderOverviewCharts();
}

function renderOverviewCharts() {
    // Monthly spend chart
    const monthlyTotals = {};
    fuelRecords.forEach(r => { if(r.date && r.totalCost){ const m = r.date.substring(0,7); monthlyTotals[m]=(monthlyTotals[m]||0)+r.totalCost; }});
    const mKeys = Object.keys(monthlyTotals).sort();
    const mLabels = mKeys.map(k => { const [y,m]=k.split('-'); return new Date(parseInt(y),parseInt(m)-1).toLocaleString('default',{month:'short',year:'2-digit'}); });
    const mVals = mKeys.map(k => monthlyTotals[k]);

    if (chartMonthly) chartMonthly.destroy();
    chartMonthly = new Chart(document.getElementById('chartMonthlySpend'), {
        type:'bar',
        data:{ labels:mLabels, datasets:[{ label:'Spend ($)', data:mVals, backgroundColor:'rgba(0,229,255,0.25)', borderColor:'rgba(0,229,255,0.8)', borderWidth:1, borderRadius:4 }] },
        options:{ responsive:true, plugins:{ legend:{display:false} }, scales:{ y:{ticks:{color:'#6b7394',callback:v=>'$'+v},grid:{color:'rgba(255,255,255,0.04)'}}, x:{ticks:{color:'#6b7394'},grid:{display:false}} } }
    });

    // MPG trend
    const mpgData = fuelRecords.filter(r=>r.mpg>0).slice().reverse();
    const mpgLabels = mpgData.map(r => formatDisplayDate(r.date));
    const mpgVals = mpgData.map(r => r.mpg);

    if (chartMpg) chartMpg.destroy();
    chartMpg = new Chart(document.getElementById('chartMpgTrend'), {
        type:'line',
        data:{ labels:mpgLabels, datasets:[{ label:'MPG', data:mpgVals, borderColor:'var(--emerald)', backgroundColor:'rgba(0,224,150,0.08)', fill:true, tension:0.3, pointRadius:3, pointBackgroundColor:'var(--emerald)' }] },
        options:{ responsive:true, plugins:{ legend:{display:false} }, scales:{ y:{ticks:{color:'#6b7394'},grid:{color:'rgba(255,255,255,0.04)'}}, x:{ticks:{color:'#6b7394',maxTicksLimit:10},grid:{display:false}} } }
    });
}

// ══════════════════════════════════════════════════
// DATA VAULT — JSON IMPORT / EXPORT
// ══════════════════════════════════════════════════

function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function exportMaintJSON() {
    if (!maintRecords.length) { toast('No maintenance data'); return; }
    const payload = { version: 1, type: 'maintenance', exportDate: new Date().toISOString(), maintenance: maintRecords };
    downloadBlob(JSON.stringify(payload, null, 2), `sportage_maintenance_${getPSTDate()}.json`, 'application/json');
    toast('Maintenance data exported');
}


async function purgeAllData() {
    if (confirm('⚠️ FULL SYSTEM PURGE\n\nDelete ALL fuel and mileage data?\nThis cannot be undone.')) {
        try {
            // Delete all fuel records
            const fuelRes = await window.appwriteDB.listDocuments(DB_ID, FUEL_COL, [
                window.appwriteQuery.equal("userId", window.currentUser.$id)
            ]);
            for (const doc of fuelRes.documents) {
                await window.appwriteDB.deleteDocument(DB_ID, FUEL_COL, doc.$id);
            }

            // Delete all mileage records
            await window.deleteMileageRecordsForUser();

            fuelRecords = []; mileageData = [];
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

function updateVaultCounts() {
    const fuelEl = document.getElementById('vaultFuelCount');
    const mileEl = document.getElementById('vaultMileCount');
    if (fuelEl) fuelEl.textContent = fuelRecords.length;
    if (mileEl) mileEl.textContent = mileageData.length;
}

// ══════════════════════════════════════════════════
// MAINTENANCE
// ══════════════════════════════════════════════════

const MAINT_KEY = 'sportageMaintenanceData';
let maintRecords = [];

async function loadMaint() {
    if (!window.currentUser) {
        maintRecords = [];
        renderMaintTable();
        updateMaintSummary();
        return;
    }
    maintRecords = await window.loadMaintFromAppwrite();
    renderMaintTable();
    updateMaintSummary();
}

async function addMaintRecord() {
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

async function deleteMaintRecord(docId) {
    try {
        await window.deleteMaintRecordFromAppwrite(docId);
        await loadMaint();
    } catch (err) {
        console.error("Error deleting maintenance record:", err);
        toast('Error: ' + (err.message || 'Failed to delete'));
    }
}

function renderMaintTable() {
    const tbody = document.getElementById('maintTableBody');
    if (!tbody) return;
    if (!maintRecords.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-2);padding:24px;">No records yet</td></tr>';
        return;
    }
    tbody.innerHTML = maintRecords.map(r => `
        <tr data-id="${r.$id}">
            <td>${r.date || '—'}</td>
            <td>${r.type || '—'}</td>
            <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${r.notes || ''}">${r.notes || '—'}</td>
            <td>${r.shop || '—'}</td>
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

function editMaintRow(docId) {
    const r = maintRecords.find(r => r.$id === docId);
    if (!r) return;
    const tr = document.querySelector(`#maintTableBody tr[data-id="${docId}"]`);
    if (!tr) return;
    tr.classList.add('editing');
    const inp = (type, field, val, extra = '') =>
        `<input type="${type}" data-field="${field}" value="${val != null ? val : ''}" class="row-edit-input" ${extra}>`;
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

async function saveMaintRow(docId) {
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

function updateMaintSummary() {
    document.getElementById('maintCount').textContent = maintRecords.length;
    const total = maintRecords.reduce((s, r) => s + (r.cost || 0), 0);
    document.getElementById('maintTotalCost').textContent = total.toFixed(2);
    const sorted = [...maintRecords].filter(r => r.date).sort((a,b) => b.date.localeCompare(a.date));
    document.getElementById('maintLastDate').textContent = sorted.length ? sorted[0].date : '—';
    const withOdo = sorted.filter(r => r.odo != null);
    document.getElementById('maintLastOdo').textContent = withOdo.length ? withOdo[0].odo.toLocaleString() + ' mi' : '—';
}

async function purgeMaintData() {
    if (!confirm('Delete all maintenance records? This cannot be undone.')) return;
    try {
        await window.deleteMaintRecordsForUser();
        maintRecords = [];
        renderMaintTable();
        updateMaintSummary();
        toast('Maintenance data cleared.');
    } catch (err) {
        console.error("Error purging maintenance data:", err);
        toast('Error: ' + (err.message || 'Failed to purge'));
    }
}

function toggleMaintInput() {
    const col = document.querySelector('#page-maintenance .panel-col-input');
    const btn = document.getElementById('maintToggleBtn');
    const lbl = document.getElementById('maintToggleLabel');
    if (!col) return;
    const hidden = col.style.display === 'none';
    col.style.display = hidden ? '' : 'none';
    lbl.textContent = hidden ? 'Hide Input' : 'Show Input';
}

// ══════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// INIT FLATPICKR (before auth check)
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    fpMileMain  = flatpickr('#mileDateTime', { enableTime:true, dateFormat:'Y-m-d H:i', time_24hr:true, defaultDate:nowPacific() });
    fpMileStart = flatpickr('#mileStartDate', { dateFormat:'Y-m-d' });
    fpMileEnd   = flatpickr('#mileEndDate',   { dateFormat:'Y-m-d' });
});

// ══════════════════════════════════════════════════
// INIT DATA LOADING (after auth check in module)
// ══════════════════════════════════════════════════
async function initAppData() {
    try {
        await loadFuel();
        await loadMileage();
        await loadMaint();
        updateVaultCounts();
        refreshOverview();
    } catch (err) {
        console.error("Error initializing app data:", err);
    }
}

window.initAppData = initAppData;
window.exportMaintJSON = exportMaintJSON;
window.renderFuelTable = renderFuelTable;
window.renderMaintTable = renderMaintTable;
window.cancelMileageEdit = () => processAndRenderMileage(mileageData);
window.editFuelRow = editFuelRow;
window.saveFuelRow = saveFuelRow;
window.editMileageRow = editMileageRow;
window.saveMileageRow = saveMileageRow;
window.editMaintRow = editMaintRow;
window.saveMaintRow = saveMaintRow;
