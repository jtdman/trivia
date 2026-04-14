# Email Policy

## Current Policy: ADMIN ONLY

**NO emails are sent to trivia providers or venue owners.**

Only admin summary emails are sent to: `jtdman+tfadmin@gmail.com`

## How It Works

1. **Sunday Job** (`pnpm generate-events`) creates event occurrences for next 4 weeks
2. **Admin Summary** is generated (currently just logged to console)
3. **Providers manage events** through the admin interface at `http://localhost:3001/`
4. **No automated emails** go to providers - they must check the admin interface

## If You Want to Enable Provider Emails Later

1. Edit `jobs/generate-weekly-events.js`
2. Modify the `sendProviderNotifications()` function
3. Add SMTP configuration
4. Change the email sending logic

## Current Admin Dashboard Workflow

1. Providers log into `http://localhost:3001/`
2. They see their weekly events
3. They can confirm/cancel/reschedule events
4. You (admin) can see all provider activity in god-mode

This prevents spam and gives you full control over communications.