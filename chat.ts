// Kirim SATU pesan lewat sesi brama yang sudah login, lalu keluar.
// Pakai: node chat.ts <nomor|jid> "<pesan>"     (npm run chat -- 628xx "halo")
// Bukan bagian dari bot pengingat: tidak baca sumber, tidak sentuh data/state.json,
// tidak peduli DRY_RUN. Alat manual untuk operator.
import { BaileysClass } from './lib/baileys.ts';

const [target, ...rest] = process.argv.slice(2);
const pesan = rest.join(' ');
if (!target || !pesan) {
    console.error('pakai: node chat.ts <nomor|jid> "<pesan>"');
    process.exit(1);
}

const bot = new BaileysClass({ name: process.env.SESSION_NAME || 'brama' });

bot.on('qr', () => {
    // Sesi harus sudah ada. Kalau QR muncul, session-nya tidak valid - jangan diam-diam nunggu.
    console.error('SESI TIDAK VALID: WhatsApp minta scan QR. Batal, tidak ada yang dikirim.');
    process.exit(1);   // skrip sekali pakai, bukan daemon
});

bot.on('ready', async () => {
    const sock: any = bot.getInstance();
    let jid = target.includes('@') ? target : `${target.replace(/\D/g, '')}@s.whatsapp.net`;
    try {
        if (jid.endsWith('@s.whatsapp.net')) {
            // onWhatsApp = satu-satunya cara tahu nomor itu ada + jid mana yang benar
            // (akun baru dialamatkan lewat LID, bukan nomor).
            const [hit] = await sock.onWhatsApp(jid);
            if (!hit?.exists) {
                console.error('BATAL: nomor tidak terdaftar di WhatsApp ->', target);
                process.exit(2);
            }
            jid = hit.jid;
        }
        const r = await sock.sendMessage(jid, { text: pesan });
        console.log('TERKIRIM ->', jid, '| id =', r?.key?.id);
        process.exit(0);
    } catch (e: any) {
        console.error('GAGAL:', e?.message, JSON.stringify(e?.data ?? null));
        process.exit(1);
    }
});
