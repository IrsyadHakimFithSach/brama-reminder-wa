# PROSEDUR BRAMA — panduan operator

Dokumen ini untuk **kamu, operator bot**. Isinya cara memasang, menguji, memindahkan ke
grup asli, dan memperbaiki kalau rusak. Bahasanya teknis dan boleh menyebut perintah.

Dokumen untuk **organisasi** (boss & pengurus) ada di `SOP.md` — itu yang nanti dijadikan
versi Word. Kalau kamu mengubah alur di sini, cek apakah `SOP.md` ikut berubah.

Rancangan produk & keputusan yang belum diambil: `.claude/prds/brama-reminder-wa.prd.md`.

---

## 0. Status pembangunan — baca ini dulu

Tidak semua yang ditulis di sini sudah jadi. Penanda:

| Tanda | Arti |
|---|---|
| ✅ | Sudah ada dan sudah diuji |
| 🟡 | Sudah ada tapi belum diuji sampai tuntas |
| ⬜ | **Belum dibuat.** Menunggu `/plan` dan implementasi |

| Bagian | Status |
|---|---|
| Koneksi WhatsApp, QR, session tidak terhapus | 🟡 QR tampil & session terbentuk, tapi belum pernah discan sampai kirim beneran |
| Tick 60 detik, daftar putih grup, gabung pesan, catat state | 🟡 kode ada, belum pernah jalan dengan grup asli |
| Baca CSV format kontrak (`id,tanggal,jam,grup,pesan`) | ✅ |
| Baca CSV proker asli (`schedule_reminder_cnc.csv`) | ✅ `npm run csv-cnc` → 59 baris jadi 80 reminder, 0 dibuang |
| Laporan "dibaca N / dibuang M + alasan" | ✅ `npm run csv-cnc` & `npm run check-sheet` |
| `npm run test-blast` (6 reminder test) | ✅ ada, ikut diuji `npm run check` |
| Sumber Google Form → Spreadsheet | ✅ terbukti: isian Form terbaca bot, `dibaca 1 / dipakai 1 / dibuang 0` |
| Kirim sungguhan ke grup asli | ⬜ belum, dan sengaja dikunci sampai fase real |

Jangan menganggap bot ini sudah berfungsi sampai bagian 3 di bawah kamu lakukan sendiri
dan pesannya benar-benar muncul di grup test.

---

## 1. Apa yang sebenarnya dilakukan bot ini

Satu kalimat: **tiap 60 detik bot melihat daftar jadwal, mengambil yang sudah waktunya
dan belum pernah dikirim, lalu mengirimkannya ke grup WhatsApp yang terdaftar.**

Bot ini **hanya mengirim**. Dia tidak membaca pesan orang, tidak menjawab, tidak menerima
perintah lewat chat. Itu keputusan sadar, bukan kekurangan — lihat bagian 9.

Satu putaran (disebut **tick**):

```
 1. Baca 3 sumber jadwal          -> kumpulan reminder
 2. Buang yang id-nya sudah ada di catatan terkirim
 3. Buang yang belum waktunya     (tanggal != hari ini, atau jam belum lewat)
 4. Terjemahkan LABEL grup -> JID  lewat daftar putih di .env
       label tidak dikenal        -> DIBUANG + dicatat di log
 5. Gabung reminder untuk grup yang sama jadi 1 pesan
 6. Kirim per grup, dijeda beberapa detik
 7. SETELAH sukses, catat id-nya  -> tidak akan terkirim dua kali
```

Kenapa dicatat **setelah** sukses, bukan sebelum: kalau dicatat duluan lalu pengirimannya
gagal, reminder itu hilang selamanya tanpa ada yang tahu. Dengan urutan sekarang, yang
gagal cukup dicoba lagi tick berikutnya.

### Tiga sumber jadwal

