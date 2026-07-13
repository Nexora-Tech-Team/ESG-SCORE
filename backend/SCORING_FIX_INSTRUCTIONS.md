# Scoring Fix - Implementation Instructions

## Files Created

1. ✅ `internal/scoring/scoring.go` - New scoring calculation module
2. ✅ `internal/db/migration_add_normalized_weight.sql` - Database migration

## Changes Needed in `cmd/api/main.go`

### 1. Add Import (Line ~26)

```go
import (
	// ... existing imports ...
	"github.com/cbqaglobal/esg-score/internal/scoring"  // ADD THIS
)
```

### 2. Update scoreUpsert Function (Replace lines ~1286-1328)

**OLD CODE:**
```go
func (s *Server) scoreUpsert(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	if user.Role != "asesor" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only assessor can score"})
		return
	}
	var req struct {
		ChecklistItemID string `json:"checklistItemId" binding:"required"`
		Score           int    `json:"score" binding:"min=0,max=5"`
		Note            string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	var weight float64
	if err := s.db.QueryRow(`SELECT weight FROM checklist_items WHERE id = $1`, req.ChecklistItemID).Scan(&weight); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "checklist item not found"})
		return
	}
	weighted := float64(req.Score) * weight
	var item ScoreItem
	if err := s.db.Get(&item, `
		INSERT INTO score_items (assessment_id, checklist_item_id, score, weighted_score, note, assessed_by, assessed_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (assessment_id, checklist_item_id)
		DO UPDATE SET score = EXCLUDED.score, weighted_score = EXCLUDED.weighted_score, note = EXCLUDED.note, assessed_by = EXCLUDED.assessed_by, assessed_at = NOW()
		RETURNING id, assessment_id, checklist_item_id, score, weighted_score, note, assessed_by, assessed_at
	`, assessmentID, req.ChecklistItemID, req.Score, weighted, req.Note, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "score save failed"})
		return
	}
	_, _ = s.db.Exec(`UPDATE assessor_assignments SET status = 'in_review' WHERE assessment_id = $1`, assessmentID)
	c.JSON(http.StatusOK, gin.H{"data": item})
}
```

**NEW CODE:**
```go
func (s *Server) scoreUpsert(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	if user.Role != "asesor" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only assessor can score"})
		return
	}
	var req struct {
		ChecklistItemID string `json:"checklistItemId" binding:"required"`
		Score           int    `json:"score" binding:"min=0,max=5"`
		Note            string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	
	// Calculate normalized weight using scoring module
	normalizedWeight, err := scoring.CalculateNormalizedWeight(s.db, assessmentID, req.ChecklistItemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "weight calculation failed: " + err.Error()})
		return
	}
	
	// Calculate weighted score
	weighted := float64(req.Score) * normalizedWeight
	
	// Save score with normalized weight
	var item ScoreItem
	if err := s.db.Get(&item, `
		INSERT INTO score_items (assessment_id, checklist_item_id, score, normalized_weight, weighted_score, note, assessed_by, assessed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (assessment_id, checklist_item_id)
		DO UPDATE SET 
			score = EXCLUDED.score, 
			normalized_weight = EXCLUDED.normalized_weight,
			weighted_score = EXCLUDED.weighted_score, 
			note = EXCLUDED.note, 
			assessed_by = EXCLUDED.assessed_by, 
			assessed_at = NOW()
		RETURNING id, assessment_id, checklist_item_id, score, weighted_score, note, assessed_by, assessed_at
	`, assessmentID, req.ChecklistItemID, req.Score, normalizedWeight, weighted, req.Note, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "score save failed"})
		return
	}
	_, _ = s.db.Exec(`UPDATE assessor_assignments SET status = 'in_review' WHERE assessment_id = $1`, assessmentID)
	c.JSON(http.StatusOK, gin.H{"data": item})
}
```

### 3. Update scoreSummary Function (Replace lines ~1330-1357)

**OLD CODE:**
```go
func (s *Server) scoreSummary(assessmentID string) (gin.H, error) {
	var row struct {
		Environmental float64 `db:"environmental"`
		Social        float64 `db:"social"`
		Governance    float64 `db:"governance"`
		Total         float64 `db:"total"`
	}
	err := s.db.Get(&row, `
		SELECT
			COALESCE(SUM(CASE WHEN ci.pillar = 'environmental' THEN si.weighted_score ELSE 0 END), 0) AS environmental,
			COALESCE(SUM(CASE WHEN ci.pillar = 'social' THEN si.weighted_score ELSE 0 END), 0) AS social,
			COALESCE(SUM(CASE WHEN ci.pillar = 'governance' THEN si.weighted_score ELSE 0 END), 0) AS governance,
			COALESCE(SUM(si.weighted_score), 0) AS total
		FROM score_items si
		JOIN checklist_items ci ON ci.id = si.checklist_item_id
		WHERE si.assessment_id = $1
	`, assessmentID)
	if err != nil {
		return nil, err
	}
	return gin.H{
		"environmental": row.Environmental,
		"social":        row.Social,
		"governance":    row.Governance,
		"total":         row.Total,
		"percentage":    row.Total / 5 * 100,
	}, nil
}
```

**NEW CODE:**
```go
func (s *Server) scoreSummary(assessmentID string) (gin.H, error) {
	// Use scoring module for accurate calculation
	summary, err := scoring.CalculateScoreSummary(s.db, assessmentID)
	if err != nil {
		return nil, err
	}
	
	return gin.H{
		"environmental": summary.Environmental,
		"social":        summary.Social,
		"governance":    summary.Governance,
		"total":         summary.Total,
		"grandScore":    summary.GrandScore,
		"minPillar":     summary.MinPillar,
		"percentage":    summary.GrandScore, // For backward compatibility
		"profileCode":   summary.ProfileCode,
	}, nil
}
```

### 4. Update recommendAwardLevel Function (Replace lines ~1359-1373)

**OLD CODE:**
```go
func recommendAwardLevel(percentage float64) string {
	if percentage >= 85 {
		return "grand_champion"
	}
	if percentage >= 80 {
		return "leadership"
	}
	if percentage >= 60 {
		return "integration"
	}
	if percentage >= 40 {
		return "foundation"
	}
	return "not_eligible"
}
```

**NEW CODE:**
```go
func recommendAwardLevel(env, social, gov float64) string {
	return string(scoring.DetermineAwardLevel(env, social, gov))
}
```

### 5. Update awardState Function (Lines ~1387-1402)

**OLD CODE:**
```go
func (s *Server) awardState(assessmentID string, percentage float64) (recommended string, effective string, eligible bool, activeCount int, note string, err error) {
	activeCount, err = s.activeRedFlagCount(assessmentID)
	if err != nil {
		return "", "", false, 0, "", err
	}
	recommended = recommendAwardLevel(percentage)
	effective = recommended
	eligible = true
	note = "Eligible for award"
	if activeCount > 0 {
		effective = "not_eligible"
		eligible = false
		note = fmt.Sprintf("Automatically locked by %d active red flag(s).", activeCount)
	}
	return recommended, effective, eligible, activeCount, note, nil
}
```

**NEW CODE:**
```go
func (s *Server) awardState(assessmentID string, env, social, gov, grandScore float64) (recommended string, effective string, eligible bool, activeCount int, grandEligible bool, note string, err error) {
	activeCount, err = s.activeRedFlagCount(assessmentID)
	if err != nil {
		return "", "", false, 0, false, "", err
	}
	
	minPillar := env
	if social < minPillar {
		minPillar = social
	}
	if gov < minPillar {
		minPillar = gov
	}
	
	recommended = recommendAwardLevel(env, social, gov)
	effective = recommended
	eligible = true
	grandEligible = scoring.IsGrandChampionEligible(grandScore, minPillar, activeCount)
	note = "Eligible for award"
	
	if activeCount > 0 {
		effective = "not_eligible"
		eligible = false
		grandEligible = false
		note = fmt.Sprintf("Automatically locked by %d active red flag(s).", activeCount)
	}
	
	return recommended, effective, eligible, activeCount, grandEligible, note, nil
}
```

### 6. Update assessmentSummary Function (Lines ~1404-1458)

Find this section and update the call to awardState:

**OLD:**
```go
recommended, effective, eligible, activeCount, note, err := s.awardState(assessmentID, percentage)
```

**NEW:**
```go
env := summary["environmental"].(float64)
soc := summary["social"].(float64)
gov := summary["governance"].(float64)
grandScore := summary["grandScore"].(float64)

recommended, effective, eligible, activeCount, grandEligible, note, err := s.awardState(assessmentID, env, soc, gov, grandScore)
if err != nil {
	c.JSON(http.StatusInternalServerError, gin.H{"error": "award state failed"})
	return
}

summary["recommendedAwardLevel"] = recommended
summary["effectiveAwardLevel"] = effective
summary["eligibleForAward"] = eligible
summary["activeRedFlags"] = activeCount
summary["eligibilityNote"] = note
summary["grandChampionEligible"] = grandEligible
```

### 7. Update juryAssessments Function (Lines ~1490-1531)

Update the loop that processes rows:

**REPLACE:**
```go
for i := range rows {
	recommended, effective, eligible, activeCount, note, err := s.awardState(rows[i].AssessmentID.String(), rows[i].Percentage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "jury eligibility failed"})
		return
	}
	rows[i].RecommendedAwardLevel = recommended
	rows[i].EffectiveAwardLevel = effective
	rows[i].EligibleForAward = eligible
	rows[i].ActiveRedFlags = activeCount
	rows[i].EligibilityNote = note
}
```

**WITH:**
```go
for i := range rows {
	recommended, effective, eligible, activeCount, grandEligible, note, err := s.awardState(
		rows[i].AssessmentID.String(),
		rows[i].Environmental,
		rows[i].Social,
		rows[i].Governance,
		rows[i].Percentage, // This is actually grandScore now
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "jury eligibility failed"})
		return
	}
	rows[i].RecommendedAwardLevel = recommended
	rows[i].EffectiveAwardLevel = effective
	rows[i].EligibleForAward = eligible
	rows[i].ActiveRedFlags = activeCount
	rows[i].EligibilityNote = note
	// Add grandEligible to response if needed
}
```

## Step-by-Step Application

### 1. Run Database Migration
```bash
cd backend
psql -U esgscore -d esgscore -f internal/db/migration_add_normalized_weight.sql
```

### 2. Apply Code Changes

You can either:
- **Option A:** Manually edit `cmd/api/main.go` following the instructions above
- **Option B:** Use the automated patch script (if created)

### 3. Test the Build
```bash
go mod tidy
go build -o api cmd/api/main.go
```

### 4. Run and Test
```bash
./api
# or
go run cmd/api/main.go
```

## Verification

After applying changes:

1. Check that server starts without errors
2. Login as asesor
3. Score some items
4. Check `/v1/assessments/:id/summary` - should show normalized weights
5. Verify scoring matches Excel calculations

## Rollback Plan

If issues occur:

1. Restore database:
```bash
psql -U esgscore -d esgscore -c "ALTER TABLE score_items DROP COLUMN IF EXISTS normalized_weight"
```

2. Restore original main.go from git:
```bash
git checkout cmd/api/main.go
```
