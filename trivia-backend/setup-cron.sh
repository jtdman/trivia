#!/bin/bash

# Setup cron job for Sunday Night Event Scheduler
# Run this script once to set up the automated scheduler

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_PATH="$(which node)"
CRON_COMMAND="0 22 * * SUN cd $PROJECT_DIR && $NODE_PATH sunday-night-scheduler.js >> scheduler.log 2>&1"

echo "🔧 Setting up Sunday Night Event Scheduler cron job..."
echo "📁 Project directory: $PROJECT_DIR"
echo "🟢 Node path: $NODE_PATH"
echo "⏰ Cron schedule: Every Sunday at 10 PM"

# Create log file if it doesn't exist
touch "$PROJECT_DIR/scheduler.log"

# Add cron job (only if it doesn't already exist)
(crontab -l 2>/dev/null | grep -v "sunday-night-scheduler.js"; echo "$CRON_COMMAND") | crontab -

echo "✅ Cron job installed successfully!"
echo ""
echo "📋 Current crontab:"
crontab -l | grep "sunday-night-scheduler.js" || echo "   (No matching entries found)"
echo ""
echo "🧪 To test the scheduler manually:"
echo "   cd $PROJECT_DIR"
echo "   npm run scheduler:test"
echo ""
echo "📊 To view scheduler logs:"
echo "   tail -f $PROJECT_DIR/scheduler.log"
echo ""
echo "🗑️  To remove the cron job:"
echo "   crontab -e  # Then delete the line containing 'sunday-night-scheduler.js'"