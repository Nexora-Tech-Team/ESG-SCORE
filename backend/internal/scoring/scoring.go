package scoring

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
)

// ProfileCode determines profile code from license type and service type
func ProfileCode(licenseType, mainServiceType string) string {
	licenseType = strings.TrimSpace(strings.ToUpper(licenseType))

	if licenseType == "IUP" {
		return "IUP"
	}

	if licenseType != "IUJP" {
		return "BELUM DIPILIH"
	}

	service := strings.TrimSpace(strings.ToLower(mainServiceType))

	switch {
	case strings.Contains(service, "consult"),
		strings.Contains(service, "planning"),
		strings.Contains(service, "lab"),
		strings.Contains(service, "engineering"),
		strings.Contains(service, "konsultasi"):
		return "IUJP-KONSULTASI"

	case strings.Contains(service, "haul"),
		strings.Contains(service, "operasional"),
		strings.Contains(service, "logistic"),
		strings.Contains(service, "maintenance"),
		strings.Contains(service, "heavy"),
		strings.Contains(service, "construction"):
		return "IUJP-OPERASIONAL"

	case strings.Contains(service, "drill"),
		strings.Contains(service, "blast"),
		strings.Contains(service, "bor"),
		strings.Contains(service, "peledak"):
		return "IUJP-DRILLING"

	case strings.Contains(service, "processing"),
		strings.Contains(service, "refining"),
		strings.Contains(service, "plant"),
		strings.Contains(service, "pengolahan"),
		strings.Contains(service, "pemurnian"):
		return "IUJP-PENGOLAHAN"

	case strings.Contains(service, "camp"),
		strings.Contains(service, "catering"),
		strings.Contains(service, "security"),
		strings.Contains(service, "support"),
		strings.Contains(service, "penunjang"):
		return "IUJP-PENUNJANG"

	default:
		return "IUJP-KONSULTASI" // Default untuk IUJP
	}
}

// ProfileTargetWeight gets target weight for a pillar in a profile
type ProfileTarget struct {
	Environmental float64
	Social        float64
	Governance    float64
}

func GetProfileTarget(db *sqlx.DB, profileCode string) (*ProfileTarget, error) {
	var target ProfileTarget
	err := db.QueryRow(`
		SELECT environmental, social, governance
		FROM profile_weight_targets
		WHERE profile_code = $1
	`, profileCode).Scan(&target.Environmental, &target.Social, &target.Governance)

	if err != nil {
		return nil, err
	}
	return &target, nil
}

// GetPillarTarget returns the target weight for a specific pillar
func (pt *ProfileTarget) GetPillarTarget(pillar string) float64 {
	switch strings.ToLower(pillar) {
	case "environmental":
		return pt.Environmental
	case "social":
		return pt.Social
	case "governance":
		return pt.Governance
	default:
		return 0
	}
}

// IsItemApplicable checks if checklist item is applicable for profile
func IsItemApplicable(db *sqlx.DB, checklistItemID, profileCode string) (bool, error) {
	var applicabilityTag string
	err := db.QueryRow(`
		SELECT applicability_tag
		FROM checklist_items
		WHERE id = $1
	`, checklistItemID).Scan(&applicabilityTag)

	if err != nil {
		return false, err
	}

	// Parse comma-separated applicability tags
	tags := strings.Split(applicabilityTag, ",")
	for _, tag := range tags {
		if strings.TrimSpace(tag) == profileCode {
			return true, nil
		}
	}

	return false, nil
}

// CalculateNormalizedWeight calculates normalized weight for an item
func CalculateNormalizedWeight(
	db *sqlx.DB,
	assessmentID string,
	checklistItemID string,
) (float64, error) {
	// Get profile code from assessment
	var licenseType, mainServiceType sql.NullString
	err := db.QueryRow(`
		SELECT o.license_type, o.main_service_type
		FROM assessments a
		JOIN organizations o ON o.id = a.organization_id
		WHERE a.id = $1
	`, assessmentID).Scan(&licenseType, &mainServiceType)

	if err != nil {
		return 0, fmt.Errorf("failed to get profile: %w", err)
	}

	profileCode := ProfileCode(licenseType.String, mainServiceType.String)

	// Get item details
	var baseWeight float64
	var pillar string
	var applicabilityTag string
	err = db.QueryRow(`
		SELECT weight, pillar, applicability_tag
		FROM checklist_items
		WHERE id = $1
	`, checklistItemID).Scan(&baseWeight, &pillar, &applicabilityTag)

	if err != nil {
		return 0, fmt.Errorf("failed to get checklist item: %w", err)
	}

	// Check if item is applicable for this profile
	applicable := false
	tags := strings.Split(applicabilityTag, ",")
	for _, tag := range tags {
		if strings.TrimSpace(tag) == profileCode {
			applicable = true
			break
		}
	}

	if !applicable {
		return 0, nil // Not applicable = 0 weight
	}

	// Get profile target for this pillar
	profileTarget, err := GetProfileTarget(db, profileCode)
	if err != nil {
		return 0, fmt.Errorf("failed to get profile target: %w", err)
	}

	pillarTarget := profileTarget.GetPillarTarget(pillar)

	// Calculate sum of base weights for applicable items in this pillar
	var sumBaseWeights float64
	err = db.QueryRow(`
		SELECT COALESCE(SUM(weight), 0)
		FROM checklist_items
		WHERE pillar = $1
		  AND $2 = ANY(string_to_array(applicability_tag, ','))
	`, pillar, profileCode).Scan(&sumBaseWeights)

	if err != nil {
		return 0, fmt.Errorf("failed to calculate sum weights: %w", err)
	}

	if sumBaseWeights == 0 {
		return 0, nil
	}

	// Calculate normalized weight
	// Formula: (base_weight / sum_base_weights) * pillar_target
	normalizedWeight := (baseWeight / sumBaseWeights) * pillarTarget

	return normalizedWeight, nil
}

