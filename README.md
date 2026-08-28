# BRAMA — bot pengingat WhatsApp untuk organisasi

Bot pengingat **satu arah**: baca jadwal dari 3 sumber, kirim ke grup WhatsApp yang sudah
didaftarkan, tandai terkirim, jangan pernah mengirim dua kali. Dipakai sungguhan untuk satu
masa kepengurusan (Agustus–Desember 2026), jalan terus di sebuah laptop.

Tidak ada handler pesan masuk. Itu keputusan, bukan kekurangan — memasang pembaca pesan
berarti bot ikut menerima seluruh riwayat chat saat konek, dan mengubah sifat produknya.

## Kenapa menarik dilihat

Masalah paling mahal di proyek ini bukan koneksi WhatsApp, tapi **kegagalan senyap**.
CSV jadwal asli sempat dibuang **59 dari 59 baris tanpa satu pun pesan error**: loader
mencari kolom `tanggal/jam/grup/pesan`, sementara file nyata memakai
`tanggal_reminder/proker_diinfokan/pesan_reminder`, lalu `.filter()` membuang sisanya diam-diam.

Yang dipakai untuk menutupnya, dan jadi aturan tetap di repo ini:

> **Sumber data tidak dianggap berfungsi sampai ada laporan `dibaca N / dipakai M / dibuang K`
> beserta alasan tiap baris yang dibuang.**

Dua pelapor itu ada: `npm run csv-cnc` (sumber CSV) dan `npm run check-sheet` (sumber Sheet).

## Arsitektur

```
                  ┌─ CSV jadwal (adapter: cnc-to-csv.ts)
1 tick = 60 detik ├─ Google Form -> Spreadsheet (CSV via gviz)
                  └─ config/reminders.json (manual)
                                    |
                                    v
       saring: id belum ada di state.json  DAN  jadwal sudah lewat
                                    |
                                    v
       label grup -> JID lewat daftar putih GRUP_<LABEL> di .env
       (label tak dikenal = dibuang + dicatat, bukan diam)
                                    |
                                    v
       gabung per grup jadi 1 pesan -> kirim -> BARU tandai terkirim
```

Ketiga sumber menghasilkan satu bentuk yang sama: `id, tanggal, jam, grup, pesan`.
`id` harus stabil — kalau berubah tiap poll, pesan yang sama terkirim berulang.

## Keputusan desain yang dijaga ketat

| Aturan | Alasan |
|---|---|
| Folder session **tidak pernah dihapus**, bahkan saat `loggedOut` | Hilang = harus scan QR ulang = bot mati sampai ada orang di depan laptop. Reconnect pakai backoff 30 detik s/d 5 menit. |
| Proses **tidak boleh mati sendiri** | `unhandledRejection`/`uncaughtException` dicatat, tidak exit. Error per sumber di-`catch` sendiri supaya sumber lain tetap jalan. |
| Tandai terkirim **setelah** sukses kirim | Gagal kirim = dicoba lagi tick berikutnya, bukan hilang. |
| `DRY_RUN=true` adalah **default** | Ini grup organisasi beneran; salah kirim tidak bisa ditarik. |
| Tulis state **atomik** (`.tmp` lalu rename) | Laptop mati saat menulis tidak merusak daftar terkirim. |

## Catatan teknis

- **Tanpa langkah build.** Dijalankan `node index.ts` langsung — Node >= 22 melucuti tipe TS
  sendiri. Konsekuensinya: import relatif wajib pakai ekstensi (`./lib/sources.ts`), dan
  `enum`/`namespace`/parameter property haram.
- **Tanpa dependency yang tidak perlu.** `.env` dibaca `process.loadEnvFile()` bawaan Node,
  bukan `dotenv`. Parser CSV ditulis sendiri (tahan koma, tanda kutip, dan newline di dalam sel).
- `SOP.md` -> `SOP.docx` lewat `sop-docx.py` (~110 baris, pakai `python-docx` yang sudah ada),
  karena pandoc/LibreOffice tidak tersedia di mesin target.

## Menjalankan

```bash
npm install
cp .env.example .env      # isi GRUP_<LABEL>=<jid>@g.us
npm run check             # self-check tanpa framework
npm run csv-cnc -- schedule_reminder_cnc.example.csv konteks/schedule_reminder.csv
npm start                 # QR muncul di terminal, scan sekali
```

Belum tahu JID grup? Jalankan `npm run groups` — semua grup + JID dicetak siap tempel ke `.env`.
Setelah yakin: `DRY_RUN=false`, lalu restart (`.env` dibaca sekali saat start, tidak ada reload).

## Isi repo

| Berkas | Isi |
|---|---|
| `index.ts` | tick 60 detik: resolve grup, batch per grup, kirim, catat state |
| `lib/sources.ts` | 3 loader + `parseCSV()` + `isDue()` |
| `lib/baileys.ts` | koneksi WhatsApp (baileys, di-pin `6.7.24` persis) |
| `cnc-to-csv.ts` | adapter CSV organisasi -> format kontrak, dengan laporan dibuang |
| `check-sheet.ts` | pembuktian sumber Google Sheet terbaca |
| `setup-gform.gs` | Apps Script: bikin Form + Spreadsheet yang cocok kontraknya |
| `check.ts` | self-check tanpa framework |
| `prosedur.md` / `SOP.md` | panduan operator (teknis) & SOP organisasi (non-teknis) |
| `CLAUDE.md` | catatan lengkap keputusan, jebakan, dan riwayat perubahan |

Data jadwal organisasi yang asli tidak ikut ke repo ini; sebagai gantinya ada
`schedule_reminder_cnc.example.csv` dengan skema yang sama persis.
