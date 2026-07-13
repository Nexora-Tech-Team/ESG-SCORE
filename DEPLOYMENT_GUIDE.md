# 🚀 ESG Score System - Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2026-07-08  
**Database:** PostgreSQL 14+  
**Backend:** Go 1.21+  
**Frontend:** React 18 + Vite

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Role Configuration](#role-configuration)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ System Overview

### Architecture
```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend  │─────>│   Backend    │─────>│  PostgreSQL  │
│ React + Vite│      │  Go + Gin    │      │   Database   │
│  Port 5175  │      │  Port 8088   │      │  Port 5434   │
└─────────────┘      └──────────────┘      └──────────────┘
```

### 4 Role System
1. **Admin** - Manage master data, users, participants
2. **Asesor** - Score assessments
3. **Juri** - Final award decisions
4. **Peserta** - Submit evidence, view progress

---

## ⚙️ Prerequisites

### Required Software
```bash
# Database
PostgreSQL 14 or higher

# Backend
Go 1.21 or higher

# Frontend
Node.js 18 or higher
npm or yarn

# Tools
git
```

### System Requirements
- **RAM:** Minimum 4GB
- **Disk:** 2GB free space
- **OS:** Linux, macOS, or Windows

---

## 🗄️ Database Setup

### Step 1: Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Create Database and User

```bash
# Login as postgres user
sudo -u postgres psql

# In psql prompt:
CREATE DATABASE esgscore;
CREATE USER esgscore WITH ENCRYPTED PASSWORD 'esgscore_dev';
GRANT ALL PRIVILEGES ON DATABASE esgscore TO esgscore;
\q
```

### Step 3: Configure Connection

Create `.env` file in `backend/` directory:

```env
# Database
DATABASE_URL=postgres://esgscore:esgscore_dev@localhost:5432/esgscore?sslmode=disable

# Server
PORT=8088

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY_MINUTES=1440

# Frontend
FRONTEND_BASE_URL=http://localhost:5175
```

**IMPORTANT:** Change `JWT_SECRET` in production!

### Step 4: Initialize Database

The backend automatically runs migrations on startup, but you can manually run:

```bash
cd backend
psql -U esgscore -d esgscore -f internal/db/schema.sql
psql -U esgscore -d esgscore -f internal/db/seed.sql
```

---

## 🔧 Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd "Documents/New project/ESG Score/backend"
```

### Step 2: Install Dependencies

```bash
go mod download
go mod tidy
```

### Step 3: Build Application

```bash
go build -o api cmd/api/main.go
```

### Step 4: Run Backend

```bash
# Development mode
go run cmd/api/main.go

# Or using built binary
./api
```

**Expected Output:**
```
ESG Score API running on :8088
```

### Step 5: Test API

```bash
curl http://localhost:8088/health
```

**Expected Response:**
```json
{"status":"ok","service":"ESG Score API"}
```

---

## 💻 Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd "Documents/New project/ESG Score/frontend"
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Create `.env` file in `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8088/v1
```

### Step 4: Run Development Server

```bash
npm run dev
```

**Expected Output:**
```
  VITE v5.x ready in xxx ms

  ➜  Local:   http://localhost:5175/
  ➜  Network: http://192.168.x.x:5175/
```

### Step 5: Access Application

Open browser and go to: **http://localhost:5175**

---

## 👥 Role Configuration

### Default Users

System seeds these users automatically on first run:

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@esg-score.local | Admin@2026 | admin | Master data management |
| asesor@esg-score.local | password | asesor | Assessment scoring |
| asesor2@esg-score.local | password | asesor | Additional assessor |
| juri@esg-score.local | password | juri | Award decisions |

### Creating Additional Users

**Via Admin Panel:**
1. Login as admin
2. Go to "User Management"
3. Click "Create New User"
4. Fill form with role selection
5. User receives email with credentials

**Via API:**
```bash
curl -X POST http://localhost:8088/v1/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Assessor",
    "email": "assessor@example.com",
    "role": "asesor",
    "password": "SecurePass@123",
    "confirmPassword": "SecurePass@123",
    "isActive": true
  }'
