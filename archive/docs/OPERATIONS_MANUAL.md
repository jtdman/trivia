# Trivia Event Management - Operations Manual

## 🎯 Daily Operations

### Morning Routine (Monday-Saturday)
1. **Check Admin Dashboard** - http://localhost:5173/admin (dev) or https://trivianearby.com/admin (prod)
2. **Review Event Status** - Look for events needing confirmation
3. **Monitor Provider Activity** - Check who's actively managing their events

### Sunday Operations (Critical)
1. **Automated Event Generation** runs at 6 AM via cron
2. **Check Generation Log**: `tail -f /var/log/trivia-events.log`
3. **Verify New Events Created**: Admin dashboard should show 4 weeks of events
4. **Manual Fallback** (if needed): `cd trivia-backend && pnpm generate-events`

## 👨‍💼 User Management

### Adding New Admin Users
```sql
-- 1. User must first sign up through admin interface
-- 2. Add them to admin_users table
INSERT INTO admin_users (user_id, email, role) 
VALUES ('user-uuid-from-auth-users', 'email@example.com', 'admin');
```

### Adding New Trivia Providers
```sql
-- 1. Create provider record
INSERT INTO trivia_providers (name, website, contact_info) 
VALUES ('Provider Name', 'https://website.com', '{"email": "contact@provider.com"}');

-- 2. Link user to provider (after they sign up)
INSERT INTO provider_users (user_id, provider_id, role) 
VALUES ('user-uuid', 'provider-uuid', 'admin');
```

## 📊 Data Management

### Event Occurrence Lifecycle
1. **Template Events** - Stored in `events` table (recurring patterns)
2. **Generated Occurrences** - Created in `event_occurrences` (specific dates)
3. **Provider Review** - Status changes: `scheduled` → `confirmed` or `cancelled`
4. **Public Display** - Only `scheduled` and `confirmed` show to users

### Event Status Flow
```
Auto-Generated → scheduled
Provider Review → confirmed (shows to public)
                → cancelled (hidden from public)
                → scheduled (can be changed back)
```

### Adding Themed/One-Time Events
Providers can add special events through admin interface:
- Set `is_themed = true`
- Add `theme_name` and `theme_description`
- Status automatically set to `confirmed`

## 🔧 Maintenance Tasks

### Weekly Tasks
- [ ] Review event generation success rate
- [ ] Check for providers who haven't confirmed events
- [ ] Monitor Google Places API usage
- [ ] Review admin interface performance

### Monthly Tasks
- [ ] Database cleanup (archive old occurrences > 6 months)
- [ ] Update provider contact information
- [ ] Review and update venue information
- [ ] Check SSL certificate renewal status

### Quarterly Tasks
- [ ] Full database backup
- [ ] Review RLS policies and security
- [ ] Update dependencies and security patches
- [ ] Provider relationship review

## 🚨 Alert Scenarios

### High Priority Alerts
1. **Sunday Job Failure** - Events not generated for upcoming week
2. **Database Connection Lost** - Admin interface can't load data
3. **Authentication System Down** - Users can't log in
4. **SSL Certificate Expiring** - HTTPS access will fail

### Medium Priority Alerts
1. **Low Provider Engagement** - Many events staying `scheduled`
2. **Google Places API Limits** - Venue validation failing
3. **High Error Rates** - Users experiencing issues
4. **Slow Query Performance** - Database optimization needed

## 📈 Key Performance Indicators

### System Health
- **Event Generation Success Rate**: Should be 100% weekly
- **Provider Login Frequency**: Track engagement levels
- **Event Confirmation Rate**: % of events confirmed vs scheduled
- **Admin Interface Uptime**: Target 99.9%

### Business Metrics
- **Active Providers**: Number regularly using the system
- **Total Events**: Growth in event occurrences over time
- **Venue Coverage**: Geographic spread and density
- **User Engagement**: Admin interface usage patterns

## 🛠 Common Fixes

### "Events Not Showing" Issue
1. Check if events are `scheduled` or `confirmed` (both should show)
2. Verify RLS policies allow user to see events
3. Check provider_users table for correct associations
4. Review event_occurrences dates (might be too old/new)

### "Can't Confirm Events" Issue
1. Verify user has correct provider association
2. Check if events belong to user's provider
3. Review database permissions and RLS policies
4. Test with god-level admin account to isolate issue

### "Slow Admin Interface" Issue
1. Check database query performance
2. Review network connectivity to Supabase
3. Optimize queries with indexes
4. Consider pagination for large result sets

## 📞 Emergency Contacts

### System Issues
- **Database**: Supabase Support (if hosting issues)
- **Domain/SSL**: DNS provider support
- **Server**: Hetzner support (if using their VPS)

### Business Issues
- **Provider Relations**: Handle through admin interface
- **Data Issues**: Direct database fixes via SQL
- **User Complaints**: Review through admin logs and user data

---

## 🎯 Quick Reference Commands

```bash
# Start admin interface locally
cd trivia-nearby && pnpm dev
# Admin interface is at http://localhost:5173/admin

# Generate events manually
cd trivia-backend && pnpm generate-events

# Check event counts
echo "SELECT COUNT(*) FROM event_occurrences WHERE occurrence_date >= CURRENT_DATE;" | psql $DATABASE_URL

# Check provider engagement
echo "SELECT COUNT(*) FROM event_occurrences WHERE status = 'confirmed' AND occurrence_date >= CURRENT_DATE;" | psql $DATABASE_URL

# View recent admin logins
echo "SELECT email, last_login FROM admin_users ORDER BY last_login DESC;" | psql $DATABASE_URL
```

*Keep this manual updated as the system evolves!*