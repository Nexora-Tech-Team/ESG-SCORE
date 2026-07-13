# 🧪 ESG Score System - Testing Guide Per Role

**Version:** 2.0 (dengan scoring fixes)  
**Date:** 2026-07-08  
**Status:** Ready for Testing

---

## 📋 Pre-Testing Checklist

### 1. Run Database Migration
```bash
cd backend
psql -U esgscore -d esgscore -f internal/db/migration_add_normalized_weight.sql
psql -U esgscore -d esgscore -f internal/db/fix_weights.sql
psql -U esgscore -d esgscore -f internal/db/validate_weights.sql
```

### 2. Start Backend (NEW VERSION)
```bash
cd backend
# Menggunakan binary yang sudah di-compile dengan scoring fixes
./api_v2

# Atau jika ingin re-compile:
go run cmd/api/main.go
```

**Expected output:**
```
ESG Score API running on :8088
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

**Expected output:**
```
➜  Local:   http://localhost:5175/
```

### 4. Verify API
```bash
curl http://localhost:8088/health
# Should return: {"status":"ok","service":"ESG Score API"}
```

---

## 🎯 URUTAN TESTING YANG DIREKOMENDASIKAN

Kita akan test per role dengan urutan yang mengikuti workflow natural:

1. **Admin** - Setup master data & users
2. **Peserta** - Registration & profile
3. **Admin** - Assign assessor
4. **Asesor** - Scoring
5. **Juri** - Final decision

---

## 👨‍💼 ROLE 1: ADMIN

### Login Credentials
```
Email: admin@esg-score.local
Password: Admin@2026
```

### Test Cases

#### TC-ADMIN-01: Login Success
**Steps:**
1. Buka http://localhost:5175
2. Input email: `admin@esg-score.local`
3. Input password: `Admin@2026`
4. Klik "Login"

**Expected:**
- ✅ Redirect ke dashboard admin
- ✅ Menu terlihat: Master Data, Users, Participants
- ✅ Header menampilkan "Admin ESG"

#### TC-ADMIN-02: View Master Data - Profile Weights
**Steps:**
1. Navigate ke "Master Data" → "Profile Weights"
2. Verify table data

**Expected:**
```
✅ 6 profiles ditampilkan:
   - IUP: 35% + 40% + 25% = 100%
   - IUJP-KONSULTASI: 10% + 50% + 40% = 100%
   - IUJP-OPERASIONAL: 25% + 45% + 30% = 100%
   - IUJP-DRILLING: 25% + 45% + 30% = 100%
   - IUJP-PENGOLAHAN: 30% + 40% + 30% = 100%
   - IUJP-PENUNJANG: 10% + 55% + 35% = 100%
```

#### TC-ADMIN-03: View Master Data - Checklist Items
**Steps:**
1. Navigate ke "Master Data" → "Checklist Items"
2. Verify total count

**Expected:**
- ✅ Total items: 49
- ✅ Environmental: 23 items
- ✅ Social: 15 items  
- ✅ Governance: 11 items
- ✅ All weights displayed correctly (after fix)

#### TC-ADMIN-04: View Master Data - Maturity Levels
**Steps:**
1. Navigate ke "Master Data" → "Maturity Levels"

**Expected:**
```
✅ 6 levels ditampilkan:
   0 - Tidak Ada
   1 - Ad-hoc
   2 - Foundational
   3 - Integration
   4 - Advanced
   5 - Leadership
```

#### TC-ADMIN-05: Create New User (Asesor)
**Steps:**
1. Navigate ke "Users" → "Create User"
2. Fill form:
   - Name: Test Asesor 3
   - Email: asesor3@test.local
   - Role: asesor
   - Password: Test@1234
   - Confirm Password: Test@1234
   - Active: Yes
3. Click "Create"

**Expected:**
- ✅ Success message displayed
- ✅ User appears in user list
- ✅ Can login with new credentials

#### TC-ADMIN-06: View Participants
**Steps:**
1. Navigate ke "Participants"
2. Check list

**Expected:**
- ✅ List of registered organizations
- ✅ Shows status (registered, verified, assessing, completed)
- ✅ Shows assigned assessor (if any)

#### TC-ADMIN-07: Verify Participant
**Prerequisites:** Ada participant yang sudah register (dari TC-PESERTA tests)

**Steps:**
1. Navigate ke "Participants"
2. Find newly registered participant
3. Click "Verify" button
4. Confirm

**Expected:**
- ✅ Status changes from "registered" → "verified"
- ✅ Participant dapat login dan complete profile

#### TC-ADMIN-08: Assign Assessor
**Prerequisites:** Ada participant yang status "verified"

**Steps:**
1. Navigate ke "Participants"
2. Find verified participant
3. Click "Assign Assessor"
4. Select asesor from dropdown
5. Click "Assign"

**Expected:**
- ✅ Assessor name appears in participant row
- ✅ Participant status changes to "assessing"
- ✅ Assessment status changes to "in_review"
- ✅ Asesor dapat melihat assignment di dashboard mereka

**API Test:**
```bash
# Get admin token first
export TOKEN="<admin-jwt-token>"

