# 🚀 Quick Start - Testing ESG Score System

## Persiapan (One-time Setup)

### 1. Apply Database Fixes

```bash
cd "Documents/New project/ESG Score/backend"

# Run migrations
psql -U esgscore -d esgscore << 'EOF'
-- Add normalized_weight column
ALTER TABLE score_items
ADD COLUMN IF NOT EXISTS normalized_weight NUMERIC(10,6) DEFAULT 0;

-- Apply weight fixes
\i internal/db/fix_weights.sql

-- Validate
\i internal/db/validate_weights.sql
EOF
```

### 2. Start Backend (Versi Baru dengan Scoring Fixes)

```bash
cd "Documents/New project/ESG Score/backend"

# Option A: Run langsung
go run cmd/api/main.go

# Option B: Gunakan binary yang sudah dikompile
./api_v2

# Option C: Compile ulang jika ada perubahan
go build -o api_v2 cmd/api/main.go && ./api_v2
```

**Tunggu sampai muncul:**
```
ESG Score API running on :8088
```

### 3. Start Frontend (Terminal Baru)

```bash
cd "Documents/New project/ESG Score/frontend"
npm run dev
```

**Tunggu sampai muncul:**
```
➜  Local:   http://localhost:5175/
```

### 4. Verify System

```bash
# Test API
curl http://localhost:8088/health

# Test Frontend
open http://localhost:5175
# atau buka browser manual ke http://localhost:5175
```

---

## 🎯 Rekomendasi Urutan Testing

### FASE 1: Role ADMIN (15-20 menit)

**Login:**
- URL: http://localhost:5175
- Email: `admin@esg-score.local`
- Password: `Admin@2026`

**Test Checklist:**
- [ ] Login berhasil
- [ ] View Profile Weights (6 profil, total 100%)
- [ ] View Checklist Items (49 items)
- [ ] View Maturity Levels (6 levels)
- [ ] Check weights sudah diperbaiki:
  - [ ] 4.1 ISO 45001 = 0.05 ✓
  - [ ] 4.2 LTIFR = 0.04 ✓
  - [ ] 4.3 Fatality = 0.04 ✓

**Catatan untuk Admin:**
```
✅ Yang HARUS dicek:
1. Master data lengkap
2. Bobot sudah benar (13 items diperbaiki)
3. Bisa create user baru
4. Bisa view participants

❌ Jangan lanjut ke fase 2 kalau master data belum OK!
```

---

### FASE 2: Role PESERTA (20-25 menit)

#### Step 1: Registration
1. Buka http://localhost:5175/register
2. Register perusahaan baru:
   ```
   Company: PT Testing Tambang
   Name: Test User
   Email: test@tambang.local
   Position: Manager ESG
   Sector: Mining
   Phone: +628123456789
   Password: Test@1234
   ```
3. Setelah register, akan auto-login

#### Step 2: Complete Profile
1. Navigate ke Profile/Company Profile
2. Isi:
   ```
   License Number: IUP-TEST-001
   License Type: IUP
   Logo URL: (kosongkan atau isi URL)
   ```
3. Save
4. **Verify:** Profile Code = "IUP"

#### Step 3: Upload Evidence (minimal 5 items)
1. Go to Assessment → Checklist
2. Pilih item applicable untuk IUP:
   - 4.1 ISO 45001
   - 4.2 LTIFR/TRIFR
   - 4.3 Fatality
   - 7.1 ISO 37001
   - 8.1 Board Oversight
3. Upload evidence untuk each (file name + URL)

#### Step 4: Submit Assessment
1. Click "Submit Assessment"
2. Confirm
3. **Verify:** Status = "submitted"

**Catatan untuk Peserta:**
```
✅ Yang HARUS dicek:
1. Profile code ter-calculate (IUP, IUJP-*, dll)
2. Hanya item applicable yang muncul di checklist
3. Evidence bisa diupload & di-view
4. Submit berhasil & status berubah

🔄 Test profile berbeda:
- IUP: untuk pemilik tambang
- IUJP-KONSULTASI: main_service="Consultancy"
- IUJP-OPERASIONAL: main_service="Hauling Operations"
```

---

### FASE 3: Back to ADMIN - Assign Asesor (5 menit)

**Re-login sebagai Admin:**

1. Go to Participants
2. Find "PT Testing Tambang" (status: submitted)
3. Click "Assign Assessor"
4. Select: "Asesor ESG 1"
5. Confirm

**Verify:**
- [ ] Asesor name muncul
- [ ] Status = "assessing"
- [ ] Assessment status = "in_review"

---

### FASE 4: Role ASESOR (25-30 menit) ⭐ MOST IMPORTANT

**Login:**
- Email: `asesor@esg-score.local`
- Password: `password`

#### Step 1: View Assignment
1. Go to "My Assignments"
2. **Verify:** PT Testing Tambang ada di list
3. Click to open

#### Step 2: Score Items (KRITIS - Test New Scoring!)

