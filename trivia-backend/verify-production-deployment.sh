#!/bin/bash

# Production Deployment Verification Script
# Run this script AFTER deploying the Sunday Night Scheduler to verify everything is working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCHEDULER_DIR="/var/www/trivia-backend"
LOG_FILE="/var/log/trivia-scheduler.log"
NODE_CMD="node"

echo -e "${BLUE}🔍 Sunday Night Scheduler - Production Deployment Verification${NC}"
echo -e "${BLUE}=================================================================${NC}"
echo ""

# Function to print status
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Track overall status
ERRORS=0
WARNINGS=0

# 1. Check if we're in the right environment
echo -e "${BLUE}1. Environment Check${NC}"
echo "-------------------"

if [ -d "$SCHEDULER_DIR" ]; then
    print_success "Scheduler directory exists: $SCHEDULER_DIR"
    cd "$SCHEDULER_DIR"
else
    print_error "Scheduler directory not found: $SCHEDULER_DIR"
    ERRORS=$((ERRORS + 1))
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js available: $NODE_VERSION"
else
    print_error "Node.js not found"
    ERRORS=$((ERRORS + 1))
fi

# Check package manager  
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm available: v$PNPM_VERSION"
    PKG_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm available: v$NPM_VERSION"
    PKG_MANAGER="npm"
else
    print_error "No package manager found (npm/pnpm required)"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 2. Check files and permissions
echo -e "${BLUE}2. File and Permission Check${NC}"
echo "-----------------------------"

