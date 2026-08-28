// npm run csv-cnc -> schedule_reminder_cnc.csv (format boss) jadi
// konteks/schedule_reminder.csv (format kontrak, sama persis dengan tab BOT di spreadsheet).
//
// CSV asli dari boss TIDAK diubah. Skrip ini yang menyesuaikan, jadi CSV proker lain
// berformat sama tinggal dilewatkan ke sini juga.
//
// Selalu mencetak `dibaca N / dipakai M / dibuang K + alasan`. Loader di lib/sources.ts
// membuang baris cacat DIAM-DIAM; skrip inilah yang berisik. Jangan dibikin diam.
import { readFileSync, writeFileSync, renameSync } from 'fs';
import { parseCSV } from './lib/sources.ts';

// CSV asli tidak punya kolom jam sama sekali. Satu jam untuk semua tipe reminder.
// 18:00 diputuskan operator 2026-08-28, bukan tebakan kode.
// Mau H-1 sore dan H pagi? ganti jadi map per `tipe_reminder` di petakan().
export const JAM = '18:00';

type Baris = { id: string; tanggal: string; jam: string; grup: string; pesan: string };

/** Satu baris CSV boss -> 0..N baris kontrak. `proker_diinfokan` dipecah di tanda pipa. */
export function petakan(r: Record<string, string>, jam = JAM): { ok: Baris[]; buang: string[] } {
    const id = (r['id_reminder'] ?? '').trim();
    const tanggal = (r['tanggal_reminder'] ?? '').trim();
    const pesan = (r['pesan_reminder'] ?? '').trim();
    const label = (r['proker_diinfokan'] ?? '').split('|').map(s => s.trim()).filter(Boolean);

    const buang = [
        !id && 'id_reminder kosong',
        !tanggal && 'tanggal_reminder kosong',
        tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) && `tanggal_reminder "${tanggal}" bukan YYYY-MM-DD`,
        !pesan && 'pesan_reminder kosong',
        !label.length && 'proker_diinfokan kosong',
    ].filter(Boolean) as string[];
    if (buang.length) return { ok: [], buang };

    // Label ikut masuk ke id: satu baris jadi N reminder, dan tiap grup harus punya
    // id sendiri supaya tidak saling menimpa di data/state.json.
    return { ok: label.map(g => ({ id: `cnc-${id}-${g}`, tanggal, jam, grup: g, pesan })), buang: [] };
}

const kutip = (s: string) => `"${s.replace(/"/g, '""')}"`;

function main(masuk: string, keluar: string) {
    const rows = parseCSV(readFileSync(masuk, 'utf-8'));
    const head = rows[0].map(h => h.trim().toLowerCase());
    const hasil: Baris[] = [];
    let dibuang = 0;

    rows.slice(1).forEach((r, i) => {
        const obj: Record<string, string> = {};
        head.forEach((h, k) => (obj[h] = r[k] ?? ''));
        const { ok, buang } = petakan(obj);
        if (buang.length) {
            dibuang++;
            console.log(`  DIBUANG baris ${i + 2} (${obj['id_reminder'] || '?'}): ${buang.join('; ')}`);
        }
        hasil.push(...ok);
    });

    const bentrok = hasil.length - new Set(hasil.map(h => h.id)).size;
    if (bentrok) console.log(`  PERINGATAN: ${bentrok} id kembar -> reminder akan saling menimpa di state.json`);

    const teks = 'id,tanggal,jam,grup,pesan\n' +
        hasil.map(h => [h.id, h.tanggal, h.jam, h.grup, kutip(h.pesan)].join(',')).join('\n') + '\n';
    writeFileSync(keluar + '.tmp', teks);          // tulis atomik: .tmp lalu rename
    renameSync(keluar + '.tmp', keluar);

    const perGrup = hasil.reduce<Record<string, number>>((a, h) => ((a[h.grup] = (a[h.grup] ?? 0) + 1), a), {});
    console.log(`\ndibaca ${rows.length - 1} / dipakai ${hasil.length} / dibuang ${dibuang}`);
    console.log(`per grup: ${Object.entries(perGrup).map(([g, n]) => `${g}=${n}`).join(', ')}`);
    console.log(`jam kirim: ${JAM} (semua baris) -> ${keluar}`);
}

// dijaga argv supaya import dari check.ts tidak ikut menulis file
if (process.argv[1]?.endsWith('cnc-to-csv.ts')) {
    main(process.argv[2] ?? 'schedule_reminder_cnc.csv', process.argv[3] ?? 'konteks/schedule_reminder.csv');
}
