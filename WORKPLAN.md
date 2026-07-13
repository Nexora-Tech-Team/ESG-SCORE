# Workplan - ESG Score Platform

Dokumen ini dipakai sebagai checklist kerja agar implementasi tetap mengikuti alur:
`peserta daftar -> admin verifikasi -> admin assign asesor -> asesor review -> juri finalisasi`.

## Target Utama

1. Alur utama berjalan end-to-end.
2. Struktur role jelas: admin, asesor, juri, peserta.
3. Aturan red flag dan eligibility konsisten.
4. UI mengikuti style ONEGRC.

## Checklist Pekerjaan

### 1. Fondasi Produk

- [x] Ambil style dan aset dari ONEGRC.
- [x] Login dan register peserta.
- [x] Routing role-based.
- [x] Dashboard per role.

### 2. Alur Admin

- [x] List semua peserta yang register.
- [x] Verifikasi peserta.
- [x] Assign peserta ke asesor.
- [x] Lihat detail assessment peserta.
- [ ] Re-assign asesor.
- [ ] Filter status peserta dan assessment.

### 3. Alur Peserta

- [x] Lihat assessment aktif.
- [x] Upload evidence per checklist item.
- [x] Submit ke asesor.
- [ ] Lihat riwayat revisi evidence.
- [ ] Lihat status final award.

### 4. Alur Asesor

- [x] Lihat daftar peserta yang di-assign.
- [x] Review evidence.
- [x] Input skor 0-5 per item.
- [x] Submit hasil ke juri.
- [ ] Tandai evidence accepted/rejected/revision_requested.
- [ ] Tambahkan catatan revisi per item.

### 5. Alur Juri

- [x] Lihat ranking peserta.
- [x] Lihat rekomendasi award.
- [x] Lihat red flag aktif.
- [x] Finalisasi award.
- [ ] Override award dengan alasan khusus bila memang diizinkan aturan.
- [ ] Histori keputusan juri.

### 6. Red Flag dan Eligibility

- [x] Simpan red flag pada assessment.
- [x] Tampilkan red flag di detail assessment.
- [x] Hitung eligibility dari red flag aktif.
- [x] Kunci award jika red flag aktif.
- [ ] Map rule per jenis red flag kalau nanti Excel berubah.

### 7. Reporting

- [ ] Export Excel.
- [ ] Export PDF.
- [ ] Ringkasan ranking final.
- [ ] Activity log.

## Urutan Kerja Berikutnya

1. Lengkapi re-assign asesor.
2. Tambahkan status review evidence pada alur asesor.
3. Buat export report.
4. Tambahkan audit trail.
5. Rapikan admin monitoring.

## Aturan Jaga Jalur

- Kalau Excel berubah, cek dulu apakah perubahan itu mempengaruhi flow inti.
- Kalau perubahan hanya di rumus, jangan ubah alur role.
- Kalau perubahan menyentuh red flag, update PRD dan workplan dulu sebelum coding.
