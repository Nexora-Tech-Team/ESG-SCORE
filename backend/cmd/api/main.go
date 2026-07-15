package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"github.com/cbqaglobal/esg-score/internal/scoring"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	JWTExpiry      int
	AllowedOrigins []string
}

type Server struct {
	db  *sqlx.DB
	cfg Config
}

type Claims struct {
	UserID string `json:"user_id"`
	OrgID  string `json:"org_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type User struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	OrganizationID *uuid.UUID `db:"organization_id" json:"organizationId"`
	Email          string     `db:"email" json:"email"`
	Name           string     `db:"name" json:"name"`
	Position       *string    `db:"position" json:"position,omitempty"`
	Affiliation    *string    `db:"affiliation" json:"affiliation,omitempty"`
	Phone          *string    `db:"phone" json:"phone,omitempty"`
	PhotoURL       *string    `db:"photo_url" json:"photoUrl,omitempty"`
	Role           string     `db:"role" json:"role"`
	IsActive       bool       `db:"is_active" json:"isActive"`
	CreatedAt      time.Time  `db:"created_at" json:"createdAt"`
}

type Organization struct {
	ID              uuid.UUID `db:"id" json:"id"`
	Name            string    `db:"name" json:"name"`
	Slug            string    `db:"slug" json:"slug"`
	Industry        *string   `db:"industry" json:"industry,omitempty"`
	Sector          *string   `db:"sector" json:"sector,omitempty"`
	LogoURL         *string   `db:"logo_url" json:"logoUrl,omitempty"`
	LicenseNumber   *string   `db:"license_number" json:"licenseNumber,omitempty"`
	LicenseType     *string   `db:"license_type" json:"licenseType,omitempty"`
	MainServiceType *string   `db:"main_service_type" json:"mainServiceType,omitempty"`
	Status          string    `db:"status" json:"status"`
	Email           *string   `db:"email" json:"email,omitempty"`
	Phone           *string   `db:"phone" json:"phone,omitempty"`
	Website         *string   `db:"website" json:"website,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"createdAt"`
}

type ProfileWeightTarget struct {
	Code          string    `db:"profile_code" json:"profileCode"`
	Environmental float64   `db:"environmental" json:"environmental"`
	Social        float64   `db:"social" json:"social"`
	Governance    float64   `db:"governance" json:"governance"`
	Rationale     string    `db:"rationale" json:"rationale"`
	CreatedAt     time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt     time.Time `db:"updated_at" json:"updatedAt"`
	Total         float64   `json:"total"`
}

type MaturityLevelRef struct {
	ID          uuid.UUID `db:"id" json:"id"`
	Score       int       `db:"score" json:"score"`
	Level       string    `db:"level" json:"level"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `db:"updated_at" json:"updatedAt"`
}

type MaturityBandRef struct {
	ID         uuid.UUID `db:"id" json:"id"`
	RangeLabel string    `db:"range_label" json:"rangeLabel"`
	BandLabel  string    `db:"band_label" json:"bandLabel"`
	CreatedAt  time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt  time.Time `db:"updated_at" json:"updatedAt"`
}

type Assessment struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	OrganizationID uuid.UUID  `db:"organization_id" json:"organizationId"`
	PeriodID       *uuid.UUID `db:"period_id" json:"periodId,omitempty"`
	Title          string     `db:"title" json:"title"`
	Status         string     `db:"status" json:"status"`
	PeriodYear     int        `db:"period_year" json:"periodYear"`
	SubmittedAt    *time.Time `db:"submitted_at" json:"submittedAt,omitempty"`
	FinalizedAt    *time.Time `db:"finalized_at" json:"finalizedAt,omitempty"`
	RevisionNote   *string    `db:"revision_note" json:"revisionNote,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"createdAt"`
}

type AssessmentDetailRow struct {
	Assessment
	OrganizationName   string     `db:"organization_name" json:"organizationName"`
	OrganizationStatus string     `db:"organization_status" json:"organizationStatus"`
	AssessorID         *uuid.UUID `db:"assessor_id" json:"assessorId,omitempty"`
	AssessorName       *string    `db:"assessor_name" json:"assessorName,omitempty"`
	AssessorEmail      *string    `db:"assessor_email" json:"assessorEmail,omitempty"`
}

type ParticipantRow struct {
	Organization
	AssessmentID     *uuid.UUID `db:"assessment_id" json:"assessmentId,omitempty"`
	AssessmentStatus *string    `db:"assessment_status" json:"assessmentStatus,omitempty"`
	AssessorID       *uuid.UUID `db:"assessor_id" json:"assessorId,omitempty"`
	AssessorName     *string    `db:"assessor_name" json:"assessorName,omitempty"`
}

type AssignmentRow struct {
	AssignmentID     uuid.UUID `db:"assignment_id" json:"assignmentId"`
	AssessmentID     uuid.UUID `db:"assessment_id" json:"assessmentId"`
	ParticipantID    uuid.UUID `db:"participant_id" json:"participantId"`
	ParticipantName  string    `db:"participant_name" json:"participantName"`
	AssessmentStatus string    `db:"assessment_status" json:"assessmentStatus"`
	Status           string    `db:"status" json:"status"`
	AssignedAt       time.Time `db:"assigned_at" json:"assignedAt"`
	LicenseType      *string   `db:"license_type" json:"-"`
	MainServiceType  *string   `db:"main_service_type" json:"-"`
	ScoredCount      int       `db:"scored_count" json:"scoredCount"`
	ProfileCode      string    `db:"-" json:"profileCode"`
	TotalItems       int       `db:"-" json:"totalItems"`
}

type ChecklistItem struct {
	ID               string  `db:"id" json:"id"`
	Pillar           string  `db:"pillar" json:"pillar"`
	Category         string  `db:"category" json:"category"`
	SubCategory      string  `db:"sub_category" json:"subCategory"`
	QuestionNumber   string  `db:"question_number" json:"questionNumber"`
	Question         string  `db:"question" json:"question"`
	EvidenceRequired string  `db:"evidence_required" json:"evidenceRequired"`
	ApplicabilityTag string  `db:"applicability_tag" json:"applicabilityTag"`
	Weight           float64 `db:"weight" json:"weight"`
	SortOrder        int     `db:"sort_order" json:"sortOrder"`
}

type EvidenceItem struct {
	ID              uuid.UUID `db:"id" json:"id"`
	AssessmentID    uuid.UUID `db:"assessment_id" json:"assessmentId"`
	ChecklistItemID string    `db:"checklist_item_id" json:"checklistItemId"`
	FileName        string    `db:"file_name" json:"fileName"`
	FileURL         string    `db:"file_url" json:"fileUrl"`
	Status          string    `db:"status" json:"status"`
	ReviewerNote    *string   `db:"reviewer_note" json:"reviewerNote,omitempty"`
	UploadedBy      uuid.UUID `db:"uploaded_by" json:"uploadedBy"`
	CreatedAt       time.Time `db:"created_at" json:"createdAt"`
}

type ScoreItem struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	AssessmentID    uuid.UUID  `db:"assessment_id" json:"assessmentId"`
	ChecklistItemID string     `db:"checklist_item_id" json:"checklistItemId"`
	Score           int        `db:"score" json:"score"`
	WeightedScore   float64    `db:"weighted_score" json:"weightedScore"`
	Note            *string    `db:"note" json:"note,omitempty"`
	AssessedBy      *uuid.UUID `db:"assessed_by" json:"assessedBy,omitempty"`
	AssessedAt      time.Time  `db:"assessed_at" json:"assessedAt"`
}

type JuryAssessmentRow struct {
	AssessmentID          uuid.UUID  `db:"assessment_id" json:"assessmentId"`
	ParticipantID         uuid.UUID  `db:"participant_id" json:"participantId"`
	ParticipantName       string     `db:"participant_name" json:"participantName"`
	AssessmentStatus      string     `db:"assessment_status" json:"assessmentStatus"`
	LicenseType           *string    `db:"license_type" json:"-"`
	MainServiceType       *string    `db:"main_service_type" json:"-"`
	Environmental         float64    `db:"environmental" json:"environmental"`
	Social                float64    `db:"social" json:"social"`
	Governance            float64    `db:"governance" json:"governance"`
	Total                 float64    `db:"total" json:"total"`
	Percentage            float64    `db:"percentage" json:"percentage"`
	ScoredCount           int        `db:"scored_count" json:"scoredCount"`
	TotalItems            int        `db:"-" json:"totalItems"`
	RecommendedAwardLevel string     `json:"recommendedAwardLevel"`
	EffectiveAwardLevel   string     `json:"effectiveAwardLevel"`
	EligibleForAward      bool       `json:"eligibleForAward"`
	ActiveRedFlags        int        `json:"activeRedFlags"`
	EligibilityNote       string     `json:"eligibilityNote,omitempty"`
	AwardLevel            *string    `db:"award_level" json:"awardLevel,omitempty"`
	DecisionNote          *string    `db:"decision_note" json:"decisionNote,omitempty"`
	DecidedAt             *time.Time `db:"decided_at" json:"decidedAt,omitempty"`
}