| # | Sumber | Untuk apa | Siapa yang isi |
|---|---|---|---|
| 1 | CSV proker (`schedule_reminder_cnc.csv`) | Jadwal utama satu kepengurusan, sudah disusun jauh hari | Boss / koordinator, di Excel |
| 2 | Google Form → Spreadsheet | Reminder **dadakan** yang tidak ada di jadwal utama | Pengurus mana pun, lewat HP |
| 3 | `config/reminders.json` | Reminder manual / darurat / tes | Operator, langsung di laptop |

Ketiganya berujung ke bentuk yang sama. Kalau salah satu mati (misal internet putus,
Sheet dihapus), **dua sisanya tetap jalan**. Itu wajib, jangan diubah.

---

## 2. Fase kerja

Bot ini dipasang bertahap. Jangan lompat.

| Fase | Tujuan | Grup | Mode kirim | Blocker |
|---|---|---|---|---|
| **1. Testing** | Membuktikan pesan benar-benar sampai | 1 grup test | `DRY_RUN=false` (tapi cuma ke grup test) | butuh JID grup test |
| **2. Sumber asli** | 59 baris CnC terbaca semua, tidak ada yang hilang | masih grup test | tetap grup test | **selesai** |
| **3. Form dadakan** | Pengurus non-teknis bisa nambah reminder | masih grup test | tetap grup test | isi Form sekali + `npm run check-sheet` (bagian 6) |
| **4. Uji tahan banting** | Bot pulih dari putus koneksi & restart laptop | masih grup test | tetap grup test | — |
| **5. Real** | Grup proker asli | grup proker | `DRY_RUN=false` | **butuh nomor bot di-add ke grup proker** |
| **6. Serah terima** | Organisasi bisa jalan tanpa kamu | — | — | SOP versi Word |

Fase 1–4 **tidak butuh akses grup proker sama sekali**. Ini disengaja: percobaan
sebelumnya gagal justru karena semua rencana bergantung pada group ID yang tidak kamu
punya. Kerjakan fase 1–4 sampai tuntas sambil menunggu akses.

---

## 3. Memasang dari nol

### 3.1 Syarat

- Node.js **versi 22 ke atas** (`node -v`). Di bawah itu bot tidak akan jalan sama sekali,
  karena file `.ts` dijalankan langsung tanpa proses build.
- HP dengan WhatsApp aktif untuk scan QR.
- Laptop yang bisa dibiarkan menyala.

### 3.2 Pasang

```bash
cd "D:\VS CODE\CLAUDE\BRAMA"
npm install
npm run check        # self-check. Harus lolos sebelum lanjut.
```

Kalau `npm run check` gagal, **berhenti**. Jangan lanjut ke `npm start` — perbaiki dulu.

### 3.3 Siapkan .env

```bash
copy .env.example .env      # PowerShell / cmd
```

Isi belakangan. Untuk langkah berikutnya, `.env` justru **harus dibiarkan tanpa
`GRUP_*` sama sekali**.

### 3.4 Ambil JID grup test

`JID` = ID grup WhatsApp, bentuknya seperti `120363xxxxxxxxxxxx@g.us`. Ini yang tidak kamu
punya untuk grup proker, dan inilah yang menggagalkan rancangan pertama.

Caranya:

1. Pastikan `.env` **tidak punya baris `GRUP_*`** satu pun.
2. `npm start`
3. QR muncul di terminal. Scan dari HP: **WhatsApp → Perangkat tertaut → Tautkan perangkat**.
4. Begitu tersambung, bot mencetak **daftar semua grup yang diikuti nomor itu, lengkap
   dengan JID-nya**.
5. Salin JID grup test.
6. Hentikan bot (`Ctrl+C`).

> Bot hanya bisa melihat grup yang **nomornya sudah jadi anggota**. Kalau nomor bot belum
> di-add ke grup proker, grup itu tidak akan muncul — tidak ada jalan pintas. Ini alasan
> fase 5 diblokir sampai boss meng-add nomor bot.

### 3.5 Isi .env

