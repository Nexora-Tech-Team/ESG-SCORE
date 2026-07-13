# Analisis Logic Scoring - ESG Score System

**Date:** 2026-07-08  
**File Analyzed:** backend/cmd/api/main.go

---

## 🚨 MASALAH KRITIS DITEMUKAN

### Perhitungan Weighted Score TIDAK SESUAI EXCEL

**Lokasi:** Line 1309-1327 (scoreUpsert function)

```go
// CURRENT IMPLEMENTATION (SALAH!)
var weight float64
s.db.QueryRow(`SELECT weight FROM checklist_items WHERE id = $1`, req.ChecklistItemID).Scan(&weight)
weighted := float64(req.Score) * weight  // ❌ Langsung dikali base weight
```

**Masalah:**
- System hanya mengalikan `score * base_weight`
- Tidak ada normalisasi berdasarkan profile (IUP vs IUJP-*)
- Tidak mempertimbangkan applicability_tag
- Tidak menghitung normalized weight sesuai formula Excel

---

## 📐 FORMULA YANG BENAR (Dari Excel)

### Formula Normalized Weight per Item:

```
Berlaku? = IF(ISNUMBER(SEARCH(","+ProfileCode+",", ","+ApplicabilityTag+",")),1,0)

NormalizedWeight = IF(Berlaku=0, 0,
    (BaseWeight / SUM_BaseWeights_Applicable_in_Pillar)
    * ProfileTarget_for_Pillar
)

WeightedScore = NormalizedWeight * Score
```

### Contoh Perhitungan:

**Item: 2.3 ISO 14001**
- Base Weight: 0.03
- Pillar: Environmental
- Applicability: IUP,IUJP-KONSULTASI,...

**Untuk Profile IUP:**
1. Check applicable: YES (IUP in tag)
2. Sum environmental weights applicable to IUP: 0.35 (total dari semua env items untuk IUP)
3. Profile target for Environmental (IUP): 0.35
4. Normalized = (0.03 / 0.35) * 0.35 = 0.03
5. If Score = 5, then WeightedScore = 0.03 * 5 = 0.15

**Untuk Profile IUJP-PENUNJANG:**
1. Check applicable: YES (IUJP-PENUNJANG in tag)
2. Sum environmental weights for IUJP-PENUNJANG: berbeda dari IUP!
3. Profile target for Environmental (IUJP-PENUNJANG): 0.10
4. Normalized akan berbeda!

---

## 🔍 SCORING FLOW ANALYSIS

### Saat Ini (INCORRECT):

```
1. Asesor input score (0-5) → /v1/assessments/:id/scores [POST]
2. Backend:
   - Query base weight dari checklist_items
   - weighted_score = score * base_weight
   - Save to score_items table
3. Summary: /v1/assessments/:id/summary [GET]
   - SUM weighted_score per pillar
   - No normalization!
```

### Yang Seharusnya (CORRECT):

```
1. Asesor input score (0-5)
2. Backend:
   - Get assessment → organization → license_type + main_service_type
   - Determine profile_code (IUP, IUJP-KONSULTASI, etc)
   - Get all checklist_items where profile_code IN applicability_tag
   - Calculate sum of base_weights per pillar for this profile
   - Get profile_weight_targets for this profile
   - Calculate normalized_weight = (base_weight / sum_pillar) * profile_target
   - weighted_score = score * normalized_weight
   - Save both raw score AND weighted_score
3. Summary:
   - SUM weighted_score per pillar
   - Each pillar score should be 0-5 range
   - Total = (Sum_All_Pillars / 5) * 100 = Grand Score (0-100)
```

---

## 📊 CURRENT SUMMARY CALCULATION

**Lokasi:** Line 1330-1357 (scoreSummary function)

```go
// Current query - simple SUM without normalization
SELECT
    COALESCE(SUM(CASE WHEN ci.pillar = 'environmental' THEN si.weighted_score ELSE 0 END), 0) AS environmental,
    COALESCE(SUM(CASE WHEN ci.pillar = 'social' THEN si.weighted_score ELSE 0 END), 0) AS social,
    COALESCE(SUM(CASE WHEN ci.pillar = 'governance' THEN si.weighted_score ELSE 0 END), 0) AS governance,
    COALESCE(SUM(si.weighted_score), 0) AS total
FROM score_items si
JOIN checklist_items ci ON ci.id = si.checklist_item_id
WHERE si.assessment_id = $1
```