type RedFlagRow struct {
	ID           uuid.UUID `db:"id" json:"id"`
	AssessmentID uuid.UUID `db:"assessment_id" json:"assessmentId"`
	Type         string    `db:"type" json:"type"`
	Description  string    `db:"description" json:"description"`
	IsActive     bool      `db:"is_active" json:"isActive"`
	CreatedAt    time.Time `db:"created_at" json:"createdAt"`
}

// weakJWTSecrets are known/default values that must never be used in production.
var weakJWTSecrets = map[string]bool{
	"":                                     true,
	"change-me-esg-score":                  true,
	"esg-score-secret-key-2026-production": true,
}

func main() {
	cfg := loadConfig()

	if weakJWTSecrets[cfg.JWTSecret] || len(cfg.JWTSecret) < 24 {
		log.Printf("⚠️  SECURITY WARNING: JWT_SECRET is weak or default. Set a long random JWT_SECRET before deploying to production — anyone who knows it can forge login tokens for any role.")
	}

	db := connect(cfg.DatabaseURL)
	defer db.Close()

	runSQLFile(db, "internal/db/schema.sql")
	runSQLFile(db, "internal/db/seed.sql")
	seedUsers(db)

	s := &Server{db: db, cfg: cfg}
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "ESG Score API"})
	})

	// Serve uploaded evidence files statically
	if err := os.MkdirAll("uploads", 0o755); err != nil {
		log.Printf("warning: failed to create uploads directory: %v", err)
	}
	r.Static("/uploads", "uploads")

	v1 := r.Group("/v1")
	v1.POST("/auth/login", s.login)
	v1.POST("/auth/register", s.registerParticipant)
	v1.POST("/auth/check-email", s.checkEmail)
	v1.POST("/auth/forgot-password", s.requestPasswordReset)
	v1.POST("/auth/reset-password", s.resetPassword)

	protected := v1.Group("/")
	protected.Use(s.authMiddleware())
	protected.GET("/me", s.me)
	protected.PATCH("/me", s.updateMe)
	protected.POST("/me/photo", s.uploadUserPhoto)
	protected.GET("/score-model", s.scoreModel)
	protected.GET("/checklist", s.checklist)
	protected.GET("/assessments/:assessmentId", s.assessmentDetail)
	protected.GET("/assessments/:assessmentId/evidence", s.evidenceList)
	protected.POST("/assessments/:assessmentId/evidence", s.evidenceUpsert)
	protected.POST("/assessments/:assessmentId/evidence/upload", s.evidenceUpload)
	protected.DELETE("/assessments/:assessmentId/evidence/:evidenceId", s.evidenceDelete)
	protected.GET("/assessments/:assessmentId/red-flags", s.redFlagList)
	protected.POST("/assessments/:assessmentId/red-flags", s.redFlagUpsert)
	protected.GET("/assessments/:assessmentId/scores", s.scoreList)
	protected.POST("/assessments/:assessmentId/scores", s.scoreUpsert)
	protected.GET("/assessments/:assessmentId/summary", s.assessmentSummary)
	protected.PATCH("/assessments/:assessmentId/submit", s.submitAssessment)
	protected.PATCH("/assessments/:assessmentId/request-revision", s.requestRevision)
	protected.PATCH("/assessments/:assessmentId/submit-to-jury", s.submitToJury)
	protected.POST("/assessments/:assessmentId/jury-decision", s.juryDecision)

	participant := protected.Group("/participant")
	participant.Use(requireRole("peserta"))
	participant.GET("/assessment", s.participantAssessment)
	participant.GET("/profile", s.participantProfile)
	participant.PATCH("/profile", s.updateParticipantProfile)
	participant.POST("/profile", s.updateParticipantProfile)
	participant.POST("/logo", s.uploadLogo)

	admin := protected.Group("/admin")
	admin.Use(requireRole("admin"))
	admin.GET("/participants", s.adminParticipants)
	admin.GET("/users", s.adminUsers)
	admin.POST("/users", s.adminCreateUser)
	admin.PATCH("/users/:userId/status", s.updateUserStatus)
	admin.GET("/profile-weights", s.profileWeights)
	admin.PATCH("/profile-weights/:profileCode", s.updateProfileWeight)
	admin.DELETE("/profile-weights/:profileCode", s.deleteProfileWeight)
	admin.GET("/checklist-items", s.adminChecklistItems)
	admin.POST("/checklist-items", s.createChecklistItem)
	admin.PATCH("/checklist-items/:id", s.updateChecklistItem)
	admin.DELETE("/checklist-items/:id", s.deleteChecklistItem)
	admin.GET("/maturity-levels", s.maturityLevels)
	admin.POST("/maturity-levels", s.createMaturityLevel)
	admin.PATCH("/maturity-levels/:id", s.updateMaturityLevel)
	admin.DELETE("/maturity-levels/:id", s.deleteMaturityLevel)
	admin.GET("/maturity-bands", s.maturityBands)
	admin.POST("/maturity-bands", s.createMaturityBand)
	admin.PATCH("/maturity-bands/:id", s.updateMaturityBand)
	admin.DELETE("/maturity-bands/:id", s.deleteMaturityBand)
	admin.PATCH("/participants/:orgId/verify", s.verifyParticipant)
	admin.PATCH("/participants/:orgId", s.updateParticipant)
	admin.DELETE("/participants/:orgId", s.deleteParticipant)
	admin.GET("/assessors", s.assessors)
	admin.POST("/assessments/:assessmentId/assign", s.assignAssessor)

	assessor := protected.Group("/assessor")
	assessor.Use(requireRole("asesor"))
	assessor.GET("/assignments", s.assessorAssignments)

	jury := protected.Group("/jury")
	jury.Use(requireRole("juri"))
	jury.GET("/assessments", s.juryAssessments)

	log.Printf("ESG Score API running on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func loadConfig() Config {
	_ = godotenv.Load()
	expiry, _ := strconv.Atoi(env("JWT_EXPIRY_MINUTES", "1440"))
	return Config{
		Port:           env("PORT", "8088"),
		DatabaseURL:    env("DATABASE_URL", "postgres://esgscore:esgscore_dev@localhost:5434/esgscore?sslmode=disable"),
		JWTSecret:      env("JWT_SECRET", "change-me-esg-score"),
		JWTExpiry:      expiry,
		AllowedOrigins: parseCSVEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175"),
	}
}

func parseCSVEnv(key, fallback string) []string {
	raw := env(key, fallback)
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			values = append(values, value)
		}
	}
	return values
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func connect(dsn string) *sqlx.DB {
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("database connect error: %v", err)
	}
	db.SetMaxOpenConns(15)
	db.SetMaxIdleConns(5)
	return db
}

func runSQLFile(db *sqlx.DB, path string) {
	body, err := os.ReadFile(path)
	if err != nil {
		log.Fatalf("read %s: %v", path, err)
	}
	if _, err := db.Exec(string(body)); err != nil {
		log.Fatalf("execute %s: %v", path, err)
	}
}

func seedUsers(db *sqlx.DB) {
	users := []struct {
		Email string
		Name  string
		Role  string
	}{
		{"admin@esg-score.local", "Admin ESG", "admin"},
		{"asesor@esg-score.local", "Asesor ESG 1", "asesor"},
		{"asesor2@esg-score.local", "Asesor ESG 2", "asesor"},
		{"juri@esg-score.local", "Juri ESG", "juri"},
	}

	for _, item := range users {
		var userID uuid.UUID
		err := db.QueryRow(`
			INSERT INTO users (email, name, role)
			VALUES ($1, $2, $3)
			ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
			RETURNING id
		`, item.Email, item.Name, item.Role).Scan(&userID)
		if err != nil {
			log.Fatalf("seed user %s: %v", item.Email, err)
		}
		seedPassword := "password"
		if item.Role == "admin" {
			seedPassword = "Admin@2026"
		}
		setPassword(db, userID, seedPassword)
	}
}

