#!/bin/bash

# Production Deployment Script for Sunday Night Event Scheduler
# This script deploys the scheduler to the Hetzner production server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_SERVER="your-server-ip"  # Replace with actual server IP
PRODUCTION_USER="root"              # Replace with actual server user
PRODUCTION_PATH="/var/www/trivia-backend"
LOCAL_BACKEND_PATH="."

echo -e "${BLUE}🚀 Starting Production Deployment of Sunday Night Scheduler${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "sunday-night-scheduler.js" ]; then
    print_error "Must run this script from the trivia-backend directory"
    exit 1
fi

# Check if required files exist
echo -e "${BLUE}📋 Checking required files...${NC}"
required_files=(
    "sunday-night-scheduler.js"
    "jobs/generate-weekly-events.js"
    "setup-cron.sh"
    "package.json"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "Found $file"
    else
        print_error "Missing required file: $file"
        exit 1
    fi
done

# Create deployment package
echo -e "${BLUE}📦 Creating deployment package...${NC}"
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy essential files
cp sunday-night-scheduler.js "$DEPLOY_DIR/"
cp -r jobs "$DEPLOY_DIR/"
cp setup-cron.sh "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp pnpm-lock.yaml "$DEPLOY_DIR/" 2>/dev/null || echo "No pnpm-lock.yaml found"

# Copy environment template (not actual .env for security)
if [ -f ".env.example" ]; then
    cp .env.example "$DEPLOY_DIR/"
    print_status "Copied .env.example template"
fi

# Create production deployment script
cat > "$DEPLOY_DIR/install-on-server.sh" << 'EOF'
#!/bin/bash

# Server-side installation script
set -e

INSTALL_DIR="/var/www/trivia-backend"
LOG_DIR="/var/log"
BACKUP_DIR="/backups"

echo "🔧 Installing Sunday Night Scheduler on production server..."

# Create directories
sudo mkdir -p "$INSTALL_DIR"
sudo mkdir -p "$LOG_DIR"
sudo mkdir -p "$BACKUP_DIR"

# Copy files (assuming they're in current directory)
echo "📁 Copying files to $INSTALL_DIR..."
sudo cp -r . "$INSTALL_DIR/"
cd "$INSTALL_DIR"

# Set permissions
sudo chown -R www-data:www-data "$INSTALL_DIR"
sudo chmod +x setup-cron.sh
sudo chmod +x sunday-night-scheduler.js

# Install Node.js dependencies
echo "📦 Installing dependencies..."
if command -v pnpm &> /dev/null; then
    sudo -u www-data pnpm install --prod
elif command -v npm &> /dev/null; then
    sudo -u www-data npm install --only=production
else
    echo "❌ Neither pnpm nor npm found. Please install Node.js package manager."
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Please create .env file with the following variables:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo ""
    echo "You can use .env.example as a template if available."
    exit 1
fi

# Test the scheduler
echo "🧪 Testing scheduler..."
if node sunday-night-scheduler.js --dry-run; then
    echo "✅ Scheduler test passed!"
else
    echo "❌ Scheduler test failed. Please check configuration."
    exit 1
fi

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Run: sudo ./setup-cron.sh"
echo "2. Monitor logs: tail -f /var/log/trivia-scheduler.log"
echo "3. Test manually: node sunday-night-scheduler.js"
EOF

chmod +x "$DEPLOY_DIR/install-on-server.sh"

# Create monitoring script
cat > "$DEPLOY_DIR/monitor-scheduler.sh" << 'EOF'
#!/bin/bash

# Monitoring script for Sunday Night Scheduler
LOG_FILE="/var/log/trivia-scheduler.log"
SCHEDULER_DIR="/var/www/trivia-backend"

echo "📊 Sunday Night Scheduler Status"
echo "================================"

# Check if cron job exists
echo "🕐 Cron Job Status:"
if crontab -l 2>/dev/null | grep -q "sunday-night-scheduler.js"; then
    echo "  ✅ Cron job is configured"
    crontab -l | grep "sunday-night-scheduler.js"
else
    echo "  ❌ Cron job not found"
fi

echo ""

# Check recent executions
echo "📋 Recent Executions (last 10 lines):"
if [ -f "$LOG_FILE" ]; then
    tail -10 "$LOG_FILE"
else
    echo "  ❌ Log file not found at $LOG_FILE"
fi

echo ""

# Check if scheduler can run
echo "🧪 Test Run:"
cd "$SCHEDULER_DIR" || exit 1
if node sunday-night-scheduler.js --dry-run; then
    echo "  ✅ Scheduler test passed"
else
    echo "  ❌ Scheduler test failed"
fi

echo ""
echo "📁 Useful paths:"
echo "  Scheduler directory: $SCHEDULER_DIR"
echo "  Log file: $LOG_FILE"
echo "  Edit cron: crontab -e"
EOF

chmod +x "$DEPLOY_DIR/monitor-scheduler.sh"

# Create improved cron setup script
cat > "$DEPLOY_DIR/setup-cron-production.sh" << 'EOF'
#!/bin/bash

# Production Cron Setup for Sunday Night Scheduler
set -e

PROJECT_DIR="/var/www/trivia-backend"
NODE_PATH="$(which node)"
LOG_FILE="/var/log/trivia-scheduler.log"

# Ensure we're in the right directory
cd "$PROJECT_DIR" || exit 1

echo "🔧 Setting up Production Sunday Night Event Scheduler..."
echo "📁 Project directory: $PROJECT_DIR"
echo "🟢 Node path: $NODE_PATH"
echo "📝 Log file: $LOG_FILE"
echo "⏰ Schedule: Every Sunday at 10 PM (22:00)"

# Create log file with proper permissions
sudo touch "$LOG_FILE"
sudo chown www-data:www-data "$LOG_FILE"

# Build the cron command
CRON_COMMAND="0 22 * * SUN cd $PROJECT_DIR && $NODE_PATH sunday-night-scheduler.js >> $LOG_FILE 2>&1"

echo ""
echo "🕐 Installing cron job..."

# Remove any existing scheduler jobs and add the new one
(crontab -l 2>/dev/null | grep -v "sunday-night-scheduler.js"; echo "$CRON_COMMAND") | crontab -

echo "✅ Cron job installed successfully!"
echo ""
echo "📋 Current scheduler cron jobs:"
crontab -l | grep "sunday-night-scheduler.js" || echo "   (No matching entries found)"

echo ""
echo "🧪 Testing scheduler..."
if node sunday-night-scheduler.js --dry-run; then
    echo "✅ Scheduler test passed!"
else
    echo "❌ Scheduler test failed. Please check configuration."
    exit 1
fi

echo ""
echo "📊 Monitoring commands:"
echo "  View logs: tail -f $LOG_FILE"
echo "  Test run: cd $PROJECT_DIR && node sunday-night-scheduler.js --dry-run"
echo "  Manual run: cd $PROJECT_DIR && node sunday-night-scheduler.js"
echo "  Monitor status: ./monitor-scheduler.sh"
echo ""
echo "🗑️  To remove cron job:"
echo "  crontab -e  # Then delete the line containing 'sunday-night-scheduler.js'"

echo ""
echo "🎉 Production scheduler setup complete!"
EOF

chmod +x "$DEPLOY_DIR/setup-cron-production.sh"

print_status "Created deployment package in $DEPLOY_DIR"

# Create deployment instructions
cat > "$DEPLOY_DIR/DEPLOYMENT_INSTRUCTIONS.md" << EOF
# Sunday Night Scheduler - Production Deployment Instructions

## 📋 Pre-Deployment Checklist

### On Production Server
1. **Ensure Node.js is installed** (version 18+)
   \`\`\`bash
   node --version
   npm --version  # or pnpm --version
   \`\`\`

2. **Ensure required directories exist**
   \`\`\`bash
   sudo mkdir -p /var/www/trivia-backend
   sudo mkdir -p /var/log
   sudo mkdir -p /backups
   \`\`\`

3. **Set up environment variables**
   Create \`/var/www/trivia-backend/.env\` with:
   \`\`\`bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   \`\`\`

## 🚀 Deployment Steps

### Step 1: Upload Files
Upload this entire directory to your production server:
\`\`\`bash
# From your local machine
scp -r deploy-* user@your-server:/tmp/scheduler-deploy
\`\`\`

### Step 2: Install on Server
\`\`\`bash
# On production server
cd /tmp/scheduler-deploy
sudo ./install-on-server.sh
\`\`\`

### Step 3: Set Up Cron Job
\`\`\`bash
cd /var/www/trivia-backend
sudo ./setup-cron-production.sh
\`\`\`

### Step 4: Verify Installation
\`\`\`bash
# Test the scheduler
cd /var/www/trivia-backend
node sunday-night-scheduler.js --dry-run

# Check cron job
crontab -l | grep scheduler

# Monitor logs
tail -f /var/log/trivia-scheduler.log
\`\`\`

## 📊 Monitoring

### Check Status
\`\`\`bash
cd /var/www/trivia-backend
./monitor-scheduler.sh
\`\`\`

### View Logs
\`\`\`bash
# Recent logs
tail -20 /var/log/trivia-scheduler.log

# Follow logs in real-time
tail -f /var/log/trivia-scheduler.log

# Search for errors
grep -i error /var/log/trivia-scheduler.log
\`\`\`

### Manual Testing
\`\`\`bash
cd /var/www/trivia-backend

# Dry run (safe test)
node sunday-night-scheduler.js --dry-run

# Actual run (creates real data)
node sunday-night-scheduler.js
\`\`\`

## 🔧 Troubleshooting

### Common Issues

1. **Permission Errors**
   \`\`\`bash
   sudo chown -R www-data:www-data /var/www/trivia-backend
   sudo chmod +x /var/www/trivia-backend/sunday-night-scheduler.js
   \`\`\`

2. **Environment Variables Not Found**
   - Check \`/var/www/trivia-backend/.env\` exists
   - Verify Supabase credentials are correct
   - Test database connection

3. **Cron Job Not Running**
   \`\`\`bash
   # Check cron service
   sudo systemctl status cron
   
   # Check system logs
   grep CRON /var/log/syslog
   \`\`\`

4. **Node.js Dependencies**
   \`\`\`bash
   cd /var/www/trivia-backend
   npm install --only=production  # or pnpm install --prod
   \`\`\`

## ⚠️ Important Notes

- **The cron job runs every Sunday at 10 PM (22:00)**
- **Logs are written to \`/var/log/trivia-scheduler.log\`**
- **Always test with \`--dry-run\` first**
- **Monitor the first few runs to ensure success**
- **Set up log rotation to prevent disk space issues**

## 📞 Emergency Procedures

### If Scheduler Fails
1. Check logs: \`tail -50 /var/log/trivia-scheduler.log\`
2. Test manually: \`node sunday-night-scheduler.js --dry-run\`
3. Check database connectivity
4. Verify environment variables

### If Cron Job Stops Working
1. Check cron service: \`sudo systemctl status cron\`
2. Verify cron job exists: \`crontab -l | grep scheduler\`
3. Re-run setup: \`./setup-cron-production.sh\`

---

**Deployment Date**: $(date)
**Deployed By**: Production Deployment Script
**Next Scheduled Run**: Next Sunday at 10 PM
EOF

print_status "Created deployment instructions"

# Archive the deployment package
echo -e "${BLUE}📦 Creating deployment archive...${NC}"
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"
print_status "Created deployment archive: ${DEPLOY_DIR}.tar.gz"

# Clean up temp directory
rm -rf "$DEPLOY_DIR"

echo ""
echo -e "${GREEN}🎉 Deployment package ready!${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Upload ${DEPLOY_DIR}.tar.gz to your production server"
echo "2. Extract: tar -xzf ${DEPLOY_DIR}.tar.gz"
echo "3. Follow instructions in DEPLOYMENT_INSTRUCTIONS.md"
echo ""
echo -e "${YELLOW}Quick deployment commands:${NC}"
echo "# Upload to server"
echo "scp ${DEPLOY_DIR}.tar.gz user@your-server:/tmp/"
echo ""
echo "# On production server:"
echo "cd /tmp && tar -xzf ${DEPLOY_DIR}.tar.gz && cd ${DEPLOY_DIR%%-*}*"
echo "sudo ./install-on-server.sh"
echo "sudo ./setup-cron-production.sh"
echo ""
echo -e "${GREEN}✅ Production deployment package created successfully!${NC}"