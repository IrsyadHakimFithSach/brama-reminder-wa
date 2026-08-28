# BRAMA — bot pengingat WhatsApp organisasi

Bot pengingat satu arah. Baca jadwal dari 3 sumber, kirim ke grup WhatsApp yang
sudah didaftarkan. Masa pakai: **Agustus–Desember 2026**, jalan terus di laptop.

> **SELALU UPDATE FILE INI.** Setiap kali kamu mengubah struktur, menambah/menghapus
> sumber, mengganti kontrak data, mengubah nama env var, atau menemukan jebakan
> baru — perbarui CLAUDE.md di commit yang sama. Agent berikutnya cuma punya file
> ini sebagai konteks. Bagian yang wajib ikut berubah: **Struktur**, **Kontrak data**,
> **Env**, **Aturan yang tidak boleh dilanggar**, dan **Catatan perubahan** (tambahkan
> entri bertanggal di paling bawah). Kalau CLAUDE.md tidak lagi cocok dengan kode,
> itu bug.

## Aturan yang tidak boleh dilanggar

1. **Jangan pernah menghapus folder session.** `brama_sessions/` = identitas login.
   Hilang → harus scan QR ulang → bot mati sampai ada orang di depan laptop.
   Repo asal (`bot-wa-baileys`) punya `clearSessionAndRestart()` yang menghapus folder
   session saat `loggedOut`. **Fungsi itu sudah dibuang di sini.** Jangan
   dikembalikan, jangan menambahkan penghapusan file ke path session mana pun.
2. **Proses tidak boleh mati sendiri.** `unhandledRejection` dan `uncaughtException`
   dicatat, bukan bikin exit. Error per sumber (Sheet offline, JSON rusak) di-`catch`
   sendiri supaya sumber lain tetap jalan. Jangan tambahkan `process.exit()`.
3. **Tandai terkirim SETELAH sukses**, bukan sebelum. Kalau gagal kirim, biarkan
   dicoba lagi di tick berikutnya.
4. **`DRY_RUN=true` adalah default.** Jangan diubah jadi default `false` — ini grup
   organisasi beneran, salah kirim tidak bisa ditarik.

## Struktur

```
index.ts                  entrypoint: tick 60s, resolve grup, batch, kirim, catat state
check.ts                  self-check tanpa framework (npm run check)
test-blast.ts             npm run test-blast -> 6 reminder uji jarak 10 menit lewat SUMBER 3.
                          `jadwalUji()` murni & diuji di check.ts; main() dijaga argv supaya
                          import dari check.ts tidak ikut menulis file.
chat.ts                   npm run chat -- <nomor|jid> "<pesan>" -> kirim SATU pesan manual lewat
                          sesi yang sudah login, lalu keluar. Bukan bagian bot pengingat:
                          tidak baca sumber, tidak sentuh state.json, tidak peduli DRY_RUN.
diag.ts                   SEMENTARA - diagnostik kirim ke grup (`not-acceptable`). Hapus kalau selesai.
cnc-to-csv.ts             npm run csv-cnc -> schedule_reminder_cnc.csv (format boss) jadi
                          konteks/schedule_reminder.csv (format kontrak). `petakan()` murni &
                          diuji di check.ts; main() dijaga argv supaya import tidak menulis file.
check-sheet.ts            npm run check-sheet -> tarik SHEET_CSV_URL, lapor dibaca/dipakai/dibuang
                          + alasan tiap baris. Sumber 2 di loader sengaja diam; ini yang berisik.
setup-gform.gs            Apps Script, dijalankan di script.google.com. `setup()` bikin Form +
                          Spreadsheet SUMBER 2 (sudah dijalankan 2026-08-28, jangan diulang: bikin
                          Form baru). `pasangBot()` menambah/menyegarkan tab BOT di Sheet yang ada.
                          Bukan runtime bot: tidak pernah di-import, tidak ikut npm run check.
lib/baileys.ts            core koneksi WhatsApp (salinan bot-wa-baileys, tanpa hapus-session)
lib/utils.ts              helper (formatPhone, generate QR png, dll) — salinan apa adanya
lib/sources.ts            3 loader sumber + parseCSV + isDue
konteks/schedule_reminder.csv   SUMBER 1 yang DIBACA BOT. Bukan tulisan tangan - keluaran
                                `npm run csv-cnc`. Jangan disunting manual, akan tertimpa.
schedule_reminder_cnc.csv       SUMBER 1 ASLI dari boss — 59 reminder CnC Agu-Des 2026.
                                Skemanya beda; JANGAN diubah, adapternya yang menyesuaikan.
config/reminders.json           SUMBER 3 — reminder manual
data/state.json           id yang sudah terkirim (gitignored, jangan dihapus sembarangan)
.env / .env.example       daftar putih grup + setelan
arsitektur.png.png        diagram rancangan asli

sop-docx.py               python sop-docx.py -> SOP.md jadi SOP.docx (pakai python-docx yang
                          sudah terpasang; pandoc/LibreOffice tidak ada di mesin ini).
                          MENOLAK menimpa SOP.docx yang sudah ada tanpa --force.
prosedur.md               panduan OPERATOR (teknis): pasang, uji, pindah fase, pulihkan
SOP.md                    SOP ORGANISASI (non-teknis, draf) — nanti jadi versi Word
.claude/prds/brama-reminder-wa.prd.md
                          PRD: problem, metrik, 6 milestone, keputusan yang belum diambil
```