```dotenv
GRUP_TEST=120363xxxxxxxxxxxx@g.us     # tempel JID grup test di sini

SHEET_CSV_URL=https://...gviz/tq?tqx=out:csv&headers=1&gid=...   # sudah terisi, lihat bagian 6
DRY_RUN=true                           # JANGAN diubah dulu
TICK_MS=60000
SEND_GAP_MS=3000
SESSION_NAME=brama
```

Aturannya: **label di `.env` harus sama persis dengan yang ditulis di kolom grup pada
sumber jadwal.** `GRUP_TEST` cocok dengan label `TEST`. Label yang tidak ada di `.env`
akan dibuang dan dicatat di log — pengingatnya tidak terkirim ke mana-mana.

### 3.6 Jalan pertama dengan mode aman

```bash
npm start
```

`DRY_RUN=true` artinya bot melakukan **semuanya kecuali benar-benar mengirim**. Log akan
menunjukkan pesan apa yang *akan* dikirim ke grup mana. Baca log itu baik-baik:

- Grupnya benar?
- Isi pesannya benar?
- Jumlahnya masuk akal?

Baru setelah tiga jawaban itu "ya", ganti `DRY_RUN=false` di `.env` dan restart.

---

## 4. Uji 6 reminder dalam 1 jam ✅

**Nomor yang dipakai untuk uji: nomor kamu sendiri** (keputusan 2026-08-28). Untuk fase
real nanti dipakai nomor baru khusus bot — artinya nanti scan QR ulang dan mulai dari
session bersih. Itu memang diinginkan supaya reminder uji tidak terbawa ke grup asli.

Urutan lengkap, dijalankan manual olehmu:

```bash
# 1. pastikan .env sudah punya GRUP_TEST=<jid>@g.us   (cara ambil JID: bagian 3.4)
# 2. bikin 6 reminder uji
npm run test-blast

# 3. periksa keluarannya: 6 baris jam, tujuan grup benar, tidak ada tanda "!!"
# 4. kalau sudah yakin, set DRY_RUN=false di .env
# 5. nyalakan bot dan biarkan ~1 jam
npm start
```

Perintah `test-blast` membuat 6 reminder ke grup berlabel `TEST`, berjarak 10 menit
(sekarang+2, +12, +22, +32, +42, +52 menit), dengan id unik per jalan sehingga boleh
diulang berkali-kali tanpa bentrok catatan terkirim. Label lain bisa dipakai dengan
`npm run test-blast -- NAMALABEL`.

Yang dilakukan perintah itu pada `config/reminders.json`:

- Reminder uji dari run **sebelumnya** dibuang, supaya tidak menumpuk.
- Reminder **manual** (`id` yang tidak diawali `test-`) **selalu dipertahankan**.
- Kalau file itu rusak, perintah **menolak menulis** dan tidak mengubah apa pun — jangan
  diakali, perbaiki dulu isinya.

Perintah ini juga memperingatkan sendiri kalau `GRUP_TEST` belum ada di `.env`, kalau
`DRY_RUN` masih `true`, dan kalau jadwalnya melewati tengah malam.

**Kenapa lewat perintah terminal, bukan ketik `.test` di grup WhatsApp:** memasang perintah
chat berarti memasang pembaca pesan masuk. Begitu bot konek, WhatsApp mengirimkan seluruh
riwayat chat sekaligus — log langsung banjir dan bot berubah dari "hanya mengirim" jadi
"membaca semua percakapan grup". Itu perubahan sifat produk, bukan penambahan fitur.

**Lulus kalau:** 6 pesan masuk grup test, urut, tidak ada yang dobel, dan setelah bot
di-restart tidak ada satu pun yang terkirim ulang.

---

## 5. Memetakan CSV proker asli ✅

**Sudah dikerjakan.** CSV asli dari boss tidak diubah; `npm run csv-cnc` yang menyesuaikan:

```
$ npm run csv-cnc
dibaca 59 / dipakai 80 / dibuang 0
per grup: CnC=59, Pubmedsos=13, Medkom=8
jam kirim: 18:00 (semua baris) -> konteks/schedule_reminder.csv
```

