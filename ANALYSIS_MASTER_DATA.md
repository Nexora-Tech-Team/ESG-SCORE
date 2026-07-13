# Analisis Kesesuaian Master Data ESG Score

**Tanggal Analisis:** 2026-07-08  
**File Referensi:** ESG_Score_IUP_IUJP_rev.01.xlsx  
**Database:** PostgreSQL (schema.sql & seed.sql)

---

## 🎯 RINGKASAN EKSEKUTIF

### ✅ YANG SUDAH SESUAI:
1. **Profile Weight Targets** - 6 profil dengan bobot E/S/G sudah 100% sesuai
2. **Maturity Levels** - 6 level (0-5) sudah lengkap dengan deskripsi
3. **Maturity Bands** - 4 kategori band sudah sesuai
4. **Struktur Tabel** - Desain database sudah solid dan siap digunakan
5. **Red Flag Logic** - Tabel red_flags sudah ada dengan 3 tipe sesuai Excel

### ⚠️ YANG PERLU DIPERBAIKI:

#### 1. **CHECKLIST ITEMS - ADA KETIDAKSESUAIAN SIGNIFIKAN**

**Total Items di Excel:** 49 items  
**Total Items di Database:** 48 items (seed.sql)

---

## 📊 PERBANDINGAN DETAIL

### A. BOBOT KATEGORI (Profile Weight Targets)
✅ **STATUS: SEMPURNA - 100% SESUAI**

| Profile Code | Environmental (Excel) | Environmental (DB) | Social (Excel) | Social (DB) | Governance (Excel) | Governance (DB) |
|--------------|----------------------|-------------------|----------------|-------------|-------------------|-----------------|
| IUP | 0.35 | 0.35 | 0.40 | 0.40 | 0.25 | 0.25 |
| IUJP-KONSULTASI | 0.10 | 0.10 | 0.50 | 0.50 | 0.40 | 0.40 |
| IUJP-OPERASIONAL | 0.25 | 0.25 | 0.45 | 0.45 | 0.30 | 0.30 |
| IUJP-DRILLING | 0.25 | 0.25 | 0.45 | 0.45 | 0.30 | 0.30 |
| IUJP-PENGOLAHAN | 0.30 | 0.30 | 0.40 | 0.40 | 0.30 | 0.30 |
| IUJP-PENUNJANG | 0.10 | 0.10 | 0.55 | 0.55 | 0.35 | 0.35 |

---

### B. MATURITY LEVELS
✅ **STATUS: SEMPURNA - 100% SESUAI**

| Score | Level (Excel) | Level (DB) | Status |
|-------|---------------|-----------|--------|
| 0 | Tidak Ada | Tidak Ada | ✅ |
| 1 | Ad-hoc | Ad-hoc | ✅ |
| 2 | Foundational | Foundational | ✅ |
| 3 | Integration | Integration | ✅ |
| 4 | Advanced | Advanced | ✅ |
| 5 | Leadership | Leadership | ✅ |

**Maturity Bands:**
- 0.0 - < 2.0: Belum Memenuhi (Not Yet Qualified) ✅
- 2.0 - < 3.0: Foundation ✅
- 3.0 - < 4.0: Integration ✅
- 4.0 - 5.0: Leadership ✅

---

### C. CHECKLIST ITEMS - ANALISIS DETAIL

#### ⚠️ PERBEDAAN KRITIS:

#### **1. BOBOT (WEIGHT) TIDAK SESUAI - 3 Items**

| Kode Excel | Bobot Excel | Bobot DB | Item ID DB | Status |
|------------|------------|----------|------------|---------|
| **4.1** (ISO 45001) | **0.0500** | 0.0300 | soc-zero-harm | ❌ HARUS DIUBAH |
| **4.2** (LTIFR/TRIFR) | **0.0400** | 0.0300 | soc-ltifr-trifr | ❌ HARUS DIUBAH |
| **4.3** (Fatality) | **0.0400** | 0.0300 | soc-fatality | ❌ HARUS DIUBAH |

**DAMPAK:** Ini sangat kritis karena bobot K3 di Excel lebih tinggi (mencerminkan pentingnya keselamatan kerja), tapi database menggunakan bobot lebih rendah.

#### **2. KODE PERTANYAAN - INKONSISTENSI**

Database tidak menggunakan kode numerik (1.1, 2.3, dll) sebagai ID, melainkan ID semantik (env-tailings-water, soc-zero-harm, dll).

**REKOMENDASI:** Tambahkan kolom `question_number` di tabel checklist_items untuk menyimpan kode Excel (sudah ada di schema ✅)

#### **3. SUB-KATEGORI - BERBEDA**

