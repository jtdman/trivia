# Sunday Night Event Scheduler

This automated system replaces manual data scraping by generating weekly event schedules based on recurring event templates that providers manage themselves.

## How It Works

1. **Providers create recurring events** via the admin interface
2. **Every Sunday at 10 PM**, the scheduler automatically:
   - Generates event occurrences for the next 4 weeks
   - Sends notifications to providers about events needing confirmation
   - Cleans up old, unconfirmed events
3. **Providers confirm/cancel events** throughout the week via the admin interface
4. **Users see confirmed events** on the public app

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

You'll need:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key  
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (admin privileges)

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Cron Job

Run the setup script to install the Sunday night cron job:

```bash
./setup-cron.sh
```

This will run the scheduler every Sunday at 10 PM.

## Manual Usage

### Test the Scheduler

```bash
npm run scheduler:test
```

### Run the Scheduler Once

```bash
npm run scheduler
```

### View Logs

```bash
tail -f scheduler.log
```

## What the Scheduler Does

### 1. Generate Event Occurrences

- Looks at all active recurring events with `frequency = 'weekly'`
- Creates event occurrences for the next 4 weeks based on `day_of_week`
- Skips dates outside the event's `start_date` to `end_date` range
- Won't create duplicates (checks if occurrence already exists)

### 2. Send Provider Notifications

- Finds all events needing confirmation in the next 7 days
- Groups by provider and sends notification
- Notifications appear in the admin dashboard

### 3. Cleanup Old Data

- Removes unconfirmed events older than 2 weeks
- Keeps confirmed events for historical data

## Database Schema

The scheduler works with these tables:

- `events` - Recurring event templates (what providers create)
- `event_occurrences` - Specific date instances (what the scheduler generates)
- `notifications` - Provider notifications
- `system_logs` - Audit trail

## Provider Workflow

1. **Create recurring events** in admin dashboard
2. **Receive weekly notifications** about upcoming events
3. **Confirm or cancel** specific occurrences  
4. **Add one-off events** as needed
5. **Users see confirmed events** on the public app

## Monitoring

Check these regularly:

- `scheduler.log` - Execution logs
- `system_logs` table - Database audit trail
- Provider notifications - Make sure providers are getting notified
- Event confirmation rates - Are providers actively managing their events?

## Troubleshooting

### Scheduler Not Running

```bash
# Check if cron job exists
crontab -l | grep scheduler

# Check recent logs
tail -20 scheduler.log

# Test manually
npm run scheduler:test
```

### No Events Being Generated

- Check that events have `is_active = true`
- Check that events have `frequency = 'weekly'`  
- Verify `day_of_week` values are correct
- Check date ranges (`start_date`, `end_date`)

### Providers Not Getting Notifications

- Check `notifications` table for recent entries
- Verify provider `contact_info` has valid emails
- Check notification settings in admin dashboard

## Migration from Scraping

1. **Export existing scraped data** to recurring event templates
2. **Set up the scheduler** using this documentation
3. **Train providers** on the new self-service system
4. **Monitor for a few weeks** to ensure smooth transition
5. **Deprecate scraping scripts** once stable

This system puts control back in the hands of trivia providers while maintaining accurate, up-to-date event data for users.