Satu baris CSV bisa jadi beberapa reminder karena `proker_diinfokan` berisi
`CnC|Pubmedsos`. Tiap hasil pecahan punya `id` sendiri (`cnc-CNC-001-CnC`,
`cnc-CNC-001-Pubmedsos`) supaya tidak saling menimpa di `data/state.json`.

**`konteks/schedule_reminder.csv` sekarang keluaran skrip, bukan tulisan tangan.**
Jangan disunting manual — suntinganmu hilang begitu `npm run csv-cnc` dijalankan lagi.
Boss kirim CSV baru? timpa `schedule_reminder_cnc.csv`, jalankan skripnya, baca laporannya.

**Jam kirim: `18:00` untuk semua 80 reminder** (diputuskan operator 2026-08-28), karena CSV asli tidak punya
kolom jam sama sekali. Kalau boss maunya lain, ganti konstanta `JAM` di `cnc-to-csv.ts`
lalu jalankan ulang. Mau H-1 sore dan hari-H pagi? `tipe_reminder` di CSV asli sudah
membedakannya (`H-1` 39, `H` 18, `H-3` 1, `H-2` 1) — ubah `JAM` jadi map per tipe.

Bagian di bawah ini rancangan awalnya, disimpan sebagai catatan.


**Ini bug yang sudah dipastikan ada sekarang**, bukan dugaan.

Pembaca CSV mencari kolom bernama `tanggal`, `jam`, `grup`, `pesan`. CSV CnC asli tidak
punya satu pun nama kolom itu. Baris yang tidak lengkap dibuang **tanpa pesan error**.
Hasilnya: **59 dari 59 baris hilang diam-diam.** Bot akan terlihat "jalan normal" sambil
tidak mengirim apa-apa.

Rencana perbaikan — **CSV asli dari boss dibiarkan apa adanya, kode yang menyesuaikan**,
supaya CSV proker lain yang formatnya sama langsung jalan tanpa konversi manual:

| Kolom di CSV proker | → | Dipakai jadi | Catatan |
|---|---|---|---|
| `id_reminder` | → | bagian dari `id` | contoh: `CNC-001` |
| `tanggal_reminder` | → | `tanggal` | sudah `YYYY-MM-DD`, aman |
| *(tidak ada)* | → | `jam` | **diisi jam default** — lihat catatan di bawah |
| `proker_diinfokan` | → | `grup` | isinya bisa majemuk, dipisah tanda pipa |
| `pesan_reminder` | → | `pesan` | boleh banyak baris, sudah aman |
| `tipe_reminder`, `nama_kegiatan`, `catatan`, dll | → | — | tidak dipakai untuk mengirim, berguna untuk log |

Dua hal yang harus benar:

1. **Satu baris bisa jadi beberapa reminder.** Nilai seperti `CnC|Pubmedsos` artinya
   dikirim ke dua grup. Supaya keduanya tidak saling menimpa di catatan terkirim, id-nya
   harus memuat label grup juga — misalnya `cnc-CNC-001-CnC` dan `cnc-CNC-001-Pubmedsos`.
2. **Id harus stabil.** Kalau id berubah setiap kali file dibaca, pesan yang sama akan
   dikirim berulang-ulang tiap menit. `id_reminder` dari CSV sudah stabil — pakai itu,
   jangan pakai nomor urut baris kalau bisa dihindari.

**Jam default masih pertanyaan terbuka.** CSV proker sama sekali tidak menyebut jam. Kamu
perlu tanya boss: pengingat enaknya masuk jam berapa? Sementara belum ada jawaban, pakai
satu jam yang bisa ditimpa per baris.

**Wajib ada sebelum fase real:** saat sumber dibaca, bot harus mencetak
`dibaca 59, dipakai 57, dibuang 2 (baris 14: tanggal kosong; baris 31: label PUBDOK tidak
terdaftar)`. Tanpa laporan itu kamu tidak akan pernah tahu ada yang hilang.

---

## 6. Google Form + Spreadsheet ✅

