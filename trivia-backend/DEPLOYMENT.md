# Deployment

Production runs on a Hetzner VPS serving `trivianearby.com`. Frontend is a static Vite build; backend is a Node project intended to be invoked by cron.

The whole repo is checked out on the server at `/var/www/trivia/`. Both the frontend build output and the backend code live inside that checkout. SSH to the server via the `jtdev` alias (configured in `~/.ssh/config` → `178.156.139.162:2222` as user `jason`).

## Production Layout

```
/var/www/trivia/                       full repo checkout
  trivia-nearby/dist/                  built frontend (nginx serves from here)
  trivia-backend/                      Node scripts, .env, scheduler
    scheduler.log                      scheduler cron output
/backups/                              database + config backups
```

Nginx config (`/etc/nginx/sites-enabled/...`):

```nginx
server {
    listen 443 ssl;
    server_name trivianearby.com www.trivianearby.com;
    root /var/www/trivia/trivia-nearby/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

The SPA handles `/admin` internally — no separate admin subdomain.

SSL: `certbot` auto-renewal. Supabase project `izaojwusiuvosqrbdwtd`; no local Postgres.

## Deploying a Frontend Change

The repo is already on the server. Easiest path is to pull and build in place (server has Node 20.20+ which Vite 7 requires):

```bash
ssh jtdev
cd /var/www/trivia
git fetch origin
git checkout main              # first time only; subsequent pulls stay on main
git pull origin main
cd trivia-nearby
pnpm install                   # only if deps changed
pnpm build
```

Nginx serves the new `dist/` immediately — no reload needed. Hard-refresh to bust browser cache.

Alternate path (build locally, rsync):

```bash
cd trivia-nearby
pnpm build
rsync -avz --delete dist/ jtdev:/var/www/trivia/trivia-nearby/dist/
```

Use the rsync path if you don't want to change the server's checked-out branch state.

## Deploying a Backend Change

Backend changes matter if they touch the scheduler, scrapers, or importers. No long-running process to restart.

```bash
ssh jtdev
cd /var/www/trivia
git pull origin main
cd trivia-backend
pnpm install                   # only if deps changed

# smoke test
node sunday-night-scheduler.js --dry-run
pnpm monitor
```

Apply any Supabase schema changes via the Supabase SQL Editor *before* pulling the dependent code.

## Cron / Scheduler State

**Known issue (2026-04 snapshot):** `crontab -l` as user `jason` is empty — the Sunday-night scheduler is not currently installed. Check `sudo crontab -l` for a root-level install; if neither exists, the scheduler hasn't run since September 2025 and `event_occurrences` will stop filling in.

To install:

```bash
cd /var/www/trivia/trivia-backend
./setup-cron.sh
```

The script installs this crontab entry for the current user:

```
0 22 * * SUN cd /var/www/trivia/trivia-backend && /usr/bin/node sunday-night-scheduler.js >> scheduler.log 2>&1
```

It's idempotent — re-running it won't create duplicates.

Verify:

```bash
crontab -l | grep scheduler
systemctl status cron
```

If the scheduler has been down long enough that there's a gap, run the backfill first:

```bash
cd /var/www/trivia/trivia-backend
node jobs/backfill-occurrences.js --dry-run
node jobs/backfill-occurrences.js
```

## Health Checks After Deploy

```bash
# frontend serving
curl -I https://trivianearby.com
curl -I https://trivianearby.com/admin

# bundle age (Last-Modified reflects the last `pnpm build`)
curl -sI https://trivianearby.com/assets/index-*.js | grep -i last-modified

# SSL valid
sudo certbot certificates

# disk space
df -h

# scheduler reachable?
cd /var/www/trivia/trivia-backend
node sunday-night-scheduler.js --dry-run
pnpm monitor

# recent cron runs?
tail -50 /var/www/trivia/trivia-backend/scheduler.log
```

Spot-check in the app: load https://trivianearby.com, confirm events for today render. Log into `/admin` and confirm the dashboard loads.

## Rollback

Frontend rollback via git:

```bash
ssh jtdev
cd /var/www/trivia
git log --oneline -5
git checkout <previous-sha>
cd trivia-nearby && pnpm build
```

Or keep the previous `dist/` around before deploying:

```bash
ssh jtdev 'cp -r /var/www/trivia/trivia-nearby/dist /var/www/trivia/trivia-nearby/dist.prev'
# roll back
ssh jtdev 'rm -rf /var/www/trivia/trivia-nearby/dist && mv /var/www/trivia/trivia-nearby/dist.prev /var/www/trivia/trivia-nearby/dist'
```

Backend rollback: same `git checkout <sha>` approach in `/var/www/trivia`, no restart required.

Database rollback: restore from the latest `/backups/trivia-*.sql.gz` dump via `psql`. Only do this if a migration corrupted data — most issues are fixable via code-only rollback.

## Backups

Weekly Postgres dump:

```
0 2 * * 0 pg_dump $DATABASE_URL | gzip > /backups/trivia-$(date +\%Y\%m\%d).sql.gz
```

Log rotation is configured via `/etc/logrotate.d/trivia` (weekly, 52 rotations, gzip).

## Production Gotchas

- **Service role key never ships to the frontend.** Only `VITE_SUPABASE_ANON_KEY` is bundled. Service role lives in `/var/www/trivia/trivia-backend/.env`.
- **RLS is on for every table.** If an admin can't see rows, check role/claim linkage before blaming the code.
- **Cron uses server time.** `timedatectl` to confirm. Events are generated using server-local dates.
- **Google Places has a 1000/day cap.** Big imports can burn through it; pace with `--limit` and check `api_usage_log`.
- **The scheduler is a one-shot, not a daemon.** If it fails mid-run, just run it again — it's idempotent.
- **Two log path conventions exist** (`scheduler.log` in the project dir vs `/var/log/trivia-scheduler.log`). Check both when investigating; depends on which installer script was used.
- **Don't run DDL from code.** Apply migrations via the Supabase SQL Editor; the service role key in scripts is for DML only.
- **Server is typically on the `main` branch.** Older docs may reference a `deployment` branch — that branch exists but hasn't been the source of truth since the 2026 cleanup.