# Assign assessor
curl -X POST http://localhost:8088/v1/admin/assessments/{assessmentId}/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assessorId": "<asesor-uuid>"}'
```

#### TC-ADMIN-09: Update Checklist Item Weight
**Steps:**
1. Navigate ke "Master Data" → "Checklist Items"
2. Find item "4.1 ISO 45001"
3. Click "Edit"
4. Verify weight is 0.05 (after fix)
5. Try changing to 0.06
6. Save

**Expected:**
- ✅ Weight updated successfully
- ✅ Change reflected in checklist

**Note:** For testing only! Restore to 0.05 after test.

---

## 👥 ROLE 2: PESERTA (PARTICIPANT)

### Test Cases

#### TC-PESERTA-01: Self Registration
**Steps:**
1. Navigate ke http://localhost:5175/register
2. Fill form:
   - Company Name: PT Test Mining Sejahtera
   - Name: John Doe
   - Email: john@testmining.com
   - Position: Manager ESG
   - Sector: Coal Mining
   - Phone: +62812345678
   - Password: SecurePass@123
   - Confirm Password: SecurePass@123
3. Click "Register"

**Expected:**
- ✅ Success message
- ✅ Auto-login after registration
- ✅ Redirect to participant dashboard
- ✅ Assessment created automatically
- ✅ Status: "draft"

**API Test:**
```bash
curl -X POST http://localhost:5088/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": "PT Test Mining Sejahtera",
    "name": "John Doe",
    "email": "john@testmining.com",
    "position": "Manager ESG",
    "sector": "Coal Mining",
    "phone": "+62812345678",
    "password": "SecurePass@123"
  }'
```

#### TC-PESERTA-02: Login
**Steps:**
1. Logout
2. Login dengan:
   - Email: john@testmining.com
   - Password: SecurePass@123

**Expected:**
- ✅ Login successful
- ✅ Dashboard menampilkan company name
- ✅ Assessment progress indicator visible

#### TC-PESERTA-03: Complete Organization Profile
**Steps:**
1. Navigate ke "Profile" atau "Company Profile"
2. Fill form:
   - License Number: IUP-0001-2024
   - License Type: IUP (dropdown)
   - Main Service Type: -  (not needed for IUP)
   - Logo URL: https://example.com/logo.png (optional)
3. Click "Save"

**Expected:**
- ✅ Profile saved successfully
- ✅ Profile completion indicator shows 100%
- ✅ Profile code calculated: "IUP"

**Test Different Profiles:**

**IUP:**
```
License Type: IUP
→ Profile Code: IUP
→ Applicable items: All IUP-tagged items
```

**IUJP-KONSULTASI:**
```
License Type: IUJP
Main Service: Geological Consultancy Services
→ Profile Code: IUJP-KONSULTASI
```

**IUJP-OPERASIONAL:**
```
License Type: IUJP
Main Service: Hauling and Heavy Equipment Operations
→ Profile Code: IUJP-OPERASIONAL
```

#### TC-PESERTA-04: View Checklist
**Steps:**
1. Navigate ke "Assessment" → "Checklist"
2. Browse items

**Expected:**
- ✅ Only applicable items shown (based on profile)
- ✅ For IUP: Should see tailing, closure items
- ✅ For IUJP-KONSULTASI: Should NOT see tailing items
- ✅ Items grouped by category
- ✅ Evidence upload button available

#### TC-PESERTA-05: Upload Evidence
**Steps:**
1. Navigate ke checklist
2. Select item "4.1 ISO 45001"
3. Click "Upload Evidence"
4. Enter:
   - File Name: ISO45001_Certificate_2024.pdf
   - File URL: https://drive.google.com/file/xxx (or #)
5. Click "Upload"

**Expected:**
- ✅ Evidence saved
- ✅ Evidence indicator appears on checklist item
- ✅ Can view uploaded evidence
- ✅ Can update/replace evidence

#### TC-PESERTA-06: Submit Assessment
**Prerequisites:** Evidence uploaded untuk beberapa items

**Steps:**
1. Navigate ke "Assessment"
2. Click "Submit Assessment"
3. Confirm submission

**Expected:**
- ✅ Confirmation dialog appears
- ✅ After confirm: Status changes to "submitted"
- ✅ Cannot edit evidence anymore
- ✅ Waiting for assessor scoring

---

## 🎓 ROLE 3: ASESOR (ASSESSOR)

### Login Credentials
```
Email: asesor@esg-score.local
Password: password
```

### Test Cases

#### TC-ASESOR-01: Login
**Steps:**
1. Navigate ke http://localhost:5175
2. Login dengan credentials asesor

**Expected:**
- ✅ Login successful
- ✅ Dashboard shows "Asesor ESG 1"
- ✅ Menu: Assignments, My Assessments

#### TC-ASESOR-02: View Assignments
**Prerequisites:** Admin has assigned this asesor to a participant

**Steps:**
1. Navigate ke "Assignments" atau "My Assessments"

**Expected:**
- ✅ List of assigned participants shown
- ✅ Shows participant name, status
- ✅ Click to open assessment detail

#### TC-ASESOR-03: View Assessment Detail
**Steps:**
1. Click on an assignment
2. View assessment page

**Expected:**
- ✅ Participant info displayed
- ✅ Profile code shown (IUP, IUJP-*, etc)
- ✅ Checklist items displayed
- ✅ Only applicable items for participant's profile shown
- ✅ Evidence links visible
- ✅ Scoring input available (0-5 scale)

#### TC-ASESOR-04: Score Checklist Items (CRITICAL TEST!)
**This tests the NEW scoring normalization logic**

**Test Scenario A: IUP Profile**
**Steps:**
1. Open assessment for IUP participant
2. Score the following items with 5:
   - 4.1 ISO 45001 (weight should be 0.05)
   - 4.2 LTIFR/TRIFR (weight should be 0.04)
   - 4.3 Fatality (weight should be 0.04)
3. Click each item, enter score "5", click "Save Score"

**Expected - WITH NEW SCORING:**
```
✅ Each score saved successfully
✅ Normalized weights calculated correctly:
   - For IUP profile
   - Based on Social pillar target (0.40)
   - Sum of applicable Social items base weights
   