**Skripnya sudah ada, tinggal dijalankan.** `setup-gform.gs` membuat Form + Spreadsheet
sekaligus, dengan validasi format dan dropdown grup yang sudah benar, lalu mencetak
`SHEET_CSV_URL` siap tempel. Bikin manual lewat UI juga bisa, tapi tiap langkahnya adalah
kesempatan salah ketik yang berakhir jadi reminder hilang tanpa error.

### 6.1 Sudah dijalankan — sisa satu langkah

Form + Spreadsheet sudah jadi dan sudah diuji isi sekali. Tautannya:

| | Tautan |
|---|---|
| **Form (bagikan ke pengurus)** | https://docs.google.com/forms/d/e/<FORM_ID>/viewform |
| Form (buat diedit) | https://docs.google.com/forms/d/<FORM_ID>/edit |
| Spreadsheet respons | https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit |

Uji pertama **gagal, dan itu ketahuan karena ada yang mengeceknya**:

```
$ npm run check-sheet
DIBUANG sheet-1: tanggal "8/28/2026" bukan YYYY-MM-DD; jam "6:27:00 PM" bukan HH:MM
dibaca 1 / dipakai 0 / dibuang 1
```

Sebabnya: tab respons Form menyimpan tanggal & jam sebagai **nilai**, dan Google
mengekspornya ikut locale. Mengunci format kolom lewat skrip **tidak menolong** — Forms
menimpanya lagi tiap kali ada jawaban masuk. Sudah diukur di sheet ini: gviz dengan klausa
`format` maupun `/export?format=csv` dua-duanya tetap keluar `8/28/2026`.

Jalan keluarnya: bot tidak membaca tab respons, tapi **tab turunan `BOT`** yang mengubah
nilai jadi teks lewat `TEXT()`. Tab itu bukan milik Forms, jadi tidak ikut ditimpa.

**Sudah dikerjakan, dan hasilnya:**

```
$ curl "<SHEET_CSV_URL>"
"id","tanggal","jam","grup","pesan"
"gf-20260828-182400","2026-08-28","18:27","TEST","Test via gform pada waktu input jam 18:23"

$ npm run check-sheet
dibaca 1 / dipakai 1 / dibuang 0
```

`SHEET_CSV_URL` di `.env` sekarang menunjuk **gid tab `BOT`**, bukan tab respons.
Kalau suatu saat perlu dipasang ulang (tab `BOT` kehapus, atau Form dibuat ulang):
tempel `setup-gform.gs` ke Apps Script, isi `SS_ID`, **Run → `pasangBot`**, salin
`SHEET_CSV_URL` dari **View → Logs**, lalu `npm run check-sheet`.

**Yang tersisa di fase 3:** buktikan pesannya benar-benar sampai. Dengan bot jalan
(`npm start`, `DRY_RUN=false`), isi Form dengan jam beberapa menit ke depan dan tunggu
pesannya muncul di grup test.

### 6.2 Field Form dan kenapa cuma segini

| # | Pertanyaan | Tipe | Wajib | Kenapa |
|---|---|---|---|---|
| 1 | `tanggal` | **Tanggal** (kalender) | ya | Pengisi tidak bisa salah format. Yang menjaga `YYYY-MM-DD` adalah format kolom sheet, bukan pengisinya |
| 2 | `jam` | **Waktu** (penunjuk jam) | ya | Sama. Isi 24 jam: `19:30`, bukan `7:30 PM` |
| 3 | `grup` | **Dropdown** | ya | Isian bebas = salah ketik = dibuang diam-diam |
| 4 | `pesan` | Paragraf | ya | Dikirim apa adanya. Baris baru aman, `parseCSV()` tahan newline dalam kutip |