required_files=(
    "sunday-night-scheduler.js"
    "scheduler-monitor.js"
    "package.json"
    ".env"
    "jobs/generate-weekly-events.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found: $file"
        
        # Check if executable files are executable
        if [[ "$file" == *.js ]]; then
            if [ -x "$file" ]; then
                print_info "  Executable: Yes"
            else
                print_info "  Executable: No (not required for .js files)"
            fi
        fi
    else
        print_error "Missing: $file"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check log file
if [ -f "$LOG_FILE" ]; then
    print_success "Log file exists: $LOG_FILE"
    if [ -w "$LOG_FILE" ]; then
        print_success "Log file is writable"
    else
        print_warning "Log file is not writable"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    print_warning "Log file does not exist yet: $LOG_FILE"
    print_info "  (Will be created on first run)"
fi

echo ""

# 3. Check dependencies
echo -e "${BLUE}3. Dependencies Check${NC}"
echo "----------------------"

if [ -f "package.json" ]; then
    print_info "Checking Node.js dependencies..."
    
    if [ -d "node_modules" ]; then
        print_success "node_modules directory exists"
        
        # Check key dependencies
        key_deps=("@supabase/supabase-js" "dotenv" "date-fns")
        for dep in "${key_deps[@]}"; do
            if [ -d "node_modules/$dep" ]; then
                print_success "  $dep installed"
            else
                print_warning "  $dep not found"
                WARNINGS=$((WARNINGS + 1))
            fi
        done
    else
        print_error "node_modules directory not found"
        print_info "  Run: $PKG_MANAGER install"
        ERRORS=$((ERRORS + 1))
    fi
fi

echo ""

# 4. Environment variables check
echo -e "${BLUE}4. Environment Variables Check${NC}"
echo "-------------------------------"

if [ -f ".env" ]; then
    print_success ".env file exists"
    
    # Check for required variables (without displaying values)
    required_vars=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env; then
            if grep -q "^$var=.*[^[:space:]]" .env; then
                print_success "  $var is set"
            else
                print_error "  $var is empty"
                ERRORS=$((ERRORS + 1))
            fi
        else
            print_error "  $var not found in .env"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    print_error ".env file not found"
    print_info "  Create .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 5. Database connectivity test
echo -e "${BLUE}5. Database Connectivity Test${NC}"
echo "-------------------------------"

print_info "Testing database connection..."

# Use the monitoring script to test database connectivity
if node scheduler-monitor.js --json > /tmp/monitor-test.json 2>/dev/null; then
    if grep -q '"connected":true' /tmp/monitor-test.json; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        ERRORS=$((ERRORS + 1))
    fi
    rm -f /tmp/monitor-test.json
else
    print_warning "Could not run database connectivity test"
    print_info "  Try manually: node scheduler-monitor.js"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# 6. Cron job verification
echo -e "${BLUE}6. Cron Job Verification${NC}"
echo "-------------------------"

if crontab -l 2>/dev/null | grep -q "sunday-night-scheduler.js"; then
    print_success "Cron job is configured"
    print_info "Cron entry:"
    crontab -l | grep "sunday-night-scheduler.js" | sed 's/^/  /'
    
    # Extract and parse the schedule
    CRON_SCHEDULE=$(crontab -l | grep "sunday-night-scheduler.js" | awk '{print $1, $2, $3, $4, $5}')
    print_info "  Schedule: $CRON_SCHEDULE (Every Sunday at 10 PM if set correctly)"
else
    print_error "Cron job not found"
    print_info "  Run: sudo ./setup-cron-production.sh"
    ERRORS=$((ERRORS + 1))
fi

# Check cron service
if systemctl is-active --quiet cron; then
    print_success "Cron service is running"
elif systemctl is-active --quiet crond; then
    print_success "Crond service is running"
else
    print_warning "Cron service status unknown"
    print_info "  Check: sudo systemctl status cron"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# 7. Scheduler dry-run test
echo -e "${BLUE}7. Scheduler Dry-Run Test${NC}"
echo "---------------------------"

print_info "Running scheduler dry-run test (this may take a few minutes)..."

# Set a timeout for the dry run test
timeout_cmd=""
if command -v timeout &> /dev/null; then
    timeout_cmd="timeout 300s"  # 5 minute timeout
elif command -v gtimeout &> /dev/null; then
    timeout_cmd="gtimeout 300s"  # macOS
fi

if $timeout_cmd node sunday-night-scheduler.js --dry-run > /tmp/scheduler-test.log 2>&1; then
    print_success "Scheduler dry-run completed successfully"
    
    # Check the output for key indicators
    if grep -q "completed successfully" /tmp/scheduler-test.log; then
        print_success "  Scheduler execution successful"
    fi
    
    if grep -q "Events processed:" /tmp/scheduler-test.log; then
        EVENTS_PROCESSED=$(grep "Events processed:" /tmp/scheduler-test.log | awk '{print $NF}')
        print_info "  Events processed: $EVENTS_PROCESSED"
    fi
    
    if grep -q "Would create.*occurrences" /tmp/scheduler-test.log; then
        WOULD_CREATE=$(grep "Would create.*occurrences" /tmp/scheduler-test.log | awk '{print $(NF-2)}')
        print_info "  Would create: $WOULD_CREATE occurrences"
    fi
    
else
    print_error "Scheduler dry-run failed or timed out"
    print_info "Check log for details:"
    if [ -f /tmp/scheduler-test.log ]; then
        tail -10 /tmp/scheduler-test.log | sed 's/^/  /'
    fi
    ERRORS=$((ERRORS + 1))
fi

# Clean up temp file
rm -f /tmp/scheduler-test.log

echo ""

# 8. System resources check
echo -e "${BLUE}8. System Resources Check${NC}"
echo "---------------------------"

# Check disk space
DISK_USAGE=$(df -h "$SCHEDULER_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_success "Disk space OK (${DISK_USAGE}% used)"
else
    print_warning "Disk space high (${DISK_USAGE}% used)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check memory
if command -v free &> /dev/null; then
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$MEMORY_USAGE" -lt 80 ]; then
        print_success "Memory usage OK (${MEMORY_USAGE}% used)"
    else
        print_warning "Memory usage high (${MEMORY_USAGE}% used)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo ""

# 9. Final summary
echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}📊 DEPLOYMENT VERIFICATION SUMMARY${NC}"
echo -e "${BLUE}=================================================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! Production deployment is ready.${NC}"
    echo ""
    echo -e "${GREEN}✅ Sunday Night Scheduler is fully operational${NC}"
    echo -e "${GREEN}✅ Next run: Every Sunday at 10 PM${NC}"
    echo -e "${GREEN}✅ Monitoring available: node scheduler-monitor.js${NC}"
    echo -e "${GREEN}✅ Logs location: $LOG_FILE${NC}"
    
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  DEPLOYMENT READY WITH WARNINGS${NC}"
    echo -e "${YELLOW}   Warnings: $WARNINGS${NC}"
    echo ""
    echo -e "${YELLOW}The scheduler will work but please address the warnings above.${NC}"
    
else
    echo -e "${RED}❌ DEPLOYMENT HAS CRITICAL ISSUES${NC}"
    echo -e "${RED}   Errors: $ERRORS${NC}"
    echo -e "${YELLOW}   Warnings: $WARNINGS${NC}"
    echo ""
    echo -e "${RED}Please fix all errors before considering the deployment complete.${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Monitor first scheduled run (next Sunday at 10 PM)"
echo "2. Check logs regularly: tail -f $LOG_FILE"
echo "3. Run health checks: node scheduler-monitor.js"
echo "4. Set up log rotation if not already configured"

echo ""
echo -e "${BLUE}🆘 Emergency Commands:${NC}"
echo "• Manual run: node sunday-night-scheduler.js"
echo "• Health check: node scheduler-monitor.js"
echo "• View logs: tail -20 $LOG_FILE"
echo "• Check cron: crontab -l | grep scheduler"

echo ""
echo -e "${BLUE}=================================================================${NC}"

# Exit with appropriate code
if [ $ERRORS -eq 0 ]; then
    exit 0
else
    exit 1
fi