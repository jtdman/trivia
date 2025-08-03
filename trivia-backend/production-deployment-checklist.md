# Sunday Night Scheduler - Production Deployment Checklist

## 🚀 **CRITICAL LAUNCH INFRASTRUCTURE** 🚀

**This scheduler is ESSENTIAL for your 3-week launch. It must run autonomously without manual intervention during the media blitz.**

---

## 📋 Pre-Deployment Checklist

### ✅ Local Testing Complete
- [x] Scheduler scripts tested locally
- [x] Dry-run mode works correctly  
- [x] Monitoring system functional
- [x] Deployment package created

### 🛠️ Production Server Requirements

#### Server Environment
- [ ] Node.js 18+ installed on production server
- [ ] pnpm or npm package manager available
- [ ] Cron service running (`sudo systemctl status cron`)
- [ ] Sufficient disk space for logs and backups

#### Directory Structure
- [ ] `/var/www/trivia-backend/` directory created
- [ ] `/var/log/` writable for logging
- [ ] `/backups/` directory for system backups
- [ ] Proper file permissions set

#### Environment Variables
- [ ] `.env` file created with production credentials:
  ```bash
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
  ```
- [ ] Database connectivity tested from production server

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Upload Deployment Package
```bash
# From local machine
scp deploy-20250730-234233.tar.gz user@your-hetzner-server:/tmp/
```

### Step 2: Install on Production Server
```bash
# SSH into production server
ssh user@your-hetzner-server

# Extract and install
cd /tmp
tar -xzf deploy-20250730-234233.tar.gz
cd deploy-*
sudo ./install-on-server.sh
```

### Step 3: Configure Cron Job
```bash
cd /var/www/trivia-backend
sudo ./setup-cron-production.sh
```

### Step 4: Verify Installation
```bash
# Test scheduler
node sunday-night-scheduler.js --dry-run

# Check cron job
crontab -l | grep scheduler

# Test monitoring
node scheduler-monitor.js
```

---

## 🧪 TESTING REQUIREMENTS

### ✅ Critical Tests
- [ ] **Dry-run test passes**: `node sunday-night-scheduler.js --dry-run`
- [ ] **Database connection works**: Monitor shows "Database connected"
- [ ] **Cron job configured**: `crontab -l` shows Sunday scheduler entry
- [ ] **Log file writable**: `/var/log/trivia-scheduler.log` created
- [ ] **Monitoring system works**: `node scheduler-monitor.js` completes

### ✅ Functional Tests
- [ ] **Event generation works**: Creates new event occurrences
- [ ] **Provider notifications work**: Admin gets summary emails
- [ ] **Cleanup functions**: Removes old occurrences
- [ ] **Error handling**: Graceful failure and logging
- [ ] **Performance acceptable**: Completes in under 10 minutes

---

## 📊 MONITORING SETUP

### Essential Commands
```bash
# Check scheduler status
/var/www/trivia-backend/monitor-scheduler.sh

# View recent logs
tail -20 /var/log/trivia-scheduler.log

# Monitor in real-time
tail -f /var/log/trivia-scheduler.log

# Test manual run
cd /var/www/trivia-backend && node sunday-night-scheduler.js --dry-run
```

### Automated Monitoring (Recommended)
- [ ] Set up weekly monitoring email
- [ ] Configure log rotation for scheduler logs
- [ ] Set up disk space monitoring
- [ ] Create backup of scheduler configuration

---

## ⚠️ LAUNCH CRITICAL ALERTS

### Red Flags - Fix Immediately
- 🚨 **Cron job not configured** - Scheduler won't run automatically
- 🚨 **Database connection failed** - No events will be generated
- 🚨 **Permission errors** - Scheduler can't write logs or access files
- 🚨 **Node.js dependencies missing** - Runtime errors

### Yellow Flags - Monitor Closely
- ⚠️ **Slow database response** (>5s) - Performance issues
- ⚠️ **High memory usage** - Potential server problems
- ⚠️ **Failed scheduler runs** - Check logs for errors
- ⚠️ **No upcoming events** - May indicate data issues

---

## 📅 SCHEDULER DETAILS

### When It Runs
- **Schedule**: Every Sunday at 10 PM (22:00) server time
- **Duration**: Usually 2-5 minutes with current data volume
- **Next Run**: Displays after cron setup

### What It Does
1. **Generates Events**: Creates occurrences for next 4 weeks
2. **Sends Notifications**: Admin summary email about events needing confirmation
3. **Cleans Up**: Removes old unconfirmed events (>2 weeks old)
4. **Logs Results**: Audit trail in database and log files

### Generated Data
- Creates ~200-400 new event occurrences per week
- Processes all active recurring events from providers
- Only creates events that don't already exist

---

## 🆘 EMERGENCY PROCEDURES

### If Scheduler Fails on Sunday Night
1. **Check logs immediately**: `tail -50 /var/log/trivia-scheduler.log`
2. **Run manual generation**: `cd /var/www/trivia-backend && node sunday-night-scheduler.js`
3. **Verify database connectivity**: `node scheduler-monitor.js`
4. **Check disk space**: `df -h`
5. **Restart cron if needed**: `sudo systemctl restart cron`

### If Events Missing on Launch Day
1. **Run immediate generation**: `node sunday-night-scheduler.js`
2. **Check event occurrence count**: Use monitoring script
3. **Verify provider data**: Check events table for active providers
4. **Manual database check**: Query event_occurrences table directly

### Contact Information
- **Admin Email**: jtdman+tfadmin@gmail.com
- **Database**: Supabase project dashboard
- **Server**: Hetzner VPS management panel

---

## ✅ SIGN-OFF CHECKLIST

### Development Team
- [ ] All scripts tested and verified working
- [ ] Deployment package created and documented
- [ ] Monitoring system operational
- [ ] Error handling and logging complete

### System Administrator  
- [ ] Production server configured and ready
- [ ] Cron job installed and verified
- [ ] Log rotation and backups configured
- [ ] Monitoring alerts set up

### Final Verification
- [ ] **DRY RUN SUCCESSFUL**: Test run completed without errors
- [ ] **CRON CONFIGURED**: Sunday 10 PM schedule active
- [ ] **MONITORING ACTIVE**: Health checks working
- [ ] **LOGS WRITABLE**: `/var/log/trivia-scheduler.log` accessible
- [ ] **DATABASE CONNECTED**: Supabase connectivity verified

---

## 🎯 GO/NO-GO DECISION

**Deployment Date**: _______________

**Next Scheduled Run**: _______________

**Deployed By**: _______________

**Status**: _______________

---

**🚀 LAUNCH READINESS: This scheduler is CRITICAL for autonomous operation during your media launch. Ensure all checklist items are complete before going live.**

---

*Generated: July 30, 2025*
*Deployment Package: deploy-20250730-234233.tar.gz*