func setPassword(db *sqlx.DB, userID uuid.UUID, password string) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("password hash: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO user_credentials (user_id, password_hash)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
	`, userID, string(hash)); err != nil {
		log.Fatalf("seed password: %v", err)
	}
}

func slugify(value string) string {
	slug := strings.ToLower(strings.TrimSpace(value))
	var b strings.Builder
	prevDash := false
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteRune('-')
			prevDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

func (s *Server) sign(user User) (string, error) {
	orgID := ""
	if user.OrganizationID != nil {
		orgID = user.OrganizationID.String()
	}
	claims := Claims{
		UserID: user.ID.String(),
		OrgID:  orgID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.cfg.JWTExpiry) * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.cfg.JWTSecret))
}

func (s *Server) verify(token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid claims")
	}
	return claims, nil
}

func (s *Server) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		token := strings.TrimPrefix(header, "Bearer ")
		if token == "" || token == header {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		claims, err := s.verify(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		c.Set("claims", claims)
		c.Next()
	}
}

func requireRole(roles ...string) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, role := range roles {
		allowed[role] = true
	}
	return func(c *gin.Context) {
		claims := c.MustGet("claims").(*Claims)
		if !allowed[claims.Role] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}

func (s *Server) currentUser(c *gin.Context) (User, bool) {
	claims := c.MustGet("claims").(*Claims)
	var user User
	err := s.db.Get(&user, `SELECT id, organization_id, email, name, position, affiliation, phone, photo_url, role, is_active, created_at FROM users WHERE id = $1`, claims.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return User{}, false
	}
	return user, true
}

func (s *Server) login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var user User
	var passwordHash string
	err := s.db.QueryRowx(`
		SELECT u.id, u.organization_id, u.email, u.name, u.position, u.affiliation, u.phone, u.photo_url, u.role, u.is_active, u.created_at, uc.password_hash
		FROM users u
		JOIN user_credentials uc ON uc.user_id = u.id
		WHERE u.email = $1 AND u.is_active = TRUE
	`, strings.ToLower(req.Email)).Scan(&user.ID, &user.OrganizationID, &user.Email, &user.Name, &user.Position, &user.Affiliation, &user.Phone, &user.PhotoURL, &user.Role, &user.IsActive, &user.CreatedAt, &passwordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	token, err := s.sign(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token failed"})
		return
	}
	_, _ = s.db.Exec(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, user.ID)
	c.JSON(http.StatusOK, gin.H{"accessToken": token, "user": user})
}

func (s *Server) checkEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var exists bool
	if err := s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, strings.ToLower(req.Email)).Scan(&exists); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "email check failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"email":     strings.ToLower(req.Email),
		"exists":    exists,
		"available": !exists,
	})
}

func passwordPolicyError(password string) string {
	if len(password) < 8 {
		return "password must be at least 8 characters long"
	}

	var hasUppercase, hasNumber, hasSymbol bool
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUppercase = true
		case unicode.IsNumber(r):
			hasNumber = true
		case unicode.IsPunct(r) || unicode.IsSymbol(r):
			hasSymbol = true
		}
	}

	if !hasUppercase {
		return "password must include at least one uppercase letter"
	}
	if !hasNumber {
		return "password must include at least one number"
	}
	if !hasSymbol {
		return "password must include at least one symbol"
	}
	return ""
}

func generateResetToken() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	token := hex.EncodeToString(raw)
	sum := sha256.Sum256([]byte(token))
	return token, hex.EncodeToString(sum[:]), nil
}

func resetPasswordBaseURL() string {
	base := strings.TrimRight(env("FRONTEND_BASE_URL", "http://localhost:5175"), "/")
	return base + "/reset-password/"
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func profileCodeFromProfile(licenseType *string, mainServiceType *string) string {
	if licenseType == nil {
		return "BELUM DIPILIH"
	}
	if strings.EqualFold(*licenseType, "IUP") {
		return "IUP"
	}
	if !strings.EqualFold(*licenseType, "IUJP") {
		return "BELUM DIPILIH"
	}

	service := strings.TrimSpace(strings.ToLower(derefString(mainServiceType)))
	switch {
	case strings.Contains(service, "consult"), strings.Contains(service, "planning"), strings.Contains(service, "lab"), strings.Contains(service, "engineering"):
		return "IUJP-KONSULTASI"
	case strings.Contains(service, "haul"), strings.Contains(service, "operasional"), strings.Contains(service, "logistic"), strings.Contains(service, "maintenance"), strings.Contains(service, "heavy"), strings.Contains(service, "construction"):
		return "IUJP-OPERASIONAL"
	case strings.Contains(service, "drill"), strings.Contains(service, "blast"), strings.Contains(service, "bor"), strings.Contains(service, "peledak"):
		return "IUJP-DRILLING"
	case strings.Contains(service, "processing"), strings.Contains(service, "refining"), strings.Contains(service, "plant"), strings.Contains(service, "pengolahan"), strings.Contains(service, "pemurnian"):
		return "IUJP-PENGOLAHAN"
	case strings.Contains(service, "camp"), strings.Contains(service, "catering"), strings.Contains(service, "security"), strings.Contains(service, "support"), strings.Contains(service, "penunjang"), strings.Contains(service, "logistik"), strings.Contains(service, "logistic"):
		return "IUJP-PENUNJANG"
	default:
		return "IUJP-KONSULTASI"
	}
}

func (s *Server) registerParticipant(c *gin.Context) {
	var req struct {
		Company  string `json:"company" binding:"required"`
		Position string `json:"position" binding:"required"`
		Sector   string `json:"sector" binding:"required"`
		Name     string `json:"name" binding:"required"`
		Phone    string `json:"phone"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if errMsg := passwordPolicyError(req.Password); errMsg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	tx := s.db.MustBegin()
	defer func() { _ = tx.Rollback() }()

	slug := slugify(req.Company)
	if slug == "" {
		slug = "participant"
	}
	slug = slug + "-" + uuid.NewString()[:8]

	var orgID uuid.UUID
	if err := tx.QueryRow(`
		INSERT INTO organizations (name, slug, industry, sector, status, email, phone)
		VALUES ($1, $2, $3, $4, 'registered', $5, $6)
		RETURNING id
	`, req.Company, slug, req.Sector, req.Sector, strings.ToLower(req.Email), req.Phone).Scan(&orgID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "organization create failed"})
		return
	}

	var userID uuid.UUID
	if err := tx.QueryRow(`
		INSERT INTO users (organization_id, email, name, position, phone, role)
		VALUES ($1, $2, $3, $4, $5, 'peserta')
		RETURNING id
	`, orgID, strings.ToLower(req.Email), req.Name, req.Position, req.Phone).Scan(&userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email already registered"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "password failed"})
		return
	}
	if _, err := tx.Exec(`INSERT INTO user_credentials (user_id, password_hash) VALUES ($1, $2)`, userID, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "credential failed"})
		return
	}

	var periodID *uuid.UUID
	_ = tx.QueryRow(`SELECT id FROM award_periods WHERE status = 'active' ORDER BY year DESC LIMIT 1`).Scan(&periodID)
	if _, err := tx.Exec(`
		INSERT INTO assessments (organization_id, period_id, title, status, period_year)
		VALUES ($1, $2, 'ESG Mining Award Assessment 2026', 'draft', 2026)
	`, orgID, periodID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assessment create failed"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "register failed"})
		return
	}

	var user User
	if err := s.db.Get(&user, `SELECT id, organization_id, email, name, position, affiliation, phone, role, is_active, created_at FROM users WHERE id = $1`, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user lookup failed"})
		return
	}
	token, _ := s.sign(user)
	c.JSON(http.StatusCreated, gin.H{"accessToken": token, "user": user})
}

func nullIfEmpty(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return strings.TrimSpace(value)
}

func (s *Server) requestPasswordReset(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var userID uuid.UUID
	var userEmail string
	if err := s.db.QueryRow(`
		SELECT id, email
		FROM users
		WHERE email = $1 AND is_active = TRUE
	`, strings.ToLower(req.Email)).Scan(&userID, &userEmail); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "If the email exists, reset instructions will be sent."})
		return
	}

	token, tokenHash, err := generateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reset token failed"})
		return
	}

	if _, err := s.db.Exec(`
		DELETE FROM password_reset_tokens
		WHERE user_id = $1 AND used_at IS NULL
	`, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reset cleanup failed"})
		return
	}

	if _, err := s.db.Exec(`
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, NOW() + INTERVAL '30 minutes')
	`, userID, tokenHash); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reset request failed"})
		return
	}

	resetURL := resetPasswordBaseURL() + token
	log.Printf("password reset requested for %s: %s", userEmail, resetURL)
	c.JSON(http.StatusOK, gin.H{
		"message":  "If the email exists, reset instructions will be sent.",
		"resetUrl": resetURL,
	})
}

