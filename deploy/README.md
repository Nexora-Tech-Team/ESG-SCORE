# ESG Score Production Deployment

Target host: `oneconnect.cbqaglobal.co.id`

## Runtime Layout

```text
/opt/esg-score/backend/api
/opt/esg-score/backend/.env
/opt/esg-score/backend/internal/db/schema.sql
/opt/esg-score/backend/internal/db/seed.sql
/opt/esg-score/backend/uploads/
/var/www/esg-score/
/etc/systemd/system/esg-score-api.service
/etc/nginx/sites-available/oneconnect-esg-score
```

## Required Production Environment

Copy `backend/.env.production.example` to `/opt/esg-score/backend/.env` on the server and set real values:

```env
PORT=8088
DATABASE_URL=postgres://esgscore:...@127.0.0.1:5432/esgscore?sslmode=disable
JWT_SECRET=...
JWT_EXPIRY_MINUTES=480
FRONTEND_BASE_URL=https://oneconnect.cbqaglobal.co.id
ALLOWED_ORIGINS=https://oneconnect.cbqaglobal.co.id,http://oneconnect.cbqaglobal.co.id
```

## Database

Create a dedicated database and user:

```sql
CREATE DATABASE esgscore;
CREATE USER esgscore WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE esgscore TO esgscore;
```

The API runs `internal/db/schema.sql` and `internal/db/seed.sql` on startup.

## Services

Install:

```bash
cp deploy/systemd/esg-score-api.service /etc/systemd/system/esg-score-api.service
systemctl daemon-reload
systemctl enable esg-score-api
systemctl restart esg-score-api
```

Nginx:

```bash
cp deploy/nginx/oneconnect-esg-score.conf /etc/nginx/sites-available/oneconnect-esg-score
ln -sfn /etc/nginx/sites-available/oneconnect-esg-score /etc/nginx/sites-enabled/oneconnect-esg-score
nginx -t
systemctl reload nginx
```

Smoke test is intentionally not part of this checklist.
