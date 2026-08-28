// Self-check tanpa framework: `npm run check`. Gagal = exit non-zero.
import assert from 'assert';
import { parseCSV, fromCSV, fromJSON, isDue, type Reminder } from './lib/sources.ts';
import { jadwalUji } from './test-blast.ts';
import { petakan, JAM } from './cnc-to-csv.ts';

// CSV: koma di dalam tanda kutip tidak boleh memecah kolom
const rows = parseCSV('id,pesan\n1,"halo, apa kabar"\n2,"dia bilang ""oke"""\n');
assert.deepStrictEqual(rows[1], ['1', 'halo, apa kabar']);
assert.deepStrictEqual(rows[2], ['2', 'dia bilang "oke"']);

// Sumber 1 & 3 terbaca dari file contoh
assert.ok(fromCSV().length >= 3, 'CSV contoh harus kebaca');
assert.ok(fromJSON().length >= 1, 'reminders.json contoh harus kebaca');

// Jatuh tempo
const r = (tanggal: string, jam: string): Reminder =>
    ({ id: 'x', tanggal, jam, grup: 'INTI', pesan: 'p', asal: 't' });
const now = new Date(2026, 8, 1, 9, 30);           // 2026-09-01 09:30
assert.strictEqual(isDue(r('2026-09-01', '08:00'), now), true,  'lewat jamnya -> kirim');
assert.strictEqual(isDue(r('2026-09-01', '09:30'), now), true,  'pas jamnya -> kirim');
assert.strictEqual(isDue(r('2026-09-01', '10:00'), now), false, 'belum jamnya -> tunggu');
assert.strictEqual(isDue(r('2026-09-02', '08:00'), now), false, 'beda hari -> jangan');
assert.strictEqual(isDue(r('2026-08-31', '08:00'), now), false, 'hari lewat -> jangan');

// test-blast: 6 reminder, jarak 10 menit, dan tanggal ikut maju kalau lewat tengah malam
const uji = jadwalUji(new Date(2026, 8, 1, 23, 50), 'TEST');   // 2026-09-01 23:50
assert.strictEqual(uji.length, 6, 'harus 6 reminder uji');
assert.strictEqual(new Set(uji.map(u => u.id)).size, 6, 'id uji harus unik');
assert.strictEqual(uji[0].tanggal + ' ' + uji[0].jam, '2026-09-01 23:52', 'yang pertama +2 menit');
assert.strictEqual(uji[1].tanggal + ' ' + uji[1].jam, '2026-09-02 00:02', 'lewat tengah malam -> tanggal maju');
assert.strictEqual(uji[5].tanggal + ' ' + uji[5].jam, '2026-09-02 00:42', 'yang terakhir +52 menit');
assert.ok(uji.every(u => u.grup === 'TEST' && u.pesan), 'label & pesan harus terisi');
// harus benar-benar jatuh tempo pada waktunya, bukan cuma terlihat benar
assert.strictEqual(isDue(uji[1], new Date(2026, 8, 2, 0, 1)), false, 'sebelum jamnya -> tunggu');
assert.strictEqual(isDue(uji[1], new Date(2026, 8, 2, 0, 2)), true, 'pas jamnya -> kirim');

// mode --pair: 2 reminder di menit yang sama, id tetap harus beda supaya state tidak bentrok
const pasangan = jadwalUji(new Date(2026, 8, 1, 10, 0), 'TEST', 2, 0);
assert.strictEqual(pasangan.length, 2);
assert.strictEqual(pasangan[0].jam, pasangan[1].jam, 'pair harus jatuh di menit yang sama');
assert.strictEqual(pasangan[0].tanggal, pasangan[1].tanggal, 'pair harus di tanggal yang sama');
assert.notStrictEqual(pasangan[0].id, pasangan[1].id, 'id pair harus tetap berbeda');

// adapter CSV CnC: fan-out di tanda pipa, id memuat label grup, baris cacat ditolak
const satu = petakan({ id_reminder: 'CNC-001', tanggal_reminder: '2026-08-27',
    proker_diinfokan: 'CnC|Pubmedsos', pesan_reminder: 'halo' });
assert.strictEqual(satu.ok.length, 2, '1 baris 2 label -> 2 reminder');
assert.deepStrictEqual(satu.ok.map(x => x.id), ['cnc-CNC-001-CnC', 'cnc-CNC-001-Pubmedsos'],
    'id wajib memuat label, kalau tidak saling menimpa di state.json');
assert.deepStrictEqual(satu.ok.map(x => x.grup), ['CnC', 'Pubmedsos']);
assert.strictEqual(satu.ok[0].jam, JAM, 'jam diisi dari konstanta, CSV asli tidak punya kolomnya');
// diikat ke JAM, bukan angka mati: kalau tidak, tes ini lapuk tiap jam kirim diubah
const [jamH, jamM] = JAM.split(':').map(Number);
assert.strictEqual(isDue(({ ...satu.ok[0], asal: 'csv' }), new Date(2026, 7, 27, jamH, jamM)), true,
    'hasil adapter harus benar-benar jatuh tempo pada tanggal+jamnya');
assert.strictEqual(isDue(({ ...satu.ok[0], asal: 'csv' }), new Date(2026, 7, 27, jamH, jamM - 1)), false,
    'semenit sebelum jamnya -> belum boleh kirim');

// yang cacat WAJIB ditolak dengan alasan, bukan lolos diam-diam
assert.strictEqual(petakan({ id_reminder: 'X', tanggal_reminder: '27/08/2026',
    proker_diinfokan: 'CnC', pesan_reminder: 'halo' }).ok.length, 0, 'tanggal salah format -> tolak');
assert.ok(petakan({ id_reminder: 'X', tanggal_reminder: '2026-08-27',
    proker_diinfokan: '', pesan_reminder: 'halo' }).buang[0].includes('proker_diinfokan'),
    'label kosong -> alasannya harus disebut');

console.log('check: semua lolos');
