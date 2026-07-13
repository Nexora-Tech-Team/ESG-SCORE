# ESG Score System Configuration

**JANGAN DIUBAH** - Konfigurasi tetap untuk development dan testing.

## Port Configuration (FIXED)

| Service | Port | URL |
|---------|------|-----|
| **Frontend (Vite)** | **5175** | http://localhost:5175 |
| **Backend (Go API)** | **8088** | http://localhost:8088 |
| **Database (PostgreSQL)** | **5432** | localhost:5432 |

## Database

- **Name**: `esgscore`
- **User**: (sesuai .env di backend)
- **Host**: localhost:5432

## API Endpoints

- **Base URL**: http://localhost:8088/v1
- **Frontend Proxy**: `/api` → proxied ke `http://localhost:8088/v1`

## Frontend Vite Config

```typescript
// vite.config.ts - FIXED PORT
server: {
  port: 5175,        // JANGAN DIUBAH
  strictPort: true,  // Error jika port occupied
  proxy: {
    '/api': {
      target: 'http://localhost:8088',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, '/v1'),
    }
  }
}
```

## Test Accounts

### Admin
- Email: `admin@esg-score.local`
- Password: `Admin@2026`

### Asesor
- Email: `asesor@esg-score.local`
- Password: `password`

### Asesor 2
- Email: `asesor2@esg-score.local`
- Password: `password`

### Juri
- Email: `juri@esg-score.local`
- Password: `password`

### Peserta
- Register manual di: http://localhost:5175/register

## Running Services

### Backend
```bash
cd /Users/cbqaglobal/Documents/New\ project/ESG\ Score/backend
./api_v2
# atau
go run cmd/api/main.go
```

### Frontend
```bash
cd /Users/cbqaglobal/Documents/New\ project/ESG\ Score/frontend
npm run dev
# Automatically runs on port 5175
```

### Database
```bash
# Check if running
psql -U postgres -d esgscore -c "SELECT 1"
```

## Environment Files

### Backend `.env`
```
PORT=8088
DATABASE_URL=postgres://...
JWT_SECRET=...
JWT_EXPIRY_HOURS=720
```

### Frontend (No .env needed)
- Proxy configuration in `vite.config.ts` handles API routing

---

**Last Updated**: 2026-07-10
**Status**: ✅ STABLE - DO NOT CHANGE
