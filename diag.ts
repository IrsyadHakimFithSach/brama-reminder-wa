// SEMENTARA - diagnostik kenapa kirim ke grup ditolak `not-acceptable`. Hapus setelah selesai.
import { BaileysClass } from './lib/baileys.ts';

const JID = process.argv[2] || '120363xxxxxxxxxxxx@g.us';
const bot = new BaileysClass({ name: process.env.SESSION_NAME || 'brama' });

bot.on('ready', async () => {
    const sock: any = bot.getInstance();
    console.log('\n=== AKUN ===');
    console.log('id  :', sock.user?.id);
    console.log('lid :', sock.user?.lid ?? '(tidak ada)');

    console.log('\n=== METADATA GRUP', JID, '===');
    try {
        const md: any = await sock.groupMetadata(JID);
        console.log('subject        :', md.subject);
        console.log('announce       :', md.announce, '  <- true = HANYA ADMIN boleh kirim');
        console.log('restrict       :', md.restrict);
        console.log('peserta        :', md.participants?.length);
        console.log('addressingMode :', md.addressingMode ?? '(tidak ada field ini)');
        const meNum = String(sock.user?.id || '').split(':')[0].split('@')[0];
        const aku = (md.participants || []).find((p: any) => String(p.id).includes(meNum));
        console.log('aku di grup?   :', aku ? `YA (admin=${aku.admin ?? 'bukan'})` : 'TIDAK KETEMU');
        console.log('contoh peserta :', (md.participants || [])[0]?.id);
    } catch (e: any) {
        console.log('groupMetadata GAGAL:', e?.message, e?.data ?? '');
    }

    console.log('\n=== COBA KIRIM ===');
    try {
        const r = await sock.sendMessage(JID, { text: 'diagnostik brama - abaikan' });
        console.log('SUKSES. message id =', r?.key?.id);
    } catch (e: any) {
        console.log('GAGAL   :', e?.message);
        console.log('output  :', JSON.stringify(e?.output ?? null));
        console.log('data    :', JSON.stringify(e?.data ?? null));
    }
    process.exit(0);   // skrip sekali pakai, bukan daemon
});

setTimeout(() => { console.log('timeout 90 detik, menyerah'); process.exit(1); }, 90_000);
