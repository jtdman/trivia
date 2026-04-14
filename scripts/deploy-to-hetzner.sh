#!/bin/bash
#
# Deploy trivia-nearby frontend to production.
# Pulls latest main on the server and rebuilds in place.
# Requires the `jtdev` SSH alias configured in ~/.ssh/config.

set -e

echo "Deploying trivia-nearby to production..."

ssh jtdev << 'EOF'
  set -e
  cd /var/www/trivia

  echo "Pulling latest main..."
  git fetch origin
  git checkout main
  git pull origin main

  cd trivia-nearby
  echo "Installing dependencies (if changed)..."
  pnpm install

  echo "Building..."
  pnpm build

  echo "Done."
EOF

echo "Deployed. Verify at https://trivianearby.com (hard-refresh to bust cache)."
