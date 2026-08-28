# STANDAR OPERASIONAL PROSEDUR
## Sistem Pengingat Otomatis WhatsApp "BRAMA"

| | |
|---|---|
| **Nomor dokumen** | SOP/BRAMA/01 |
| **Versi** | 0.1 — DRAF |
| **Berlaku** | Agustus – Desember 2026 |
| **Disusun oleh** | [nama operator] |
| **Diperiksa oleh** | [nama koordinator/ketua] |
| **Disahkan oleh** | [nama] |
| **Tanggal disahkan** | [diisi saat pengesahan] |

> **Status draf.** Dokumen ini belum berlaku. Bagian yang masih bertanda `[…]` wajib diisi,
> dan seluruh isinya wajib diverifikasi setelah sistem berhasil diuji, sebelum
> ditandatangani dan dijadikan versi Word.

---

## 1. Tujuan

SOP ini mengatur penggunaan sistem pengingat otomatis WhatsApp ("BRAMA") agar:

1. Setiap pengingat kegiatan proker sampai ke grup yang tepat, tepat waktu, dan hanya
   sekali.
2. Tanggung jawab menyusun, mengajukan, dan menjaga pengingat jelas pemiliknya, tidak
   bergantung pada ingatan satu orang.
3. Apabila sistem berhenti bekerja, ada langkah baku yang bisa dijalankan tanpa menunggu
   pihak teknis.

## 2. Ruang lingkup

SOP ini berlaku untuk seluruh pengingat kegiatan proker pada masa kepengurusan
**Agustus–Desember 2026**, yang dikirimkan ke grup WhatsApp resmi kepengurusan.

**Tidak termasuk dalam ruang lingkup:** percakapan atau tanya-jawab melalui bot, pesan ke
nomor pribadi, pengumuman di luar jadwal proker, dan pengingat untuk organisasi lain.

## 3. Definisi

| Istilah | Arti |
|---|---|
| **Sistem / bot** | Program pengingat otomatis yang berjalan di laptop Operator |
| **Operator** | Pihak yang memasang dan menjaga sistem tetap berjalan |
| **Grup terdaftar** | Grup WhatsApp yang sudah didaftarkan; hanya grup ini yang bisa dikirimi |
| **Label grup** | Nama pendek grup yang dipakai di jadwal, contoh `CnC`, `Pubmedsos` |
| **Jadwal utama** | Daftar pengingat satu kepengurusan yang disusun di awal |
| **Pengingat dadakan** | Pengingat di luar jadwal utama, diajukan melalui Formulir |
| **Mode aman** | Kondisi sistem berjalan tanpa benar-benar mengirim pesan, untuk pemeriksaan |
| **Penautan ulang** | Proses menghubungkan kembali sistem ke akun WhatsApp dengan memindai kode QR |

## 4. Peran dan tanggung jawab

| Peran | Dijabat oleh | Tanggung jawab |
|---|---|---|
| **Pemilik jadwal** | [koordinator/ketua proker] | Menyusun dan menyetujui jadwal utama; menetapkan daftar grup dan labelnya; menyetujui perpindahan ke pengiriman sungguhan |
| **Operator** | [nama] | Menjalankan dan memantau sistem; memeriksa laporan harian; menangani gangguan; menyimpan cadangan |
| **Operator cadangan** | [belum ditunjuk] | Menggantikan Operator saat berhalangan. **Wajib ditunjuk sebelum SOP ini disahkan** |
| **Pengaju pengingat** | Seluruh pengurus | Mengajukan pengingat dadakan melalui Formulir sesuai Prosedur 6 |
| **Admin grup** | [pemegang admin tiap grup] | Menambahkan nomor sistem ke grup proker |

## 5. Prosedur — Menyusun jadwal utama

**Pelaksana: Pemilik jadwal.** **Waktu: awal kepengurusan, dan setiap ada perubahan.**