✅ Backend logs show (if verbose):
   - Profile: IUP
   - Pillar: social
   - Base weight: 0.05, 0.04, 0.04
   - Normalized weight: calculated per formula
   - Weighted score: score × normalized_weight
```

**API Test (Manual):**
```bash
# Get asesor token
export TOKEN="<asesor-jwt-token>"

# Score an item
curl -X POST http://localhost:8088/v1/assessments/{assessmentId}/scores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checklistItemId": "soc-zero-harm",
    "score": 5,
    "note": "ISO 45001 certificate verified, valid until 2025"
  }'

# Expected response should include normalized_weight field
```

**Test Scenario B: Score Multiple Items**
**Steps:**
1. Score 10+ items across different pillars:
   - Environmental: 3 items with scores 4, 5, 3
   - Social: 4 items with scores 5, 4, 5, 3
   - Governance: 3 items with scores 4, 4, 5

**Expected:**
- ✅ All scores saved
- ✅ Each has appropriate normalized weight
- ✅ Progress indicator updates

#### TC-ASESOR-05: View Score Summary (CRITICAL!)
**Prerequisites:** Multiple items scored

**Steps:**
1. Navigate ke "Summary" or assessment summary page
2. View scores

**Expected - WITH NEW CALCULATION:**
```
✅ Summary displays:
   - Environmental: X.XX (0-5 scale)
   - Social: X.XX (0-5 scale)
   - Governance: X.XX (0-5 scale)
   - Grand Score: XX.X (0-100 scale)
   - Min Pillar: X.XX
   - Profile Code: IUP
   
✅ Scores calculated using normalized weights
✅ Each pillar score ≤ 5.0
✅ Grand Score = (Total / 5) × 100
✅ Recommended Award Level based on MIN pillar (NEW!)
   - If min ≥ 4.0 → Leadership
   - If min ≥ 3.0 → Integration
   - If min ≥ 2.0 → Foundation
   - If min < 2.0 → Not Eligible
```

**API Test:**
```bash
curl -X GET http://localhost:8088/v1/assessments/{assessmentId}/summary \
  -H "Authorization: Bearer $TOKEN"

