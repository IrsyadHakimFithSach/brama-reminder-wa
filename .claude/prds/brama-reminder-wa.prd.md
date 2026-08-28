# BRAMA — Bot Pengingat WhatsApp Organisasi

## Problem

Pengurus proker (CnC, Pubmedsos, Medkom, dan proker lain) melewatkan deadline karena
pengingat dikirim manual oleh satu orang ke banyak grup WhatsApp. Untuk CnC saja ada
**59 titik pengingat tersebar Agustus–Desember 2026** dengan pola H-3/H-2/H-1/H —
mustahil dijaga konsisten oleh manusia selama 5 bulan. Kalau dibiarkan: deadline konten
lewat, upload telat, dan seluruh beban mengingat menumpuk pada satu orang yang kalau
berhalangan, alurnya berhenti total tanpa ada yang sadar.

## Evidence

- `schedule_reminder_cnc.csv` berisi **59 reminder terjadwal** Agu–Des 2026, bertipe
  H-3/H-2/H-1/H. Terverifikasi langsung dari file.
- Percobaan 1 (`ProjectChatBot`) **gagal di tahap koneksi** — QR maupun pairing code
  tidak pernah tersambung. Nol pengingat terkirim.
- Percobaan 2 (`bot-wa-baileys`) **berhasil konek dan berhasil kirim** ke chat pribadi
  maupun grup — membuktikan jalur teknisnya ada — tapi **proses mati sendiri setelah
  sesi selesai**. Pengingat berhenti tanpa pemberitahuan.
- **Kegagalan senyap sudah terjadi dan terverifikasi:** loader saat ini mencari kolom
  `tanggal/jam/grup/pesan`; CSV CnC asli memakai `tanggal_reminder` / `tipe_reminder` /
  `proker_diinfokan` / `pesan_reminder`. Hasilnya **59 dari 59 baris dibuang tanpa satu
  pun pesan error**. Ini bukan dugaan — ini kelas risiko utama produk ini.
- Grup proker selain CnC **tidak bisa diakses** dari HP operator, sehingga group ID-nya
  tidak tersedia. Asumsi desain awal ("tinggal tempel JID grup") tidak berlaku, dan
  inilah yang menggagalkan rancangan pertama.
- CSV asli memuat `proker_diinfokan` bernilai majemuk (`CnC|Pubmedsos`) — artinya satu
  reminder wajar dikirim ke lebih dari satu grup. Terverifikasi dari data.
- CSV asli **tidak punya kolom jam sama sekali**, hanya tanggal. Terverifikasi.
- *Assumption — needs validation via uji pakai di fase testing:* bahwa pengurus
  non-teknis benar-benar mau dan mampu mengisi Google Form untuk reminder dadakan.
  Belum pernah dicoba oleh siapa pun.
- *Assumption — needs validation via fase real:* bahwa laptop operator cukup sering
  menyala untuk menutupi jam-jam pengingat. Belum ada data uptime sama sekali.

## Users

- **Primary — Koordinator/ketua proker ("boss")**: pemilik jadwal. Pemicu kebutuhan:
  punya banyak proker berjalan paralel dan tidak sanggup mengingatkan tiap grup manual.
  Dia menilai produk ini dari satu hal — anggotanya diingatkan tanpa dia jadi alarm.
- **Primary — Pengurus proker (anggota grup)**: penerima pengingat. Pemicu: deadline
  konten/upload yang mudah terlupa. Butuh pengingat sampai di grup yang benar, tepat
  waktu, tidak dobel, tidak salah grup.
- **Primary — Operator bot**: yang memasang dan menjaga bot tetap hidup di laptop
  pribadinya. Pemicu: dia yang disalahkan kalau bot diam. Butuh bot yang tidak mati
  sendiri dan prosedur pemulihan yang jelas.
- **Secondary — Pengurus pengisi reminder dadakan**: butuh cara menambah pengingat
  mendesak tanpa menyentuh kode atau menghubungi operator.

**Not for**:
- Percakapan dua arah, tanya-jawab, atau perintah lewat chat — bot ini tidak menjawab.
- Broadcast ke nomor pribadi / japri massal.
- Organisasi lain (multi-tenant) atau reminder pribadi perorangan.
- Siapa pun yang butuh jaminan uptime setara layanan berbayar.

## Hypothesis

