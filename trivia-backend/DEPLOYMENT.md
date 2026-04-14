# Deployment

Production runs on a Hetzner VPS serving `trivianearby.com`. The frontend is a static Vite build; the backend is a Node project invoked by cron.

## Production Layout

```
/var/www/trivianearby/dist/      # built frontend (trivia-nearby/dist)
/var/www/trivia-backend/         # backend checkout, includes .env and scheduler
/var/log/trivia-scheduler.log    # cron output
/backups/                        # database + config backups
```

Nginx serves the frontend as a SPA (fallback to `index.html`). The `/admin` route is part of the same SPA bundle — there is no separate admin subdomain in use.

```nginx
server {
    listen 443 ssl;
    server_name trivianearby.com;
    root /var/www/trivianearby/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

SSL is managed by `certbot` (`sudo certbot --nginx -d trivianearby.com`) with auto-renewal.

Supabase is hosted (project `izaojwusiuvosqrbdwtd`) — there is no local Postgres.

Branches: deploy from `main`.

## Deploying a Frontend Change

```bash
# local
cd trivia-nearby
pnpm install
pnpm build

# copy the build to the server
rsync -avz --delete dist/ user@hetzner:/var/www/trivianearby/dist/
```

Nginx picks it up immediately; no reload required for static content. Hard-refresh the browser to bust the cache.

## Deploying a Backend Change

Backend changes only matter if they affect the scheduler, scrapers, or import scripts.

```bash
# on the server
ssh user@hetzner
cd /var/www/trivia-backend
git pull origin main
pnpm install           # only if dependencies changed

# smoke test
node sunday-night-scheduler.js --dry-run
pnpm monitor
```

No process to restart — the scheduler is a cron-invoked one-shot, not a long-running service.

If a migration is required, apply it via the Supabase SQL Editor before pulling the code that depends on it.

## Installing the Cron Scheduler on Prod

From a fresh `/var/www/trivia-backend` checkout with `.env` in place:

```bash
cd /var/www/trivia-backend
./setup-cron.sh
```

`setup-cron.sh` installs this crontab entry for the current user:

```
0 22 * * SUN cd /var/www/trivia-backend && /usr/bin/node sunday-night-scheduler.js >> scheduler.log 2>&1
```

It's idempotent — re-running it won't create duplicates (it strips prior `sunday-night-scheduler.js` lines before adding the new one).

Verify:

```bash
crontab -l | grep scheduler
systemctl status cron       # ensure cron is running
```

If you want logs in `/var/log/` instead of the project directory, edit the crontab entry by hand to redirect there and make sure the user has write access.

## Health Checks After Deploy

```bash
# scheduler dry-run (should complete without errors)
cd /var/www/trivia-backend && node sunday-night-scheduler.js --dry-run

# monitor summary
pnpm monitor

# cron installed?
crontab -l | grep sunday-night-scheduler

# scheduler can reach Supabase and recent runs are logged?
tail -50 /var/log/trivia-scheduler.log
# or
tail -50 /var/www/trivia-backend/scheduler.log

# frontend serving?
curl -I https://trivianearby.com
curl -I https://trivianearby.com/admin

# SSL valid?
sudo certbot certificates

# disk space
df -h
```

Spot-check in the app: load `https://trivianearby.com`, confirm events for today render, log into `/admin` and confirm the provider dashboard loads.

After the first Sunday post-deploy, verify new `event_occurrences` rows were created:

```sql
SELECT COUNT(*) FROM event_occurrences
WHERE created_at > NOW() - INTERVAL '1 day';
```

## Rollback

Frontend:

```bash
# keep the previous build around before deploying
ssh user@hetzner 'cp -r /var/www/trivianearby/dist /var/www/trivianearby/dist.prev'
# then to roll back
ssh user@hetzner 'rm -rf /var/www/trivianearby/dist && mv /var/www/trivianearby/dist.prev /var/www/trivianearby/dist'
```

Backend:

```bash
cd /var/www/trivia-backend
git log --oneline -5
git checkout <previous-sha>
pnpm install
node sunday-night-scheduler.js --dry-run
```

Database: restore from the latest `/backups/trivia-*.sql.gz` dump via `psql`. Only do this if a migration corrupted data — most issues are fixable by code-only rollback.

DNS rollback is not a realistic step (we control one domain, one server).

## Backups

Weekly crontab entry dumps Postgres:

```
0 2 * * 0 pg_dump $DATABASE_URL | gzip > /backups/trivia-$(date +\%Y\%m\%d).sql.gz
```

Log rotation is configured via `/etc/logrotate.d/trivia` (weekly, 52 rotations, gzip).

## Production Gotchas

- **Service role key never goes to the frontend.** Only `VITE_SUPABASE_ANON_KEY` is bundled. The service role key lives in `/var/www/trivia-backend/.env` and is used by the scheduler and importers.
- **RLS is on for every table.** If an admin suddenly can't see rows, check `admin_users` / `provider_users` linkage before blaming the code.
- **Cron uses server time.** Confirm the server timezone (`timedatectl`) matches what "Sunday 10 PM" is supposed to mean for your data. Events are generated using server-local dates.
- **Google Places has a 1000/day cap.** A big import can burn through it; pace with `--limit` and check `api_usage_log`.
- **The scheduler is a one-shot, not a daemon.** If it fails mid-run, just run it again — it's idempotent and won't re-create existing occurrences.
- **Two log path conventions exist** (`scheduler.log` in the project dir vs `/var/log/trivia-scheduler.log`). Check both when investigating; they depend on which installer script was used.
- **Don't amend Supabase schemas from code.** Apply migrations through the Supabase SQL Editor; the service role key in scripts does not have DDL helpers wired up.