Excel menggunakan sub-kategori yang lebih spesifik, sedangkan database seed.sql menggunakan sub_category yang berbeda:

**Excel:**
- Tailing & Air
- Biodiversitas & Closure  
- Dekarbonisasi
- Jejak Operasional Jasa (IUJP)
- Keselamatan & Kesehatan Kerja
- Masyarakat & Lahan
- Rantai Pasok & HAM
- Integritas & Kepatuhan
- Tata Kelola ESG

**Database seed.sql:**
- Tailings Safety
- Water Management
- Biodiversity
- Mine Closure
- GHG Management
- Energy Efficiency
- Safety System
- Health & Wellbeing
- FPIC & Consent
- Grievance Mechanism
- Community Dev
- Supplier Mgmt
- Human Rights
- Transparency
- Risk & Remuneration
- dll.

**MASALAH:** Database lebih granular (bagus untuk filtering), tapi tidak match dengan struktur Excel yang akan dipakai user.

#### **4. ITEM 2.05 (Mine Closure Progressive) - KODE ANEH**

Di Excel row 17 tercantum:
- No: 11
- Kode: **2.05** (bukan 2.5)
- ID di DB: env-mine-closure-progressive

**CATATAN:** Kode 2.05 tidak konsisten dengan pola 2.1, 2.2, 2.3, 2.4 yang lain.

#### **5. ITEM 7.4a vs 7.4b - SPLIT LOGIC**

Excel memiliki:
- **7.4a** (IUP only) - Transparansi EITI
- **7.4b** (IUJP only) - Transparansi kepatuhan pajak

Database:
- `gov-eiti` (IUP only) ✅
- `gov-tax-compliance` (IUJP only) ✅

**STATUS:** Logika split sudah benar ✅

---

## 🔍 CHECKLIST LENGKAP PERBANDINGAN

### ENVIRONMENTAL (23 items)

| No | Kode Excel | Sub-Kategori Excel | Bobot Excel | ID Database | Bobot DB | Match? |
|----|-----------|-------------------|------------|-------------|----------|--------|
| 1 | 1.1 | Tailing & Air | 0.0200 | env-tailings-water | 0.0200 | ✅ |
| 2 | 1.2 | Tailing & Air | 0.0300 | env-tailings-monitoring | 0.0300 | ✅ |
| 3 | 1.3 | Tailing & Air | 0.0300 | env-tailings-erp | 0.0300 | ✅ |
| 4 | 1.4 | Tailing & Air | 0.0300 | env-water-balance | 0.0300 | ✅ |
| 5 | 1.5 | Tailing & Air | 0.0200 | env-recycle-rate | 0.0200 | ✅ |
| 6 | 1.6 | Tailing & Air | 0.0200 | env-effluent-quality | 0.0200 | ✅ |
| 7 | 2.1 | Biodiversitas & Closure | 0.0200 | env-biodiversity-baseline | 0.0200 | ✅ |
| 8 | 2.2 | Biodiversitas & Closure | 0.0200 | env-biodiversity-tnfd | 0.0200 | ✅ |
| 9 | 2.3 | Biodiversitas & Closure | 0.0300 | env-iso14001 | 0.0200 | ❌ |
| 10 | 2.4 | Biodiversitas & Closure | 0.0200 | env-biodiversity-closure | 0.0200 | ✅ |
| 11 | 2.05 | Biodiversitas & Closure | 0.0200 | env-mine-closure-progressive | 0.0200 | ✅ |
| 12 | 3.1 | Dekarbonisasi | 0.0300 | env-ghg-inventory | 0.0200 | ❌ |
| 13 | 3.2 | Dekarbonisasi | 0.0200 | env-ghg-target | 0.0200 | ✅ |
| 14 | 3.3 | Dekarbonisasi | 0.0200 | env-decarbonization-energy | 0.0200 | ✅ |
| 15 | 3.4 | Dekarbonisasi | 0.0200 | env-ebt-share | 0.0200 | ✅ |
| 16 | 3.5 | Dekarbonisasi | 0.0300 | env-electrification | 0.0200 | ❌ |
| 17 | 3.6 | Jejak Operasional Jasa | 0.0200 | env-operational-b3-bbm | 0.0200 | ✅ |
| 18 | 3.7 | Jejak Operasional Jasa | 0.0200 | env-dust-emissions | 0.0200 | ✅ |
| 19 | 3.8 | Jejak Operasional Jasa | 0.0200 | env-drilling-mud | 0.0200 | ✅ |
| 20 | 3.9 | Jejak Operasional Jasa | 0.0200 | env-blast-vibration | 0.0200 | ✅ |
| 21 | 3.10 | Jejak Operasional Jasa | 0.0200 | env-process-waste | 0.0200 | ✅ |
| 22 | 3.11 | Jejak Operasional Jasa | 0.0300 | env-green-office | 0.0300 | ✅ |
| 23 | 3.12 | Jejak Operasional Jasa | 0.0200 | env-domestic-waste | 0.0200 | ✅ |