func (s *Server) resetPassword(c *gin.Context) {
	var req struct {
		Token           string `json:"token" binding:"required"`
		Password        string `json:"password" binding:"required"`
		ConfirmPassword string `json:"confirmPassword" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "passwords do not match"})
		return
	}
	if errMsg := passwordPolicyError(req.Password); errMsg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	tokenHash := sha256.Sum256([]byte(req.Token))
	var userID uuid.UUID
	err := s.db.QueryRow(`
		SELECT user_id
		FROM password_reset_tokens
		WHERE token_hash = $1
		  AND used_at IS NULL
		  AND expires_at > NOW()
	`, hex.EncodeToString(tokenHash[:])).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired reset token"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reset validation failed"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "password failed"})
		return
	}

	tx := s.db.MustBegin()
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`
		INSERT INTO user_credentials (user_id, password_hash)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
	`, userID, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "password update failed"})
		return
	}

	if _, err := tx.Exec(`
		UPDATE password_reset_tokens
		SET used_at = NOW()
		WHERE token_hash = $1
	`, hex.EncodeToString(tokenHash[:])); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reset token update failed"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reset failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated successfully"})
}

func (s *Server) me(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": user})
}

func (s *Server) updateMe(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	var req struct {
		Position    string `json:"position"`
		Affiliation string `json:"affiliation"`
		Phone       string `json:"phone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if _, err := s.db.Exec(`
		UPDATE users
		SET position = $2, affiliation = $3, phone = $4, updated_at = NOW()
		WHERE id = $1
	`, user.ID, nullIfEmpty(req.Position), nullIfEmpty(req.Affiliation), nullIfEmpty(req.Phone)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "profile update failed"})
		return
	}
	var updated User
	if err := s.db.Get(&updated, `SELECT id, organization_id, email, name, position, affiliation, phone, photo_url, role, is_active, created_at FROM users WHERE id = $1`, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "profile lookup failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (s *Server) checklist(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}

	// Determine which profile to filter the checklist by.
	// - Peserta: always derived from their own organization (cannot be spoofed).
	// - Asesor/Juri/Admin: optional ?profileCode= query (the assessment they review).
	profileCode := ""
	if user.Role == "peserta" && user.OrganizationID != nil {
		var org Organization
		if err := s.db.Get(&org, `SELECT license_type, main_service_type FROM organizations WHERE id = $1`, *user.OrganizationID); err == nil {
			profileCode = profileCodeFromProfile(org.LicenseType, org.MainServiceType)
		}
	} else {
		profileCode = strings.TrimSpace(c.Query("profileCode"))
	}

	var rows []ChecklistItem
	var err error
	// Only filter when we have a resolved, meaningful profile code.
	if profileCode != "" && profileCode != "BELUM DIPILIH" {
		err = s.db.Select(&rows, `
			SELECT id, pillar, category, sub_category, question_number, question, evidence_required, COALESCE(applicability_tag, '') AS applicability_tag, weight, sort_order
			FROM checklist_items
			WHERE applicability_tag IS NULL
			   OR applicability_tag = ''
			   OR ',' || REPLACE(applicability_tag, ' ', '') || ',' LIKE '%,' || $1 || ',%'
			ORDER BY sort_order
		`, profileCode)
	} else {
		err = s.db.Select(&rows, `
			SELECT id, pillar, category, sub_category, question_number, question, evidence_required, COALESCE(applicability_tag, '') AS applicability_tag, weight, sort_order
			FROM checklist_items
			ORDER BY sort_order
		`)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "checklist failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (s *Server) adminChecklistItems(c *gin.Context) {
	var rows []ChecklistItem
	if err := s.db.Select(&rows, `
		SELECT id, pillar, category, sub_category, question_number, question, evidence_required, COALESCE(applicability_tag, '') AS applicability_tag, weight, sort_order
		FROM checklist_items
		ORDER BY sort_order
	`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "checklist items failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (s *Server) createChecklistItem(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req struct {
		ID               string  `json:"id" binding:"required"`
		Pillar           string  `json:"pillar" binding:"required"`
		Category         string  `json:"category" binding:"required"`
		SubCategory      string  `json:"subCategory" binding:"required"`
		QuestionNumber   string  `json:"questionNumber" binding:"required"`
		Question         string  `json:"question" binding:"required"`
		EvidenceRequired string  `json:"evidenceRequired" binding:"required"`
		ApplicabilityTag string  `json:"applicabilityTag" binding:"required"`
		Weight           float64 `json:"weight" binding:"required"`
		SortOrder        int     `json:"sortOrder" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	tag := strings.TrimSpace(req.ApplicabilityTag)
	if tag == "" {
		tag = "IUP"
	}
	var row ChecklistItem
	if err := s.db.Get(&row, `
		INSERT INTO checklist_items (id, pillar, category, sub_category, question_number, question, evidence_required, applicability_tag, weight, sort_order)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id, pillar, category, sub_category, question_number, question, evidence_required, COALESCE(applicability_tag, '') AS applicability_tag, weight, sort_order
	`, strings.TrimSpace(req.ID), strings.TrimSpace(req.Pillar), strings.TrimSpace(req.Category), strings.TrimSpace(req.SubCategory), strings.TrimSpace(req.QuestionNumber), strings.TrimSpace(req.Question), strings.TrimSpace(req.EvidenceRequired), tag, req.Weight, req.SortOrder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "checklist item save failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) updateChecklistItem(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id required"})
		return
	}
	var req struct {
		Pillar           string  `json:"pillar" binding:"required"`
		Category         string  `json:"category" binding:"required"`
		SubCategory      string  `json:"subCategory" binding:"required"`
		QuestionNumber   string  `json:"questionNumber" binding:"required"`
		Question         string  `json:"question" binding:"required"`
		EvidenceRequired string  `json:"evidenceRequired" binding:"required"`
		ApplicabilityTag string  `json:"applicabilityTag" binding:"required"`
		Weight           float64 `json:"weight" binding:"required"`
		SortOrder        int     `json:"sortOrder" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	tag := strings.TrimSpace(req.ApplicabilityTag)
	if tag == "" {
		tag = "IUP"
	}
	var row ChecklistItem
	if err := s.db.Get(&row, `
		UPDATE checklist_items
		SET pillar = $2, category = $3, sub_category = $4, question_number = $5, question = $6, evidence_required = $7, applicability_tag = $8, weight = $9, sort_order = $10
		WHERE id = $1
		RETURNING id, pillar, category, sub_category, question_number, question, evidence_required, COALESCE(applicability_tag, '') AS applicability_tag, weight, sort_order
	`, id, strings.TrimSpace(req.Pillar), strings.TrimSpace(req.Category), strings.TrimSpace(req.SubCategory), strings.TrimSpace(req.QuestionNumber), strings.TrimSpace(req.Question), strings.TrimSpace(req.EvidenceRequired), tag, req.Weight, req.SortOrder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "checklist item update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) deleteChecklistItem(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id required"})
		return
	}
	if _, err := s.db.Exec(`DELETE FROM checklist_items WHERE id = $1`, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "checklist item delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "checklist item deleted"})
}

func (s *Server) canAccessAssessment(c *gin.Context, assessmentID string) bool {
	user, ok := s.currentUser(c)
	if !ok {
		return false
	}
	if user.Role == "admin" || user.Role == "juri" {
		return true
	}
	var count int
	switch user.Role {
	case "peserta":
		if user.OrganizationID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "missing organization"})
			return false
		}
		err := s.db.QueryRow(`SELECT COUNT(*) FROM assessments WHERE id = $1 AND organization_id = $2`, assessmentID, *user.OrganizationID).Scan(&count)
		if err != nil || count == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "assessment forbidden"})
			return false
		}
	case "asesor":
		err := s.db.QueryRow(`SELECT COUNT(*) FROM assessor_assignments WHERE assessment_id = $1 AND assessor_id = $2`, assessmentID, user.ID).Scan(&count)
		if err != nil || count == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "assessment forbidden"})
			return false
		}
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return false
	}
	return true
}

func (s *Server) participantAssessment(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	if user.OrganizationID == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "participant organization not found"})
		return
	}
	var assessment Assessment
	if err := s.db.Get(&assessment, `
		SELECT id, organization_id, period_id, title, status, period_year, submitted_at, finalized_at, revision_note, created_at
		FROM assessments
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`, *user.OrganizationID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": assessment})
}

func (s *Server) participantProfile(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	if user.OrganizationID == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "participant organization not found"})
		return
	}

	var org Organization
	if err := s.db.Get(&org, `
		SELECT id, name, slug, industry, sector, logo_url, license_number, license_type, main_service_type, status, email, phone, website, created_at
		FROM organizations
		WHERE id = $1
	`, *user.OrganizationID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "participant profile not found"})
		return
	}

	complete := org.LicenseNumber != nil && org.LicenseType != nil && org.MainServiceType != nil && org.LogoURL != nil
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"organization": org,
		"isComplete":   complete,
		"profileCode":  profileCodeFromProfile(org.LicenseType, org.MainServiceType),
	}})
}

func (s *Server) updateParticipantProfile(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	if user.OrganizationID == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "participant organization not found"})
		return
	}

	var req struct {
		LicenseNumber   string `json:"licenseNumber" binding:"required"`
		LicenseType     string `json:"licenseType" binding:"required"`
		MainServiceType string `json:"mainServiceType"`
		LogoURL         string `json:"logoUrl"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.LicenseType != "IUP" && req.LicenseType != "IUJP" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid license type"})
		return
	}
	if req.LicenseType == "IUJP" && strings.TrimSpace(req.MainServiceType) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "main service type is required for IUJP"})
		return
	}

	// For IUP the "sub-category" (IUP / IUPK) is stored in main_service_type so the
	// profile counts as complete. It does NOT affect the profile code — IUP and IUPK
	// both resolve to profile code "IUP". Default to "IUP" when left empty.
	mainServiceStr := strings.TrimSpace(req.MainServiceType)
	if req.LicenseType == "IUP" && mainServiceStr == "" {
		mainServiceStr = "IUP"
	}
	var mainService any = nullIfEmpty(mainServiceStr)

	if _, err := s.db.Exec(`
		UPDATE organizations
		SET license_number = $2,
		    license_type = $3,
		    main_service_type = $4,
		    logo_url = $5
		WHERE id = $1
	`, *user.OrganizationID, strings.TrimSpace(req.LicenseNumber), req.LicenseType, mainService, nullIfEmpty(req.LogoURL)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "profile update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

func (s *Server) assessmentDetail(c *gin.Context) {
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	var row AssessmentDetailRow
	if err := s.db.Get(&row, `
		SELECT
			a.id, a.organization_id, a.period_id, a.title, a.status, a.period_year, a.submitted_at, a.finalized_at, a.revision_note, a.created_at,
			o.name AS organization_name,
			o.status AS organization_status,
			aa.assessor_id,
			au.name AS assessor_name,
			au.email AS assessor_email
		FROM assessments a
		JOIN organizations o ON o.id = a.organization_id
		LEFT JOIN assessor_assignments aa ON aa.assessment_id = a.id
		LEFT JOIN users au ON au.id = aa.assessor_id
		WHERE a.id = $1
	`, assessmentID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) evidenceList(c *gin.Context) {
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	var rows []EvidenceItem
	if err := s.db.Select(&rows, `
		SELECT id, assessment_id, checklist_item_id, file_name, file_url, status, reviewer_note, uploaded_by, created_at
		FROM evidence_items
		WHERE assessment_id = $1
		ORDER BY created_at DESC
	`, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence list failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (s *Server) evidenceUpsert(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	if user.Role != "peserta" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only participant can upload evidence"})
		return
	}
	var req struct {
		ChecklistItemID string `json:"checklistItemId" binding:"required"`
		FileName        string `json:"fileName" binding:"required"`
		FileURL         string `json:"fileUrl"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.FileURL == "" {
		req.FileURL = "#"
	}
	if full, err := s.evidenceLimitReached(assessmentID, req.ChecklistItemID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence save failed"})
		return
	} else if full {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("maksimal %d dokumen per item", maxEvidencePerItem)})
		return
	}
	var item EvidenceItem
	if err := s.db.Get(&item, `
		INSERT INTO evidence_items (assessment_id, checklist_item_id, file_name, file_url, status, uploaded_by)
		VALUES ($1, $2, $3, $4, 'uploaded', $5)
		RETURNING id, assessment_id, checklist_item_id, file_name, file_url, status, reviewer_note, uploaded_by, created_at
	`, assessmentID, req.ChecklistItemID, req.FileName, req.FileURL, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence save failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

// maxEvidencePerItem limits how many evidence documents a participant may attach
// to a single checklist item.
const maxEvidencePerItem = 3

// evidenceLimitReached reports whether the item already has the maximum documents.
func (s *Server) evidenceLimitReached(assessmentID, checklistItemID string) (bool, error) {
	var count int
	if err := s.db.QueryRow(`
		SELECT COUNT(*) FROM evidence_items
		WHERE assessment_id = $1 AND checklist_item_id = $2
	`, assessmentID, checklistItemID).Scan(&count); err != nil {
		return false, err
	}
	return count >= maxEvidencePerItem, nil
}

// allowedLogoExt restricts logo uploads to raster images (no SVG to avoid script payloads).
var allowedLogoExt = map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".webp": true}

const maxLogoUploadBytes = 3 << 20       // 3 MB
const maxUserPhotoUploadBytes = 10 << 20 // 10 MB

// uploadLogo stores a company logo file and saves its URL on the organization,
// replacing the old base64-in-database approach that bloated the DB.
func (s *Server) uploadLogo(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	if user.OrganizationID == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "participant organization not found"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	if fileHeader.Size > maxLogoUploadBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large (max 3 MB)"})
		return
	}
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedLogoExt[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image type (png/jpg/webp)"})
		return
	}

	orgID := user.OrganizationID.String()
	dir := filepath.Join("uploads", "logos", orgID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare storage"})
		return
	}
	storedName := uuid.NewString() + ext
	if err := c.SaveUploadedFile(fileHeader, filepath.Join(dir, storedName)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	logoURL := fmt.Sprintf("/uploads/logos/%s/%s", orgID, storedName)
	if _, err := s.db.Exec(`UPDATE organizations SET logo_url = $2 WHERE id = $1`, *user.OrganizationID, logoURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save logo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"logoUrl": logoURL}})
}

// uploadUserPhoto stores the current user's profile photo and saves its URL on
// the users row. Available to any authenticated user (used by asesor/juri).
func (s *Server) uploadUserPhoto(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	if fileHeader.Size > maxUserPhotoUploadBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large (max 10 MB)"})
		return
	}
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedLogoExt[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image type (png/jpg/webp)"})
		return
	}

	userID := user.ID.String()
	dir := filepath.Join("uploads", "photos", userID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare storage"})
		return
	}
	storedName := uuid.NewString() + ext
	if err := c.SaveUploadedFile(fileHeader, filepath.Join(dir, storedName)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	photoURL := fmt.Sprintf("/uploads/photos/%s/%s", userID, storedName)
	if _, err := s.db.Exec(`UPDATE users SET photo_url = $2, updated_at = NOW() WHERE id = $1`, user.ID, photoURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save photo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"photoUrl": photoURL}})
}

// allowedEvidenceExt is the whitelist of file types participants may upload.
var allowedEvidenceExt = map[string]bool{
	".pdf": true, ".doc": true, ".docx": true, ".xls": true, ".xlsx": true,
	".ppt": true, ".pptx": true, ".png": true, ".jpg": true, ".jpeg": true, ".zip": true,
}

const maxEvidenceUploadBytes = 20 << 20 // 20 MB

// evidenceUpload accepts a multipart file, stores it on disk, and upserts the
// matching evidence record so participants can browse and upload a real document.
func (s *Server) evidenceUpload(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	if user.Role != "peserta" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only participant can upload evidence"})
		return
	}

	checklistItemID := strings.TrimSpace(c.PostForm("checklistItemId"))
	if checklistItemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "checklistItemId is required"})
		return
	}

	// Reject before writing the file to disk if the item already has the max documents.
	if full, err := s.evidenceLimitReached(assessmentID, checklistItemID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence save failed"})
		return
	} else if full {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("maksimal %d dokumen per item", maxEvidencePerItem)})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	if fileHeader.Size > maxEvidenceUploadBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large (max 20 MB)"})
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedEvidenceExt[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported file type"})
		return
	}

	// Store under uploads/<assessmentId>/<uuid><ext>; keep original name for display.
	dir := filepath.Join("uploads", assessmentID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare storage"})
		return
	}
	storedName := uuid.NewString() + ext
	destPath := filepath.Join(dir, storedName)
	if err := c.SaveUploadedFile(fileHeader, destPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	fileURL := fmt.Sprintf("/uploads/%s/%s", assessmentID, storedName)
	displayName := filepath.Base(fileHeader.Filename)

	var item EvidenceItem
	if err := s.db.Get(&item, `
		INSERT INTO evidence_items (assessment_id, checklist_item_id, file_name, file_url, status, uploaded_by)
		VALUES ($1, $2, $3, $4, 'uploaded', $5)
		RETURNING id, assessment_id, checklist_item_id, file_name, file_url, status, reviewer_note, uploaded_by, created_at
	`, assessmentID, checklistItemID, displayName, fileURL, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence save failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

// evidenceDelete removes a single evidence document (and its file on disk).
func (s *Server) evidenceDelete(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	if user.Role != "peserta" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only participant can delete evidence"})
		return
	}
	evidenceID := c.Param("evidenceId")

	var fileURL string
	if err := s.db.QueryRow(`
		DELETE FROM evidence_items
		WHERE id = $1 AND assessment_id = $2
		RETURNING file_url
	`, evidenceID, assessmentID).Scan(&fileURL); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "evidence not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence delete failed"})
		return
	}

	// Best-effort remove the stored file (ignore errors for external URLs).
	if strings.HasPrefix(fileURL, "/uploads/") {
		_ = os.Remove(filepath.Join("." + fileURL))
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"id": evidenceID, "deleted": true}})
}

func (s *Server) redFlagList(c *gin.Context) {
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	rows := []RedFlagRow{}
	if err := s.db.Select(&rows, `
		SELECT id, assessment_id, type, description, is_active, created_at
		FROM red_flags
		WHERE assessment_id = $1
		ORDER BY created_at DESC
	`, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "red flag list failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (s *Server) redFlagUpsert(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	if user.Role != "admin" && user.Role != "juri" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only admin or jury can create red flag"})
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	var req struct {
		Type        string `json:"type" binding:"required"`
		Description string `json:"description" binding:"required"`
		IsActive    *bool  `json:"isActive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	var row RedFlagRow
	if err := s.db.Get(&row, `
		INSERT INTO red_flags (assessment_id, type, description, is_active)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (assessment_id, type)
		DO UPDATE SET description = EXCLUDED.description, is_active = EXCLUDED.is_active
		RETURNING id, assessment_id, type, description, is_active, created_at
	`, assessmentID, req.Type, req.Description, active); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "red flag save failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) submitAssessment(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	if user.Role != "peserta" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only participant can submit assessment"})
		return
	}
	// Reject submitting an assessment that has no evidence at all.
	var evidenceCount int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM evidence_items WHERE assessment_id = $1`, assessmentID).Scan(&evidenceCount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assessment submit failed"})
		return
	}
	if evidenceCount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unggah minimal satu dokumen evidence sebelum submit"})
		return
	}
	// Submitting also clears any prior revision note (re-submit after revision).
	if _, err := s.db.Exec(`UPDATE assessments SET status = 'submitted', submitted_at = NOW(), revision_note = NULL WHERE id = $1`, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assessment submit failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "assessment submitted"})
}

// requestRevision sends an assessment back to the participant for fixes, with a note.
func (s *Server) requestRevision(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	if user.Role != "asesor" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only assessor or admin can request revision"})
		return
	}
	var req struct {
		Note string `json:"note" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Note) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "catatan revisi wajib diisi"})
		return
	}

	var status string
	if err := s.db.QueryRow(`SELECT status FROM assessments WHERE id = $1`, assessmentID).Scan(&status); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}
	if status == "finalized" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "assessment sudah difinalisasi"})
		return
	}

	if _, err := s.db.Exec(`
		UPDATE assessments SET status = 'revision_requested', revision_note = $2 WHERE id = $1
	`, assessmentID, strings.TrimSpace(req.Note)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "request revision failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "revision requested"})
}