Tiga dokumen di atas saling merujuk. Kalau alur atau kontrak data berubah, **ketiganya ikut
diperbarui di commit yang sama**, bukan cuma CLAUDE.md.

## Jebakan yang sudah ditutup — jangan diulang

**`schedule_reminder_cnc.csv` dulu dibuang 59 dari 59 baris, tanpa satu pun error.**
`rowsToReminders()` mencari kolom `tanggal/jam/grup/pesan`; CSV nyata memakai
`tanggal_reminder / proker_diinfokan / pesan_reminder`, dan `.filter()` di ujungnya
membuang baris tak lengkap **diam-diam**.

Ditutup 2026-08-28 oleh `cnc-to-csv.ts`: `dibaca 59 / dipakai 80 / dibuang 0`,
dan `fromCSV()` membacanya balik jadi 80 reminder (CnC 59, Pubmedsos 13, Medkom 8).

Yang tetap berlaku selamanya: **jangan menganggap sumber CSV berfungsi sampai ada laporan
`dibaca N / dipakai M / dibuang K + alasan`.** Kegagalan senyap adalah kelas bug paling
mahal di proyek ini — semua loader baru wajib melaporkan yang dibuang, bukan diam.
Sudah ada dua pelapor: `npm run csv-cnc` (sumber 1) dan `npm run check-sheet` (sumber 2).

## Fase pemakaian

| Fase | Grup | Blocker |
|---|---|---|
| 1. Testing | 1 grup test | butuh JID grup test dari operator |
| 2. Sumber CnC asli terbaca | masih grup test | **selesai** — 59 baris jadi 80 reminder, 0 dibuang |
| 3. Google Form dadakan | masih grup test | **selesai & terbukti** - `dibaca 1 / dipakai 1 / dibuang 0` |
| 4. Uji tahan mati-hidup | masih grup test | — |
| 5. Real | grup proker asli | nomor bot harus di-add ke grup proker |
| 6. Serah terima | — | SOP versi Word |

**Fase 1–4 sengaja tidak bergantung pada akses grup proker.** Rancangan pertama gagal justru
karena seluruh rencananya bergantung pada group ID yang tidak dimiliki. Jangan mengulanginya.

**Identitas nomor bot (diputuskan 2026-08-28):** fase testing pakai **nomor operator**,
fase real pakai **nomor baru khusus bot**. Konsekuensinya: saat pindah ke fase real akan ada
scan QR ulang dan `state.json` mulai dari nol (itu diinginkan), dan **nomor baru itu harus
di-add ke tiap grup proker lebih dulu** — pekerjaan orang, bukan pekerjaan kode, jadi mulai
lebih awal. Eksekusi uji fase 1 dilakukan manual oleh operator, bukan oleh agent.

## Cara kerja (1 tick = 60 detik)

1. Baca 3 sumber → `Reminder[]`.
2. Saring: `id` belum ada di `data/state.json` **dan** `isDue()` (tanggal = hari ini,
   jam sudah lewat, pakai waktu lokal laptop).