1. Jadwal disusun dalam satu berkas tabel (Excel/CSV) yang memuat sekurang-kurangnya:
   nomor pengingat, tanggal kirim, jenis pengingat (H-3/H-2/H-1/H), grup yang dituju, dan
   isi pesan.
2. **Tanggal wajib ditulis dengan format `YYYY-MM-DD`** (contoh: `2026-09-01`). Format lain
   tidak akan terbaca.
3. **Nama grup wajib ditulis memakai label yang terdaftar** (Lampiran B). Satu pengingat
   boleh ditujukan ke lebih dari satu grup.
4. **Nomor pengingat tidak boleh diubah setelah jadwal berjalan.** Mengubah nomor
   menyebabkan pengingat yang sama terkirim ulang.
5. Berkas diserahkan kepada Operator. Operator **wajib** menjalankan pemeriksaan mode aman
   terlebih dahulu dan melaporkan jumlah baris yang terbaca dan yang ditolak beserta
   alasannya, sebelum jadwal dinyatakan berlaku.
6. Baris yang ditolak dikembalikan kepada Pemilik jadwal untuk diperbaiki. **Jadwal tidak
   dinyatakan berlaku selama masih ada baris yang ditolak tanpa penjelasan.**

## 6. Prosedur — Mengajukan pengingat dadakan

**Pelaksana: seluruh pengurus.** **Waktu: selambat-lambatnya 1 hari sebelum pengingat
diharapkan terkirim.**

1. Buka Formulir pengingat: https://docs.google.com/forms/d/e/<FORM_ID>/viewform.
2. Isi seluruh kolom wajib: nama pengaju, grup tujuan, tanggal kirim, jam kirim, dan isi
   pesan.
3. **Grup tujuan dipilih dari daftar yang tersedia.** Jangan mengetik nama grup sendiri;
   pilihan di luar daftar tidak akan terkirim.
4. **Isi pesan ditulis lengkap sebagaimana yang ingin dibaca anggota grup.** Sistem
   mengirimkan apa adanya, tidak menyunting, tidak menambahkan apa pun.
5. Setelah dikirim, pengajuan tidak dapat ditarik oleh pengaju. Pembatalan diajukan kepada
   Operator sebelum jam kirim.
6. Pengaju bertanggung jawab atas kebenaran isi pesan yang diajukannya.

## 7. Prosedur — Operasional harian

**Pelaksana: Operator.** **Waktu: setiap hari kerja.**

1. Pastikan laptop menyala, tersambung listrik, dan tidak dalam mode tidur.
2. Pastikan sistem masih berjalan.
3. Periksa catatan berjalan (log) hari itu:
   a. Apakah ada pengingat yang **ditolak**? Bila ya, tindak lanjuti sesuai Prosedur 8.
   b. Apakah jumlah pengingat terkirim sesuai jadwal hari itu?
   c. Apakah tanggal dan jam laptop sudah benar?
4. Setiap akhir pekan: cocokkan pengingat yang terkirim sepanjang minggu dengan jadwal
   utama, dan simpan cadangan data sistem.
5. Setiap temuan dicatat. Catatan ini menjadi dasar laporan kepada Pemilik jadwal.

## 8. Prosedur — Penanganan gangguan dan eskalasi