func (s *Server) scoreList(c *gin.Context) {
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	var rows []ScoreItem
	if err := s.db.Select(&rows, `
		SELECT id, assessment_id, checklist_item_id, score, weighted_score, note, assessed_by, assessed_at
		FROM score_items
		WHERE assessment_id = $1
		ORDER BY assessed_at DESC
	`, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "score list failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

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

func recommendAwardLevel(env, social, gov float64) string {
	return string(scoring.DetermineAwardLevel(env, social, gov))
}

func normalizePillarScores(envWeighted, socialWeighted, govWeighted float64, target ProfileWeightTarget) (envScore, socialScore, govScore float64) {
	if target.Environmental > 0 {
		envScore = envWeighted / target.Environmental
	}
	if target.Social > 0 {
		socialScore = socialWeighted / target.Social
	}
	if target.Governance > 0 {
		govScore = govWeighted / target.Governance
	}
	return envScore, socialScore, govScore
}

func (s *Server) activeRedFlagCount(assessmentID string) (int, error) {
	var count int
	if err := s.db.Get(&count, `
		SELECT COUNT(*)
		FROM red_flags
		WHERE assessment_id = $1 AND is_active = TRUE
	`, assessmentID); err != nil {
		return 0, err
	}
	return count, nil
}

func (s *Server) scoreProgress(assessmentID, profileCode string) (scoredCount int, totalItems int, err error) {
	if profileCode == "" || profileCode == "BELUM DIPILIH" {
		if err := s.db.Get(&scoredCount, `SELECT COUNT(*) FROM score_items WHERE assessment_id = $1`, assessmentID); err != nil {
			return 0, 0, err
		}
		if err := s.db.Get(&totalItems, `SELECT COUNT(*) FROM checklist_items`); err != nil {
			return 0, 0, err
		}
		return scoredCount, totalItems, nil
	}

	applicable := `
		ci.applicability_tag IS NULL
		OR ci.applicability_tag = ''
		OR ',' || REPLACE(ci.applicability_tag, ' ', '') || ',' LIKE '%,' || $2 || ',%'
	`
	if err := s.db.Get(&scoredCount, `
		SELECT COUNT(DISTINCT si.checklist_item_id)
		FROM score_items si
		JOIN checklist_items ci ON ci.id = si.checklist_item_id
		WHERE si.assessment_id = $1 AND (`+applicable+`)
	`, assessmentID, profileCode); err != nil {
		return 0, 0, err
	}
	if err := s.db.Get(&totalItems, `
		SELECT COUNT(*)
		FROM checklist_items ci
		WHERE ci.applicability_tag IS NULL
		   OR ci.applicability_tag = ''
		   OR ',' || REPLACE(ci.applicability_tag, ' ', '') || ',' LIKE '%,' || $1 || ',%'
	`, profileCode); err != nil {
		return 0, 0, err
	}
	return scoredCount, totalItems, nil
}

func (s *Server) awardState(assessmentID string, env, social, gov, grandScore float64, scoredCount, totalItems int) (recommended string, effective string, eligible bool, activeCount int, grandEligible bool, note string, err error) {
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
	eligible = false
	grandEligible = false
	note = "Not eligible for award"

	if totalItems == 0 {
		effective = "not_eligible"
		note = "Checklist profile belum tersedia."
		return recommended, effective, eligible, activeCount, grandEligible, note, nil
	}

	if scoredCount < totalItems {
		effective = "not_eligible"
		note = fmt.Sprintf("Belum eligible: scoring belum lengkap (%d/%d item).", scoredCount, totalItems)
		return recommended, effective, eligible, activeCount, grandEligible, note, nil
	}

	if recommended == string(scoring.AwardNotEligible) {
		effective = "not_eligible"
		note = "Belum eligible: skor minimum pilar masih di bawah threshold Foundation (2.0)."
		return recommended, effective, eligible, activeCount, grandEligible, note, nil
	}

	if activeCount > 0 {
		effective = "not_eligible"
		note = fmt.Sprintf("Automatically locked by %d active red flag(s).", activeCount)
		return recommended, effective, eligible, activeCount, grandEligible, note, nil
	}

	eligible = true
	grandEligible = scoring.IsGrandChampionEligible(grandScore, minPillar, activeCount)
	note = "Eligible for award"

	return recommended, effective, eligible, activeCount, grandEligible, note, nil
}

func (s *Server) assessmentSummary(c *gin.Context) {
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	summary, err := s.scoreSummary(assessmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "summary failed"})
		return
	}
	env := summary["environmental"].(float64)
	soc := summary["social"].(float64)
	gov := summary["governance"].(float64)
	grandScore := summary["grandScore"].(float64)
	profileCode := summary["profileCode"].(string)

	var profileTarget ProfileWeightTarget
	if err := s.db.Get(&profileTarget, `
		SELECT profile_code, environmental, social, governance, rationale, created_at, updated_at
		FROM profile_weight_targets
		WHERE profile_code = $1
	`, profileCode); err != nil {
		if err != sql.ErrNoRows {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "profile target lookup failed"})
			return
		}
	}
	profileTarget.Total = profileTarget.Environmental + profileTarget.Social + profileTarget.Governance

	scoredCount, totalItems, err := s.scoreProgress(assessmentID, profileCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "score progress failed"})
		return
	}
	envScore, socScore, govScore := normalizePillarScores(env, soc, gov, profileTarget)
	recommended, effective, eligible, activeCount, grandEligible, note, err := s.awardState(assessmentID, envScore, socScore, govScore, grandScore, scoredCount, totalItems)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "red flag summary failed"})
		return
	}
	minPillarScore := envScore
	if socScore < minPillarScore {
		minPillarScore = socScore
	}
	if govScore < minPillarScore {
		minPillarScore = govScore
	}
	summary["recommendedAwardLevel"] = recommended
	summary["effectiveAwardLevel"] = effective
	summary["eligibleForAward"] = eligible
	summary["activeRedFlags"] = activeCount
	summary["scoredCount"] = scoredCount
	summary["totalItems"] = totalItems
	summary["environmentalScore"] = envScore
	summary["socialScore"] = socScore
	summary["governanceScore"] = govScore
	summary["minPillarScore"] = minPillarScore
	summary["grandChampionEligible"] = grandEligible
	summary["eligibilityNote"] = note
	summary["profileTarget"] = profileTarget
	c.JSON(http.StatusOK, gin.H{"data": summary})
}