3. Label `grup` di-resolve ke JID lewat `GRUP_<LABEL>` di `.env`.
   Label tidak dikenal → **dibuang + dicatat di log** (sekali per label per run,
   bukan tiap tick, supaya log tidak banjir).
4. Beberapa reminder untuk grup yang sama → **digabung jadi 1 pesan**, dipisah baris kosong.
5. Kirim, jeda `SEND_GAP_MS` antar grup, lalu tulis `data/state.json` secara atomik
   (tulis `.tmp` lalu rename).

## Kontrak data

Semua sumber menghasilkan bentuk yang sama (`Reminder` di `lib/sources.ts`):

| kolom     | format       | contoh                        |
|-----------|--------------|-------------------------------|
| `id`      | unik & stabil| `rapat-2026-09-01`            |
| `tanggal` | `YYYY-MM-DD` | `2026-09-01`                  |
| `jam`     | `HH:MM` (24j)| `08:00`                       |
| `grup`    | LABEL        | `INTI`                        |
| `pesan`   | teks bebas   | `Rapat jam 09.00 ...`         |

`id` **harus stabil**. Kalau `id` berubah tiap poll, pesan yang sama akan terkirim
berulang. Untuk CSV/Sheet tanpa kolom `id`, fallback-nya nomor baris — aman selama
baris tidak disisipkan di tengah.

- **Sumber 1 (CSV)** — header wajib: `id,tanggal,jam,grup,pesan`. Parser sendiri di
  `parseCSV()`, sudah tahan koma, tanda kutip, **dan newline** di dalam teks (sudah dicek —
  pesan multi-baris CnC aman).
- **Sumber 1 versi nyata (`schedule_reminder_cnc.csv`)** — skemanya beda, **adapternya
  `cnc-to-csv.ts`** (`npm run csv-cnc`). CSV asli dari boss dibiarkan apa adanya, kode yang
  menyesuaikan, supaya CSV proker lain berformat sama tinggal dilewatkan ke skrip yang sama.
  Pemetaannya:

  | kolom CSV asli | → | field `Reminder` |
  |---|---|---|
  | `id_reminder` | → | bagian dari `id`: `cnc-CNC-001-CnC` |
  | `tanggal_reminder` | → | `tanggal` (sudah `YYYY-MM-DD`) |
  | *(tidak ada)* | → | `jam` ← konstanta `JAM` di `cnc-to-csv.ts`, **`18:00`** |
  | `proker_diinfokan` | → | `grup`, **dipecah di tanda pipa** → 1 baris jadi N reminder |
  | `pesan_reminder` | → | `pesan` |

  Dua hal yang gampang salah, dua-duanya sudah dikunci dan diuji di `check.ts`:
  (a) `id` **wajib memuat label grup** — tanpa itu fan-out saling menimpa di `state.json`
  dan cuma satu grup yang dapat kiriman; (b) `id_reminder` sudah stabil, **pakai itu**,
  jangan nomor baris.

  11 kolom lain di CSV asli (`hari_reminder`, `tipe_reminder`, `nama_kegiatan`,
  `tanggal_deadline`, dst) sengaja **tidak dipakai** — sudah tercermin di `pesan_reminder`.
  `tipe_reminder` (`H-1` 39, `H` 18, `H-3` 1, `H-2` 1) baru perlu dilirik kalau nanti tiap
  tipe mau punya jam kirim sendiri; sekarang satu `JAM` untuk semua.