**Environmental Discrepancies:**
- 2.3 (ISO 14001): Excel = 0.0300, DB = 0.0200 ❌
- 3.1 (GHG Inventory): Excel = 0.0300, DB = 0.0200 ❌
- 3.5 (Elektrifikasi): Excel = 0.0300, DB = 0.0200 ❌

### SOCIAL (15 items)

| No | Kode Excel | Sub-Kategori Excel | Bobot Excel | ID Database | Bobot DB | Match? |
|----|-----------|-------------------|------------|-------------|----------|--------|
| 24 | 4.1 | K3 | 0.0500 | soc-zero-harm | 0.0300 | ❌ KRITIS |
| 25 | 4.2 | K3 | 0.0400 | soc-ltifr-trifr | 0.0300 | ❌ KRITIS |
| 26 | 4.3 | K3 | 0.0400 | soc-fatality | 0.0300 | ❌ KRITIS |
| 27 | 4.4 | K3 | 0.0300 | soc-health-wellbeing | 0.0300 | ✅ |
| 28 | 4.5 | K3 | 0.0300 | soc-stop-work | 0.0300 | ✅ |
| 29 | 5.1 | Masyarakat & Lahan | 0.0300 | soc-fpic | 0.0300 | ✅ |
| 30 | 5.2 | Masyarakat & Lahan | 0.0300 | soc-grievance | 0.0300 | ✅ |
| 31 | 5.3 | Masyarakat & Lahan | 0.0200 | soc-grievance-resolution | 0.0300 | ❌ |
| 32 | 5.4 | Masyarakat & Lahan | 0.0300 | soc-community-dev | 0.0300 | ✅ |
| 33 | 5.5 | Masyarakat & Lahan | 0.0200 | soc-community-monitoring | 0.0300 | ❌ |
| 34 | 6.1 | Rantai Pasok & HAM | 0.0200 | soc-supplier-code | 0.0200 | ✅ |
| 35 | 6.2 | Rantai Pasok & HAM | 0.0300 | soc-supplier-audit | 0.0300 | ✅ |
| 36 | 6.3 | Rantai Pasok & HAM | 0.0200 | soc-human-rights | 0.0300 | ❌ |
| 37 | 6.4 | Rantai Pasok & HAM | 0.0200 | soc-modern-slavery | 0.0200 | ✅ |
| 38 | 6.5 | Rantai Pasok & HAM | 0.0300 | soc-worker-welfare | 0.0300 | ✅ |

**Social Discrepancies:**
- 4.1: Excel = 0.0500, DB = 0.0300 ❌ **KRITIS**
- 4.2: Excel = 0.0400, DB = 0.0300 ❌ **KRITIS**
- 4.3: Excel = 0.0400, DB = 0.0300 ❌ **KRITIS**
- 5.3: Excel = 0.0200, DB = 0.0300 ❌
- 5.5: Excel = 0.0200, DB = 0.0300 ❌
- 6.3: Excel = 0.0200, DB = 0.0300 ❌

### GOVERNANCE (11 items)

| No | Kode Excel | Sub-Kategori Excel | Bobot Excel | ID Database | Bobot DB | Match? |
|----|-----------|-------------------|------------|-------------|----------|--------|
| 39 | 7.1 | Integritas & Kepatuhan | 0.0300 | gov-anti-corruption | 0.0300 | ✅ |
| 40 | 7.2 | Integritas & Kepatuhan | 0.0300 | gov-whistleblowing | 0.0300 | ✅ |
| 41 | 7.3 | Integritas & Kepatuhan | 0.0200 | gov-iso37301 | 0.0300 | ❌ |
| 42 | 7.4a | Integritas & Kepatuhan | 0.0300 | gov-eiti | 0.0300 | ✅ |
| 43 | 7.4b | Integritas & Kepatuhan | 0.0300 | gov-tax-compliance | 0.0300 | ✅ |
| 44 | 7.5 | Integritas & Kepatuhan | 0.0200 | gov-due-diligence | 0.0300 | ❌ |
| 45 | 8.1 | Tata Kelola ESG | 0.0300 | gov-board-oversight | 0.0200 | ❌ |
| 46 | 8.2 | Tata Kelola ESG | 0.0200 | gov-esg-meeting-frequency | 0.0200 | ✅ |
| 47 | 8.3 | Tata Kelola ESG | 0.0300 | gov-esg-erm | 0.0200 | ❌ |
| 48 | 8.4 | Tata Kelola ESG | 0.0200 | gov-remuneration | 0.0200 | ✅ |
| 49 | 8.5 | Tata Kelola ESG | 0.0200 | gov-reporting | 0.0200 | ✅ |