// ScoreSummary represents the aggregated scores per pillar
type ScoreSummary struct {
	Environmental float64
	Social        float64
	Governance    float64
	Total         float64
	GrandScore    float64 // 0-100 scale
	MinPillar     float64
	ProfileCode   string
}

// CalculateScoreSummary computes the score summary for an assessment
func CalculateScoreSummary(db *sqlx.DB, assessmentID string) (*ScoreSummary, error) {
	summary := &ScoreSummary{}

	// Get all scores with their normalized weights
	rows, err := db.Query(`
		SELECT
			ci.pillar,
			si.score,
			si.normalized_weight,
			si.weighted_score
		FROM score_items si
		JOIN checklist_items ci ON ci.id = si.checklist_item_id
		WHERE si.assessment_id = $1
	`, assessmentID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var envWeightedSum, socWeightedSum, govWeightedSum float64

	for rows.Next() {
		var pillar string
		var score int
		var normalizedWeight, weightedScore float64

		if err := rows.Scan(&pillar, &score, &normalizedWeight, &weightedScore); err != nil {
			return nil, err
		}

		switch strings.ToLower(pillar) {
		case "environmental":
			envWeightedSum += weightedScore
		case "social":
			socWeightedSum += weightedScore
		case "governance":
			govWeightedSum += weightedScore
		}
	}

	summary.Environmental = envWeightedSum
	summary.Social = socWeightedSum
	summary.Governance = govWeightedSum
	summary.Total = envWeightedSum + socWeightedSum + govWeightedSum

	// Calculate Grand Score (0-100)
	// Each pillar should be 0-5 after normalization, total should be 0-15
	// But since we use profile targets that sum to 1.0, total will be 0-5
	// Grand Score = (Total / 5) * 100
	summary.GrandScore = (summary.Total / 5.0) * 100

	// Calculate minimum pillar score
	summary.MinPillar = summary.Environmental
	if summary.Social < summary.MinPillar {
		summary.MinPillar = summary.Social
	}
	if summary.Governance < summary.MinPillar {
		summary.MinPillar = summary.Governance
	}

	// Get profile code
	var licenseType, mainServiceType sql.NullString
	err = db.QueryRow(`
		SELECT o.license_type, o.main_service_type
		FROM assessments a
		JOIN organizations o ON o.id = a.organization_id
		WHERE a.id = $1
	`, assessmentID).Scan(&licenseType, &mainServiceType)

	if err == nil {
		summary.ProfileCode = ProfileCode(licenseType.String, mainServiceType.String)
	}

	return summary, nil
}

// AwardLevel represents the award category
type AwardLevel string

const (
	AwardNotEligible AwardLevel = "not_eligible"
	AwardFoundation  AwardLevel = "foundation"
	AwardIntegration AwardLevel = "integration"
	AwardLeadership  AwardLevel = "leadership"
	AwardGrandChampion AwardLevel = "grand_champion"
)

// DetermineAwardLevel determines award based on MINIMUM pillar score
func DetermineAwardLevel(env, social, gov float64) AwardLevel {
	minScore := env
	if social < minScore {
		minScore = social
	}
	if gov < minScore {
		minScore = gov
	}

	// Award based on minimum pillar score (Excel logic)
	if minScore >= 4.0 {
		return AwardLeadership
	}
	if minScore >= 3.0 {
		return AwardIntegration
	}
	if minScore >= 2.0 {
		return AwardFoundation
	}
	return AwardNotEligible
}

// IsGrandChampionEligible checks if assessment qualifies for Grand Champion
func IsGrandChampionEligible(grandScore, minPillar float64, redFlagCount int) bool {
	return grandScore >= 85.0 && minPillar >= 3.0 && redFlagCount == 0
}
