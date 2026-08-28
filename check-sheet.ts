// node check-sheet.ts -> tarik SHEET_CSV_URL, laporkan dibaca/dipakai/dibuang + alasan.
// Sumber 2 di lib/sources.ts sengaja diam (satu sumber rusak != tick jatuh). Skrip ini
// yang berisik, supaya "Sheet-nya jalan" tidak pernah lagi cuma tebakan.
import { existsSync } from 'fs';
import { parseCSV, isDue } from './lib/sources.ts';

if (existsSync('.env')) process.loadEnvFile('.env');

const url = process.env.SHEET_CSV_URL;
if (!url) {
    console.error('SHEET_CSV_URL kosong di .env. Jalankan setup-gform.gs dulu.');
    process.exitCode = 1;
} else {
    const labels = new Set(Object.keys(process.env).filter(k => k.startsWith('GRUP_') && process.env[k])
        .map(k => k.slice(5).toUpperCase()));
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    console.log(`HTTP ${res.status}, ${text.length} byte`);

    if (!res.ok || /^\s*</.test(text)) {
        // HTML = halaman login/error, bukan CSV. Loader akan diam-diam dapat 0 baris.
        console.error('BUKAN CSV. Sheet belum di-share "anyone with the link" atau URL-nya salah.');
        console.error(text.slice(0, 200));
        process.exitCode = 1;
    } else {
        const rows = parseCSV(text);
        const head = (rows[0] ?? []).map(h => h.trim().toLowerCase());
        const kurang = ['tanggal', 'jam', 'grup', 'pesan'].filter(c => !head.includes(c));
        console.log(`header: ${head.join(' | ')}`);
        if (kurang.length) {
            console.error(`KOLOM HILANG: ${kurang.join(', ')} -> SEMUA baris akan dibuang.`);
            process.exitCode = 1;
        }
        const col = (r: string[], n: string) => (r[head.indexOf(n)] ?? '').trim();
        let dipakai = 0, dibuang = 0;
        rows.slice(1).forEach((r, i) => {
            const [tanggal, jam, grup, pesan] = ['tanggal', 'jam', 'grup', 'pesan'].map(n => col(r, n));
            const id = col(r, 'id') || `sheet-${i + 1}`;
            const alasan = [
                !tanggal && 'tanggal kosong',
                !jam && 'jam kosong',
                !grup && 'grup kosong',
                !pesan && 'pesan kosong',
                tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) && `tanggal "${tanggal}" bukan YYYY-MM-DD`,
                jam && !/^([01]\d|2[0-3]):[0-5]\d$/.test(jam) && `jam "${jam}" bukan HH:MM`,
                grup && !labels.has(grup.toUpperCase()) && `grup "${grup}" tidak ada GRUP_${grup.toUpperCase()} di .env`,
            ].filter(Boolean);
            if (alasan.length) { dibuang++; console.log(`  DIBUANG ${id}: ${alasan.join('; ')}`); }
            else {
                dipakai++;
                const due = isDue({ id, tanggal, jam, grup, pesan, asal: 'sheet' });
                console.log(`  OK      ${id}: ${tanggal} ${jam} -> ${grup}${due ? '  [SUDAH JATUH TEMPO]' : ''}`);
            }
        });
        console.log(`\ndibaca ${rows.length - 1} / dipakai ${dipakai} / dibuang ${dibuang}`);
        if (dibuang) process.exitCode = 1;
    }
}