func (s *Server) submitToJury(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	if !s.canAccessAssessment(c, assessmentID) {
		return
	}
	if user.Role != "asesor" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only assessor can submit to jury"})
		return
	}
	tx := s.db.MustBegin()
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.Exec(`UPDATE assessments SET status = 'jury_review' WHERE id = $1`, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assessment update failed"})
		return
	}
	if _, err := tx.Exec(`UPDATE assessor_assignments SET status = 'submitted_to_jury' WHERE assessment_id = $1`, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assignment update failed"})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "submit to jury failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "submitted to jury"})
}

func (s *Server) juryAssessments(c *gin.Context) {
	var rows []JuryAssessmentRow
	if err := s.db.Select(&rows, `
		SELECT
			a.id AS assessment_id,
			o.id AS participant_id,
			o.name AS participant_name,
			o.license_type,
			o.main_service_type,
			a.status AS assessment_status,
			COALESCE(SUM(CASE WHEN ci.pillar = 'environmental' THEN si.weighted_score ELSE 0 END), 0) AS environmental,
			COALESCE(SUM(CASE WHEN ci.pillar = 'social' THEN si.weighted_score ELSE 0 END), 0) AS social,
			COALESCE(SUM(CASE WHEN ci.pillar = 'governance' THEN si.weighted_score ELSE 0 END), 0) AS governance,
			COALESCE(SUM(si.weighted_score), 0) AS total,
			COALESCE(SUM(si.weighted_score), 0) / 5 * 100 AS percentage,
			COUNT(DISTINCT si.checklist_item_id) AS scored_count,
			jd.award_level,
			jd.note AS decision_note,
			jd.decided_at
		FROM assessments a
		JOIN organizations o ON o.id = a.organization_id
		LEFT JOIN score_items si ON si.assessment_id = a.id
		LEFT JOIN checklist_items ci ON ci.id = si.checklist_item_id
		LEFT JOIN jury_decisions jd ON jd.assessment_id = a.id
		WHERE a.status IN ('jury_review', 'finalized')
		GROUP BY a.id, o.id, o.name, o.license_type, o.main_service_type, a.status, jd.award_level, jd.note, jd.decided_at
		ORDER BY percentage DESC, o.name ASC
	`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "jury assessments failed"})
		return
	}
	for i := range rows {
		profileCode := profileCodeFromProfile(rows[i].LicenseType, rows[i].MainServiceType)
		scoredCount, totalItems, err := s.scoreProgress(rows[i].AssessmentID.String(), profileCode)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "jury score progress failed"})
			return
		}
		rows[i].ScoredCount = scoredCount
		rows[i].TotalItems = totalItems
		var target ProfileWeightTarget
		if err := s.db.Get(&target, `
			SELECT profile_code, environmental, social, governance, rationale, created_at, updated_at
			FROM profile_weight_targets
			WHERE profile_code = $1
		`, profileCode); err != nil {
			if err != sql.ErrNoRows {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "jury profile target failed"})
				return
			}
		}
		envScore, socialScore, govScore := normalizePillarScores(rows[i].Environmental, rows[i].Social, rows[i].Governance, target)
		// rows[i].Percentage is actually grandScore from the calculation
		recommended, effective, eligible, activeCount, grandEligible, note, err := s.awardState(
			rows[i].AssessmentID.String(),
			envScore,
			socialScore,
			govScore,
			rows[i].Percentage, // This is grandScore
			scoredCount,
			totalItems,
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
		_ = grandEligible // Store in row if needed
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (s *Server) juryDecision(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	if user.Role != "juri" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only jury can decide award"})
		return
	}
	assessmentID := c.Param("assessmentId")
	var req struct {
		AwardLevel string `json:"awardLevel" binding:"required"`
		Note       string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	activeCount, err := s.activeRedFlagCount(assessmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "red flag check failed"})
		return
	}
	finalAward := req.AwardLevel
	if activeCount > 0 {
		finalAward = "not_eligible"
	}
	tx := s.db.MustBegin()
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.Exec(`
		INSERT INTO jury_decisions (assessment_id, award_level, note, decided_by, decided_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (assessment_id)
		DO UPDATE SET award_level = EXCLUDED.award_level, note = EXCLUDED.note, decided_by = EXCLUDED.decided_by, decided_at = NOW()
	`, assessmentID, finalAward, req.Note, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "jury decision failed"})
		return
	}
	var orgID uuid.UUID
	if err := tx.QueryRow(`UPDATE assessments SET status = 'finalized', finalized_at = NOW() WHERE id = $1 RETURNING organization_id`, assessmentID).Scan(&orgID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assessment finalize failed"})
		return
	}
	if _, err := tx.Exec(`UPDATE organizations SET status = 'completed' WHERE id = $1`, orgID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "organization finalize failed"})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "decision commit failed"})
		return
	}
	response := gin.H{"message": "jury decision saved"}
	if activeCount > 0 && req.AwardLevel != finalAward {
		response["warning"] = fmt.Sprintf("award coerced to %s because %d active red flag(s) are present", finalAward, activeCount)
	}
	c.JSON(http.StatusOK, response)
}