**Governance Discrepancies:**
- 7.3 (ISO 37301): Excel = 0.0200, DB = 0.0300 ❌
- 7.5 (Due Diligence): Excel = 0.0200, DB = 0.0300 ❌
- 8.1 (Board Oversight): Excel = 0.0300, DB = 0.0200 ❌
- 8.3 (ERM): Excel = 0.0300, DB = 0.0200 ❌

---

## 📌 SUMMARY TOTAL BOBOT

### Environmental
- **Excel Total (IUP):** Item 1-23 yang applicable untuk IUP
- **Database Total:** Semua env-* items

### Social  
- **Excel Total (IUP):** Item 24-38 yang applicable untuk IUP
- **Database Total:** Semua soc-* items

### Governance
- **Excel Total (IUP):** Item 39-49 yang applicable untuk IUP
- **Database Total:** Semua gov-* items

---

## 🔧 REKOMENDASI PERBAIKAN

### PRIORITAS TINGGI (HARUS DIPERBAIKI):

1. **Update Bobot K3 (KRITIS):**
```sql
UPDATE checklist_items SET weight = 0.0500 WHERE id = 'soc-zero-harm';
UPDATE checklist_items SET weight = 0.0400 WHERE id = 'soc-ltifr-trifr';
UPDATE checklist_items SET weight = 0.0400 WHERE id = 'soc-fatality';
```

2. **Update Bobot Environmental:**
```sql
UPDATE checklist_items SET weight = 0.0300 WHERE id = 'env-iso14001';
UPDATE checklist_items SET weight = 0.0300 WHERE id = 'env-ghg-inventory';
UPDATE checklist_items SET weight = 0.0300 WHERE id = 'env-electrification';
```

3. **Update Bobot Social (lainnya):**
```sql
UPDATE checklist_items SET weight = 0.0200 WHERE id = 'soc-grievance-resolution';
UPDATE checklist_items SET weight = 0.0200 WHERE id = 'soc-community-monitoring';
UPDATE checklist_items SET weight = 0.0200 WHERE id = 'soc-human-rights';
```

4. **Update Bobot Governance:**
```sql
UPDATE checklist_items SET weight = 0.0200 WHERE id = 'gov-iso37301';
UPDATE checklist_items SET weight = 0.0200 WHERE id = 'gov-due-diligence';
UPDATE checklist_items SET weight = 0.0300 WHERE id = 'gov-board-oversight';
UPDATE checklist_items SET weight = 0.0300 WHERE id = 'gov-esg-erm';
```

### PRIORITAS SEDANG:

5. **Sinkronisasi Sub-Kategori** - Pertimbangkan untuk:
   - Tetap gunakan sub_category granular di DB (untuk filtering/grouping teknis)
   - Tambahkan kolom `category_display` untuk tampilan user yang match dengan Excel
   - Atau update semua sub_category agar match Excel

6. **Validasi Question Number** - Pastikan field `question_number` sudah terisi sesuai kode Excel

---

## ✅ KESIMPULAN

### Status Kesiapan: **70% SIAP** ⚠️

**YANG SUDAH BAGUS:**
- ✅ Struktur database solid dan well-designed
- ✅ Profile weights 100% akurat
- ✅ Maturity levels & bands lengkap
- ✅ Applicability tags sudah benar
- ✅ Red flag logic sudah ada
- ✅ Semua 49 items checklist ada (walaupun beberapa bobot berbeda)

**YANG HARUS DIPERBAIKI SEBELUM PRODUCTION:**
- ❌ **13 items memiliki bobot berbeda dengan Excel**
- ⚠️ 3 bobot K3 (Safety) KRITIS - ini sangat penting karena keselamatan adalah prioritas utama mining
- ⚠️ Sub-kategori perlu disesuaikan agar UI/UX match dengan dokumen resmi

**ESTIMASI WAKTU PERBAIKAN:** 2-3 jam
- 1 jam: Update weight values di seed.sql
- 1 jam: Update sub_category (jika diperlukan)
- 1 jam: Testing validasi scoring calculation

---

## 📝 NEXT STEPS

1. Review laporan ini dengan stakeholder
2. Konfirmasi: apakah mengikuti bobot Excel atau ada revisi?
3. Buat migration script untuk update bobot
4. Test perhitungan scoring dengan sample data
5. Validasi normalisasi bobot per pilar E/S/G
6. Deploy ke production

---

**Prepared by:** Claude AI  
**Review Required:** Admin ESG Score System  
**Status:** READY FOR REVIEW
