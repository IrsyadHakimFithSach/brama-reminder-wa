/**
 * BRAMA - bikin Google Form + Spreadsheet Sumber 2 sekali jalan.
 *
 * CARA PAKAI (sekali saja, ~2 menit):
 *   1. Buka https://script.google.com  ->  New project
 *   2. Hapus isi Code.gs, tempel SELURUH file ini
 *   3. Sesuaikan LABELS di bawah supaya PERSIS sama dengan GRUP_<LABEL> di .env
 *   4. Run > setup  -> klik Authorize, izinkan
 *   5. View > Logs  -> salin URL Form + SHEET_CSV_URL ke .env
 *   6. npm run check-sheet  -> harus lapor "dibaca/dipakai/dibuang"
 *
 * Sudah terlanjur punya Form? Jangan run setup lagi. Isi SS_ID di bawah lalu
 * Run > pasangBot -- itu menambahkan tab BOT ke Spreadsheet yang sudah ada.
 *
 * Nambah grup nanti (fase real): JANGAN run ulang setup (bikin Form + URL baru).
 * Edit pilihan dropdown "grup" langsung di editor Form -- 3 klik, tanpa kode.
 *
 * Hal yang sama berlaku buat MENGGANTI TIPE PERTANYAAN: Forms menghapus item lama lalu
 * menambah item baru, dan kolom lamanya TETAP TINGGAL di sheet respons. Urutan kolom
 * bergeser, rumus di tab BOT menunjuk kolom yang salah, dan hasilnya dibuang diam-diam.
 * Kalau tipe pertanyaan memang harus berubah: run setup lagi (Form + Sheet baru),
 * perbarui SHEET_CSV_URL, buang Form lama.
 */

// HARUS sama persis dengan GRUP_<LABEL> di .env. Salah ketik = reminder dibuang diam-diam.
const LABELS = ['TEST'];   // fase real: ['CNC', 'PUBMEDSOS', 'MEDKOM', ...]

// Spreadsheet yang SUDAH ada, buat pasangBot(). Potongan URL antara /d/ dan /edit.
const SS_ID = 'ISI_ID_SPREADSHEET_DI_SINI';   // dicetak oleh setup(); lihat View > Logs

function setup() {
  const form = FormApp.create('BRAMA - Reminder Dadakan');
  form.setDescription(
    'Reminder tambahan di luar jadwal utama. Bot ngecek tiap 60 detik dan ' +
    'mengirim begitu tanggal+jam-nya lewat. Tidak bisa ditarik setelah terkirim.'
  );

  // Kalender & jam bawaan Google: pengisi tidak bisa salah format.
  form.addDateItem().setTitle('tanggal').setRequired(true).setIncludesYear(true)
    .setHelpText('Pilih di kalender.');

  form.addTimeItem().setTitle('jam').setRequired(true)
    .setHelpText('Jam kirim, 24 jam. 19:30, bukan 7:30 PM.');

  // Dropdown, bukan isian bebas: label ngasal = reminder dibuang tanpa error.
  form.addListItem().setTitle('grup').setRequired(true).setChoiceValues(LABELS);

  form.addParagraphTextItem().setTitle('pesan').setRequired(true)
    .setHelpText('Teks yang dikirim apa adanya ke grup. Boleh beberapa baris.');

  const ss = SpreadsheetApp.create('BRAMA - Reminder Dadakan (respons)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();

  const bot = tabBot(SpreadsheetApp.openById(ss.getId()));

  // Bot menarik CSV tanpa login, jadi filenya harus bisa dibaca siapa saja yang punya link.
  DriveApp.getFileById(ss.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  lapor(ss, bot, form);
}

/** Pasang/segarkan tab BOT di Spreadsheet yang sudah ada. Form tidak disentuh. */
function pasangBot() {
  if (!SS_ID) throw new Error('Isi SS_ID dulu di atas.');
  const ss = SpreadsheetApp.openById(SS_ID);
  const bot = tabBot(ss);
  DriveApp.getFileById(SS_ID).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  lapor(ss, bot, null);
}

/**
 * Tab turunan yang dibaca bot. ALASANNYA, jangan dihapus:
 *
 * Tab respons Form menyimpan tanggal & jam sebagai NILAI, dan Google mengekspornya
 * sesuai locale -- `8/28/2026`, `6:27:00 PM`. Terbukti 2026-08-28: baik gviz (termasuk
 * dengan klausa `format`) maupun `/export?format=csv` sama-sama mengabaikan format kolom
 * yang dipasang skrip, karena Forms menimpa format kolom respons setiap kali ada jawaban
 * masuk. isDue() tidak akan pernah cocok, dan bot DIAM SAJA.
 *
 * TEXT() mengubahnya jadi teks di tab lain, yang tidak ikut ditimpa Forms. Rumusnya satu
 * sel; kolom-kolomnya persis kontrak `Reminder` di lib/sources.ts.
 *
 * Bonus: `id` diambil dari Timestamp, bukan nomor baris. Menghapus baris di tab respons
 * tidak lagi menggeser id, jadi tidak bisa bikin reminder lama terkirim ulang.
 */
function tabBot(ss) {
  const resp = ss.getSheets().filter(function (s) { return s.getFormUrl(); })[0];
  if (!resp) throw new Error('Tab respons Form tidak ketemu di spreadsheet ini.');
  const R = "'" + resp.getName() + "'!";

  const bot = ss.getSheetByName('BOT') || ss.insertSheet('BOT');
  bot.clear();
  bot.getRange(1, 1, 1, 5).setValues([['id', 'tanggal', 'jam', 'grup', 'pesan']]);
  bot.getRange('A2').setFormula(
    '=IFERROR(FILTER({' +
      '"gf-"&TEXT(' + R + 'A2:A,"yyyymmdd-hhmmss"),' +   // id <- Timestamp, stabil
      'TEXT(' + R + 'B2:B,"yyyy-mm-dd"),' +              // tanggal
      'TEXT(' + R + 'C2:C,"hh:mm"),' +                   // jam, 24 jam (tanpa AM/PM)
      R + 'D2:D,' +                                      // grup
      R + 'E2:E' +                                       // pesan
    '},LEN(' + R + 'E2:E)),"")'
  );
  SpreadsheetApp.flush();
  return bot;
}

function lapor(ss, bot, form) {
  const csv = 'https://docs.google.com/spreadsheets/d/' + ss.getId() +
              '/gviz/tq?tqx=out:csv&headers=1&gid=' + bot.getSheetId();
  Logger.log('=========== TEMPEL KE .env ===========');
  Logger.log('SHEET_CSV_URL=' + csv);
  Logger.log('');
  if (form) {
    Logger.log('Form (bagikan ke pengurus) : ' + form.getPublishedUrl());
    Logger.log('Form (buat diedit)         : ' + form.getEditUrl());
  }
  Logger.log('Spreadsheet                : ' + ss.getUrl());
  Logger.log('Cek tab BOT baris 2        : ' + JSON.stringify(bot.getRange(2, 1, 1, 5).getDisplayValues()[0]));
  Logger.log('======================================');
}