| Gejala yang terlihat | Penanggung jawab | Tindakan | Batas waktu |
|---|---|---|---|
| Pengingat tidak masuk grup padahal ada di jadwal | Operator | Periksa apakah sistem berjalan dan apakah label grup benar | 1 jam kerja |
| Sistem meminta penautan ulang (kode QR) | Operator | Jalankan penautan ulang. **Jangan menghapus data sesi** | 1 jam kerja |
| Penautan ulang butuh pemegang nomor yang tidak ada di tempat | Operator → pemegang nomor | Hubungi pemegang nomor; sistem berhenti sampai penautan selesai | secepatnya, laporkan ke Pemilik jadwal bila > 1 hari |
| Pengingat terkirim dua kali | Operator | Hentikan sistem, laporkan, jangan jalankan ulang sebelum sebabnya jelas | segera |
| **Pesan terkirim ke grup yang salah** | Operator → Pemilik jadwal | Hentikan sistem **segera**. Laporkan. Pesan yang sudah terkirim tidak dapat ditarik | segera |
| Laptop mati / listrik padam | Operator | Nyalakan kembali dan jalankan ulang sistem; periksa pengingat yang terlewat | 1 jam kerja |
| Operator berhalangan | Operator cadangan | Ambil alih Prosedur 7 | hari yang sama |
| Nomor sistem diblokir WhatsApp | Operator → Pemilik jadwal | Hentikan sistem. Keputusan lanjut/berhenti ada pada Pemilik jadwal | segera |

**Aturan mutlak:** apabila sistem berperilaku di luar dugaan, **hentikan dulu, laporkan,
baru cari sebabnya.** Pesan WhatsApp yang sudah terkirim tidak dapat ditarik kembali.

## 9. Prosedur — Perubahan grup atau penambahan proker

**Pelaksana: Pemilik jadwal bersama Operator.**

1. Pemilik jadwal menetapkan label grup baru.
2. Admin grup menambahkan nomor sistem ke grup tersebut. **Selama nomor sistem belum
   menjadi anggota, grup itu tidak dapat dikirimi — tidak ada jalan lain.**
3. Operator mendaftarkan grup tersebut ke dalam daftar grup terdaftar.
4. Operator menambahkan label baru ke pilihan pada Formulir.
5. Operator menjalankan pemeriksaan mode aman, lalu satu pengingat uji ke grup tersebut.
6. Grup dinyatakan aktif setelah pengingat uji diterima dan dikonfirmasi.

## 10. Larangan

1. **Dilarang menghapus data sesi sistem.** Menghapusnya memutus sambungan WhatsApp dan
   menghentikan seluruh pengingat sampai ada penautan ulang secara manual.
2. **Dilarang mengaktifkan pengiriman sungguhan** sebelum pemeriksaan mode aman dilakukan
   dan disetujui Pemilik jadwal.
3. **Dilarang mengubah nomor pengingat** pada jadwal yang sudah berjalan.
4. **Dilarang menghapus atau mengubah lembar kerja bernama `BOT`** pada berkas tanggapan
   Formulir. Lembar itulah yang dibaca sistem; bila rusak, seluruh pengingat dadakan
   berhenti tanpa pemberitahuan apa pun.
5. **Dilarang menggunakan sistem ini** untuk pesan di luar pengingat kegiatan proker,
   termasuk promosi, pengumuman pribadi, dan pengiriman massal ke nomor pribadi.
6. **Dilarang menyerahkan akses sistem** kepada pihak di luar peran pada Pasal 4.

## 11. Batasan layanan

Bagian ini disampaikan terbuka agar tidak menimbulkan harapan yang keliru.

1. Sistem ini **berjalan di laptop Operator**, bukan di server. Sistem hanya bekerja
   selama laptop menyala dan tersambung internet. **Tidak ada jaminan ketersediaan
   24 jam.**
2. Sistem menggunakan jalur WhatsApp **tidak resmi**. Terdapat kemungkinan nomor yang
   dipakai dibatasi atau diblokir oleh WhatsApp. Risiko ini melekat dan tidak dapat
   dihilangkan sepenuhnya.
3. Pesan yang sudah terkirim **tidak dapat ditarik** oleh sistem.
4. Sistem **tidak membaca dan tidak membalas** pesan di grup. Sistem hanya mengirim.
5. Ketepatan waktu mengikuti jam laptop Operator.
6. Masa berlaku sistem berakhir **Desember 2026**. Kelanjutan sesudahnya merupakan
   keputusan kepengurusan berikutnya.

## 12. Lampiran

