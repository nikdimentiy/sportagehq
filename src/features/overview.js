import { state } from '../state.js';
import { formatDisplayDate, getWeekId } from '../utils/helpers.js';
import { recalcMileage } from './mileage.js';

export function refreshOverview() {
    const el = id => document.getElementById(id);

    const fc = state.fuelRecords.length;
    el('ovFuelCount').textContent = fc;
    const totalSpend = state.fuelRecords.reduce((s,r) => s + (r.totalCost||0), 0);
    el('ovTotalSpend').textContent = '$' + totalSpend.toFixed(2);
    const totalGal = state.fuelRecords.reduce((s,r) => s + (r.gallons||0), 0);
    el('ovTotalGallons').textContent = totalGal.toFixed(1);

    if (fc > 0) {
        const months = {};
        state.fuelRecords.forEach(r => { if(r.date) { const m = r.date.substring(0,7); months[m] = (months[m]||0) + r.totalCost; }});
        const mc = Object.keys(months).length || 1;
        el('ovMonthlyAvgSpend').textContent = `Monthly avg: $${(totalSpend / mc).toFixed(2)}`;
    } else { el('ovMonthlyAvgSpend').textContent = 'Monthly avg: --'; }

    const priced = state.fuelRecords.filter(r => r.pricePerGallon > 0);
    el('ovAvgPrice').textContent = priced.length ? '$' + (priced.reduce((s,r)=>s+r.pricePerGallon,0)/priced.length).toFixed(3) : '--';

    const mpgRecs = state.fuelRecords.filter(r => r.mpg > 0);
    const avgMpg = mpgRecs.length ? (mpgRecs.reduce((s,r)=>s+r.mpg,0)/mpgRecs.length) : 0;
    el('ovAvgMpg').textContent = avgMpg > 0 ? avgMpg.toFixed(1) : '--';
    el('ovBestMpg').textContent = mpgRecs.length ? 'Best: ' + Math.max(...mpgRecs.map(r=>r.mpg)).toFixed(1) + ' mpg' : 'Best: --';

    const totalFuelMi = state.fuelRecords.reduce((s,r)=>s+(r.milesDriven||0),0);
    el('ovCostPerMile').textContent = totalFuelMi > 0 ? '$' + (totalSpend/totalFuelMi).toFixed(3) : '--';

    const tripped = state.fuelRecords.filter(r => r.milesDriven > 0);
    el('ovAvgTrip').textContent = tripped.length ? (tripped.reduce((s,r)=>s+r.milesDriven,0)/tripped.length).toFixed(1)+' mi' : '--';

    const fdc = {};
    state.fuelRecords.forEach(r => { try{ const d = new Date(r.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short'}); fdc[d]=(fdc[d]||0)+1; }catch(e){} });
    let pfd='--', pfm=0; for(const d in fdc){if(fdc[d]>pfm){pfm=fdc[d];pfd=d;}} el('ovPeakFuelDay').textContent = pfd;

    const mc2 = state.mileageData.length;
    el('ovMileCount').textContent = mc2;

    if (mc2 > 0) {
        const calc = recalcMileage(state.mileageData);
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

    const allDates = new Set();
    state.fuelRecords.forEach(r => { if(r.date) allDates.add(r.date); });
    state.mileageData.forEach(r => { if(r.dateTime) allDates.add(r.dateTime.split(' ')[0]); });
    el('ovDaysTracked').textContent = allDates.size;

    renderOverviewCharts();
}

export function renderOverviewCharts() {
    const monthlyTotals = {};
    state.fuelRecords.forEach(r => { if(r.date && r.totalCost){ const m = r.date.substring(0,7); monthlyTotals[m]=(monthlyTotals[m]||0)+r.totalCost; }});
    const mKeys = Object.keys(monthlyTotals).sort();
    const mLabels = mKeys.map(k => { const [y,m]=k.split('-'); return new Date(parseInt(y),parseInt(m)-1).toLocaleString('default',{month:'short',year:'2-digit'}); });
    const mVals = mKeys.map(k => monthlyTotals[k]);

    if (state.chartMonthly) state.chartMonthly.destroy();
    state.chartMonthly = new Chart(document.getElementById('chartMonthlySpend'), {
        type:'bar',
        data:{ labels:mLabels, datasets:[{ label:'Spend ($)', data:mVals, backgroundColor:'rgba(0,229,255,0.25)', borderColor:'rgba(0,229,255,0.8)', borderWidth:1, borderRadius:4 }] },
        options:{ responsive:true, plugins:{ legend:{display:false} }, scales:{ y:{ticks:{color:'#6b7394',callback:v=>'$'+v},grid:{color:'rgba(255,255,255,0.04)'}}, x:{ticks:{color:'#6b7394'},grid:{display:false}} } }
    });

    const mpgData = state.fuelRecords.filter(r=>r.mpg>0).slice().reverse();
    const mpgLabels = mpgData.map(r => formatDisplayDate(r.date));
    const mpgVals = mpgData.map(r => r.mpg);

    if (state.chartMpg) state.chartMpg.destroy();
    state.chartMpg = new Chart(document.getElementById('chartMpgTrend'), {
        type:'line',
        data:{ labels:mpgLabels, datasets:[{ label:'MPG', data:mpgVals, borderColor:'var(--emerald)', backgroundColor:'rgba(0,224,150,0.08)', fill:true, tension:0.3, pointRadius:3, pointBackgroundColor:'var(--emerald)' }] },
        options:{ responsive:true, plugins:{ legend:{display:false} }, scales:{ y:{ticks:{color:'#6b7394'},grid:{color:'rgba(255,255,255,0.04)'}}, x:{ticks:{color:'#6b7394',maxTicksLimit:10},grid:{display:false}} } }
    });
}