We believe **bot pengingat satu-arah yang membaca jadwal dari CSV proker, Google Form,
dan config manual, lalu mengirimkannya ke grup WhatsApp lewat daftar putih label grup**
will **menghapus kerja mengingatkan manual dan menghentikan deadline yang terlewat**
for **pengurus proker selama kepengurusan Agustus–Desember 2026**.

We'll know we're right when **seluruh 59 reminder CnC ditambah reminder dadakan dari
Form terkirim ke grup yang benar dalam ≤1 tick dari jam jatuh temponya, tanpa satu pun
kiriman dobel atau salah grup, selama 5 bulan — dan tidak ada baris sumber yang hilang
diam-diam.**

## Success Metrics

| Metric | Target | How measured |
|---|---|---|
| Reminder test sampai di grup | 6 dari 6 dalam 1 jam | Hitung manual pesan di grup test vs catatan terkirim |
| Baris sumber terbaca | 59 dari 59 CnC; **0 baris hilang diam-diam** | Laporan "dibaca N / dibuang M + alasan" tiap kali sumber dibaca |
| Ketepatan waktu | ≤ 1 tick setelah jam jatuh tempo | Bandingkan jam pesan di WA vs kolom jam di sumber |
| Kiriman dobel | 0 | Catatan terkirim unik per id; ditinjau setelah tiap restart |
| Salah grup | 0 | Tinjau mingguan selama fase real |
| Uptime tanpa intervensi manual | ≥ 7 hari berturut-turut per bulan | Catatan restart oleh operator |
| Waktu pulih setelah logout | ≤ 1 jam kerja | Dari munculnya peringatan sampai pengingat terkirim lagi |
| Reminder dadakan lewat Form | Terkirim tanpa operator membuka kode | Uji pakai oleh 1 pengurus non-teknis |
| Sumber online mati tidak menjatuhkan sumber lain | 100% tick tetap jalan | Uji putus internet / Sheet dihapus |

## Scope

**MVP** — Bot pengingat satu-arah yang jalan terus di laptop dan, tiap periode singkat,
membaca tiga sumber jadwal (CSV proker, Google Form→Spreadsheet, config manual),
menyaring yang sudah jatuh tempo dan belum pernah terkirim, memetakan label proker ke
grup WhatsApp lewat daftar putih, menggabungkan beberapa pengingat untuk grup yang sama
menjadi satu pesan, mengirim, lalu mencatatnya secara tahan-restart. Default-nya mode
aman (tidak benar-benar mengirim). Dibuktikan dulu di **satu grup test**, lalu dipindah
ke grup proker asli **tanpa mengubah bentuk sumber data** — sumber yang dipakai saat
testing harus sama persis bentuknya dengan yang dipakai saat real, supaya perpindahan
fase hanya soal mengganti daftar grup, bukan menulis ulang alur.

**Out of scope**
- **Balas pesan / perintah lewat chat WhatsApp** — melanggar sifat satu-arah, dan saat
  konek WhatsApp mengirim riwayat chat yang membanjiri log. Ditunda tanpa rencana.
- **Hosting cloud / VPS** — syarat "gratis" mengikat produk ini ke laptop operator.
- **Dashboard atau UI web** — Google Form dan spreadsheet sudah cukup jadi antarmuka
  untuk pengguna non-teknis. Ditinjau ulang hanya kalau Form terbukti tidak dipakai.
- **WhatsApp Business API resmi** — berbayar, bertentangan dengan syarat utama.
- **Kirim gambar / lampiran / poster** — teks dulu. Ditambahkan hanya kalau pengurus
  memintanya setelah fase real jalan.
- **Multi-organisasi / multi-kepengurusan** — masa pakai produk ini berhenti Des 2026.
- **Auto-restart laptop, manajemen daya, jaminan listrik** — di luar produk; ditangani
  sebagai prosedur manusia di SOP.
- **Menarik/menghapus pesan yang terlanjur terkirim** — tidak dijanjikan. Mitigasinya
  seluruhnya di sisi pencegahan (mode aman + grup test).

## Delivery Milestones

