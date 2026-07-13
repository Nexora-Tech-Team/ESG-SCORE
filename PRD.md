# PRD - ESG Score Platform

## 1. Ringkasan Produk

ESG Score Platform adalah sistem penilaian ESG untuk peserta/perusahaan, dengan alur kerja berbasis role: admin, peserta, asesor, dan juri. Sistem ini mengacu pada workbook `ESG Score.xlsx` sebagai dasar checklist, bobot, maturity level, award level, dan red flag.

Tujuan utama sistem adalah menggantikan proses manual Excel menjadi workflow digital yang rapi, auditable, dan role-based.

## 2. Tujuan

- Peserta dapat register, melengkapi profil perusahaan, mengisi checklist ESG, dan mengunggah evidence.
- Admin dapat melihat semua peserta, memverifikasi peserta, mengatur periode award, mengelola user, dan assign peserta ke asesor.
- Asesor hanya melihat peserta yang ditugaskan kepadanya, lalu melakukan review evidence, scoring, dan memberi catatan.
- Juri dapat melihat hasil akhir, red flag, ranking, dan menetapkan award.
- Sistem menghitung skor ESG berdasarkan bobot checklist, maturity score 0-5, dan aturan red flag.

## 3. Role dan Hak Akses

### Admin

Admin adalah pengelola sistem dan workflow.

Fitur utama:

- Login ke dashboard admin.
- Melihat semua peserta yang register.
- Melihat detail profil peserta/perusahaan.
- Memverifikasi atau menolak peserta.
- Assign peserta ke asesor.
- Re-assign peserta ke asesor lain jika diperlukan.
- Melihat progress semua asesmen.
- Mengelola user admin, asesor, juri, dan peserta.
- Mengelola master checklist ESG.
- Mengelola periode award.
- Melihat hasil scoring dan red flag.
- Monitoring ranking dan status finalisasi.

### Peserta

Peserta adalah perusahaan yang mengikuti penilaian ESG.

Fitur utama:

- Register akun peserta.
- Login ke dashboard peserta.
- Mengisi profil perusahaan.
- Melihat status verifikasi.
- Mengisi checklist ESG.
- Upload evidence per checklist item.
- Melihat status review evidence.
- Melihat catatan revisi dari asesor.
- Submit assessment jika checklist dan evidence sudah lengkap.
- Melihat hasil akhir jika sudah dipublikasikan.

### Asesor

Asesor adalah reviewer evidence dan pemberi skor.

Fitur utama:

- Login ke dashboard asesor.
- Melihat daftar peserta yang di-assign oleh admin.
- Membuka detail assessment peserta.
- Review evidence peserta per checklist item.
- Memberi status evidence: accepted, rejected, revision_requested.
- Memberi skor maturity 0-5 per item.
- Memberi catatan asesor.
- Menandai red flag jika ditemukan indikasi.
- Submit hasil review ke tahap juri/admin.

### Juri

Juri adalah pengambil keputusan akhir award.

Fitur utama:

- Login ke dashboard juri.
- Melihat peserta yang sudah selesai dinilai asesor.
- Melihat skor E/S/G, total score, maturity level, dan red flag.
- Membandingkan ranking peserta.
- Memvalidasi atau override rekomendasi award dengan alasan.
- Menetapkan award final.
- Approve hasil akhir.

## 4. Alur Utama Sistem

### 4.1 Register Peserta

1. Peserta mengisi form register.
2. Sistem membuat akun peserta dan data organisasi/perusahaan.
3. Status peserta menjadi `registered` atau `pending_verification`.
4. Peserta muncul di menu admin `List Peserta`.

### 4.2 Verifikasi Admin

1. Admin membuka `List Peserta`.
2. Admin melihat detail perusahaan dan PIC.
3. Admin dapat memilih:
   - `verified`
   - `need_revision`
   - `rejected`
4. Peserta yang verified dapat masuk tahap assignment.

