# Broken Scripts

Scripts that appeared functional but were never actually operational. Kept for reference only.

## `deploy-scheduler-production.sh`

Deploy script for the Sunday-night scheduler. Had placeholder values for server IP and user (`PRODUCTION_SERVER="your-server-ip"`, `PRODUCTION_USER="root"`) that were never filled in, so the script never worked. It was wired into `trivia-backend/package.json` as `pnpm deploy:production`, but that alias has been removed.

Real deployment is covered in [`trivia-backend/DEPLOYMENT.md`](../../trivia-backend/DEPLOYMENT.md).
