Deploy the Rift application to production (we are already on the live server — do NOT git pull).

Determine what changed (frontend, backend, or both) and run the appropriate command:

If both frontend and backend changed:
```bash
cd ~/rift-v1/frontend && npm run build && cd ../backend && venv/bin/alembic upgrade head && cd .. && pm2 restart all && pm2 list
```

If only the frontend changed:
```bash
cd ~/rift-v1/frontend && npm run build && pm2 restart rift-frontend && pm2 list
```

If only the backend changed:
```bash
cd ~/rift-v1/backend && venv/bin/alembic upgrade head && pm2 restart rift-backend && pm2 list
```

After deployment, report the pm2 list output so the user can confirm both services are online.