# Check response includes:
# - grandScore (0-100)
# - minPillar
# - normalized calculation
# - recommendedAwardLevel based on MIN not AVG
```

#### TC-ASESOR-06: Add Red Flag (Optional)
**Steps:**
1. In assessment detail
2. Click "Add Red Flag"
3. Select type: "fatality_or_tailing_failure"
4. Enter description
5. Save

**Expected:**
- ✅ Red flag saved
- ✅ Visible in assessment
- ✅ Will affect award eligibility

#### TC-ASESOR-07: Submit to Jury
**Prerequisites:** All items scored

**Steps:**
1. Review all scores
2. Click "Submit to Jury"
3. Confirm

**Expected:**
- ✅ Assessment status changes to "jury_review"
- ✅ Assignment status changes to "submitted_to_jury"
- ✅ Cannot edit scores anymore
- ✅ Jury can see this assessment

---

## ⚖️ ROLE 4: JURI (JURY)

### Login Credentials
```
Email: juri@esg-score.local
Password: password
```

### Test Cases

#### TC-JURI-01: Login
**Steps:**
1. Login dengan credentials juri

**Expected:**
- ✅ Dashboard shows "Juri ESG"
- ✅ Menu: Assessments for Review

#### TC-JURI-02: View Assessments for Review
**Steps:**
1. Navigate ke "Assessments" or "Jury Review"

**Expected:**
- ✅ List of assessments with status "jury_review"
- ✅ Shows participant name
- ✅ Shows scores per pillar
- ✅ Shows grand score
- ✅ Shows recommended award level
- ✅ Sorted by grand score (descending)

#### TC-JURI-03: Review Assessment Detail
**Steps:**
1. Click on an assessment

**Expected:**
- ✅ Full summary displayed:
   - Participant info
   - Profile code
   - Scores per pillar
   - Grand Score
   - Min Pillar Score
   - Recommended Award Level (based on MIN pillar!)
   - Grand Champion Eligibility
   - Active Red Flags
- ✅ Can view individual scores
- ✅ Can view evidence

#### TC-JURI-04: Check Award Logic (CRITICAL!)
**Test correct award determination**

**Scenario A: High but unbalanced scores**
```
Given:
  Environmental: 4.8
  Social: 4.2
  Governance: 3.5
  Min Pillar: 3.5
  Grand Score: 83.3

Expected Recommended Award:
  ✅ Integration (because MIN = 3.5, which is ≥3.0 but <4.0)
  ✅ NOT Leadership (even though avg > 4.0)
  
Grand Champion Eligible:
  ❌ NO (Grand Score < 85)
```

**Scenario B: High and balanced scores**
```
Given:
  Environmental: 4.5
  Social: 4.3
  Governance: 4.2
  Min Pillar: 4.2
  Grand Score: 86.7

Expected Recommended Award:
  ✅ Leadership (because MIN = 4.2, which is ≥4.0)
  
Grand Champion Eligible:
  ✅ YES (Grand Score ≥85 AND Min≥3.0 AND no red flags)
```

**Scenario C: With Red Flag**
```
Given:
  Environmental: 4.5
  Social: 4.0 (but has red flag: fatality)
  Governance: 4.2
  Grand Score: 86.0

Expected:
  Recommended: Leadership (based on scores)
  Effective: Not Eligible (red flag active)
  Grand Champion: ❌ NO (red flag)
  Note: "Automatically locked by 1 active red flag(s)"
```

#### TC-JURI-05: Make Award Decision
**Steps:**
1. Review assessment
2. Click "Make Decision"
3. Select award level (can override recommended)
4. Add note (optional)
5. Click "Finalize"

**Expected:**
- ✅ Decision saved
- ✅ Assessment status changes to "finalized"
- ✅ Organization status changes to "completed"
- ✅ Decision visible to participant
- ✅ Cannot be changed (or requires special permission)

#### TC-JURI-06: View All Finalized Assessments
**Steps:**
1. Navigate ke "Completed Assessments" or filter

**Expected:**
- ✅ List of finalized assessments
- ✅ Shows final award level
- ✅ Shows decision date
- ✅ Can export/print results

---

## 🧪 SCORING CALCULATION VALIDATION

### Manual Calculation Test

**Test Case: IUP Profile - Environmental Pillar**

**Setup:**
1. Create IUP participant
2. Score these environmental items with 5:
   - 1.1 Tailing EoR (base weight: 0.02)
   - 2.3 ISO 14001 (base weight: 0.03)  
   - 3.1 GHG Inventory (base weight: 0.03)

**Manual Calculation:**
```
Profile: IUP
Pillar: Environmental
Target: 0.35

Step 1: Sum applicable base weights
  All environmental items applicable to IUP
  Sum ≈ 0.23 (check actual from DB)

Step 2: Calculate normalized weights
  Item 1.1: (0.02 / 0.23) × 0.35 = X
  Item 2.3: (0.03 / 0.23) × 0.35 = Y
  Item 3.1: (0.03 / 0.23) × 0.35 = Z