Karena tanggal & jam disimpan Sheets sebagai **nilai**, bukan teks, ekspor CSV-nya ikut
locale (`8/28/2026`, `6:27:00 PM`) dan **tidak bisa diperbaiki dengan mengunci format
kolom** — Forms menimpa format itu tiap ada jawaban masuk. Karena itu bot membaca tab
`BOT`, bukan tab respons. Kalau tab `BOT` terhapus atau rumusnya dirusak, seluruh Sumber 2
mati tanpa satu pun error; yang memberitahu cuma `npm run check-sheet`.

Kolom `id` di tab `BOT` dibentuk dari Timestamp (`gf-20260828-182400`), bukan nomor baris.
Menghapus baris di tab respons **tidak** lagi menggeser id reminder lain.

### 6.3 Nambah grup waktu pindah fase real

**Jangan run `setup` lagi** — itu bikin Form baru dengan URL baru. Buka link "Form untuk
diedit", klik pertanyaan `grup`, tambahkan pilihan (`CnC`, `Pubmedsos`, …) persis sama
dengan `GRUP_<LABEL>` yang baru di `.env`. Tiga klik, tanpa kode, dan `SHEET_CSV_URL`
tidak berubah.

### 6.4 Dua hal yang gampang bikin rugi

**Jangan menghapus baris di sheet respons.** `id` sumber ini adalah **nomor baris**
(`sheet-3`), bukan Timestamp. Hapus satu baris di tengah → semua baris di bawahnya naik
satu → id-nya berubah → reminder yang sudah terkirim bisa terkirim lagi. Reminder batal
cukup dibiarkan; kalau belum terkirim dan mau dibatalkan, **kosongkan kolom `pesan`**-nya
(baris tanpa pesan otomatis dibuang, dan `npm run check-sheet` melaporkannya).

**Format kolom sudah dikunci oleh skrip** (`yyyy-mm-dd` untuk tanggal, `HH:mm` untuk jam).
Ini yang menahan kebiasaan Sheets mengubah `2026-09-01` jadi nilai tanggal lalu
mengekspornya sesuai locale. Kalau kamu membuat sheet-nya manual, format ini **wajib**
dipasang sendiri — lalu buktikan dengan `npm run check-sheet`, jangan menebak.

### 6.5 Kalau Sheet mati

Sengaja dibuat begini: kalau internet putus atau Sheet dihapus, sumber ini mengembalikan
kosong dan **tick tetap jalan** — CSV dan JSON tetap terkirim. Bot tidak boleh mati
gara-gara Google. Jangan diubah jadi melempar error.

Konsekuensinya: kegagalan sumber ini **tidak terlihat** dari log bot. Itu tugas
`npm run check-sheet`, dijalankan tiap kali Form/Sheet disentuh.
---

## 7. Pindah ke fase real

Prasyarat, semuanya wajib:

- [ ] Fase 1–4 lulus, dibuktikan sendiri, bukan diasumsikan.
- [ ] Keputusan **nomor bot** sudah diambil (skema A/B/C — lihat PRD).
- [ ] Nomor bot sudah **di-add ke semua grup proker** oleh boss/admin grup.
- [ ] JID tiap grup proker sudah didapat lewat cara di 3.4.
- [ ] Label grup sudah disepakati dengan boss dan sama persis di tiga tempat:
      CSV proker, pilihan Form, dan `.env`.
- [ ] Sudah jalan `DRY_RUN=true` **minimal 1 hari penuh** dengan sumber asli, dan log-nya
      dibaca baris per baris.

Baru setelah itu `DRY_RUN=false`.

Minggu pertama fase real: **periksa tiap hari.** Salah kirim ke grup organisasi tidak bisa
ditarik, dan yang menanggung malunya bukan cuma kamu.

---

## 8. Kalau rusak

