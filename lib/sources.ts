// 3 sumber jadwal -> Reminder[]. Sesuai arsitektur.png.
//   1. konteks/schedule_reminder.csv   (jadwal utama, Agu-Des 2026)
//   2. Google Form -> Spreadsheet      (tambahan dadakan, via URL export CSV)
//   3. config/reminders.json           (reminder manual)
import { readFileSync, existsSync } from 'fs';

export type Reminder = {
    id: string;        // stabil & unik -> dipakai anti-kirim-dobel di data/state.json
    tanggal: string;   // YYYY-MM-DD
    jam: string;       // HH:MM (waktu laptop)
    grup: string;      // LABEL, dicocokkan ke GRUP_<LABEL> di .env
    pesan: string;
    asal: string;      // sumber mana, buat log
};

/** Parser CSV RFC4180 mini: tahan koma & newline di dalam tanda kutip.
 *  ponytail: 20 baris, ganti pakai `csv-parse` kalau CSV-nya makin liar. */
export function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
            else field += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c !== '\r') field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(f => f.trim() !== ''));
}

/** Baris CSV -> Reminder, pakai header sebagai nama kolom. */
function rowsToReminders(rows: string[][], asal: string): Reminder[] {
    if (rows.length < 2) return [];
    const head = rows[0].map(h => h.trim().toLowerCase());
    const col = (r: string[], name: string) => (r[head.indexOf(name)] ?? '').trim();
    return rows.slice(1).map((r, i) => ({
        id: col(r, 'id') || `${asal}-${i + 1}`,
        tanggal: col(r, 'tanggal'),
        jam: col(r, 'jam'),
        grup: col(r, 'grup'),
        pesan: col(r, 'pesan'),
        asal,
    })).filter(x => x.tanggal && x.jam && x.grup && x.pesan);
}

// --- SUMBER 1: CSV jadwal utama --------------------------------------------
export function fromCSV(path = 'konteks/schedule_reminder.csv'): Reminder[] {
    if (!existsSync(path)) return [];
    return rowsToReminders(parseCSV(readFileSync(path, 'utf-8')), 'csv');
}

// --- SUMBER 2: Google Form -> Spreadsheet -----------------------------------
// Butuh SHEET_CSV_URL di .env. Cara dapat: File > Share > Publish to web > CSV,
// atau https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>
export async function fromSheet(url = process.env.SHEET_CSV_URL): Promise<Reminder[]> {
    if (!url) return [];
    try {
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return rowsToReminders(parseCSV(await res.text()), 'sheet');
    } catch (e: any) {
        // Sheet mati/offline tidak boleh menjatuhkan tick. Sumber lain tetap jalan.
        console.warn(`[brama] sumber sheet gagal: ${e.message}`);
        return [];
    }
}

// --- SUMBER 3: reminder manual ----------------------------------------------
export function fromJSON(path = 'config/reminders.json'): Reminder[] {
    if (!existsSync(path)) return [];
    try {
        const arr = JSON.parse(readFileSync(path, 'utf-8'));
        return (Array.isArray(arr) ? arr : []).map((x: any, i: number) => ({
            id: x.id || `manual-${i + 1}`,
            tanggal: x.tanggal, jam: x.jam, grup: x.grup, pesan: x.pesan,
            asal: 'manual',
        })).filter(x => x.tanggal && x.jam && x.grup && x.pesan);
    } catch (e: any) {
        console.warn(`[brama] config/reminders.json rusak: ${e.message}`);
        return [];
    }
}

/** Semua sumber digabung. Satu sumber error != tick gagal. */
export async function loadAll(): Promise<Reminder[]> {
    const [sheet] = await Promise.all([fromSheet()]);
    return [...fromCSV(), ...sheet, ...fromJSON()];
}

/** Jatuh tempo = tanggalnya hari ini DAN jamnya sudah lewat (waktu laptop). */
const pad = (n: number) => String(n).padStart(2, '0');
export function isDue(r: Reminder, now: Date = new Date()): boolean {
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    if (r.tanggal.trim() !== today) return false;
    return `${pad(now.getHours())}:${pad(now.getMinutes())}` >= r.jam.trim();
}