Step 3: Calculate weighted scores
  Item 1.1: 5 × X
  Item 2.3: 5 × Y
  Item 3.1: 5 × Z

Step 4: Sum for pillar
  Environmental Score = sum of all weighted scores
```

**Validation:**
Query database:
```sql
SELECT
    ci.id,
    ci.question_number,
    ci.weight as base_weight,
    si.score,
    si.normalized_weight,
    si.weighted_score,
    si.score * si.normalized_weight as calculated_weighted
FROM score_items si
JOIN checklist_items ci ON ci.id = si.checklist_item_id
WHERE si.assessment_id = '<test-assessment-id>'
  AND ci.pillar = 'environmental'
ORDER BY ci.sort_order;
```

**Expected:**
- ✅ normalized_weight values are consistent
- ✅ weighted_score = score × normalized_weight
- ✅ Sum of normalized_weights ≈ pillar target (0.35)
- ✅ Pillar score makes sense (0-5 range)

---

## 📊 Integration Tests

### End-to-End Flow Test

**Complete workflow from registration to award:**

1. ✅ Peserta registers
2. ✅ Admin verifies
3. ✅ Peserta completes profile (IUP)
4. ✅ Peserta uploads evidence (10+ items)
5. ✅ Peserta submits assessment
6. ✅ Admin assigns asesor
7. ✅ Asesor reviews evidence
8. ✅ Asesor scores all applicable items
9. ✅ Asesor submits to jury
10. ✅ Juri reviews scores
11. ✅ Juri makes award decision
12. ✅ Peserta can view award result

**Time estimate:** 30-45 minutes for complete flow

---

## 🐛 Common Issues & Solutions

### Issue 1: Normalized weight is 0
**Symptom:** All normalized_weight values are 0

**Causes:**
- Profile code not determined correctly
- Item not applicable for profile
- Profile targets not in database

**Solution:**
```sql
-- Check profile determination
SELECT o.license_type, o.main_service_type
FROM assessments a
JOIN organizations o ON o.id = a.organization_id
WHERE a.id = '<assessment-id>';

-- Check profile targets exist
SELECT * FROM profile_weight_targets;

-- Check applicability
SELECT id, applicability_tag
FROM checklist_items
WHERE id = '<item-id>';
```

### Issue 2: Pillar score > 5.0
**Symptom:** Environmental/Social/Governance score exceeds 5.0

**Cause:** Normalized weights don't sum to pillar target

**Solution:**
- Check sum of normalized weights for that pillar
- Should equal profile target (e.g., 0.35 for IUP Environmental)
- Review CalculateNormalizedWeight logic

### Issue 3: Award level incorrect
**Symptom:** Recommended award doesn't match manual calculation

**Check:**
- Is it using MIN pillar score? (Not average!)
- Min pillar ≥ 4.0 → Leadership
- Min pillar ≥ 3.0 → Integration
- Min pillar ≥ 2.0 → Foundation

### Issue 4: Cannot compile
**Error:** `cannot find package "github.com/cbqaglobal/esg-score/internal/scoring"`

**Solution:**
```bash
cd backend
go mod tidy
go build cmd/api/main.go
```

---

## ✅ Success Criteria

System is considered **PRODUCTION READY** when:

- ✅ All TC-ADMIN tests pass
- ✅ All TC-PESERTA tests pass
- ✅ All TC-ASESOR tests pass (especially scoring!)
- ✅ All TC-JURI tests pass (especially award logic!)
- ✅ Manual calculation matches system calculation
- ✅ Award levels determined by MIN pillar, not average
- ✅ Grand Champion eligibility works correctly
- ✅ Red flags properly affect eligibility
- ✅ No SQL errors in backend logs
- ✅ No console errors in frontend
- ✅ Performance acceptable (scores calculate < 1s)

---

## 📝 Test Report Template

After testing each role, document:

```markdown
## Test Report - [ROLE NAME]

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Local / Staging / Production

### Test Results
- Total Test Cases: X
- Passed: X
- Failed: X
- Blocked: X

### Failed Test Cases
| TC ID | Description | Error | Priority |
|-------|-------------|-------|----------|
| TC-XXX-XX | ... | ... | High/Med/Low |

### Issues Found
1. [Description]
   - Severity: Critical/High/Medium/Low
   - Steps to reproduce
   - Expected vs Actual

### Notes
- [Any observations]

### Recommendation
- ✅ Ready for next phase
- ❌ Needs fixes before proceeding
```

---

**Ready to test! Mulai dari Role Admin dulu?** 🚀