<!-- Business outcomes, not engineering tasks. /plan turns each into a plan. -->
<!-- Status: pending | in-progress | complete -->

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Lingkungan test hidup | Operator melihat dengan mata sendiri 6 pengingat test masuk ke satu grup test dalam 1 jam, urut, tanpa dobel | in-progress | pemicu `npm run test-blast` siap; menunggu JID grup test + eksekusi manual operator |
| 2 | Sumber proker asli terbaca | Seluruh 59 baris CnC jadi pengingat siap kirim; setiap baris yang dibuang dilaporkan beserta alasannya — tidak ada lagi kegagalan senyap | pending | — |
| 3 | Jalur reminder dadakan hidup | Pengurus non-teknis mengisi Google Form dan pengingatnya muncul di grup test, tanpa operator membuka kode | pending | — |
| 4 | Tahan mati-hidup | Bot pulih sendiri dari putus koneksi, restart laptop, dan sumber online yang mati — tanpa kehilangan maupun mengulang pengingat | pending | — |
| 5 | Pindah ke grup proker asli | Grup proker asli terdaftar di daftar putih, mode kirim sungguhan aktif, minggu pertama diawasi harian | pending | — |
| 6 | Serah terima | SOP versi Word selesai; boss dan pengurus bisa menambah pengingat sendiri dan tahu harus berbuat apa kalau bot diam | pending | — |

Milestone 1–4 **tidak diblokir** oleh ketiadaan akses grup proker. Hanya milestone 5–6
yang menunggu akses itu. Ini disengaja: kegagalan rancangan pertama justru karena
seluruh rencana bergantung pada group ID yang tidak dimiliki.

## Open Questions

- [x] ~~**Nomor WhatsApp mana yang menjadi identitas bot?**~~ **DIPUTUSKAN 2026-08-28:**
      fase testing memakai **skema A — nomor operator**; fase real memakai **skema C —
      nomor baru khusus bot**. Konsekuensi yang ikut terpilih dan harus dikerjakan:
      nomor baru itu **wajib di-add ke tiap grup proker sebelum bot berguna**, dan itu
      bergantung pada admin grup — masukkan sebagai pekerjaan milestone 5, bukan kejutan
      di akhir. Perpindahan A→C juga berarti **scan QR ulang dan `state.json` dimulai dari
      nol** di lingkungan real; itu justru diinginkan supaya reminder uji tidak terbawa.
- [ ] **JID grup test** — menyusul dari operator. Ini blocker milestone 1.
- [ ] **Label grup kanonis.** CSV CnC menyebut `CnC`, `Pubmedsos`, `Medkom`. Apakah
      penamaan ini yang dipakai untuk semua proker nanti, atau boss punya daftar sendiri?
      Salah label = pengingat dibuang atau nyasar.
- [ ] **Jam kirim untuk baris yang tidak punya kolom jam.** Asumsi kerja: satu jam
      default untuk semua baris, bisa ditimpa per baris. Perlu konfirmasi jam berapa yang
      wajar buat pengurus (pagi sebelum kuliah? malam?).
- [ ] **Pengingat yang jatuh tempo saat laptop mati/tidur: dikirim telat atau dilewati?**
      Dikirim telat berarti pengurus bisa menerima "H-1" di hari-H — membingungkan.
      Dilewati berarti pengingat hilang tanpa jejak. Perlu keputusan, plus batas
      keterlambatan yang masih pantas dikirim.
- [ ] **Siapa yang berhak mengisi Google Form** — semua pengurus, atau koordinator saja?
      Menentukan apakah Form perlu pembatasan akses.
- [ ] **Siapa operator cadangan** kalau operator utama berhalangan (UAS, sakit, laptop
      rusak)? Saat ini produk ini bergantung pada satu orang.
- [ ] **Setelah Desember 2026** — bot dimatikan dan diarsipkan, atau diserahkan ke
      kepengurusan berikutnya? Menentukan seberapa formal SOP harus ditulis.

### Keputusan tertunda: identitas nomor bot

