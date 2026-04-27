export const TZ = 'America/Los_Angeles';

export function esc(v) {
    if (v == null) return '';
    return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
}

export function getPSTDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

export function nowPacific() {
    const p = {};
    new Intl.DateTimeFormat('en-US', {
        timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', hour12:false
    }).formatToParts(new Date()).forEach(({type, value}) => { p[type] = value; });
    const hh = p.hour === '24' ? '00' : p.hour;
    return `${p.year}-${p.month}-${p.day} ${hh}:${p.minute}`;
}

export function ptDateStr(d) { return d.toLocaleDateString('en-CA', { timeZone: TZ }); }
export function ptDayName(d) { return d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long' }); }

export function formatDisplayDate(ds) {
    if (!ds) return '';
    const p = ds.split('-');
    return p.length === 3 ? `${p[1]}/${p[2]}/${p[0].slice(2)}` : ds;
}

export function getWeekId(d) {
    const date = new Date(d);
    const diff = date.getDate() - date.getDay();
    const sun = new Date(date.setDate(diff));
    return `${sun.getFullYear()}-${sun.getMonth()}-${sun.getDate()}`;
}