func (s *Server) adminParticipants(c *gin.Context) {
	var rows []ParticipantRow
	if err := s.db.Select(&rows, `
		SELECT
			o.id, o.name, o.slug, o.industry, o.status, o.email, o.phone, o.website, o.created_at,
			a.id AS assessment_id, a.status AS assessment_status,
			aa.assessor_id, au.name AS assessor_name
		FROM organizations o
		LEFT JOIN assessments a ON a.organization_id = o.id
		LEFT JOIN assessor_assignments aa ON aa.assessment_id = a.id
		LEFT JOIN users au ON au.id = aa.assessor_id
		ORDER BY o.created_at DESC
	`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "participants failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (s *Server) profileWeights(c *gin.Context) {
	var rows []ProfileWeightTarget
	if err := s.db.Select(&rows, `
		SELECT profile_code, environmental, social, governance, rationale, created_at, updated_at
		FROM profile_weight_targets
		ORDER BY profile_code
	`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "profile weights failed"})
		return
	}
	for i := range rows {
		rows[i].Total = rows[i].Environmental + rows[i].Social + rows[i].Governance
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

// scoreModel returns the dynamic score model (per-profile ESG weights and the
// maturity scale) for display on dashboards. Readable by any authenticated user;
// only admins can edit via the /admin/profile-weights endpoints.
func (s *Server) scoreModel(c *gin.Context) {
	var weights []ProfileWeightTarget
	if err := s.db.Select(&weights, `
		SELECT profile_code, environmental, social, governance, rationale, created_at, updated_at
		FROM profile_weight_targets
		ORDER BY profile_code
	`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "score model failed"})
		return
	}
	for i := range weights {
		weights[i].Total = weights[i].Environmental + weights[i].Social + weights[i].Governance
	}

	var maturityMin, maturityMax sql.NullInt64
	_ = s.db.QueryRow(`SELECT MIN(score), MAX(score) FROM maturity_levels`).Scan(&maturityMin, &maturityMax)
	minVal, maxVal := 0, 5
	if maturityMin.Valid {
		minVal = int(maturityMin.Int64)
	}
	if maturityMax.Valid {
		maxVal = int(maturityMax.Int64)
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"profiles":    weights,
		"maturityMin": minVal,
		"maturityMax": maxVal,
	}})
}

func (s *Server) maturityLevels(c *gin.Context) {
	var rows []MaturityLevelRef
	if err := s.db.Select(&rows, `
		SELECT id, score, level, description, created_at, updated_at
		FROM maturity_levels
		ORDER BY score ASC
	`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "maturity levels failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (s *Server) createMaturityLevel(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req struct {
		Score       int    `json:"score" binding:"required"`
		Level       string `json:"level" binding:"required"`
		Description string `json:"description" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Score < 0 || req.Score > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "score must be between 0 and 5"})
		return
	}
	var row MaturityLevelRef
	if err := s.db.Get(&row, `
		INSERT INTO maturity_levels (score, level, description)
		VALUES ($1, $2, $3)
		ON CONFLICT (score)
		DO UPDATE SET level = EXCLUDED.level, description = EXCLUDED.description, updated_at = NOW()
		RETURNING id, score, level, description, created_at, updated_at
	`, req.Score, strings.TrimSpace(req.Level), strings.TrimSpace(req.Description)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "maturity level save failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) updateMaturityLevel(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid maturity level id"})
		return
	}
	var req struct {
		Score       int    `json:"score" binding:"required"`
		Level       string `json:"level" binding:"required"`
		Description string `json:"description" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Score < 0 || req.Score > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "score must be between 0 and 5"})
		return
	}
	var row MaturityLevelRef
	if err := s.db.Get(&row, `
		UPDATE maturity_levels
		SET score = $2, level = $3, description = $4, updated_at = NOW()
		WHERE id = $1
		RETURNING id, score, level, description, created_at, updated_at
	`, id, req.Score, strings.TrimSpace(req.Level), strings.TrimSpace(req.Description)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "maturity level update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) deleteMaturityLevel(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid maturity level id"})
		return
	}
	if _, err := s.db.Exec(`DELETE FROM maturity_levels WHERE id = $1`, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "maturity level delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "maturity level deleted"})
}

func (s *Server) maturityBands(c *gin.Context) {
	var rows []MaturityBandRef
	if err := s.db.Select(&rows, `
		SELECT id, range_label, band_label, created_at, updated_at
		FROM maturity_bands
		ORDER BY created_at ASC
	`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "maturity bands failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func (s *Server) createMaturityBand(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req struct {
		RangeLabel string `json:"rangeLabel" binding:"required"`
		BandLabel  string `json:"bandLabel" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	var row MaturityBandRef
	if err := s.db.Get(&row, `
		INSERT INTO maturity_bands (range_label, band_label)
		VALUES ($1, $2)
		ON CONFLICT (range_label)
		DO UPDATE SET band_label = EXCLUDED.band_label, updated_at = NOW()
		RETURNING id, range_label, band_label, created_at, updated_at
	`, strings.TrimSpace(req.RangeLabel), strings.TrimSpace(req.BandLabel)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "maturity band save failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) updateMaturityBand(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid maturity band id"})
		return
	}
	var req struct {
		RangeLabel string `json:"rangeLabel" binding:"required"`
		BandLabel  string `json:"bandLabel" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	var row MaturityBandRef
	if err := s.db.Get(&row, `
		UPDATE maturity_bands
		SET range_label = $2, band_label = $3, updated_at = NOW()
		WHERE id = $1
		RETURNING id, range_label, band_label, created_at, updated_at
	`, id, strings.TrimSpace(req.RangeLabel), strings.TrimSpace(req.BandLabel)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "maturity band update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) deleteMaturityBand(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid maturity band id"})
		return
	}
	if _, err := s.db.Exec(`DELETE FROM maturity_bands WHERE id = $1`, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "maturity band delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "maturity band deleted"})
}

