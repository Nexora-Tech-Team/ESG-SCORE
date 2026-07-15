# Changelog

Semua perubahan penting pada **ESG Score** didokumentasikan di berkas ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan
[Semantic Versioning](https://semver.org/lang/id/).

> Diperbarui **otomatis** oleh `scripts/release.sh`. Jalankan rilis dari folder
> `frontend/`: `npm run release -- patch` (atau `minor` / `major`). Script akan
> menaikkan versi di `package.json`, merangkum commit sejak tag terakhir ke sini,
> lalu membuat git tag `vX.Y.Z`. Versi yang sama tampil di footer aplikasi.

<!-- RELEASES -->

## [1.0.2] - 2026-07-14

### Fixed

- Eligibility award kini memakai skor pilar yang dinormalisasi berdasarkan bobot
  kode profil peserta, misalnya `IUJP-PENUNJANG`, bukan nilai kontribusi berbobot.
- Eligibility kini dikunci sebagai belum lengkap jika skor asesor belum mengisi
  semua checklist item yang berlaku untuk profil peserta.
- Progress evidence di detail assessment kini menghitung jumlah checklist item
  yang memiliki evidence, bukan jumlah total dokumen, sehingga tidak muncul
  nilai seperti `33/28`.
- Feedback UX saat asesor menyimpan skor: tombol menampilkan status
  `Menyimpan...`, `Tersimpan`, atau `Coba Lagi`.

## [1.0.1] - 2026-07-14

### Added

- feat: add assessor jury profile panel

### Fixed

- fix: handle single commit release changelog

## [1.0.0] - 2026-07-13

Baseline rilis produksi pertama di `https://oneconnect.cbqaglobal.co.id/esg-score/`.

### Added
- Sistem versioning: versi bersumber tunggal dari `frontend/package.json`,
  ditampilkan di footer global kiri-bawah bersama "© CBQA Global 2026".
- `VERSION.md` (changelog ini) + `scripts/release.sh` untuk pencatatan rilis otomatis.

### Fixed
- Dashboard peserta gagal memuat assessment ("summary failed"): kolom
  `score_items.normalized_weight` hilang di DB karena migrasi tak pernah auto-run;
  kolom kini masuk `schema.sql` dengan `ADD COLUMN IF NOT EXISTS` yang self-heal.
- Logo perusahaan tidak muncul (404) pada deployment subpath `/esg-score/`:
  URL logo kini di-resolve lewat `publicFileUrl()` menjadi `/esg-score/uploads/...`.