**Masalah:**
- Hanya menjumlahkan weighted_score yang sudah salah dari awal
- Tidak ada filtering berdasarkan applicability
- Tidak ada validation apakah sum per pillar = profile target

---

## 🔧 SOLUSI YANG DIPERLUKAN

### Option 1: Calculate on Save (Recommended)
**Keuntungan:** Fast query, data already normalized in DB  
**Kekurangan:** Complex save logic

```go
func (s *Server) scoreUpsert(c *gin.Context) {
    // 1. Get profile code from assessment → organization
    // 2. Get profile targets
    // 3. Calculate sum of base weights for applicable items per pillar
    // 4. Calculate normalized weight
    // 5. Save: score, normalized_weight, weighted_score
}
```

### Option 2: Calculate on Read
**Keuntungan:** Simple save, recalculate on demand  
**Kekurangan:** Slower, complex query

```go
func (s *Server) scoreSummary(assessmentID string) {
    // 1. Get all scores
    // 2. Get profile
    // 3. Recalculate normalized weights
    // 4. Sum per pillar
}
```

### Option 3: Hybrid (BEST)
- Save raw score only
- Calculate normalized weights in summary endpoint
- Cache calculation results
- Allow recalculation when weights change

---

## 🎯 IMPLEMENTASI YANG DIREKOMENDASIKAN

### Step 1: Add Column to score_items table

```sql
ALTER TABLE score_items ADD COLUMN IF NOT EXISTS normalized_weight NUMERIC(10,6);
```

### Step 2: Create Calculation Function

```go
func (s *Server) calculateNormalizedWeight(
    assessmentID string,
    checklistItemID string,
    baseWeight float64,
    pillar string,
) (float64, error) {
    // Get profile code
    var profileCode string
    err := s.db.QueryRow(`
        SELECT CASE
            WHEN o.license_type = 'IUP' THEN 'IUP'
            WHEN o.license_type = 'IUJP' AND ... THEN 'IUJP-...'
            ELSE 'BELUM DIPILIH'
        END
        FROM assessments a
        JOIN organizations o ON o.id = a.organization_id
        WHERE a.id = $1
    `, assessmentID).Scan(&profileCode)
    
    // Get profile target for pillar
    var pillarTarget float64
    s.db.QueryRow(`
        SELECT CASE
            WHEN $2 = 'environmental' THEN environmental
            WHEN $2 = 'social' THEN social
            WHEN $2 = 'governance' THEN governance
        END
        FROM profile_weight_targets
        WHERE profile_code = $1
    `, profileCode, pillar).Scan(&pillarTarget)
    
    // Get sum of base weights for applicable items in this pillar
    var sumBaseWeights float64
    s.db.QueryRow(`
        SELECT SUM(weight)
        FROM checklist_items
        WHERE pillar = $1
          AND $2 = ANY(string_to_array(applicability_tag, ','))
    `, pillar, profileCode).Scan(&sumBaseWeights)
    
    // Check if item is applicable
    var applicable bool
    s.db.QueryRow(`
        SELECT $1 = ANY(string_to_array(applicability_tag, ','))
        FROM checklist_items
        WHERE id = $2
    `, profileCode, checklistItemID).Scan(&applicable)
    
    if !applicable || sumBaseWeights == 0 {
        return 0, nil
    }
    
    // Calculate normalized weight
    normalized := (baseWeight / sumBaseWeights) * pillarTarget
    return normalized, nil
}
```

### Step 3: Update scoreUpsert

