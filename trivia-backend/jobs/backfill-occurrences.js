#!/usr/bin/env node
/**
 * Backfill event_occurrences from today forward for N weeks.
 *
 * The sunday-night-scheduler.js starts from *next* Monday, so it cannot
 * fill the current week. This script fills that gap. Safe to re-run —
 * skips any occurrence that already exists for the same (event_id, date).
 *
 * Usage:
 *   node jobs/backfill-occurrences.js [--dry-run] [--weeks=4]
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const weeksArg = args.find((a) => a.startsWith('--weeks='))
const weeks = weeksArg ? parseInt(weeksArg.split('=')[1], 10) : 4
const days = weeks * 7

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dateKey(d) {
  return d.toISOString().split('T')[0]
}

async function main() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(today.getDate() + days - 1)

  console.log(`Backfilling occurrences ${dateKey(today)} -> ${dateKey(end)} (${days} days)${dryRun ? ' [DRY RUN]' : ''}`)

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, day_of_week, frequency, start_date, end_date')
    .eq('is_active', true)
    .eq('frequency', 'weekly')

  if (eventsError) throw eventsError
  console.log(`Loaded ${events.length} active weekly events`)

  // Paginate — Supabase's default cap is 1000 rows per response. We need
  // ALL existing (event_id, date) pairs to dedupe correctly; a truncated
  // list silently causes duplicate inserts.
  const existingKeys = new Set()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('event_occurrences')
      .select('event_id, occurrence_date')
      .gte('occurrence_date', dateKey(today))
      .lte('occurrence_date', dateKey(end))
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const o of data) existingKeys.add(`${o.event_id}|${o.occurrence_date}`)
    if (data.length < PAGE) break
  }
  console.log(`Found ${existingKeys.size} existing (event, date) pairs in range`)

  const toInsert = []
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dayName = dayNames[d.getDay()]
    const dStr = dateKey(d)

    for (const event of events) {
      if (event.day_of_week !== dayName) continue
      if (event.start_date && event.start_date > dStr) continue
      if (event.end_date && event.end_date < dStr) continue
      if (existingKeys.has(`${event.id}|${dStr}`)) continue

      toInsert.push({
        event_id: event.id,
        occurrence_date: dStr,
        status: 'scheduled',
        notes: null,
      })
    }
  }

  console.log(`Will create ${toInsert.length} new occurrences`)

  if (toInsert.length === 0 || dryRun) {
    if (dryRun) {
      const byDate = {}
      for (const o of toInsert) byDate[o.occurrence_date] = (byDate[o.occurrence_date] || 0) + 1
      console.log('Preview (date -> count):')
      for (const d of Object.keys(byDate).sort()) console.log(`  ${d}  ${byDate[d]}`)
    }
    return
  }

  const batchSize = 500
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize)
    const { error: insertError } = await supabase.from('event_occurrences').insert(batch)
    if (insertError) throw insertError
    console.log(`Inserted ${Math.min(i + batchSize, toInsert.length)}/${toInsert.length}`)
  }
  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
