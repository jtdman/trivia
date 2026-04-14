/**
 * City seed adapter.
 *
 * Takes a JSON file of trivia venues + weekly events and inserts them
 * into Supabase. Uses Google Places (via PlacesValidator) to enrich
 * newly-created venues with lat/lng, formatted address, phone, website,
 * and thumbnail. Backfills 4 weeks of event_occurrences so the new
 * events immediately show up in the app.
 *
 * Idempotent — safe to re-run. Venues are deduped by name+address,
 * events by (venue_id, event_type, day_of_week, start_time, provider_id).
 *
 * Usage:
 *   tsx ingest/seed-city.ts ingest/seeds/philadelphia.json
 *   tsx ingest/seed-city.ts ingest/seeds/philadelphia.json --dry-run
 *   tsx ingest/seed-city.ts ingest/seeds/philadelphia.json --skip-places
 *
 * Expected seed shape:
 *   [{ venue_name, address, provider, day_of_week, start_time,
 *      event_type, prize?, source? }, ...]
 *
 * provider === "Venue Staff" => events.provider_id left null (self-hosted).
 */

import fs from 'fs/promises'
import { supabase } from '../lib/supabase.js'
import { PlacesValidator } from '../scripts/validate-places.js'

interface SeedEntry {
  venue_name: string
  address: string
  provider: string
  day_of_week: string
  start_time: string
  event_type: string
  prize?: string | null
  source?: string
}

const SELF_HOSTED = new Set(['Venue Staff', 'venue_staff', 'self-hosted', 'Self-Hosted'])

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function findOrCreateProvider(name: string, dryRun: boolean): Promise<string | null> {
  if (SELF_HOSTED.has(name)) return null

  const { data: existing } = await supabase
    .from('trivia_providers')
    .select('id, name')
    .ilike('name', name)
    .limit(1)

  if (existing && existing.length > 0) return existing[0].id

  if (dryRun) return null

  const { data, error } = await supabase
    .from('trivia_providers')
    .insert({ name, is_active: true, status: 'approved' })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create provider "${name}": ${error.message}`)
  console.log(`  + provider: ${name}`)
  return data.id
}

async function findExistingVenue(name: string, address: string) {
  // Try exact-ish match on name + first 10 chars of address
  const addressPrefix = address.split(',')[0].trim()
  const { data } = await supabase
    .from('venues')
    .select('id, name_original, address_original, verification_status')
    .ilike('name_original', name)
    .ilike('address_original', `${addressPrefix}%`)
    .limit(1)

  if (data && data.length > 0) return data[0]
  return null
}

async function insertPendingVenue(name: string, address: string, dryRun: boolean) {
  if (dryRun) return { id: 'dry-run-venue-id', name_original: name, address_original: address }

  const { data, error } = await supabase
    .from('venues')
    .insert({
      name_original: name,
      address_original: address,
      verification_status: 'pending',
    })
    .select('id, name_original, address_original')
    .single()

  if (error) throw new Error(`Failed to insert venue "${name}": ${error.message}`)
  return data
}

async function findOrCreateEvent(
  venueId: string,
  providerId: string | null,
  eventType: string,
  dayOfWeek: string,
  startTime: string,
  prize: string | null,
  dryRun: boolean,
): Promise<{ id: string; created: boolean }> {
  const normalizedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime

  let query = supabase
    .from('events')
    .select('id')
    .eq('venue_id', venueId)
    .eq('event_type', eventType)
    .eq('day_of_week', dayOfWeek)
    .eq('start_time', normalizedStartTime)
    .eq('is_active', true)

  query = providerId ? query.eq('provider_id', providerId) : query.is('provider_id', null)

  const { data: existing } = await query.limit(1)
  if (existing && existing.length > 0) return { id: existing[0].id, created: false }

  if (dryRun) return { id: 'dry-run-event-id', created: true }

  const { data, error } = await supabase
    .from('events')
    .insert({
      venue_id: venueId,
      provider_id: providerId,
      event_type: eventType,
      day_of_week: dayOfWeek,
      start_time: normalizedStartTime,
      frequency: 'weekly',
      prize_description: prize,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to insert event at venue ${venueId}: ${error.message}`)
  return { id: data.id, created: true }
}

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function backfillOccurrencesForEvents(eventIds: string[], dayOfWeekByEventId: Map<string, string>) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const WEEKS = 4

  // Existing occurrences for these events in the window
  const end = new Date(today)
  end.setDate(today.getDate() + WEEKS * 7 - 1)
  const existing = new Set<string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('event_occurrences')
      .select('event_id, occurrence_date')
      .in('event_id', eventIds)
      .gte('occurrence_date', toLocalDateStr(today))
      .lte('occurrence_date', toLocalDateStr(end))
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const o of data) existing.add(`${o.event_id}|${o.occurrence_date}`)
    if (data.length < PAGE) break
  }

  const toInsert: any[] = []
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dayName = dayNames[d.getDay()]
    const dStr = toLocalDateStr(d)

    for (const eventId of eventIds) {
      if (dayOfWeekByEventId.get(eventId) !== dayName) continue
      if (existing.has(`${eventId}|${dStr}`)) continue
      toInsert.push({ event_id: eventId, occurrence_date: dStr, status: 'scheduled', notes: null })
    }
  }

  if (toInsert.length === 0) return 0

  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supabase.from('event_occurrences').insert(toInsert.slice(i, i + 500))
    if (error) throw error
  }
  return toInsert.length
}