**Score these items with nilai 5:**

**Environmental (pilih 3):**
- 2.3 ISO 14001 → Score: 5
- 3.1 GHG Inventory → Score: 5
- 3.5 Elektrifikasi → Score: 5

**Social (KRITIS - K3 items!):**
- 4.1 ISO 45001 → Score: 5 (weight 0.05)
- 4.2 LTIFR/TRIFR → Score: 5 (weight 0.04)
- 4.3 Fatality → Score: 5 (weight 0.04)
- 4.4 Health Program → Score: 4

**Governance (pilih 3):**
- 7.1 ISO 37001 → Score: 5
- 8.1 Board Oversight → Score: 4
- 8.3 ESG ERM → Score: 4

**Untuk setiap item:**
1. Click item
2. Enter score (0-5)
3. Optional: Add note
4. Click "Save Score"
5. **Verify:**
   - ✅ Score saved
   - ✅ Success message
   - ✅ Progress updates

#### Step 3: View Summary (PALING PENTING!)

1. Go to Assessment Summary
2. **Check Response:**

```json
{
  "environmental": X.XX,  // Should be 0-5
  "social": X.XX,         // Should be 0-5
  "governance": X.XX,     // Should be 0-5
  "total": X.XX,          // Sum of above
  "grandScore": XX.X,     // 0-100 scale
  "minPillar": X.XX,      // Minimum of 3 pillars
  "profileCode": "IUP",
  "recommendedAwardLevel": "...",  // Based on minPillar!
  "grandChampionEligible": true/false
}
```

**Manual Verification:**

Calculate expected values:
```
Example calculation (your numbers will differ):

If you scored:
- Environmental: 3 items × 5 = XX weighted
- Social: 4 items × 5/4 = XX weighted  
- Governance: 3 items × 5/4 = XX weighted

Each pillar should be ≤ 5.0
Grand Score = (Total / 5) × 100

Recommended Award = based on MIN(env, soc, gov):
- If MIN ≥ 4.0 → "leadership"
- If MIN ≥ 3.0 → "integration"
- If MIN ≥ 2.0 → "foundation"
- If MIN < 2.0 → "not_eligible"
```

**🚨 CRITICAL CHECKS:**
```
❌ FAIL if:
- Any pillar score > 5.0
- Award based on average instead of MIN
- Normalized_weight is 0 for all items
- Grand Score calculation wrong

✅ PASS if:
- All pillar scores 0-5
- Award level matches MIN pillar threshold
- Normalized weights make sense
- Sum of normalized weights ≈ pillar target
```

#### Step 4: Submit to Jury
1. Review all scores
2. Click "Submit to Jury"
3. Confirm
4. **Verify:** Status = "jury_review"

**Test API Manually (Optional but Recommended):**

```bash
# Login sebagai asesor
curl -X POST http://localhost:8088/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asesor@esg-score.local","password":"password"}'

# Save token
export TOKEN="<jwt-token-from-response>"

# Score an item
curl -X POST http://localhost:8088/v1/assessments/{assessmentId}/scores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checklistItemId": "soc-zero-harm",
    "score": 5,
    "note": "Verified ISO 45001 certificate"
  }'

# View summary
curl -X GET http://localhost:8088/v1/assessments/{assessmentId}/summary \
  -H "Authorization: Bearer $TOKEN" | jq

# Check for:
# - grandScore field
# - minPillar field
# - normalized weights being used
```

---

### FASE 5: Role JURI (15-20 menit)

**Login:**
- Email: `juri@esg-score.local`
- Password: `password`

#### Step 1: View Assessments
1. Go to "Assessments for Review"
2. **Verify:** PT Testing Tambang ada (status: jury_review)

#### Step 2: Review Assessment
1. Click assessment
2. **Check displayed info:**
   - Participant name
   - Profile code
   - Scores per pillar
   - Grand Score
   - **Min Pillar Score** ← NEW!
   - Recommended Award Level (based on MIN!)
   - Grand Champion Eligibility
   - Red Flags (if any)

#### Step 3: Verify Award Logic

**Test Scenarios:**

**Scenario A: Balanced High Scores**
```
If scores are:
Env: 4.5, Soc: 4.3, Gov: 4.2
MIN = 4.2

Expected:
✅ Recommended = "leadership" (MIN ≥ 4.0)
✅ Grand Champion = YES if grandScore ≥ 85
```

**Scenario B: Unbalanced Scores**
```
If scores are:
Env: 4.8, Soc: 4.5, Gov: 3.7
MIN = 3.7

Expected:
✅ Recommended = "integration" (MIN ≥ 3.0, < 4.0)
✅ NOT "leadership" (even though 2 pillars ≥ 4.0)
✅ Grand Champion = NO (MIN < 4.0)
```

#### Step 4: Make Decision
1. Review all info
2. Click "Make Award Decision"
3. Select award level (can override if needed)
4. Add note (optional)
5. Click "Finalize Decision"

