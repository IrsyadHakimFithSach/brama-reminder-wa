// Uji manual fase 1: 6 reminder ke grup test, jarak 10 menit (total 1 jam).
//   npm run test-blast            -> label grup TEST
//   npm run test-blast -- CNC     -> label grup lain
//
// Lewat SUMBER 3 (config/reminders.json), jadi index.ts tidak perlu diubah sama sekali.
// Sengaja dipicu dari terminal dan BUKAN perintah chat: memasang perintah chat berarti
// memasang pembaca pesan masuk, dan itu mengubah bot dari "hanya mengirim" (lihat CLAUDE.md).
import assert from 'assert';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import type { Reminder } from './lib/sources.ts';

const PATH = 'config/reminders.json';
const JUMLAH = 6;
const MULAI_MENIT = 2;    // yang pertama 2 menit dari sekarang: masih sempat baca log dulu
const JARAK_MENIT = 10;   // 6 x 10 menit = 1 jam

const pad = (n: number) => String(n).padStart(2, '0');
const tanggalDari = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const jamDari = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Murni, tanpa efek samping -> bisa diuji di check.ts tanpa menulis file apa pun.
 *  Pakai Date sungguhan supaya lewat tengah malam / ganti bulan ikut benar sendiri. */
export function jadwalUji(
    now: Date, label: string, jumlah = JUMLAH, jarakMenit = JARAK_MENIT,
): Reminder[] {
    const cap = `${tanggalDari(now).replace(/-/g, '')}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    return Array.from({ length: jumlah }, (_, i) => {
        const saat = new Date(now.getTime() + (MULAI_MENIT + i * jarakMenit) * 60_000);
        return {
            id: `test-${cap}-${i + 1}`,   // stabil dalam 1 run, beda tiap run -> boleh diulang
            tanggal: tanggalDari(saat),
            jam: jamDari(saat),
            grup: label,
            pesan: `[UJI ${i + 1}/${jumlah}] BRAMA hidup. Dijadwalkan ${jamDari(saat)}.`,
            asal: 'test-blast',
        };
    });
}

function main(): void {
    // `--pair` -> 2 reminder di MENIT YANG SAMA, untuk melihat perilaku penggabungan.
    const pair = process.argv.includes('--pair');
    const label = (process.argv.slice(2).find(a => !a.startsWith('--')) || 'TEST').trim().toUpperCase();
    const jumlah = pair ? 2 : JUMLAH;
    const baru = jadwalUji(new Date(), label, jumlah, pair ? 0 : JARAK_MENIT);

    // Kalau aritmatika waktunya rusak, berhenti SEBELUM menulis apa pun.
    assert.strictEqual(baru.length, jumlah);
    assert.strictEqual(new Set(baru.map(r => r.id)).size, jumlah, 'id uji harus unik');

    let lama: any[] = [];
    if (existsSync(PATH)) {
        try {
            const p = JSON.parse(readFileSync(PATH, 'utf-8'));
            if (!Array.isArray(p)) throw new Error('isinya bukan array');
            lama = p;
        } catch (e: any) {
            // JANGAN ditimpa: di dalamnya bisa ada reminder manual asli yang tidak ada salinannya.
            throw new Error(`${PATH} rusak (${e.message}). Perbaiki dulu — tidak ada yang ditulis.`);
        }
    }

    // Reminder uji lama dibuang biar tidak menumpuk tiap kali diulang. Yang manual tetap.
    const dipertahankan = lama.filter(x => !String(x?.id ?? '').startsWith('test-'));
    const dihapus = lama.length - dipertahankan.length;

    mkdirSync('config', { recursive: true });
    writeFileSync(PATH + '.tmp', JSON.stringify([...dipertahankan, ...baru], null, 2));
    renameSync(PATH + '.tmp', PATH);   // atomik, sama seperti state.json

    if (existsSync('.env')) process.loadEnvFile('.env');
    const jid = process.env[`GRUP_${label}`];

    console.log(`\ntest-blast: ${jumlah} reminder uji ditulis ke ${PATH}`);
    if (dihapus) console.log(`  (${dihapus} reminder uji run sebelumnya dibuang; reminder manual utuh)`);
    console.log(`  label grup: ${label}\n`);
    for (const r of baru) console.log(`  ${r.tanggal} ${r.jam}   ${r.id}`);
    console.log('');

    if (!jid) {
        console.log(`!! GRUP_${label} belum ada di .env -> keenam reminder ini akan DIBUANG.`);
        console.log(`   Isi dulu:  GRUP_${label}=<id-grup>@g.us    (cara ambil: prosedur.md bagian 3.4)`);
    } else {
        console.log(`   tujuan: ${jid}`);
    }
    if (baru.some(r => r.tanggal !== baru[0].tanggal))
        console.log('!! jadwal melewati tengah malam — sebagian baru terkirim besok.');
    if (process.env.DRY_RUN !== 'false')
        console.log('!! DRY_RUN masih true -> cuma muncul di log, TIDAK dikirim ke WhatsApp.');

    if (pair) {
        console.log('\nMODE PAIR: dua-duanya jatuh di menit yang sama.');
        console.log('Yang HARUS terjadi: masuk sebagai SATU pesan WhatsApp berisi dua blok,');
        console.log('dipisah baris kosong — bukan dua pesan terpisah. Itu memang desainnya');
        console.log('(gabung per grup) supaya grup tidak dibanjiri beberapa pesan sekaligus.');
        console.log('\nLangkah berikutnya:  npm start     (tunggu ~2 menit)');
    } else {
        console.log('\nLangkah berikutnya:  npm start     (biarkan hidup ~1 jam)');
        console.log('Catatan: kalau bot baru dinyalakan setelah beberapa jadwal lewat, yang lewat itu');
        console.log('digabung jadi SATU pesan. Itu perilaku normal, bukan kegagalan uji.');
    }
}

// Cuma jalan kalau dipanggil langsung. check.ts mengimpor jadwalUji tanpa menulis file.
if (process.argv[1]?.endsWith('test-blast.ts')) main();
