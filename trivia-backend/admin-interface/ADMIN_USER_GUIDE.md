# Admin Interface User Guide

## 🚀 Getting Started

### Accessing the Admin Interface
- **Development**: http://localhost:3001/
- **Production**: https://admin.trivianearby.com/

### Login Credentials
Use your registered email and password. Contact the system administrator if you need access.

## 👤 User Roles

### God-Level Admin
- Can see **all providers' events and data**
- Can manage any event across all providers
- Has access to system-wide statistics
- Can approve new venues and providers

### Provider Admin
- Can only see **their own provider's events**
- Can manage events for their venues only
- Can add new venues (subject to approval)
- Can create themed/special events

## 📊 Dashboard Overview

### Stats Cards
- **Total Events This Week**: Your upcoming events count
- **Scheduled**: Auto-generated events awaiting confirmation
- **Confirmed**: Events you've approved for this week
- **Cancelled**: Events you've marked as skipped

### This Week's Events
Quick view of your immediate upcoming events with:
- Event name and type
- Venue location
- Date and time
- Current status
- Quick confirm/cancel buttons

## 📅 Events Management

### Event Status Explained
- **Scheduled**: Auto-generated weekly events (show to public)
- **Confirmed**: You've verified the event is happening (show to public)
- **Cancelled**: You've marked as skipped this week (hidden from public)

### Managing Events
1. **Confirm Event**: Click "Confirm" to verify it's happening as scheduled
2. **Cancel Event**: Click "Cancel" to skip this week (holiday, etc.)
3. **Reschedule**: If cancelled, you can click "Reschedule" to reactive

### Adding Themed Events
1. Click "Add Themed Event" button
2. Choose venue using smart search
3. Set date, time, and theme details
4. Themed events are automatically confirmed

### Time Period View
Use the dropdown to view:
- Next 2 weeks
- Next 4 weeks (default)
- Next 8 weeks

## 🏢 Venue Management

### Viewing Your Venues
- See all venues where your provider has events
- View Google ratings, contact info, and verification status
- See event count per venue (admin view only)

### Adding New Venues
1. Click "Add Venue" button
2. Use smart search to check for existing venues first
3. If venue exists, select it to reuse (prevents duplicates)
4. If new venue, click "Add as new venue"
5. New venues go through Google Places validation
6. Admin approval required before venue goes live

### Smart Venue Search
- Searches existing database first
- Shows potential matches to prevent duplicates
- One venue can host multiple providers' events
- Example: "Sonny's BBQ" can have both Challenge Entertainment and NerdyTalk events

## 🔍 Navigation

### Main Menu
- **Dashboard**: Weekly overview and quick actions
- **Events**: Detailed event management
- **Venues**: Venue information and management
- **Providers**: (Admin only) System-wide provider management
- **Admin**: (Admin only) System administration

### User Indicator
Top right shows:
- Your email address
- Your role (Admin/Provider badge)
- Logout option

## ⚠️ Important Notes

### Weekly Event Confirmation
- New events are auto-generated every Sunday
- You should review and confirm your events weekly
- **Both scheduled and confirmed events show to the public**
- Only cancelled events are hidden from users

### Venue Relationships
- Multiple providers can use the same venue
- Each provider manages their own events at shared venues
- You cannot see other providers' events at your venues

### Data Updates
- Changes are saved immediately
- Status updates reflect instantly on the public site
- No "save" button needed - everything auto-saves

## 🆘 Getting Help

### Common Issues

**"I can't see my events"**
- Make sure you're logged in with the correct provider account
- Check that your events are associated with your provider
- Contact admin if you should have access but don't

**"Venue not found in search"**
- Try different search terms (name variations)
- Check for typos in venue name
- If truly new, you can add it through the interface

**"Can't confirm events"**
- Ensure the events belong to your provider
- Check that you have admin permissions for your provider
- Try refreshing the page

### Contact Support
If you encounter issues:
1. Note what you were trying to do
2. Take a screenshot if helpful
3. Contact the system administrator
4. Include your email and provider name

---

*This interface helps you manage your trivia events efficiently while maintaining data quality and preventing conflicts between providers.*