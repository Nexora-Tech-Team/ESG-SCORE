# Rencana Kerja - ESG Score Platform

## Phase 0 - Fondasi dan Alignment

Status: sebagian selesai.

- [x] Pelajari workbook `ESG Score.xlsx`
- [x] Copy style, aset, dan frontend base dari ONEGRC
- [x] Buat login prototype
- [x] Buat register peserta prototype
- [x] Buat dashboard awal untuk admin, asesor, juri, peserta
- [x] Buat PRD
- [ ] Finalisasi rumus scoring
- [ ] Finalisasi permission matrix
- [ ] Finalisasi status workflow

Output phase:

- PRD disepakati.
- Alur role disepakati.
- Rumus scoring disepakati.

## Phase 1 - Backend dan Database Dasar

Tujuan: membuat backend ESG yang bisa menyimpan user, peserta, dan assignment.

Task:

- [ ] Tentukan stack backend: reuse Go pattern ONEGRC atau setup baru
- [x] Setup backend project
- [x] Setup database PostgreSQL
- [x] Buat migration/schema awal
- [x] Buat tabel `users`
- [x] Buat tabel `organizations`
- [ ] Buat tabel `organization_contacts`
- [x] Buat tabel `award_periods`
- [x] Buat tabel `assessments`
- [x] Buat tabel `assessor_assignments`
- [x] Buat seed user admin, asesor, juri
- [x] Buat auth login real
- [x] Buat register peserta real
- [x] Hubungkan frontend login/register ke backend

Acceptance criteria:

- Peserta bisa register dan tersimpan di database.
- Admin bisa login.
- Peserta bisa login.
- Role redirect berjalan dari data backend.

## Phase 2 - Admin: List Peserta dan Assignment

Tujuan: admin bisa mengelola peserta yang register dan assign ke asesor.

Task:

- [x] Buat API list peserta
- [ ] Buat API detail peserta
- [x] Buat API update status peserta
- [x] Buat API list asesor
- [x] Buat API assign peserta ke asesor
- [x] Buat API re-assign asesor
- [x] Buat halaman admin `List Peserta`
- [x] Buat halaman admin `Detail Peserta`
- [x] Buat modal/form assign asesor
- [x] Tampilkan status assignment di admin

Acceptance criteria:

- Peserta yang register muncul di admin.
- Admin bisa verifikasi peserta.
- Admin bisa assign peserta ke asesor.
- Data assignment tersimpan.

## Phase 3 - Asesor: Peserta Saya

Tujuan: asesor hanya melihat peserta yang di-assign kepadanya.

Task:

- [x] Buat API `my assignments`
- [x] Buat dashboard/list `Peserta Saya`
- [x] Buat detail assessment peserta untuk asesor
- [ ] Tampilkan profil peserta
- [ ] Tampilkan status checklist/evidence
- [ ] Tampilkan progress review

Acceptance criteria:

- Asesor A hanya melihat peserta yang di-assign ke Asesor A.
- Asesor tidak bisa membuka assessment yang bukan assignment-nya.
- Admin tetap bisa melihat semua assignment.

## Phase 4 - Checklist ESG dari Excel

Tujuan: checklist dari Excel menjadi master data sistem.

Task:

- [ ] Ekstrak checklist dari workbook
- [ ] Bersihkan kategori, sub-kategori, question number, bobot, evidence
- [ ] Buat tabel `checklist_items`
- [ ] Buat seed checklist ESG
- [ ] Buat API checklist
- [x] Buat halaman peserta untuk isi checklist
- [ ] Buat progress checklist

Acceptance criteria:

- Semua item checklist muncul di UI peserta.
- Bobot total E/S/G sesuai 35/40/25.
- Checklist tersimpan sebagai data sistem, bukan hardcoded UI.

## Phase 5 - Evidence Upload

Tujuan: peserta bisa upload evidence dan asesor bisa review.

Task:

- [ ] Tentukan storage evidence
- [x] Buat tabel `evidence_items`
- [x] Buat API upload evidence
- [x] Buat API list evidence per assessment
- [ ] Buat API update status evidence
- [x] Buat UI upload evidence peserta
- [x] Buat UI review evidence asesor
- [ ] Buat status accepted/rejected/revision_requested

Acceptance criteria:

- Peserta bisa upload evidence per checklist item.
- Asesor bisa melihat dan memberi status evidence.
- Peserta bisa melihat catatan revisi.

## Phase 6 - Scoring Engine

Tujuan: asesor bisa memberi skor dan sistem menghitung total ESG.

Task:

- [x] Buat tabel `score_items`
- [x] Buat API input score item
- [x] Buat formula backend `weighted_score = score * weight`
- [x] Hitung Environmental score
- [x] Hitung Social score
- [x] Hitung Governance score
- [x] Hitung total ESG score
- [x] Hitung score percentage
- [x] Buat UI scoring asesor
- [x] Buat summary score peserta/admin/asesor

Acceptance criteria:

- Skor berubah real-time atau setelah save.
- Total score sama dengan hasil formula yang disepakati.
- Tidak ada dependency ke cached formula Excel.

## Phase 7 - Red Flag

Tujuan: red flag dapat diterapkan sebagai rule veto.

Task:

- [ ] Buat tabel `red_flags`
- [ ] Buat API create/update red flag
- [ ] Buat UI marker red flag untuk asesor
- [ ] Buat review red flag untuk admin/juri
- [ ] Terapkan rule fatality/tailing failure
- [ ] Terapkan rule sanksi regulator
- [ ] Terapkan rule bukti palsu
- [ ] Integrasi red flag ke award eligibility

Acceptance criteria:

- Red flag terlihat jelas di detail assessment.
- Red flag mempengaruhi eligibility award sesuai rule.
- Semua perubahan red flag tercatat di audit log.

## Phase 8 - Juri dan Award Decision

Tujuan: juri dapat melakukan review akhir dan menetapkan award.

Task:

- [x] Buat API list assessment siap juri
- [x] Buat API ranking peserta
- [x] Buat API award recommendation
- [x] Buat tabel `jury_decisions`
- [ ] Buat tabel `award_results`
- [x] Buat dashboard juri
- [x] Buat detail review juri
- [x] Buat final approval
- [ ] Buat publish result

Acceptance criteria:

- Juri bisa melihat score, evidence summary, red flag, dan rekomendasi award.
- Juri bisa menetapkan award final.
- Hasil final tersimpan sebagai snapshot.

## Phase 9 - Reporting dan Export

Tujuan: hasil assessment bisa diekspor dan dibagikan.

Task:

- [ ] Export Excel detail scoring
- [ ] Export PDF result summary
- [ ] Export award certificate/summary
- [ ] Dashboard ranking
- [ ] Filter report per periode
- [ ] Filter report per kategori

Acceptance criteria:

- Admin/juri bisa export hasil.
- File export sesuai data final.
- Report dapat ditelusuri ke assessment dan score item.

## Phase 10 - Hardening dan Deployment

Tujuan: sistem siap UAT/staging.

Task:

- [ ] Testing role access
- [ ] Testing register sampai award final end-to-end
- [ ] Testing scoring dengan sample Excel
- [ ] Audit log untuk aksi penting
- [ ] Validasi responsive UI
- [ ] Docker compose
- [ ] Environment config
- [ ] Deploy staging
- [ ] UAT checklist

Acceptance criteria:

- Flow end-to-end berjalan.
- Tidak ada role yang bisa akses data di luar haknya.
- Sistem bisa dijalankan di staging.

## Urutan Kerja Terdekat

1. Finalisasi rumus scoring.
2. Finalisasi permission matrix.
3. Finalisasi status workflow.
4. Setup backend dan database.
5. Implement register peserta real.
6. Implement admin list peserta.
7. Implement assign peserta ke asesor.
8. Implement asesor `Peserta Saya`.