- **Sumber 2 (Sheet)** — Google Form → Spreadsheet, dibaca sebagai CSV lewat
  `SHEET_CSV_URL`. Header sama dengan CSV. Sheet mati = sumber ini balik `[]`, tidak
  menjatuhkan tick. **Form-nya dibuat oleh `setup-gform.gs`, bukan lewat UI** - judul
  pertanyaan Form ADALAH nama kolom (`tanggal/jam/grup/pesan`); kolom `Timestamp` bawaan
  Google lewat begitu saja karena `rowsToReminders()` memetakan lewat nama header, bukan
  posisi. Empat hal yang dikunci di skrip itu, jangan dilonggarkan:
  (a) `tanggal`/`jam` pakai **kalender & jam bawaan Google** (`addDateItem`/`addTimeItem`),
  jadi pengisi tidak bisa salah format;
  (b) bot **tidak membaca tab respons Form**, tapi tab turunan bernama **`BOT`** berisi satu
  rumus `FILTER({...TEXT(...)...})`. Wajib, bukan pemanis: tab respons menyimpan tanggal/jam
  sebagai NILAI, dan Google mengekspornya ikut locale (`8/28/2026`, `6:27:00 PM`). Terbukti
  2026-08-28 - gviz (termasuk dengan klausa `format`) **dan** `/export?format=csv` sama-sama
  mengabaikan format kolom yang dipasang skrip, karena **Forms menimpa format kolom respons
  tiap kali ada jawaban masuk**. `TEXT()` di tab lain tidak bisa ditimpa Forms. Jangan
  mencoba lagi mengunci format kolom; sudah gagal, sudah diukur.
  `id` di tab `BOT` diambil dari Timestamp (`gf-20260828-182400`), bukan nomor baris, jadi
  menghapus baris di tab respons tidak menggeser id;
  (c) `grup` **dropdown pilihan tunggal**, bukan kotak centang - centang ganda ditulis
  Sheets jadi satu sel `TEST, CNC`, dibaca sebagai satu label tak dikenal, dibuang diam-diam.
  Fan-out multi-grup ditunda sampai adapter CSV CnC dibuat: masalah yang sama, dikerjakan
  sekali di satu tempat;
  (d) file di-share **anyone-with-link view** - kalau tidak, gviz balas HTML halaman login
  dan `parseCSV()` menghasilkan 0 baris tanpa keluhan.
  `id` sumber ini = **nomor baris** (`sheet-3`), jadi menghapus baris di sheet respons
  menggeser id dan bisa bikin reminder lama terkirim ulang. Batalkan dengan mengosongkan
  kolom `pesan`, jangan hapus barisnya.
- **Sumber 3 (JSON)** — array objek dengan field yang sama.

## Env

Semua di `.env` (lihat `.env.example`). Dibaca pakai `process.loadEnvFile()` bawaan
Node — **tidak ada dependency dotenv, jangan tambahkan**.

`.env` dibaca **sekali saat start**, tidak ada reload. **Ubah `.env` = wajib restart bot.**
Sudah kena sekali 2026-08-28: `SHEET_CSV_URL` diperbarui sementara bot lama masih jalan,
jadi dia terus menarik sheet yang salah dan tidak mengirim apa-apa — tanpa error.

| var | arti |
|---|---|
| `GRUP_<LABEL>` | daftar putih. Isinya JID `...@g.us` |
| `SHEET_CSV_URL` | link CSV Google Sheet (kosong = sumber 2 mati). Dicetak `setup-gform.gs`. Bentuk gviz `.../gviz/tq?tqx=out:csv&headers=1&gid=<GID>` dipilih, bukan publish-to-web, karena publish-to-web men-cache ~5 menit - fatal buat reminder dadakan |
| `DRY_RUN` | `true` (default) = cuma log. `false` = kirim beneran |
| `TICK_MS` | default 60000 |
| `SEND_GAP_MS` | jeda antar grup, default 3000 |
| `SESSION_NAME` | default `brama` → folder `brama_sessions/` |

## Menjalankan

```bash
npm install
npm run check          # self-check, harus lolos sebelum ubah logika
npm run check-sheet    # buktikan SHEET_CSV_URL kebaca: dibaca/dipakai/dibuang + alasan
npm start              # QR muncul di terminal, scan sekali saja
```

Belum tahu JID grup? Jalankan `npm start` dengan `.env` tanpa `GRUP_*` sama sekali —
begitu terhubung, bot mencetak semua grup + JID siap tempel ke `.env`.

Setelah yakin: set `DRY_RUN=false` di `.env`, restart.

## Kalau bot ter-logout

Session **tidak** dihapus otomatis. Yang terjadi: bot mencetak peringatan lalu mencoba
menyambung ulang dengan backoff (30 detik, naik sampai 5 menit). Kalau memang harus
re-link: hentikan bot, **pindahkan** (arsipkan, jangan hapus) folder `brama_sessions`
ke nama lain seperti `brama_sessions.bak`, lalu `npm start` dan scan QR baru.

## Catatan teknis