| Gejala | Kemungkinan besar | Tindakan |
|---|---|---|
| QR tidak muncul | Node di bawah v22, atau `npm install` belum selesai | `node -v`, ulangi `npm install`, jalankan `npm run check` |
| `does not provide an export named 'X'` | Paket lama (CommonJS) diimpor dengan gaya baru (ESM) | Pola yang sudah 3× terjadi — impor default lalu pecah sendiri, atau jadikan `import type`. Bukan paketnya rusak |
| Bot jalan, log sepi, tidak ada yang terkirim | Label grup tidak cocok, atau sumber dibuang diam-diam | Cocokkan label di sumber vs `.env`. Bagian 5 |
| Pesan terkirim dobel | Id sumber berubah tiap dibaca | Pastikan sumber punya id tetap, jangan andalkan nomor baris |
| Pesan tidak sampai padahal log bilang terkirim | Masih `DRY_RUN=true` | Cek `.env` |
| Bot bilang ter-logout | Sesi diputus dari HP, atau WhatsApp memutus sendiri | Lihat 8.1 |
| Reminder terlewat semalam | Laptop tidur / mati | Lihat 8.2 |

### 8.1 Ter-logout

Session **tidak dihapus otomatis** — ini disengaja, dan penting. Bot akan mencetak
peringatan lalu mencoba menyambung ulang berulang kali dengan jeda yang makin panjang.
Sering kali dia pulih sendiri. Tunggu dulu.

Kalau benar-benar harus tautkan ulang:

```bash
# 1. Hentikan bot (Ctrl+C)
# 2. PINDAHKAN foldernya, JANGAN dihapus:
ren brama_sessions brama_sessions.bak
# 3. npm start, lalu scan QR baru
```

**Kenapa dipindah dan bukan dihapus:** kalau ternyata masalahnya bukan di session, folder
itu bisa dikembalikan. Kalau sudah dihapus, tidak ada jalan pulang selain scan ulang —
dan kalau bot memakai nomor boss (skema B), itu berarti menunggu boss datang.

### 8.2 Laptop tidur / mati

Bot ini hidup selama laptop hidup. Titik. Yang bisa kamu lakukan:

- Setelan daya Windows: layar boleh mati, **laptop jangan sleep** saat tercolok listrik.
- Colokkan ke listrik kalau ditinggal.
- Pertanyaan yang belum terjawab: pengingat yang jatuh tempo saat laptop mati mau
  **dikirim telat** begitu laptop hidup, atau **dilewati**? Dikirim telat berarti "H-1"
  bisa mendarat di hari-H dan membingungkan pengurus. Dilewati berarti hilang tanpa jejak.
  Putuskan dengan boss sebelum fase real.

---

## 9. Yang tidak boleh dilakukan

Lima hal ini bukan preferensi gaya. Masing-masing punya alasan yang sudah terbukti mahal:

1. **Jangan pernah menghapus `brama_sessions/`.** Itu identitas login. Hilang = scan QR
   ulang = bot mati sampai ada orang di depan laptop dengan HP yang benar. Repo asal punya
   fungsi yang menghapus folder ini otomatis saat logout; fungsi itu **sudah dibuang** dari
   BRAMA. Jangan dikembalikan.
2. **Jangan menambahkan `process.exit()`.** Percobaan kedua gagal justru karena prosesnya
   mati sendiri setelah sesi selesai. Error dicatat, tidak mematikan proses.
3. **Jangan menandai terkirim sebelum benar-benar terkirim.** Yang gagal harus bisa dicoba
   lagi.
4. **Jangan mengubah default `DRY_RUN` jadi `false`.** Default yang aman adalah default
   yang tidak bisa merusak apa pun kalau seseorang lupa membaca dokumen ini.
5. **Jangan memasang pembaca pesan masuk.** Lihat bagian 4.

---

## 10. Rutinitas

**Harian (fase real):** bot masih jalan? ada baris "dibuang" di log? jam laptop benar?

**Mingguan:** cocokkan pengingat yang terkirim minggu ini dengan jadwal di CSV — ada yang
lewat? Ada yang salah grup? Cadangkan `data/state.json` dan `brama_sessions/` ke folder
lain.

**Tiap ada CSV proker baru dari boss:** jalankan `DRY_RUN=true` dulu, baca laporan
"dibaca/dibuang", pastikan angkanya sama dengan jumlah baris yang kamu harapkan. Jangan
langsung percaya.
