# ESG Score - Mining ESG Award Platform

Platform assessment ESG untuk industri pertambangan dengan sistem scoring berbasis maturity level 0-5.

## 🚀 Quick Start

### Prerequisites
- Node.js v20.19.4
- Go 1.21+
- PostgreSQL 15+

### Running the System

#### 1. Backend (API Server)
```bash
cd backend
./api_v2
```
**Port**: 8088

#### 2. Frontend (UI)
```bash
cd frontend
npm run dev
```
**Port**: 5175

#### 3. Database
- Database: `esgscore`
- Port: 5432

---

## 🌐 Access Points

| Service | URL |
|---------|-----|
| **Frontend UI** | http://localhost:5175 |
| **Backend API** | http://localhost:8088/v1 |
| **Registration** | http://localhost:5175/register |

---

## 🔐 Test Accounts

### Admin
```
Email: admin@esg-score.local
Password: Admin@2026
```

### Asesor
```
Email: asesor@esg-score.local
Password: password
```

### Asesor 2
```
Email: asesor2@esg-score.local
Password: password
```

### Juri
```
Email: juri@esg-score.local
Password: password
```

### Peserta
Register baru di: http://localhost:5175/register

---

## 📋 System Architecture

```
┌─────────────────┐
│   Frontend      │  Port 5175
│   React + TS    │  Vite + Tailwind CSS
└────────┬────────┘
         │ /api → proxy
         ↓
┌─────────────────┐
│   Backend       │  Port 8088
│   Go + Gin      │  JWT Auth
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │  Port 5432
│   Database      │  esgscore
└─────────────────┘
```

---

## 📁 Project Structure

```
ESG Score/
├── backend/
│   ├── cmd/api/main.go       # Main API server
│   ├── internal/scoring/     # Scoring logic
│   ├── api_v2                # Compiled binary
│   ├── .env                  # Backend config
│   └── uploads/              # File uploads
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── lib/              # API client
│   │   ├── store/            # Zustand state
│   │   └── types/            # TypeScript types
│   ├── vite.config.ts        # FIXED PORT 5175
│   └── package.json
│
├── SYSTEM_CONFIG.md          # System configuration (LOCKED)
└── README.md                 # This file
```

---

## 🔧 Configuration (LOCKED)

**⚠️ DO NOT CHANGE THESE SETTINGS:**

### Frontend
- **Port**: 5175 (enforced with `strictPort: true`)
- **Proxy**: `/api` → `http://localhost:8088/v1`
- **Node Version**: 20.19.4

### Backend
- **Port**: 8088
- **API Base**: `/v1`
- **JWT Expiry**: 720 hours

### Database
- **Port**: 5432
- **Name**: esgscore

---

## 🧪 Testing Flow - Profil Peserta

### New Feature: Profile Completion Blocking

1. **Register** peserta baru di `/register`
2. **Login** dengan akun peserta
3. **Klik "Checklist"** → akan muncul blocking screen
4. **Klik "Lengkapi Profil Sekarang"**
5. **Isi form profil**:
   - Nomor Izin (IUP/IUJP)
   - Jenis Izin
   - Sub-Jenis Layanan (jika IUJP)
   - Upload Logo Perusahaan
6. **Simpan** → success notification
7. **Klik "Checklist"** lagi → ✅ Access granted!

---

## 📚 Documentation

- [SYSTEM_CONFIG.md](SYSTEM_CONFIG.md) - Port & configuration (LOCKED)
- [PRD.md](PRD.md) - Product requirements
- [ROADMAP.md](ROADMAP.md) - Development roadmap
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing procedures

---

## 🛠️ Development Commands

### Frontend
```bash
npm run dev      # Start dev server (port 5175)
npm run build    # Build for production
npm run lint     # ESLint check
npm run preview  # Preview production build
```

### Backend
```bash
go run cmd/api/main.go   # Run in dev mode
go build -o api_v2       # Build binary
./api_v2                 # Run compiled binary
```

---

## 📝 Notes

- Frontend runs on **port 5175** (FIXED)
- Backend API runs on **port 8088** (FIXED)
- Database name: **esgscore** (FIXED)
- All ports are enforced and should NOT be changed

---

**Last Updated**: 2026-07-10  
**Version**: 1.0.0  
**Status**: ✅ STABLE CONFIGURATION