- Dijalankan langsung `node index.ts` — Node >= 22 melucuti tipe TS sendiri, **tidak ada
  langkah build**, tidak ada `tsc`, tidak ada `ts-node`. Karena itu semua import relatif
  **wajib pakai ekstensi** (`./lib/sources.ts`), dan jangan pakai `enum`, `namespace`,
  atau parameter property — Node tidak bisa melucuti itu.
- `lib/baileys.ts` & `lib/utils.ts` disalin dari `../bot-wa-baileys/src/`. Kalau upstream
  diperbarui, salin ulang lalu **buang lagi `clearSessionAndRestart`** dan perbaiki
  import `./utils` menjadi `./utils.ts`.
- **Versi baileys di-pin `6.7.24` persis, tanpa `^`.** Sempat di `6.7.9`, tapi grup
  WhatsApp sekarang beralamat `@lid` dan 6.7.9 menolak kirim dengan `not-acceptable`
  (406). Harga upgrade: `makeInMemoryStore` hilang (store dibuang, tidak diganti —
  bot ini tidak pernah membaca pesan) dan bentuk export berubah (lihat butir di bawah).
  Jangan longgarkan pin ini tanpa menjalankan `npm start` sampai benar-benar TERHUBUNG.
- **Paket CommonJS + file ESM = named import gagal.** Sudah kena tiga kali:
  `@whiskeysockets/baileys` (diakali: `import baileys from ...` lalu di-destructure,
  `makeWASocket` ada di `.default`), `pino` (`Logger` jadi `import type`), dan
  `follow-redirects` (named import tipe yang tidak terpakai, dibuang). Kalau nanti
  muncul `does not provide an export named 'X'`, itu polanya — bukan paketnya rusak.
- Tipe hanya boleh diimpor dengan `import type`. Node melucuti tipe tanpa mengerti
  mana yang tipe dan mana yang nilai, jadi tipe yang diimpor biasa akan bocor jadi
  named import sungguhan lalu meledak saat runtime.
- Diagram menyebut `index.js`; di sini namanya `index.ts` (perannya sama).
- Waktu memakai zona laptop. Laptop pindah zona → jadwal ikut bergeser.
- Bot ini hanya mengirim. Handler pesan masuk sengaja tidak dipasang: saat konek,
  WhatsApp mengirim riwayat chat dan log akan banjir. Karena itu uji 6-reminder dipicu lewat
  `npm run test-blast` (belum dibuat), **bukan** perintah `.test` di chat grup — memasang
  perintah chat berarti memasang pembaca pesan masuk, dan itu mengubah sifat produknya.

## Catatan perubahan

- **2026-08-28** — rancangan awal. Koneksi disalin dari `bot-wa-baileys` (terbukti
  konek), `clearSessionAndRestart()` dihapus, reconnect diganti backoff tanpa hapus
  session, ditambah `storeTimer`/`reconnectTimer` supaya `initBailey()` berulang tidak
  menumpuk interval. 3 sumber + tick + state + daftar putih grup dibuat sesuai
  `arsitektur.png.png`. Isi sumber masih data contoh.
- **2026-08-28 (sore)** — hasil uji nyala pertama: QR tampil, `brama_sessions/` terbentuk,
  koneksi sempat putus lalu tersambung ulang **tanpa menghapus session** (perilaku
  no-kill terbukti). Perbaikan yang perlu dilakukan agar bisa start: pin baileys ke
  `6.7.9`, dan tiga perbaikan import CJS/ESM di `lib/`. `npm run check` lolos.
  Belum di-scan QR-nya dan `.env` masih placeholder.