```go
func (s *Server) scoreUpsert(c *gin.Context) {
    // ... existing validation ...
    
    // Get item details
    var item struct {
        Weight float64
        Pillar string
    }
    s.db.QueryRow(`
        SELECT weight, pillar
        FROM checklist_items
        WHERE id = $1
    `, req.ChecklistItemID).Scan(&item.Weight, &item.Pillar)
    
    // Calculate normalized weight
    normalizedWeight, err := s.calculateNormalizedWeight(
        assessmentID,
        req.ChecklistItemID,
        item.Weight,
        item.Pillar,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "weight calculation failed"})
        return
    }
    
    weighted := float64(req.Score) * normalizedWeight
    
    // Save with normalized weight
    s.db.Exec(`
        INSERT INTO score_items (
            assessment_id, checklist_item_id, score,
            normalized_weight, weighted_score, note, assessed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (assessment_id, checklist_item_id)
        DO UPDATE SET
            score = EXCLUDED.score,
            normalized_weight = EXCLUDED.normalized_weight,
            weighted_score = EXCLUDED.weighted_score,
            note = EXCLUDED.note,
            assessed_by = EXCLUDED.assessed_by,
            assessed_at = NOW()
    `, assessmentID, req.ChecklistItemID, req.Score,
       normalizedWeight, weighted, req.Note, user.ID)
}
```

---

## ⚠️ AWARD LEVEL LOGIC

**Lokasi:** Line 1359-1373 (recommendAwardLevel function)

### Current Logic:
```go
func recommendAwardLevel(percentage float64) string {
    if percentage >= 85 { return "grand_champion" }
    if percentage >= 80 { return "leadership" }
    if percentage >= 60 { return "integration" }
    if percentage >= 40 { return "foundation" }
    return "not_eligible"
}
```

### Excel Logic (CORRECT):
```
Award ditentukan oleh MINIMUM SCORE tiap pilar, bukan total/average!

- Leadership Award: Min score per pilar >= 4.0
- Integration Award: Min score per pilar >= 3.0
- Foundation Recognition: Min score per pilar >= 2.0
- Not Eligible: Min score per pilar < 2.0

Grand Champion: Grand Score >= 85 AND Min >= 3.0 AND No Red Flags
```

### Fix Needed:
```go
func (s *Server) recommendAwardLevel(env, social, gov float64) string {
    minScore := math.Min(env, math.Min(social, gov))
    
    if minScore >= 4.0 {
        return "leadership"
    }
    if minScore >= 3.0 {
        return "integration"
    }
    if minScore >= 2.0 {
        return "foundation"
    }
    return "not_eligible"
}

func (s *Server) checkGrandChampionEligibility(
    grandScore float64,
    minPillar float64,
    redFlagCount int,
) bool {
    return grandScore >= 85 && minPillar >= 3.0 && redFlagCount == 0
}
```

---

## 📋 CHECKLIST PERBAIKAN

### Critical (HARUS SEBELUM PRODUCTION):
- [ ] Fix weighted score calculation dengan normalization
- [ ] Fix award level logic (use MIN pillar, not percentage)
- [ ] Add normalized_weight column to score_items table
- [ ] Implement calculateNormalizedWeight function
- [ ] Update scoreUpsert to use normalized weights
- [ ] Update scoreSummary to validate per-pillar scores
- [ ] Fix Grand Champion eligibility logic

### Important:
- [ ] Add validation: each pillar score must be 0-5
- [ ] Add validation: applicability check before scoring
- [ ] Add endpoint to recalculate scores when weights change
- [ ] Add unit tests for scoring calculation
- [ ] Document scoring formula in API docs

### Nice to Have:
- [ ] Cache normalized weights per profile
- [ ] Add scoring audit trail
- [ ] Show breakdown: base weight vs normalized weight in UI

---

## 🎯 TESTING SCENARIOS

### Test Case 1: IUP Profile
```
Given: Organization with license_type='IUP'
When: Asesor scores all environmental items with 5
Then: Environmental pillar score should = 5.0
      (because normalized weights sum to 0.35 * score 5 = 1.75, 
       and avg would be ~5 if weights are distributed correctly)
```

### Test Case 2: IUJP-KONSULTASI Profile
```
Given: Organization with license_type='IUJP' and main_service='Consultancy'
When: Asesor scores all environmental items with 5
Then: Environmental pillar score should <= 5.0
      (only applicable items counted, weight target = 0.10)
```

### Test Case 3: Mixed Scores
```
Given: IUP profile
When: Environmental items scored: mix of 3,4,5
Then: Pillar score should be weighted average
      And: Should be in range 0-5
```

### Test Case 4: Award Level
```
Given: Env=4.5, Social=3.8, Governance=3.2
Then: Recommended = "integration" (min=3.2, not leadership)
      Grand Champion = NO (min < 4.0)
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:
1. ✅ Backup existing score_items data
2. ✅ Run migration to add normalized_weight column
3. ✅ Deploy new backend with fixed logic
4. ✅ Recalculate all existing scores (migration script)
5. ✅ Validate calculations match Excel for test cases
6. ✅ Update frontend to show normalized weights
7. ✅ Inform users about scoring system update

---

**Status:** ❌ CRITICAL ISSUES FOUND - DO NOT USE IN PRODUCTION  
**Recommendation:** Fix scoring logic before any real assessments  
**Estimated Fix Time:** 4-6 hours development + testing
