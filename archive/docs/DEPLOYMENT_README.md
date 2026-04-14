# Trivia Event Management System - Deployment Guide

## 🚀 System Overview

This system provides event management for trivia providers with automated weekly event generation and admin oversight.

### Architecture
- **Main App**: `trivia-nearby/` (React, port 3000) - Public trivia finder
- **Admin Interface**: Integrated at `/admin` route in main app - Provider/admin dashboard  
- **Backend Jobs**: `trivia-backend/jobs/` - Automated event generation
- **Database**: Supabase PostgreSQL with PostGIS

## 📦 Production Deployment

### 1. Environment Setup

**Required Environment Variables:**
```bash
# Supabase Configuration
SUPABASE_URL=https://izaojwusiuvosqrbdwtd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_key

# Production URLs
ADMIN_DOMAIN=admin.trivianearby.com
MAIN_DOMAIN=trivianearby.com
```

### 2. Build Process

**Main App (includes Admin Interface):**
```bash
cd trivia-nearby
pnpm install
pnpm build
# Deploy dist/ folder to trivianearby.com
# Admin interface accessible at /admin
```

**Main App:**
```bash
cd trivia-nearby
pnpm install  
pnpm build
# Deploy dist/ folder to trivianearby.com
```

### 3. Server Setup (Hetzner VPS)

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/trivianearby
server {
    listen 80;
    server_name trivianearby.com;
    root /var/www/trivianearby/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name admin.trivianearby.com;
    root /var/www/admin-trivianearby/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**SSL with Let's Encrypt:**
```bash
sudo certbot --nginx -d trivianearby.com -d admin.trivianearby.com
```

### 4. Automated Event Generation

**Cron Job Setup:**
```bash
# Add to crontab (crontab -e)
# Run every Sunday at 6 AM
0 6 * * 0 cd /var/www/trivia-backend && node jobs/generate-weekly-events.js >> /var/log/trivia-events.log 2>&1
```

**Manual Execution:**
```bash
cd trivia-backend
pnpm generate-events        # Production run
pnpm test-generate-events   # Test run
```

## 🔐 Security Considerations

### 1. Authentication
- **Supabase RLS**: All tables have Row Level Security enabled
- **Admin Users**: Stored in `admin_users` table with god-level access
- **Provider Users**: Linked via `provider_users` table with provider-specific access
- **Session Management**: Handled by Supabase Auth with secure tokens

### 2. Database Security
- **Service Role Key**: Only used for backend jobs, not exposed to frontend
- **Anon Key**: Used for frontend, has limited permissions via RLS
- **API Rate Limiting**: Google Places calls are logged and limited

### 3. Access Control
```sql
-- Admin can see everything
SELECT * FROM events WHERE EXISTS (
  SELECT 1 FROM admin_users WHERE user_id = auth.uid()
);

-- Providers can only see their events  
SELECT * FROM events WHERE provider_id IN (
  SELECT provider_id FROM provider_users WHERE user_id = auth.uid()
);
```

## 📊 Monitoring & Maintenance

### 1. Health Checks

**Database Status:**
```bash
cd trivia-backend
pnpm -e "console.log('DB connection test')" | node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
supabase.from('venues').select('count').then(console.log)
"
```

**Event Generation Status:**
```bash
# Check recent event occurrences
echo "SELECT COUNT(*) FROM event_occurrences WHERE created_at > NOW() - INTERVAL '7 days';" | psql $DATABASE_URL
```

### 2. Log Files

**Important Logs:**
- `/var/log/trivia-events.log` - Sunday job execution
- `/var/log/nginx/access.log` - Web traffic  
- `/var/log/nginx/error.log` - Web errors

**Log Rotation:**
```bash
# /etc/logrotate.d/trivia
/var/log/trivia-events.log {
    weekly
    rotate 52
    compress
    missingok
    notifempty
}
```

### 3. Backup Strategy

**Database Backup:**
```bash
# Weekly automated backup
0 2 * * 0 pg_dump $DATABASE_URL | gzip > /backups/trivia-$(date +\%Y\%m\%d).sql.gz
```

**Config Backup:**
```bash
# Backup environment and nginx configs
tar -czf /backups/config-$(date +\%Y\%m\%d).tar.gz /etc/nginx/sites-available /var/www/*/.env
```

## 🔧 Troubleshooting

### Common Issues

1. **Admin Interface Won't Load**
   - Check nginx config and SSL certificates
   - Verify dist/ folder has correct permissions
   - Check browser console for CORS/auth errors

2. **Events Not Generating**
   - Check cron job is running: `sudo systemctl status cron`
   - Review log file: `tail -f /var/log/trivia-events.log`  
   - Test manually: `cd trivia-backend && pnpm test-generate-events`

3. **Authentication Issues**
   - Verify Supabase keys in environment
   - Check RLS policies are enabled
   - Confirm user exists in `admin_users` or `provider_users` tables

4. **Database Connection Errors**
   - Test connection: `psql $DATABASE_URL`
   - Check Supabase project status
   - Verify environment variables

### Performance Monitoring

**Key Metrics to Watch:**
- Event occurrence generation time (should be < 5 minutes)
- Database query performance on large tables
- Google Places API usage (daily limits)
- Admin interface load times

## 📞 Emergency Procedures

**If Sunday Job Fails:**
1. Check `/var/log/trivia-events.log` for errors
2. Run manual generation: `pnpm test-generate-events`
3. Verify database connectivity and permissions
4. Check for missing event templates in `events` table

**If Admin Interface Goes Down:**
1. Check nginx status: `sudo systemctl status nginx`
2. Verify SSL certificates: `sudo certbot certificates`  
3. Check disk space: `df -h`
4. Review nginx error logs: `tail -f /var/log/nginx/error.log`

**Database Recovery:**
1. Check Supabase project status at supabase.com
2. Restore from backup if needed: `psql $DATABASE_URL < backup.sql`
3. Re-run event generation to catch up: `pnpm generate-events`

---

*Last Updated: 2025-01-24*
*System Status: Production Ready* ✅