- **2026-08-28 (malam)** — fase perencanaan. Ditulis `.claude/prds/brama-reminder-wa.prd.md`
  (PRD: problem, evidence, 6 milestone, 8 open question, perbandingan 3 skema nomor bot),
  `prosedur.md` (panduan operator, dengan penanda ✅/🟡/⬜ per bagian supaya tidak ada yang
  dikira sudah jadi), dan `SOP.md` (draf SOP organisasi, calon versi Word).
  **Temuan baru dari membaca data nyata:** (1) `schedule_reminder_cnc.csv` berisi 59 reminder
  dan **seluruhnya dibuang diam-diam** karena skemanya beda — lihat "Jebakan aktif";
  (2) CSV nyata tidak punya kolom `jam` sama sekali; (3) `proker_diinfokan` bernilai majemuk
  (`CnC|Pubmedsos`), jadi satu baris wajar jadi beberapa reminder;
  (4) `parseCSV()` sudah tahan newline di dalam quote, jadi pesan multi-baris aman.
  **Keputusan yang diambil:** adapter untuk CSV nyata (CSV asli tidak diubah),
  `npm run test-blast` sebagai pemicu uji (bukan perintah chat), Google Form + Sheet dirancang
  sekarang supaya bisa dipakai ulang di fase real cuma dengan menambah pilihan grup.
  **Masih terbuka:** identitas nomor bot, JID grup test, jam default, dan kebijakan
  kirim-telat saat laptop mati. Belum ada satu baris kode pun yang diubah pada tahap ini.
- **2026-08-28 (malam, lanjutan)** — keputusan operator: **nomor uji = nomor operator,
  nomor real = nomor baru khusus bot**; eksekusi uji fase 1 dilakukan manual oleh operator.
  Ditambahkan `test-blast.ts` + script `npm run test-blast`: 6 reminder uji jarak 10 menit,
  ditulis lewat **SUMBER 3** sehingga `index.ts` dan `lib/sources.ts` **tidak disentuh sama
  sekali**. Skripnya mempertahankan reminder manual, hanya membuang reminder uji run
  sebelumnya, menulis atomik (`.tmp` + rename), dan **menolak menulis kalau
  `config/reminders.json` rusak** — jangan diubah jadi menimpa. `check.ts` kini menguji
  `jadwalUji()` termasuk kasus lewat tengah malam (23:50 -> entri kedua jatuh 00:02 besok).
  `npm run check` lolos, `npm run test-blast` sudah dijalankan sekali dan hasilnya benar.
  **Belum dikerjakan:** adapter CSV CnC (jebakan aktif masih ada), laporan dibaca/dibuang,
  Google Form, dan uji kirim sungguhan — semuanya menunggu JID grup test dari operator.
- **2026-08-28 (15:30)** — **QR sudah discan, `brama_sessions/creds.json` terbentuk, login
  berhasil.** 250 grup terbaca. Grup uji dipilih: `GRUP_TEST=120363xxxxxxxxxxxx@g.us`
  ("ini test bot"). Placeholder `GRUP_INTI/PANITIA/PUBLIKASI` dimatikan — label terdaftar
  dengan JID ngawur bikin pengingat "terkirim" ke ruang hampa tanpa error.
  Dua bug ikut diperbaiki: (1) script `groups` dulu **identik** dengan `start` sehingga tidak
  pernah memaksa apa pun — sekarang `node index.ts --groups`, dan daftar grup tercetak
  walaupun `.env` sudah terisi; (2) `lib/baileys.ts` dulu hanya menulis `brama.qr.png`
  saat `plugin=true` — guard dilepas supaya PNG **selalu** ditulis (QR ASCII tidak selalu
  bisa dipindai). Ini **divergensi ke-3** dari upstream, ikut dibuang lagi kalau menyalin
  ulang `lib/baileys.ts`. `npm run check` lolos.
  **Jebakan yang ditemukan tapi BELUM ditangani:** label auto-generate di `printGroups()`
  dipotong 20 karakter dan non-alnum diganti `_`, jadi **banyak label bentrok** (mis. tiga
  grup berbeda sama-sama jadi `GRUP_SS_GOES_TO_PROBIN`). Kalau ditempel bulat-bulat ke
  `.env`, yang belakangan diam-diam menimpa yang duluan. Tempel manual satu per satu, atau
  perbaiki `printGroups()` sebelum fase real.
  **Sisa langkah fase 1 ada di tangan operator:** set `DRY_RUN=false` lalu `npm start`.
