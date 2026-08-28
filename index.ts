// BRAMA - bot pengingat organisasi. Jalan terus di laptop sampai Desember.
// Alur: tick 60 detik -> baca 3 sumber -> yang jatuh tempo & belum terkirim
//       -> resolve label grup lewat .env -> gabung jadi 1 pesan per grup -> kirim
//       -> catat di data/state.json.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { BaileysClass } from './lib/baileys.ts';
import { loadAll, isDue, type Reminder } from './lib/sources.ts';

if (existsSync('.env')) process.loadEnvFile('.env');   // stdlib, tanpa dotenv

const TICK_MS = Number(process.env.TICK_MS ?? 60_000);
const SEND_GAP_MS = Number(process.env.SEND_GAP_MS ?? 3_000);
const DRY_RUN = process.env.DRY_RUN !== 'false';       // default aman: tidak mengirim
const STATE_PATH = 'data/state.json';
// `npm run groups` -> paksa cetak daftar grup walaupun GRUP_* di .env sudah terisi.
// Tanpa ini daftar cuma muncul kalau .env kosong sama sekali, jadi tidak berguna untuk
// menambah grup baru di tengah jalan.
const LIST_GROUPS = process.argv.includes('--groups');

const log = (...a: any[]) => console.log(new Date().toISOString(), '[brama]', ...a);

// --- daftar putih grup: GRUP_<LABEL>=<jid> di .env --------------------------
const groups: Record<string, string> = Object.fromEntries(
    Object.entries(process.env)
        .filter(([k, v]) => k.startsWith('GRUP_') && v)
        .map(([k, v]) => [k.slice(5).toUpperCase(), v!.trim()])
);
const resolveGroup = (label: string) => groups[label.trim().toUpperCase()];

// --- state: id yang sudah terkirim ------------------------------------------
type State = { sent: Record<string, string> };
function loadState(): State {
    try { return JSON.parse(readFileSync(STATE_PATH, 'utf-8')); } catch { return { sent: {} }; }
}
function saveState(s: State): void {
    mkdirSync('data', { recursive: true });
    // tulis lewat file sementara: mati listrik di tengah tulis tidak merusak state
    writeFileSync(STATE_PATH + '.tmp', JSON.stringify(s, null, 2));
    renameSync(STATE_PATH + '.tmp', STATE_PATH);
}

const bot = new BaileysClass({ name: process.env.SESSION_NAME || 'brama' });
let ready = false;
const warnedLabels = new Set<string>();   // label asing: log sekali per run, bukan tiap tick

bot.on('qr', () => log('scan QR di terminal (WhatsApp > Perangkat tertaut)'));
bot.on('auth_failure', (e: any) => log('AUTH FAILURE:', e));
bot.on('logged_out', () => { ready = false; });
bot.on('reconnecting', ({ delay }: any) => { ready = false; log(`putus, nyambung lagi ${delay / 1000}s`); });
bot.on('ready', async () => {
    ready = true;
    log(`TERHUBUNG. dry-run=${DRY_RUN}, grup terdaftar: ${Object.keys(groups).join(', ') || '(kosong)'}`);
    if (LIST_GROUPS || !Object.keys(groups).length) await printGroups();
});

/** Bantu isi .env: cetak semua grup yang diikuti akun ini + JID-nya. */
async function printGroups(): Promise<void> {
    try {
        const all = await bot.getInstance().groupFetchAllParticipating();
        log('--- salin ke .env ---');
        for (const g of Object.values(all) as any[]) {
            const label = g.subject.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 20);
            console.log(`GRUP_${label}=${g.id}   # ${g.subject}`);
        }
    } catch (e: any) { log('gagal ambil daftar grup:', e.message); }
}

async function tick(): Promise<void> {
    if (!ready) return;
    const state = loadState();
    const due = (await loadAll()).filter(r => !state.sent[r.id] && isDue(r));
    if (!due.length) return;

    // label asing dibuang & dicatat, tidak pernah bikin tick berhenti
    const perGroup = new Map<string, Reminder[]>();
    for (const r of due) {
        const jid = resolveGroup(r.grup);
        if (!jid) {
            if (!warnedLabels.has(r.grup)) {
                warnedLabels.add(r.grup);
                log(`BUANG: label grup "${r.grup}" tidak ada di .env (id=${r.id}, sumber=${r.asal})`);
            }
            continue;
        }
        perGroup.set(jid, [...(perGroup.get(jid) ?? []), r]);
    }

    for (const [jid, items] of perGroup) {
        const pesan = items.map(r => r.pesan).join('\n\n');   // gabung jadi 1 pesan per grup
        try {
            if (DRY_RUN) log(`[DRY] ${jid} <- ${items.length} item:\n${pesan}`);
            else await bot.sendText(jid, pesan);
            const now = new Date().toISOString();
            for (const r of items) state.sent[r.id] = now;    // catat SETELAH sukses
            saveState(state);
            log(`terkirim ke ${jid}: ${items.map(r => r.id).join(', ')}`);
        } catch (e: any) {
            log(`GAGAL kirim ke ${jid}: ${e.message} - dicoba lagi tick berikutnya`);
        }
        await new Promise(r => setTimeout(r, SEND_GAP_MS));
    }
}

// Bot ini harus hidup sampai Desember: error apa pun dicatat, proses tidak boleh mati.
process.on('unhandledRejection', (e: any) => log('unhandledRejection:', e?.message ?? e));
process.on('uncaughtException', (e: any) => log('uncaughtException:', e?.message ?? e));

setInterval(() => { tick().catch(e => log('tick error:', e.message)); }, TICK_MS);
log(`mulai. tick tiap ${TICK_MS / 1000}s, dry-run=${DRY_RUN}`);
