# 🏆 ESG Score - Mining Award Assessment System

> Sistem penilaian ESG (Environmental, Social, Governance) untuk perusahaan pertambangan di Indonesia - Award IUP & IUJP

[![Status](https://img.shields.io/badge/Status-Testing-yellow)](https://github.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_14-blue)](https://www.postgresql.org/)
[![Backend](https://img.shields.io/badge/Backend-Go_1.21-00ADD8)](https://golang.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18-61DAFB)](https://reactjs.org/)

---

## 📌 Daftar Isi

- [Overview](#overview)
- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Quick Start](#quick-start)
- [Struktur Project](#struktur-project)
- [Dokumentasi](#dokumentasi)
- [Status & Roadmap](#status--roadmap)

---

## 🎯 Overview

**ESG Score System** adalah platform web untuk menilai kinerja ESG perusahaan pertambangan berdasarkan standar industri global (GISTM, ISO, UNGP, GRI, dll).

### Tujuan
- Memberikan penilaian objektif terhadap praktik ESG perusahaan tambang
- Mengidentifikasi area improvement untuk keberlanjutan operasi
- Memberikan pengakuan (award) kepada perusahaan dengan kinerja ESG terbaik

### Cakupan
- **IUP** (Izin Usaha Pertambangan) - Pemilik tambang
- **IUJP** (Izin Usaha Jasa Pertambangan) - 5 sub-jenis:
  - IUJP-KONSULTASI (Jasa konsultasi/engineering)
  - IUJP-OPERASIONAL (Hauling & alat berat)
  - IUJP-DRILLING (Pemboran & peledakan)
  - IUJP-PENGOLAHAN (Processing & refining)
  - IUJP-PENUNJANG (Camp, catering, support)

---

## ✨ Fitur Utama

### 🔐 Multi-Role System

#### 1. **Admin**
- Kelola master data (checklist, weights, maturity levels)
- Kelola user (asesor, juri, peserta)
- Assign asesor ke peserta
- Monitor progress assessment
- Verify participant registration

#### 2. **Peserta (Participant)**
- Self-registration & profil perusahaan
- Upload evidence per checklist item
- Track submission progress
- View assessment results

#### 3. **Asesor (Assessor)**
- View assigned participants
- Score checklist items (0-5 maturity scale)
- Add notes & feedback
- Submit assessment to jury

#### 4. **Juri (Jury)**
- Review finalized assessments
- View scoring summary & red flags
- Determine award level
- Finalize award decision

### 📊 ESG Assessment Framework

#### Struktur Penilaian
- **49 Checklist Items** (49 kriteria)
- **3 Pilar ESG:**
  - Environmental (23 items)
  - Social (15 items)
  - Governance (11 items)
- **6 Profile Weights** - Bobot berbeda per jenis izin
- **6 Maturity Levels** (0-5)
- **Red Flag System** - Automatic disqualification

#### Award Categories
1. **ESG Foundation Recognition** (Min score 2.0)
2. **ESG Integration Award** (Min score 3.0)
3. **ESG Leadership Award** (Min score 4.0)
4. **The Grand ESG Mining Champion** (Grand Score ≥85 + Min 3.0 + No red flags)

---

## 🛠️ Teknologi

### Backend
- **Language:** Go 1.21+
- **Framework:** Gin (HTTP web framework)
- **Database:** PostgreSQL 14+
- **ORM:** sqlx
- **Auth:** JWT (golang-jwt/jwt)
- **Password:** bcrypt

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **State Management:** Redux Toolkit
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **UI Components:** Custom + Tailwind CSS (implied)

### Database Schema
```
organizations → assessments → evidence_items
                           → score_items
                           → red_flags
                           
users → user_credentials
     → assessor_assignments
     
checklist_items (master)
profile_weight_targets (master)
maturity_levels (master)
jury_decisions
```

---

## 🚀 Quick Start

### Prerequisites
```bash
# Required
PostgreSQL 14+
Go 1.21+
Node.js 18+

# Recommended
make or docker-compose
```

### 1. Clone Repository
```bash
cd "Documents/New project/ESG Score"
```

### 2. Setup Database
```bash
# Create database
createdb esgscore

# Or via psql
psql -U postgres
CREATE DATABASE esgscore;
CREATE USER esgscore WITH ENCRYPTED PASSWORD 'esgscore_dev';
GRANT ALL PRIVILEGES ON DATABASE esgscore TO esgscore;
```

### 3. Configure Environment

**Backend `.env`:**
```env
DATABASE_URL=postgres://esgscore:esgscore_dev@localhost:5432/esgscore?sslmode=disable
PORT=8088
JWT_SECRET=your-secret-key
JWT_EXPIRY_MINUTES=1440
FRONTEND_BASE_URL=http://localhost:5175
```

**Frontend `.env`:**
```env
VITE_API_BASE_URL=http://localhost:8088/v1
```

### 4. Run Backend
```bash
cd backend
go mod download
go run cmd/api/main.go
```

Backend will auto-run migrations and seed data.

### 5. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

### 6. Access Application
- Frontend: http://localhost:5175
- API: http://localhost:8088/health

### 7. Default Login

| Email | Password | Role |
|-------|----------|------|
| admin@esg-score.local | Admin@2026 | admin |
| asesor@esg-score.local | password | asesor |
| juri@esg-score.local | password | juri |

---

## 📁 Struktur Project

```
ESG Score/
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go          # Main application (2213 lines)
│   ├── internal/
│   │   └── db/
│   │       ├── schema.sql       # Database schema
│   │       ├── seed.sql         # Master data (FIXED!)
│   │       ├── fix_weights.sql  # Weight correction script
│   │       └── validate_weights.sql  # Validation query
│   ├── go.mod
│   ├── go.sum
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── store/               # Redux store
│   │   └── App.jsx
│   ├── package.json
│   └── .env.example
│
├── ESG_Score_IUP_IUJP_rev.01.xlsx   # Reference document
│
├── ANALYSIS_MASTER_DATA.md          # Data validation report
├── SCORING_LOGIC_ANALYSIS.md        # Scoring algorithm analysis
├── DEPLOYMENT_GUIDE.md              # Setup & deployment guide
└── README_SYSTEM.md                 # This file
```

---

## 📚 Dokumentasi

### Untuk Developer
1. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Setup lengkap & deployment
2. **[SCORING_LOGIC_ANALYSIS.md](SCORING_LOGIC_ANALYSIS.md)** - Algoritma scoring (PENTING!)
3. **[ANALYSIS_MASTER_DATA.md](ANALYSIS_MASTER_DATA.md)** - Validasi master data

### API Endpoints

#### Public
```
POST   /v1/auth/login                 # Login
POST   /v1/auth/register              # Participant registration
POST   /v1/auth/forgot-password       # Request password reset
POST   /v1/auth/reset-password        # Reset password
```

#### Protected (All Roles)
```
GET    /v1/me                         # Current user info
GET    /v1/checklist                  # Get all checklist items
GET    /v1/assessments/:id            # Assessment detail
GET    /v1/assessments/:id/evidence   # Evidence list
GET    /v1/assessments/:id/scores     # Score list
GET    /v1/assessments/:id/summary    # Score summary
```

#### Participant
```
GET    /v1/participant/assessment     # Get my assessment
GET    /v1/participant/profile        # Get my organization profile
PATCH  /v1/participant/profile        # Update profile
POST   /v1/assessments/:id/evidence   # Upload evidence
PATCH  /v1/assessments/:id/submit     # Submit assessment
```

#### Assessor
```
GET    /v1/assessor/assignments       # My assignments
POST   /v1/assessments/:id/scores     # Submit score
PATCH  /v1/assessments/:id/submit-to-jury  # Submit to jury
```

#### Jury
```
GET    /v1/jury/assessments           # All finalized assessments
POST   /v1/assessments/:id/jury-decision  # Award decision
GET    /v1/assessments/:id/red-flags  # Red flags
POST   /v1/assessments/:id/red-flags  # Create red flag
```

#### Admin
```
GET    /v1/admin/participants         # All participants
GET    /v1/admin/users                # System users
POST   /v1/admin/users                # Create user
PATCH  /v1/admin/users/:id/status     # Activate/deactivate
POST   /v1/admin/assessments/:id/assign  # Assign assessor

GET    /v1/admin/profile-weights      # Profile weight targets
PATCH  /v1/admin/profile-weights/:code  # Update weight
GET    /v1/admin/checklist-items      # Master checklist
POST   /v1/admin/checklist-items      # Create item
PATCH  /v1/admin/checklist-items/:id  # Update item
DELETE /v1/admin/checklist-items/:id  # Delete item
GET    /v1/admin/maturity-levels      # Maturity definitions
POST   /v1/admin/maturity-levels      # Create level
```

---

## 📈 Status & Roadmap

### ✅ Completed (v1.0.0)

- [x] Database schema design
- [x] Master data setup (49 items)
- [x] Profile weight targets (6 profiles)
- [x] Maturity levels (0-5 scale)
- [x] User authentication & authorization
- [x] 4-role system (Admin, Asesor, Juri, Peserta)
- [x] Participant self-registration
- [x] Evidence upload system
- [x] Basic scoring system
- [x] Red flag system
- [x] Award level determination
- [x] **Weight fixes** (13 items corrected to match Excel)

### ⚠️ Known Issues (v1.0.0)

**CRITICAL:**
- Scoring calculation tidak menggunakan normalized weights
- Award level determination menggunakan percentage, seharusnya MIN pillar score
- Grand Champion eligibility logic perlu diperbaiki

**Detail:** Lihat [SCORING_LOGIC_ANALYSIS.md](SCORING_LOGIC_ANALYSIS.md)

### 🔜 Planned (v1.1.0)

**Critical Fixes:**
- [ ] Implement normalized weight calculation
  - Add `normalized_weight` column to `score_items`
  - Calculate weight per profile & applicability
  - Validate sum per pillar = profile target
- [ ] Fix award level logic
  - Use MIN(environmental, social, governance) instead of average
  - Implement correct band thresholds
- [ ] Fix Grand Champion eligibility
  - Grand Score ≥ 85
  - MIN pillar ≥ 3.0
  - No active red flags

**Enhancements:**
- [ ] Scoring audit trail
- [ ] Recalculation endpoint when weights change
- [ ] Export assessment to PDF
- [ ] Dashboard analytics for admin
- [ ] Email notifications
- [ ] Batch operations for admin

### 🎯 Future (v2.0.0)

- [ ] Multi-year comparison
- [ ] Benchmark against industry average
- [ ] Detailed scoring breakdown UI
- [ ] Evidence document preview
- [ ] Mobile-responsive design improvements
- [ ] API rate limiting
- [ ] Advanced search & filtering
- [ ] Bulk CSV import/export

---

## 🔧 Maintenance & Support

### Database Maintenance

**Fix Checklist Weights:**
```bash
psql -U esgscore -d esgscore -f backend/internal/db/fix_weights.sql
psql -U esgscore -d esgscore -f backend/internal/db/validate_weights.sql
```

**Backup:**
```bash
pg_dump -U esgscore -d esgscore > backup_$(date +%Y%m%d).sql
```

**Restore:**
```bash
psql -U esgscore -d esgscore < backup_YYYYMMDD.sql
```

### Troubleshooting

**Backend won't start:**
```bash
# Check database connection
psql -U esgscore -d esgscore -h localhost

# Check port not in use
lsof -i :8088

# View logs
go run cmd/api/main.go 2>&1 | tee backend.log
```

**Frontend build fails:**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+
```

**Scores don't match Excel:**
- Run `fix_weights.sql` to correct checklist weights
- Note: Normalization logic needs update (see SCORING_LOGIC_ANALYSIS.md)
- For production use, implement normalized weight calculation

---

## 📊 Master Data Summary

### Checklist Items: **49 total**
- Environmental: 23 items (Tailing, Biodiversity, Decarbonization, IUJP operations)
- Social: 15 items (K3, Community, HAM, Supply Chain)
- Governance: 11 items (Anti-corruption, ESG governance, Transparency)

### Profile Weights: **6 profiles**
| Profile | E | S | G | Total |
|---------|---|---|---|-------|
| IUP | 35% | 40% | 25% | 100% |
| IUJP-KONSULTASI | 10% | 50% | 40% | 100% |
| IUJP-OPERASIONAL | 25% | 45% | 30% | 100% |
| IUJP-DRILLING | 25% | 45% | 30% | 100% |
| IUJP-PENGOLAHAN | 30% | 40% | 30% | 100% |
| IUJP-PENUNJANG | 10% | 55% | 35% | 100% |

### Maturity Scale: **0-5**
- 0: Tidak Ada
- 1: Ad-hoc
- 2: Foundational
- 3: Integration
- 4: Advanced
- 5: Leadership

### Red Flags: **3 types** (auto-disqualification)
1. Fatality or tailing dam failure
2. Severe regulatory sanction
3. False evidence / data manipulation

---

## 🤝 Contributing

### Code Style
- **Go:** Follow standard Go formatting (`gofmt`)
- **React:** ESLint + Prettier (if configured)
- **SQL:** Lowercase keywords, snake_case tables
- **Commit:** Conventional commits format

### Pull Request Process
1. Create feature branch
2. Implement changes + tests
3. Update documentation
4. Submit PR with clear description
5. Code review
6. Merge to main

---

## 📄 License

Internal project - All rights reserved  
© 2026 ESG Mining Award Committee

---

## 📞 Contact & Support

### Technical Issues
- **Bug Report:** Create issue with logs & steps to reproduce
- **Feature Request:** Describe use case & expected behavior

### Business Questions
- **Award Criteria:** Refer to ESG_Score_IUP_IUJP_rev.01.xlsx
- **Assessment Process:** See DEPLOYMENT_GUIDE.md

---

## 🎓 Training Materials

### For Admin
1. System setup & configuration
2. User management
3. Master data management
4. Monitoring & reporting

### For Asesor
1. Accessing assignments
2. Scoring guidelines (maturity scale)
3. Evidence review
4. Submitting to jury

### For Juri
1. Review process
2. Red flag evaluation
3. Award decision criteria
4. Final determination

### For Peserta
1. Registration & profile setup
2. Evidence upload guidelines
3. Tracking progress
4. Understanding results

---

## 📌 Important Notes

### ⚠️ BEFORE PRODUCTION USE:

1. **MUST FIX:** Scoring normalization logic
   - See SCORING_LOGIC_ANALYSIS.md for details
   - Estimated 4-6 hours development time
   - Critical for accurate assessment

2. **MUST CHANGE:**
   - JWT_SECRET in production .env
   - Default admin password
   - Database credentials

3. **MUST SETUP:**
   - SSL/TLS certificates
   - Automated backups
   - Monitoring & alerts
   - Log rotation

4. **MUST TEST:**
   - Complete assessment flow (all roles)
   - Score calculations vs Excel
   - Red flag triggers
   - Award level determination

---

## 🏁 Current Status

**Overall:** 🟡 **70% READY**

**What's Working:**
- ✅ Authentication & authorization
- ✅ Master data (weights fixed!)
- ✅ Evidence upload
- ✅ Basic scoring
- ✅ Red flag system
- ✅ 4-role workflows

**What Needs Fix:**
- ❌ Scoring normalization (CRITICAL)
- ❌ Award level logic (IMPORTANT)
- ❌ Grand Champion eligibility (IMPORTANT)

**Recommendation:** Fix scoring logic before any real assessments!

---

**Last Updated:** 2026-07-08  
**Version:** 1.0.0  
**Status:** Testing Phase - Not Production Ready  
**Next Release:** v1.1.0 with scoring fixes