- **2026-08-28 (sore, lanjutan)** - **SUMBER 2 SUDAH ADA WUJUDNYA.** `setup-gform.gs`
  dijalankan operator di script.google.com; Form + Spreadsheet terbentuk, di-share
  anyone-with-link, `SHEET_CSV_URL` (bentuk gviz) sudah masuk `.env`. Diverifikasi dari
  sisi bot, bukan diasumsikan: `npm run check-sheet` -> `HTTP 200`, header
  `timestamp | tanggal | jam | grup | pesan`, `dibaca 0 / dipakai 0 / dibuang 0`
  (belum ada yang mengisi Form). **`index.ts` dan `lib/sources.ts` tidak disentuh sama
  sekali** - Form-nya yang dibentuk supaya cocok dengan kontrak yang sudah ada.
  Ditambah `check-sheet.ts` + `npm run check-sheet`: laporan `dibaca/dipakai/dibuang +
  alasan per baris`, plus deteksi respons HTML (Sheet belum di-share = loader diam-diam
  dapat 0 baris). Ini laporan "dibaca/dibuang" pertama yang benar-benar ada di proyek
  ini; pola yang sama masih utang untuk Sumber 1.
  **Jebakan yang tertangkap saat run pertama:** `getRange('D:E').setNumberFormat()`
  ditolak Sheets ("tindakan tingkat kolom") tapi **errornya tidak menghentikan skrip** -
  log sukses tetap tercetak seolah semua beres. Sudah diperbaiki jadi satu kolom per
  panggilan, plus `fixFormat()` untuk membetulkan sheet yang terlanjur dibuat.
  **Sisa langkah:** Run `fixFormat`, isi Form sekali sebagai uji, jalankan
  `npm run check-sheet`, dan pastikan `tanggal` keluar `2026-09-01` bukan `01/09/2026`.
  Sebelum itu, sumber 2 belum boleh dianggap jalan.
- **2026-08-28 (sore, lanjutan 2)** - uji isi Form pertama: kotak `tanggal` **merah terus**
  padahal formatnya benar. Sebabnya bukan Google, tapi `'^\d{4}-\d{2}-\d{2}$'` di
  `setup-gform.gs`: string JS, `\d` ditelan, yang tersimpan di Form jadi
  `^d{4}-d{2}-d{2}$` (menuntut huruf `d` harfiah). Ketahuan dengan membaca pola yang
  benar-benar tersimpan dari HTML `viewform` publik, bukan dari membaca ulang kode.
  Pola `jam` selamat justru karena tidak memakai backslash sama sekali. Diperbaiki jadi
  `[0-9]`, ditarik ke konstanta `RE_TANGGAL`/`RE_JAM` supaya `setup()` dan `fix()` tidak
  bisa lagi beda. `fixFormat()` diganti `fix()` yang membetulkan validasi Form **dan**
  format kolom sheet sekaligus, tanpa membuat Form baru.
- **2026-08-28 (sore, lanjutan 3)** - `tanggal`/`jam` diganti ke **kalender & jam bawaan
  Google** (`addDateItem`/`addTimeItem`) atas permintaan operator; jauh lebih enak diisi
  lewat HP dan menghapus seluruh kelas salah-format di sisi pengisi. Regex + `validasi()`
  dibuang. Yang menjaga kontrak sekarang **hanya `kunciFormat()`** - kalau format kolom
  lepas, ekspor CSV ikut locale dan semua reminder Sumber 2 mati diam-diam. `fix()`
  disederhanakan jadi pemasang ulang format kolom saja.
  **Ganti tipe pertanyaan = wajib bikin Form baru.** Forms menghapus item lama lalu
  menambah item baru, tapi kolom lama TETAP TINGGAL di sheet respons; header jadi
  `tanggal, jam, ..., tanggal, jam` dan `indexOf()` mengambil kolom lama yang kosong ->
  semua baris dibuang tanpa error. Karena itu Form pertama dibuang, bukan diedit, dan
  `SHEET_CSV_URL` diperbarui.
  **Belum diverifikasi:** apakah ekspor gviz benar-benar mengeluarkan `2026-09-01`/`08:00`
  untuk nilai tanggal/waktu. `npm run check-sheet` sesudah satu isian percobaan adalah
  buktinya. Kalau ternyata ikut locale, rencana cadangan: tab kedua berisi
  `=TEXT(B2:B,"yyyy-mm-dd")` dan `SHEET_CSV_URL` diarahkan ke tab itu.