### 4.3 Assign Peserta ke Asesor

1. Admin memilih peserta verified.
2. Admin memilih asesor.
3. Sistem membuat assignment.
4. Peserta muncul di menu asesor `Peserta Saya`.
5. Admin tetap dapat melihat seluruh assignment.

Data assignment minimal:

```text
assessment_id
participant_id
assessor_id
assigned_by
assigned_at
status
```

### 4.4 Pengisian Checklist oleh Peserta

1. Peserta membuka assessment aktif.
2. Peserta mengisi checklist ESG.
3. Peserta upload evidence per item.
4. Peserta submit assessment.
5. Status berubah menjadi `submitted`.

### 4.5 Review dan Scoring oleh Asesor

1. Asesor membuka peserta yang ditugaskan.
2. Asesor review evidence.
3. Asesor memberi skor 0-5 per checklist item.
4. Sistem menghitung skor terbobot.
5. Asesor memberi catatan jika perlu revisi.
6. Jika selesai, asesor submit ke juri/admin.

### 4.6 Review Juri dan Award Decision

1. Juri membuka peserta yang sudah selesai dinilai.
2. Juri melihat ringkasan skor:
   - Environmental
   - Social
   - Governance
   - Total ESG Score
   - Red Flag
   - Rekomendasi Award
3. Juri menetapkan award final.
4. Sistem menyimpan final result.

## 5. Dasar Scoring

Sumber awal: `ESG Score.xlsx`.

Pilar dan bobot:

- Environmental: 35%
- Social: 40%
- Governance: 25%
- Total: 100%

Skala maturity:

- 0: Non-Compliant
- 1: Initial / Ad-Hoc
- 2: Foundation
- 3: Integration
- 4: Optimization
- 5: Leadership

Rumus item:

```text
weighted_score = score * weight
```

Rumus total:

```text
total_score = SUM(weighted_score)
score_percentage = total_score / 5 * 100
```

Catatan penting:

- Workbook Excel saat ini punya beberapa formula kosong dan referensi yang tidak konsisten.
- Sistem baru harus menjadikan checklist item dan bobot sebagai source of truth.
- Perhitungan harus dilakukan dari item-level score, bukan dari cached formula Excel.

## 6. Red Flag Rules

Red flag adalah aturan veto yang dapat membatasi skor atau mendiskualifikasi peserta.

Rule awal dari Excel:

1. Fatality / tailing failure
   - Jika terjadi fatalitas atau kegagalan tailing/kebocoran bahan berbahaya dalam 12 bulan terakhir, peserta tidak eligible untuk Grand Award.

2. Sanksi regulator berat
   - Jika sedang dalam proses hukum atau sanksi berat terkait lingkungan/HAM yang belum selesai, peserta tidak eligible untuk Grand Award.

3. Bukti palsu
   - Jika ditemukan pemalsuan data atau evidence, peserta langsung `not eligible` dan dapat ditandai diskualifikasi.

Aturan implementasi MVP:

- Selama ada minimal 1 red flag aktif, status eligibility peserta dikunci ke `not_eligible`.
- Juri tetap bisa melihat rekomendasi skor dari hasil perhitungan, tetapi keputusan final mengikuti red flag aktif.
- Admin dan juri dapat menambahkan red flag dari halaman detail assessment.

## 7. Award Level

Award level awal:

- ESG Foundation & Compliance Award
- ESG Integration & Performance Award
- ESG Leadership & Transformation Award
- Grand ESG Mining Champion

Rule award akan difinalisasi setelah rumus scoring disepakati.

Draft rule:

- Foundation: rata-rata kategori >= 2.0 dan < 3.0
- Integration: rata-rata kategori >= 3.0 dan < 4.0
- Leadership: rata-rata kategori >= 4.0
- Grand Champion: total score tinggi, tidak ada kategori di bawah 3.0, dan tidak terkena red flag.