```

### Participant Registration

Participants self-register at: **http://localhost:5175/register**

Required information:
- Company name
- Contact person name
- Email
- Position
- Sector
- Password (min 8 chars, uppercase, number, symbol)

---

## 🔍 Testing

### Backend API Tests

**Test Login:**
```bash
curl -X POST http://localhost:8088/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@esg-score.local",
    "password": "Admin@2026"
  }'
```

**Test Protected Endpoint:**
```bash
# First get token from login response
export TOKEN="your-jwt-token-here"

curl -X GET http://localhost:8088/v1/me \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend Testing

1. **Admin Flow:**
   - Login as admin
   - Navigate to Master Data
   - Check Profile Weights (should show 6 profiles)
   - Check Checklist Items (should show 49 items)
   - Check Maturity Levels (should show 6 levels)

2. **Participant Flow:**
   - Register new participant
   - Complete profile (license type, number, logo)
   - Access assessment dashboard
   - Upload evidence

3. **Assessor Flow:**
   - Login as asesor
   - View assignments
   - Score checklist items (0-5)
   - Submit to jury

4. **Jury Flow:**
   - Login as juri
   - View submitted assessments
   - Review scores and red flags
   - Make award decision

---

## 🌐 Production Deployment

### Environment Configuration

**Backend Production `.env`:**
```env
# Database (use managed DB service)
DATABASE_URL=postgres://user:password@prod-db-host:5432/esgscore?sslmode=require

# Server
PORT=8088

# JWT (MUST CHANGE!)
JWT_SECRET=generate-strong-random-key-here-min-32-chars
JWT_EXPIRY_MINUTES=480

# Frontend
FRONTEND_BASE_URL=https://your-domain.com

# CORS
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

**Frontend Production `.env`:**
```env
VITE_API_BASE_URL=https://api.your-domain.com/v1
```

### Database Migration

**Before deploying new version:**

1. Backup database:
```bash
pg_dump -U esgscore -d esgscore > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. Apply fixes (IMPORTANT!):
```bash
# Fix checklist weights to match Excel
psql -U esgscore -d esgscore -f backend/internal/db/fix_weights.sql

# Validate
psql -U esgscore -d esgscore -f backend/internal/db/validate_weights.sql
```

### Build for Production

**Backend:**
```bash
cd backend
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o api cmd/api/main.go
```

**Frontend:**
```bash
cd frontend
npm run build
# Output will be in dist/
```

### Deployment Options

#### Option 1: Traditional Server

1. **Deploy Backend:**
```bash
# Copy binary to server
scp backend/api user@server:/opt/esg-score/
scp backend/.env user@server:/opt/esg-score/

# On server, create systemd service
sudo nano /etc/systemd/system/esg-score-api.service
```

Service file content:
```ini
[Unit]
Description=ESG Score API
After=network.target postgresql.service

[Service]
Type=simple
User=esgapp
WorkingDirectory=/opt/esg-score
ExecStart=/opt/esg-score/api
Restart=always
RestartSec=5
Environment="PATH=/usr/local/bin:/usr/bin"

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable esg-score-api
sudo systemctl start esg-score-api
```

2. **Deploy Frontend:**
```bash
# Copy build files to web server
scp -r frontend/dist/* user@server:/var/www/esg-score/

# Configure Nginx
sudo nano /etc/nginx/sites-available/esg-score
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/esg-score;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /v1 {
        proxy_pass http://localhost:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Option 2: Docker

**Docker Compose:**
```yaml
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: esgscore
      POSTGRES_USER: esgscore
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8088:8088"
    environment:
      DATABASE_URL: postgres://esgscore:${DB_PASSWORD}@db:5432/esgscore
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `database connect error: dial tcp: connect: connection refused`

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection string in .env
cat backend/.env | grep DATABASE_URL