async function main() {
  const args = process.argv.slice(2)
  const filePath = args.find((a) => !a.startsWith('--'))
  if (!filePath) {
    console.error('Usage: tsx ingest/seed-city.ts <seed-json> [--dry-run] [--skip-places]')
    process.exit(1)
  }
  const dryRun = args.includes('--dry-run')
  const skipPlaces = args.includes('--skip-places')

  const raw = await fs.readFile(filePath, 'utf-8')
  const entries: SeedEntry[] = JSON.parse(raw)
  console.log(`Loaded ${entries.length} entries from ${filePath}${dryRun ? ' [DRY RUN]' : ''}`)

  const validator = new PlacesValidator()

  let venuesCreated = 0
  let venuesReused = 0
  let venuesEnriched = 0
  let venuesEnrichFailed = 0
  let eventsCreated = 0
  let eventsReused = 0
  const newEventIds: string[] = []
  const dayByEventId = new Map<string, string>()

  for (const [i, entry] of entries.entries()) {
    console.log(`\n[${i + 1}/${entries.length}] ${entry.venue_name}`)

    const providerId = await findOrCreateProvider(entry.provider, dryRun)

    const existingVenue = await findExistingVenue(entry.venue_name, entry.address)
    let venue = existingVenue
    if (existingVenue) {
      venuesReused++
      console.log(`  ~ venue exists (${existingVenue.verification_status})`)
    } else {
      venue = await insertPendingVenue(entry.venue_name, entry.address, dryRun)
      venuesCreated++
      console.log(`  + venue inserted (pending)`)

      if (!dryRun && !skipPlaces) {
        // Enrich inline — get google_place_id, lat/lng, thumbnail, etc.
        const ok = await validator.validateVenue(
          { id: venue.id, name_original: entry.venue_name, address_original: entry.address, verification_status: 'pending' },
          false,
        )
        if (ok) venuesEnriched++
        else venuesEnrichFailed++
      }
    }

    const { id: eventId, created } = await findOrCreateEvent(
      venue!.id,
      providerId,
      entry.event_type,
      entry.day_of_week,
      entry.start_time,
      entry.prize ?? null,
      dryRun,
    )

    if (created) {
      eventsCreated++
      if (!dryRun) {
        newEventIds.push(eventId)
        dayByEventId.set(eventId, entry.day_of_week)
      }
      console.log(`  + event: ${entry.event_type} ${entry.day_of_week} ${entry.start_time}`)
    } else {
      eventsReused++
      console.log(`  ~ event already existed`)
    }
  }

  let occurrencesCreated = 0
  if (newEventIds.length > 0 && !dryRun) {
    console.log(`\nBackfilling occurrences for ${newEventIds.length} new events...`)
    occurrencesCreated = await backfillOccurrencesForEvents(newEventIds, dayByEventId)
  }

  console.log('\n-----')
  console.log(`Venues:      ${venuesCreated} created, ${venuesReused} reused`)
  console.log(`Enrichment:  ${venuesEnriched} enriched, ${venuesEnrichFailed} failed, ${skipPlaces ? '(skipped)' : ''}`)
  console.log(`Events:      ${eventsCreated} created, ${eventsReused} reused`)
  console.log(`Occurrences: ${occurrencesCreated} created`)
  if (!skipPlaces && (venuesEnrichFailed > 0 || venuesCreated > venuesEnriched)) {
    console.log(`\nRun 'pnpm validate-places --pending --failed' later to retry any unenriched venues.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