func (s *Server) updateProfileWeight(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	profileCode := strings.ToUpper(strings.TrimSpace(c.Param("profileCode")))
	if profileCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "profile code required"})
		return
	}

	var req struct {
		Environmental float64 `json:"environmental" binding:"required"`
		Social        float64 `json:"social" binding:"required"`
		Governance    float64 `json:"governance" binding:"required"`
		Rationale     string  `json:"rationale" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	total := req.Environmental + req.Social + req.Governance
	if total < 0.999 || total > 1.001 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "weights must total 100%"})
		return
	}

	var row ProfileWeightTarget
	if err := s.db.Get(&row, `
		INSERT INTO profile_weight_targets (profile_code, environmental, social, governance, rationale)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (profile_code)
		DO UPDATE SET environmental = EXCLUDED.environmental, social = EXCLUDED.social, governance = EXCLUDED.governance, rationale = EXCLUDED.rationale, updated_at = NOW()
		RETURNING profile_code, environmental, social, governance, rationale, created_at, updated_at
	`, profileCode, req.Environmental, req.Social, req.Governance, strings.TrimSpace(req.Rationale)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "profile weight save failed"})
		return
	}
	row.Total = row.Environmental + row.Social + row.Governance
	c.JSON(http.StatusOK, gin.H{"data": row})
}

func (s *Server) deleteProfileWeight(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	profileCode := strings.ToUpper(strings.TrimSpace(c.Param("profileCode")))
	if profileCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "profile code required"})
		return
	}
	if _, err := s.db.Exec(`DELETE FROM profile_weight_targets WHERE profile_code = $1`, profileCode); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "profile weight delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "profile weight deleted"})
}

func (s *Server) verifyParticipant(c *gin.Context) {
	orgID := c.Param("orgId")
	if _, err := s.db.Exec(`UPDATE organizations SET status = 'verified' WHERE id = $1`, orgID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verify failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "participant verified"})
}

func (s *Server) updateParticipant(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	orgID := c.Param("orgId")
	var req struct {
		Name    string `json:"name" binding:"required"`
		Email   string `json:"email" binding:"required,email"`
		Phone   string `json:"phone"`
		Website string `json:"website"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	tx := s.db.MustBegin()
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`
		UPDATE organizations
		SET name = $2, email = $3, phone = $4, website = $5
		WHERE id = $1
	`, orgID, req.Name, strings.ToLower(req.Email), nullIfEmpty(req.Phone), nullIfEmpty(req.Website)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "participant update failed"})
		return
	}

	if _, err := tx.Exec(`
		UPDATE users
		SET email = $2, phone = $3
		WHERE organization_id = $1 AND role = 'peserta'
	`, orgID, strings.ToLower(req.Email), nullIfEmpty(req.Phone)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "participant user update failed"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "participant save failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "participant updated"})
}

func (s *Server) deleteParticipant(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	orgID := c.Param("orgId")

	tx := s.db.MustBegin()
	defer func() { _ = tx.Rollback() }()

	// Delete assessments first — this cascades to evidence_items, score_items,
	// red_flags, and assessor_assignments, clearing the RESTRICT foreign key on
	// evidence_items.uploaded_by that would otherwise block deleting the user.
	if _, err := tx.Exec(`DELETE FROM assessments WHERE organization_id = $1`, orgID); err != nil {
		log.Printf("ERROR deleting participant assessments (orgID=%s): %v", orgID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to delete assessments: %v", err)})
		return
	}

	if _, err := tx.Exec(`DELETE FROM users WHERE organization_id = $1 AND role = 'peserta'`, orgID); err != nil {
		log.Printf("ERROR deleting participant user (orgID=%s): %v", orgID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to delete user: %v", err)})
		return
	}

	res, err := tx.Exec(`DELETE FROM organizations WHERE id = $1`, orgID)
	if err != nil {
		log.Printf("ERROR deleting organization (orgID=%s): %v", orgID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to delete organization: %v", err)})
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		log.Printf("WARN: participant not found (orgID=%s)", orgID)
		c.JSON(http.StatusNotFound, gin.H{"error": "participant not found"})
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("ERROR commit delete transaction (orgID=%s): %v", orgID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("transaction commit failed: %v", err)})
		return
	}

	log.Printf("SUCCESS: deleted participant (orgID=%s)", orgID)

	c.JSON(http.StatusOK, gin.H{"message": "participant deleted"})
}

func (s *Server) assessors(c *gin.Context) {
	var users []User
	if err := s.db.Select(&users, `SELECT id, organization_id, email, name, position, affiliation, phone, role, is_active, created_at FROM users WHERE role = 'asesor' AND is_active = TRUE ORDER BY name`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assessors failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}

func (s *Server) adminUsers(c *gin.Context) {
	var users []User
	if err := s.db.Select(&users, `
		SELECT id, organization_id, email, name, position, affiliation, phone, role, is_active, created_at
		FROM users
		WHERE role IN ('admin', 'asesor', 'juri')
		ORDER BY created_at DESC
	`); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "users failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}

func (s *Server) updateUserStatus(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	userID := c.Param("userId")
	var req struct {
		IsActive *bool `json:"isActive" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	res, err := s.db.Exec(`UPDATE users SET is_active = $2 WHERE id = $1 AND role IN ('admin','asesor','juri')`, userID, *req.IsActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "status update failed"})
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user status updated"})
}

func (s *Server) adminCreateUser(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	if admin.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req struct {
		Name            string `json:"name" binding:"required"`
		Email           string `json:"email" binding:"required,email"`
		Phone           string `json:"phone"`
		Role            string `json:"role" binding:"required"`
		Position        string `json:"position"`
		Affiliation     string `json:"affiliation"`
		Password        string `json:"password" binding:"required"`
		ConfirmPassword string `json:"confirmPassword" binding:"required"`
		IsActive        *bool  `json:"isActive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Role != "admin" && req.Role != "asesor" && req.Role != "juri" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
		return
	}
	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "passwords do not match"})
		return
	}
	if errMsg := passwordPolicyError(req.Password); errMsg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "password failed"})
		return
	}

	tx := s.db.MustBegin()
	defer func() { _ = tx.Rollback() }()

	var userID uuid.UUID
	if err := tx.QueryRow(`
		INSERT INTO users (email, name, position, affiliation, phone, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, strings.ToLower(req.Email), req.Name, nullIfEmpty(req.Position), nullIfEmpty(req.Affiliation), nullIfEmpty(req.Phone), req.Role, active).Scan(&userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email already registered"})
		return
	}

	if _, err := tx.Exec(`
		INSERT INTO user_credentials (user_id, password_hash)
		VALUES ($1, $2)
	`, userID, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "credential failed"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create user failed"})
		return
	}

	var user User
	if err := s.db.Get(&user, `SELECT id, organization_id, email, name, position, affiliation, phone, role, is_active, created_at FROM users WHERE id = $1`, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user lookup failed"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": user})
}

func (s *Server) assignAssessor(c *gin.Context) {
	admin, ok := s.currentUser(c)
	if !ok {
		return
	}
	assessmentID := c.Param("assessmentId")
	var req struct {
		AssessorID string `json:"assessorId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var participantID uuid.UUID
	if err := s.db.QueryRow(`SELECT organization_id FROM assessments WHERE id = $1`, assessmentID).Scan(&participantID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}

	tx := s.db.MustBegin()
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.Exec(`
		INSERT INTO assessor_assignments (assessment_id, participant_id, assessor_id, assigned_by, status)
		VALUES ($1, $2, $3, $4, 'assigned')
		ON CONFLICT (assessment_id)
		DO UPDATE SET assessor_id = EXCLUDED.assessor_id, assigned_by = EXCLUDED.assigned_by, assigned_at = NOW(), status = 'assigned'
	`, assessmentID, participantID, req.AssessorID, admin.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assign failed"})
		return
	}
	if _, err := tx.Exec(`UPDATE organizations SET status = 'assessing' WHERE id = $1`, participantID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "organization update failed"})
		return
	}
	if _, err := tx.Exec(`UPDATE assessments SET status = 'in_review' WHERE id = $1`, assessmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assessment update failed"})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assign commit failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "assessor assigned"})
}

func (s *Server) assessorAssignments(c *gin.Context) {
	user, ok := s.currentUser(c)
	if !ok {
		return
	}
	var rows []AssignmentRow
	if err := s.db.Select(&rows, `
		SELECT
			aa.id AS assignment_id,
			aa.assessment_id,
			aa.participant_id,
			o.name AS participant_name,
			a.status AS assessment_status,
			aa.status,
			aa.assigned_at,
			o.license_type,
			o.main_service_type,
			(SELECT COUNT(*) FROM score_items si WHERE si.assessment_id = aa.assessment_id) AS scored_count
		FROM assessor_assignments aa
		JOIN organizations o ON o.id = aa.participant_id
		JOIN assessments a ON a.id = aa.assessment_id
		WHERE aa.assessor_id = $1
		ORDER BY aa.assigned_at DESC
	`, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "assignments failed"})
		return
	}

	// Derive profile code and count applicable checklist items (cached per profile).
	totalByProfile := map[string]int{}
	for i := range rows {
		pc := profileCodeFromProfile(rows[i].LicenseType, rows[i].MainServiceType)
		rows[i].ProfileCode = pc
		if pc == "" || pc == "BELUM DIPILIH" {
			continue
		}
		if _, ok := totalByProfile[pc]; !ok {
			var count int
			_ = s.db.QueryRow(`
				SELECT COUNT(*) FROM checklist_items
				WHERE ',' || REPLACE(applicability_tag, ' ', '') || ',' LIKE '%,' || $1 || ',%'
			`, pc).Scan(&count)
			totalByProfile[pc] = count
		}
		rows[i].TotalItems = totalByProfile[pc]
	}
	c.JSON(http.StatusOK, gin.H{"data": rows})
}
