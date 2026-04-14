# Scripts

Operational shell scripts for the full-stack deploy and for nginx/SSL management on the production server. All scripts assume an SSH alias `trivia` is configured in `~/.ssh/config` pointing at the Hetzner VPS.

## Deployment

### `deploy-to-hetzner.sh`

Builds `trivia-nearby/` locally, SSHes to the server, pulls `main`, and restarts services. This is the main deploy path for frontend changes. See [`trivia-backend/DEPLOYMENT.md`](../trivia-backend/DEPLOYMENT.md) for the manual equivalent.

### `setup-labels.sh`

One-time GitHub labels setup for the repo. Safe to re-run; idempotent.

## Nginx / SSL operations

### `safe-nginx-restart.sh`

Validates nginx config first (`nginx -t`), then performs a graceful reload only if the config is valid. Use this instead of `systemctl restart nginx` to avoid taking the site down if there's a config error.

### `fix-ssl-and-restart.sh`

Emergency script for when Let's Encrypt certificate permissions or nginx config get into a bad state after a cert renewal. Checks cert directory, validates config, reloads if possible.