- **2026-08-28 (malam)** - uji isi Form pertama lewat kalender: `npm run check-sheet` ->
  `DIBUANG sheet-1: tanggal "8/28/2026" bukan YYYY-MM-DD; jam "6:27:00 PM" bukan HH:MM`.
  Penguncian format kolom (`kunciFormat()`) **tidak menempel**: Forms menimpa format kolom
  respons setiap kali jawaban masuk. Diukur pada sheet nyata, bukan ditebak - gviz dengan
  klausa `format B 'yyyy-MM-dd'` dan `/export?format=csv` dua-duanya tetap keluar
  `8/28/2026`. `kunciFormat()` dan `fix()` dibuang.
  Gantinya **tab `BOT`**: satu sel rumus `=IFERROR(FILTER({...TEXT(...)...},...))` yang
  mengubah nilai jadi teks di tab lain, yang tidak ikut ditimpa Forms. `SHEET_CSV_URL`
  sekarang menunjuk gid tab `BOT`. Sekalian `id` diambil dari Timestamp
  (`gf-20260828-182400`) menggantikan nomor baris, sehingga bahaya "hapus satu baris ->
  reminder lama terkirim ulang" hilang.
  `pasangBot()` memasang tab itu ke Spreadsheet yang sudah ada, jadi Form dan URL-nya
  tidak perlu dibuat ulang lagi. `index.ts` dan `lib/sources.ts` masih belum disentuh.
  Catatan buat agent berikutnya: **tiga percobaan menjaga format tanggal sudah gagal**
  (regex `\d` yang ditelan JS, format kolom yang ditolak Sheets, format kolom yang
  ditimpa Forms). Yang bertahan cuma mengubahnya jadi teks di luar jangkauan Forms.
- **2026-08-28 (malam, lanjutan)** - **SUMBER 2 SELESAI DAN TERBUKTI.** `pasangBot()`
  dijalankan, `SHEET_CSV_URL` diarahkan ke gid tab `BOT`. Diperiksa dari dua sisi:
  CSV mentah `"gf-20260828-182400","2026-08-28","18:27","TEST","..."` dan
  `npm run check-sheet` -> `dibaca 1 / dipakai 1 / dibuang 0`. Kontrak `Reminder`
  terpenuhi tanpa satu baris pun diubah di `index.ts` / `lib/sources.ts`.
  Sisa fase 3: kirim sungguhan ke grup test lewat Form (jam beberapa menit ke depan,
  `DRY_RUN=false`).
- **2026-08-28 (malam, akhir)** - `SOP.md` dijadikan `SOP.docx` lewat `sop-docx.py`
  (85 paragraf, 9 tabel). Konverternya ditulis sendiri, ~110 baris, karena `python-docx`
  sudah terpasang sementara pandoc/LibreOffice tidak ada - tidak ada dependency baru.
  Cuma menangani konstruksi yang dipakai SOP.md; kalau nanti dipakai konstruksi baru,
  tambahkan di situ. Skripnya **menolak menimpa `SOP.docx` tanpa `--force`**: berkas itu
  akan disunting manual di Word untuk bagian fase real, dan menimpanya = menghapus
  pekerjaan orang. Sumber kebenaran tetap `SOP.md`; `.docx` adalah keluaran, bukan asal.
- **2026-08-28 (malam, akhir 2)** - **JEBAKAN AKTIF DITUTUP.** `cnc-to-csv.ts` +
  `npm run csv-cnc`: `dibaca 59 / dipakai 80 / dibuang 0`, `per grup: CnC=59, Pubmedsos=13,
  Medkom=8`, dan `fromCSV()` membacanya balik jadi 80 reminder. Keputusan operator:
  **CSV disamakan ke format tab `BOT`**, bukan bot yang menyesuaikan tiap skema - satu
  kontrak untuk ketiga sumber. `index.ts` dan `lib/sources.ts` tetap tidak disentuh
  sepanjang seluruh pekerjaan sumber 1 & 2.
  `konteks/schedule_reminder.csv` sekarang **keluaran skrip, bukan tulisan tangan** -
  data contoh lama tertimpa. `petakan()` murni dan diuji di `npm run check` (fan-out,
  id memuat label, tolak tanggal salah format, alasan penolakan disebut).
  **Jam kirim diputuskan operator: `JAM = '18:00'`** untuk semua 80 reminder (CSV asli
  tidak punya kolom jam). Satu konstanta di `cnc-to-csv.ts`; ubah lalu `npm run csv-cnc`.