MVP rule yang dipakai saat ini:

- `foundation`
- `integration`
- `leadership`
- `grand_champion`
- `not_eligible`

Rekomendasi award dihitung dari percentage, lalu dikunci oleh red flag aktif bila ada.

## 8. Modul Sistem

### Auth

- Login
- Register peserta
- Logout
- Role-based redirect
- Role-based route guard

### Admin

- Dashboard admin
- List peserta
- Detail peserta
- Verifikasi peserta
- Assign asesor
- List asesor
- List juri
- Master checklist
- Periode award
- Monitoring assessment

### Peserta

- Dashboard peserta
- Profil perusahaan
- Checklist ESG
- Upload evidence
- Submit assessment
- Review catatan asesor
- Result view

### Asesor

- Dashboard asesor
- Peserta saya
- Review checklist
- Review evidence
- Input skor
- Catatan temuan
- Red flag marker
- Submit review

### Juri

- Dashboard juri
- List final review
- Detail score
- Ranking peserta
- Red flag review
- Award decision
- Final approval

### Reporting

- Export scoring ke Excel
- Export result ke PDF
- Award summary
- Ranking peserta

## 9. Data Model Awal

Tabel awal yang dibutuhkan:

- users
- organizations
- organization_contacts
- award_periods
- assessments
- assessor_assignments
- checklist_items
- evidence_items
- score_items
- assessor_notes
- red_flags
- jury_decisions
- award_results
- activity_logs

## 10. Status Prototype Saat Ini

Sudah tersedia dan aktif:

- Frontend React/Vite di folder `frontend`.
- Style dan aset mengacu ONEGRC.
- Login dan register peserta.
- Dashboard role-based untuk admin, asesor, juri, peserta.
- List peserta admin.
- Assign asesor oleh admin.
- List assignment asesor.
- Checklist ESG dari backend.
- Upload evidence.
- Scoring 0-5 per item.
- Summary skor ESG.
- Submit ke juri.
- Red flag create/list.
- Detail assessment per role.
- Ranking juri.
- Eligibility otomatis berbasis red flag aktif.

Belum tersedia:

- Import penuh dari workbook Excel.
- Export Excel/PDF.
- Approval/disapproval multi-stage yang lebih lengkap.
- Audit trail yang detail untuk setiap aksi.
- Manajemen checklist dari admin.
- Manajemen periode award.
- Notifikasi.
- Hard disqualification flow terpisah dari `not_eligible`.

## 11. Rencana Kerja

### Fase 1 - Stabilkan Alur Inti

- Register peserta.
- Verifikasi admin.
- Assign asesor.
- Peserta upload evidence.
- Asesor scoring.
- Submit ke juri.
- Juri finalisasi.

### Fase 2 - Aturan Penilaian

- Finalisasi formula scoring dari Excel.
- Pastikan eligibility dan red flag konsisten.
- Tambahkan validasi data yang kurang.
- Kunci award jika red flag aktif.

### Fase 3 - Operasional Admin

- List peserta yang lebih lengkap.
- Re-assign asesor.
- Detail status tiap assessment.
- Monitoring progress semua role.

### Fase 4 - Reporting

- Export result ke Excel.
- Export hasil ke PDF.
- Ranking dan ringkasan award.
- Log aktivitas.

### Fase 5 - Hardening

- Audit trail.
- Error handling.
- Permission check yang lebih ketat.
- UI polish dan konsistensi layout.

## 12. Prinsip Implementasi

- Kerjakan bertahap, jangan langsung membangun semua modul.
- Setiap tahap harus bisa diuji dari UI.
- Source of truth scoring harus berada di backend/database.
- Formula harus auditable dan mudah ditelusuri.
- Role access harus jelas sejak awal.
- Jangan mewarisi formula Excel yang kosong atau salah referensi tanpa validasi.
- Kalau Excel berubah, alur inti tetap dipertahankan dulu sampai sistem stabil.
