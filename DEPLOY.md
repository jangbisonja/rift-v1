# Deployment — Rift (v1.kekl.ru)

## Infrastructure

- **Server**: VPS at `95.81.100.239`
- **Domain**: `https://v1.kekl.ru`
- **Process manager**: pm2 (runs as `datanewb`, survives reboots via systemd)
- **Reverse proxy**: nginx with Let's Encrypt TLS

## Routing

```
https://v1.kekl.ru/        → Next.js  :3000
https://v1.kekl.ru/be/     → FastAPI   :8000  (/be/ prefix stripped by nginx)
```

nginx config: `/etc/nginx/sites-available/rift`
pm2 ecosystem: `rift-v1/ecosystem.config.js`

## Env files (not committed)

| File | Key var |
|---|---|
| `backend/.env` | `CORS_ORIGINS`, `ENVIRONMENT=staging` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=https://v1.kekl.ru/be` |

## Deploy after code changes

**Frontend only:**
```bash
cd ~/rift-v1/frontend
git pull
npm run build
pm2 restart rift-frontend
```

**Backend only:**
```bash
cd ~/rift-v1/backend
git pull
# if new dependencies:
venv/bin/pip install -r requirements/dev.txt
# if new migrations:
venv/bin/alembic upgrade head
pm2 restart rift-backend
```

**Both layers:**
```bash
cd ~/rift-v1
git pull
cd frontend && npm run build && cd ..
cd backend && venv/bin/alembic upgrade head && cd ..
pm2 restart all
```

## Process management

```bash
pm2 list                  # status of all processes
pm2 logs                  # live logs (Ctrl+C to exit)
pm2 logs rift-backend     # backend logs only
pm2 logs rift-frontend    # frontend logs only
pm2 restart rift-backend  # restart one
pm2 restart all           # restart both
```