### Lampiran A — Format jadwal utama

Kolom yang dibaca oleh sistem:

| Kolom | Wajib | Format | Contoh |
|---|---|---|---|
| Nomor pengingat | ya | teks, unik, tidak berubah | `CNC-001` |
| Tanggal kirim | ya | `YYYY-MM-DD` | `2026-09-01` |
| Grup tujuan | ya | label terdaftar; boleh lebih dari satu | `CnC` |
| Isi pesan | ya | teks bebas, boleh beberapa baris | `Reminder: deadline cover ...` |
| Jam kirim | tidak | `HH:MM`, 24 jam | `08:00` |

Kolom lain (jenis pengingat, nama kegiatan, catatan, dan sebagainya) boleh ada dan tidak
mengganggu — kolom tersebut tidak dikirimkan, hanya membantu penelusuran.

**Bila jam kirim tidak diisi**, sistem memakai jam baku yang ditetapkan Pemilik jadwal:
[diisi — belum ditetapkan].

### Lampiran B — Daftar grup terdaftar

| Label | Nama grup | Status | Keterangan |
|---|---|---|---|
| `TEST` | [grup uji] | [ ] aktif | Grup uji coba, tidak berisi pengurus proker |
| `CnC` | [nama grup] | [ ] belum | Menunggu penambahan nomor sistem |
| `Pubmedsos` | [nama grup] | [ ] belum | Menunggu penambahan nomor sistem |
| `Medkom` | [nama grup] | [ ] belum | Menunggu penambahan nomor sistem |

Label wajib ditulis sama persis di jadwal utama, di Formulir, dan di daftar grup terdaftar.
Perbedaan satu huruf menyebabkan pengingat tidak terkirim.

### Lampiran C — Isian Formulir pengingat dadakan

| Isian | Wajib | Keterangan |
|---|---|---|
| Tanggal kirim | ya | Dipilih dari kalender |
| Jam kirim | ya | Dipilih dari penunjuk jam, 24 jam |
| Grup tujuan | ya | Pilih satu dari daftar. Untuk dua grup, **kirim Formulir dua kali** |
| Isi pesan | ya | Ditulis lengkap; dikirim apa adanya |

Tanggal dan jam dipilih, bukan diketik, sehingga kekeliruan format tidak mungkin terjadi
di sisi pengisi.

Tautan Formulir: https://docs.google.com/forms/d/e/<FORM_ID>/viewform

### Lampiran D — Nomor WhatsApp sistem

| | |
|---|---|
| Skema saat uji coba | **nomor Operator** (ditetapkan 2026-08-28) |
| Skema saat operasional | **nomor khusus sistem** — nomor baru, belum diadakan |
| Nomor operasional | [diisi setelah nomor diadakan] |
| Pemegang perangkat untuk penautan ulang | [diisi] |
| Disetujui oleh | [diisi] |

Nomor khusus sistem **wajib ditambahkan ke seluruh grup proker oleh Admin grup** sebelum
sistem dapat digunakan (Prosedur 9). Selama hal itu belum dilakukan, sistem tidak dapat
mengirim ke grup tersebut dan tidak ada cara lain untuk menyiasatinya.

**Bagian ini wajib diisi dan disetujui sebelum sistem digunakan pada grup proker.** Pilihan
skema menentukan siapa yang harus hadir setiap kali sistem perlu ditautkan ulang, dan akun
siapa yang menanggung risiko pembatasan oleh WhatsApp. Perbandingan ketiga skema tersedia
pada dokumen perencanaan.

## 13. Riwayat dokumen

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 0.1 | 2026-08-28 | Draf awal, disusun bersamaan dengan perencanaan sistem. Belum berlaku | [nama operator] |

---

**Panduan teknis pelaksanaan** (untuk Operator): `prosedur.md`
**Dokumen perencanaan sistem**: `.claude/prds/brama-reminder-wa.prd.md`