**Verify:**
- [ ] Decision saved
- [ ] Status = "finalized"
- [ ] Cannot edit anymore
- [ ] Participant can see result

---

## 🧪 Validation Queries

### Check Scoring in Database

```sql
-- View all scores for an assessment
SELECT
    ci.question_number,
    ci.pillar,
    ci.weight as base_weight,
    si.score,
    si.normalized_weight,
    si.weighted_score,
    si.score * si.normalized_weight as calc_weighted,
    CASE
        WHEN ABS(si.weighted_score - (si.score * si.normalized_weight)) < 0.0001
        THEN '✅'
        ELSE '❌'
    END as correct
FROM score_items si
JOIN checklist_items ci ON ci.id = si.checklist_item_id
WHERE si.assessment_id = '<assessment-uuid>'
ORDER BY ci.pillar, ci.sort_order;

-- Check sum of normalized weights per pillar
SELECT
    ci.pillar,
    COUNT(*) as item_count,
    ROUND(SUM(si.normalized_weight)::numeric, 4) as sum_normalized_weight,
    ROUND(SUM(si.weighted_score)::numeric, 4) as pillar_score
FROM score_items si
JOIN checklist_items ci ON ci.id = si.checklist_item_id
WHERE si.assessment_id = '<assessment-uuid>'
GROUP BY ci.pillar;

-- Expected for IUP:
-- Environmental: sum ≈ 0.35
-- Social: sum ≈ 0.40
-- Governance: sum ≈ 0.25

-- Check profile determination
SELECT
    a.id as assessment_id,
    o.name as organization,
    o.license_type,
    o.main_service_type,
    CASE
        WHEN o.license_type = 'IUP' THEN 'IUP'
        WHEN o.license_type = 'IUJP' THEN '(should show IUJP-subtype)'
        ELSE 'UNKNOWN'
    END as expected_profile
FROM assessments a
JOIN organizations o ON o.id = a.organization_id
WHERE a.id = '<assessment-uuid>';
```

---

## ✅ Final Checklist

### System siap production jika:

**Backend:**
- [ ] Server start tanpa error
- [ ] Health endpoint respond OK
- [ ] Database migrations applied
- [ ] Weight fixes applied (13 items)
- [ ] Scoring module compiled successfully

**Master Data:**
- [ ] 6 profile weights (total 100% each)
- [ ] 49 checklist items
- [ ] 6 maturity levels
- [ ] 4 maturity bands
- [ ] Weights sudah sesuai Excel

**Scoring Logic (CRITICAL!):**
- [ ] Normalized weights calculated
- [ ] Each pillar score 0-5 range
- [ ] Grand Score 0-100 range
- [ ] Award based on MIN pillar, not average
- [ ] Grand Champion eligibility correct

**All Roles:**
- [ ] Admin: Master data CRUD works
- [ ] Admin: User management works
- [ ] Admin: Assessor assignment works
- [ ] Peserta: Registration works
- [ ] Peserta: Profile completion works
- [ ] Peserta: Evidence upload works
- [ ] Asesor: Scoring works with new logic
- [ ] Asesor: Summary calculation correct
- [ ] Juri: Award determination correct
- [ ] Juri: Decision finalization works

---

## 🐛 Jika Ada Masalah

### Backend tidak start
```bash
# Check port sudah digunakan
lsof -i :8088

# Kill process jika perlu
kill -9 <PID>

# Check database connection
psql -U esgscore -d esgscore -c "SELECT 1"

# Check logs
go run cmd/api/main.go 2>&1 | tee backend.log
```

### Frontend tidak start
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check port
lsof -i :5175

# Run dengan verbose
npm run dev --verbose
```

### Scoring tidak akurat
```bash
# Re-run migrations
cd backend
psql -U esgscore -d esgscore -f internal/db/migration_add_normalized_weight.sql

# Check scoring module
go build internal/scoring/scoring.go

# Test calculation manually via SQL
psql -U esgscore -d esgscore
# Then run validation queries above
```

### Database perlu reset
```bash
# HATI-HATI: Ini akan hapus semua data!
psql -U esgscore -d esgscore << 'EOF'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\i internal/db/schema.sql
\i internal/db/seed.sql
\i internal/db/fix_weights.sql
EOF
```

---

## 📞 Support

Jika menemukan bug atau unexpected behavior:

1. Check TESTING_GUIDE.md untuk troubleshooting
2. Check SCORING_LOGIC_ANALYSIS.md untuk detail scoring
3. Check backend logs untuk error messages
4. Check browser console untuk frontend errors

---

**Siap untuk mulai testing?** 🚀

**Recommended starting order:**
1. Start with ADMIN role (verify master data)
2. Then PESERTA (create test data)
3. Then back to ADMIN (assign)
4. Then ASESOR (most critical - test scoring!)
5. Finally JURI (verify award logic)

Good luck! 🎯