| Skema | Kelebihan | Kekurangan | Cocok kalau |
|---|---|---|---|
| **A. Nomor operator sendiri** | Operator bisa scan QR & re-link kapan saja tanpa menunggu siapa pun — pemulihan paling cepat, dan justru ini yang paling menentukan uptime. Nol biaya, nol perangkat tambahan. Jalur ini sudah terbukti konek di percobaan kedua. | Nomor pribadi operator berubah fungsi jadi akun bot; risiko blokir WhatsApp menempel ke situ. Boss harus meng-add nomor operator ke tiap grup proker — artinya operator ikut melihat isi grup yang mungkin bukan urusannya. Pesan tampil atas nama operator, bukan atas nama organisasi. Kalau operator lulus/keluar, identitas bot ikut pergi. | Prioritasnya cepat jalan dan cepat pulih, isi grup proker tidak sensitif, dan operator sadar risiko blokir |
| **B. Nomor boss** | Pesan tampil dari akun yang memang berwenang — paling wajar dibaca pengurus, tidak perlu menjelaskan "kenapa si X yang ngingetin". Boss sudah ada di semua grup proker, jadi tidak perlu meng-add siapa pun. | **Setiap re-link menuntut HP boss ada di depan laptop operator** — ini titik matinya: sekali logout saat boss sibuk, bot diam berhari-hari. Laptop pribadi operator menyimpan session WhatsApp boss, artinya operator secara teknis memegang akses akun boss — soal kepercayaan dan keamanan, bukan cuma teknis. Risiko blokir menempel ke akun boss. Boss juga bisa tidak sengaja memutus sesi dari HP-nya. | Boss dan operator mudah ditemui sehari-hari, dan boss paham konsekuensi session-nya dipegang laptop lain |
| **C. Nomor ketiga khusus bot** | Paling bersih: identitas jelas milik organisasi, bukan milik orang. Risiko blokir tidak menyentuh nomor pribadi siapa pun. Bisa diwariskan utuh ke kepengurusan berikutnya. Operator boleh keluar tanpa bot ikut mati. | Butuh SIM/nomor baru — ada biaya kecil dan tidak instan. **Nomor itu harus di-add ke semua grup proker satu per satu** sebelum bot berguna, dan itu bergantung pada boss/admin grup. Nomor baru cenderung lebih gampang dicurigai WhatsApp di awal. Perlu HP kedua atau slot eSIM untuk verifikasi. | Bot dianggap aset organisasi jangka panjang dan boss bersedia meng-add satu nomor ke semua grup |

**Keputusan operator, 2026-08-28: A untuk fase testing, C untuk fase real.** B tidak
dipakai — kelemahan re-link-nya berulang, bukan sekali di awal.

Yang harus diingat karena keputusan ini: kelemahan skema C (nomor baru harus di-add ke
tiap grup proker, dan cenderung lebih diawasi WhatsApp di awal) **tidak hilang, hanya
ditunda** ke milestone 5. Mulai pendekatan ke admin grup lebih awal, jangan menunggu
fase 1–4 selesai.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Nomor kena batasi/blokir WhatsApp karena bot memakai jalur tidak resmi | Sedang | Tinggi | Volume rendah dan terjadwal, ada jeda antar grup, tidak pernah broadcast, tidak japri massal. Pilih skema nomor yang tidak mempertaruhkan akun pribadi |
| Laptop mati / tidur / mati listrik tepat di jam pengingat | Tinggi | Sedang | Keputusan kirim-telat (open question), setelan daya laptop masuk SOP, pemeriksaan harian oleh operator |
| Session logout → bot diam sampai ada orang scan QR | Sedang | Tinggi | Session tidak pernah dihapus otomatis; peringatan jelas saat logout; prosedur re-link tertulis; target pulih ≤1 jam kerja |
| **Kegagalan senyap**: format sumber berubah, baris hilang tanpa suara | Tinggi | Tinggi | Sudah terbukti terjadi. Laporan "dibaca N / dibuang M + alasan" wajib ada dan diperiksa sebelum masuk fase real |
| Salah kirim ke grup proker asli, tidak bisa ditarik | Sedang | Tinggi | Mode aman jadi default; daftar putih label; grup test dulu; minggu pertama fase real diawasi harian |
| Kiriman dobel karena id sumber tidak stabil | Sedang | Sedang | id wajib stabil dari sumber; ditandai terkirim hanya setelah sukses; diuji lewat restart di milestone 4 |
| Ketergantungan pada satu orang operator | Tinggi | Tinggi | SOP tertulis + operator cadangan (open question). Tanpa ini, produk mati begitu operator berhalangan |
| Google Sheet diubah/dihapus/diganti header oleh pengurus lain | Sedang | Sedang | Sumber online boleh gagal tanpa menjatuhkan sumber lain; header wajib didokumentasikan dan dikunci di SOP |
| Grup proker asli tidak pernah bisa diakses sampai Desember | Sedang | Tinggi | Milestone 1–4 sengaja dibuat tidak bergantung padanya; kalau tetap buntu, produk masih berguna untuk grup yang bisa diakses |
| Pengurus tidak pernah mengisi Google Form | Sedang | Rendah | Diuji di milestone 3 dengan pengurus asli. Kalau gagal, sumber manual tetap menutupi |
| Jam / zona waktu laptop meleset | Rendah | Sedang | Waktu mengikuti jam laptop; pemeriksaan jam masuk checklist harian SOP |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