# Test connection manually
psql -U esgscore -d esgscore -h localhost -p 5432
```

#### 2. Frontend Can't Connect to Backend

**Error:** `Network Error` or `CORS Error`

**Solution:**
```bash
# Check backend is running
curl http://localhost:8088/health

# Check CORS configuration in main.go
# Allowed origins should include frontend URL

# Check frontend .env
cat frontend/.env
```

#### 3. JWT Token Invalid

**Error:** `invalid token` or `token expired`

**Solution:**
- Check JWT_SECRET matches between backend sessions
- Token expires after JWT_EXPIRY_MINUTES
- Re-login to get new token

#### 4. Weight Calculations Wrong

**Error:** Scores don't match Excel calculations

**Solution:**
```bash
# Run weight fix script
psql -U esgscore -d esgscore -f backend/internal/db/fix_weights.sql

# Verify with validation script
psql -U esgscore -d esgscore -f backend/internal/db/validate_weights.sql

# Check SCORING_LOGIC_ANALYSIS.md for known issues
```

#### 5. Missing Master Data

**Error:** Empty dropdowns or "no data" messages

**Solution:**
```bash
# Re-run seed script
psql -U esgscore -d esgscore -f backend/internal/db/seed.sql

# Or via admin panel: Settings → Reset Master Data
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# API health
curl http://localhost:8088/health

# Database health
psql -U esgscore -d esgscore -c "SELECT 1"

# Check active connections
psql -U esgscore -d esgscore -c "SELECT count(*) FROM pg_stat_activity WHERE datname='esgscore'"
```

### Backup Strategy

**Daily Database Backup:**
```bash
#!/bin/bash
# /opt/esg-score/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/esg-score/backups"
pg_dump -U esgscore -d esgscore | gzip > $BACKUP_DIR/esgscore_$DATE.sql.gz
# Keep only last 30 days
find $BACKUP_DIR -name "esgscore_*.sql.gz" -mtime +30 -delete
```

**Cron job:**
```bash
crontab -e
# Add:
0 2 * * * /opt/esg-score/backup.sh
```

### Log Management

**Backend Logs:**
```bash
# If using systemd
journalctl -u esg-score-api -f

# Or redirect to file
./api >> /var/log/esg-score/api.log 2>&1
```

**Database Logs:**
```bash
tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 🔒 Security Checklist

### Before Production:

- [ ] Change default JWT_SECRET
- [ ] Change default admin password
- [ ] Enable SSL/TLS (HTTPS)
- [ ] Configure firewall rules
- [ ] Enable database SSL connection
- [ ] Set up regular backups
- [ ] Configure log rotation
- [ ] Review CORS allowed origins
- [ ] Enable rate limiting
- [ ] Set up monitoring alerts
- [ ] Document admin procedures
- [ ] Train staff on system usage

---

## 📞 Support

### Documentation
- `ANALYSIS_MASTER_DATA.md` - Master data validation report
- `SCORING_LOGIC_ANALYSIS.md` - Scoring calculation details
- `README.md` - Project overview

### Contact
- **Technical Support:** [Your IT team]
- **Business Questions:** [Project manager]
- **Bug Reports:** Create issue in project repository

---

## 📝 Changelog

### Version 1.0.0 (2026-07-08)
- ✅ Fixed 13 checklist item weights to match Excel
- ✅ Database schema finalized
- ✅ 4-role system implemented
- ✅ Profile weight targets configured
- ⚠️  Known issue: Scoring normalization needs update (see SCORING_LOGIC_ANALYSIS.md)

### Upcoming (v1.1.0)
- [ ] Fix weighted score normalization logic
- [ ] Fix award level determination (use MIN pillar)
- [ ] Add Grand Champion eligibility logic
- [ ] Performance optimization
- [ ] Audit trail for scoring changes

---

**Status:** ✅ READY FOR TESTING  
**Production Ready:** ⚠️ AFTER SCORING LOGIC FIX  
**Estimated Fix Time:** 4-6 hours for scoring logic update
