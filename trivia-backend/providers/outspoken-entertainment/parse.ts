/**
 * OutSpoken Entertainment parser.
 *
 * Reads a copy-paste of their "Where to Play" page at
 * https://www.outspokenentertainment.com/wheretoplay and emits a seed
 * JSON in the shape ingest/seed-city.ts consumes.
 *
 * Paste format (one block per venue, "Marker" is the guitar-pick icon
 * that separates entries):
 *
 *   Venue Name - Suburb, Trivia 7:00 Monday, Music Bingo 6:30 (Tue)
 *   123 Some St, City, GA 12345
 *    (555) 555-1234
 *   Marker
 *   ...
 *
 * Events with monthly cadence markers (e.g. "1st Wed", "2nd/4th Fri")
 * are skipped — our seed schema is weekly only.
 *
 * Usage:
 *   pnpm tsx providers/outspoken-entertainment/parse.ts
 */

import fs from 'fs/promises'
import path from 'path'

const INPUT = path.resolve(
  new URL('./raw.txt', import.meta.url).pathname,
)
const OUTPUT = path.resolve(
  new URL('../../ingest/seeds/outspoken-entertainment.json', import.meta.url).pathname,
)
const SOURCE_URL = 'https://www.outspokenentertainment.com/wheretoplay'
const PROVIDER = 'OutSpoken Entertainment'

interface SeedEntry {
  venue_name: string
  address: string
  provider: string
  day_of_week: string
  start_time: string
  event_type: string
  prize: string | null
  source: string
}

const DAYS: Record<string, string> = {
  sun: 'Sunday', sunday: 'Sunday', sundays: 'Sunday',
  mon: 'Monday', monday: 'Monday', mondays: 'Monday',
  tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday', tuesdays: 'Tuesday',
  wed: 'Wednesday', wednesday: 'Wednesday', wednesdays: 'Wednesday',
  thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday', thursdays: 'Thursday',
  fri: 'Friday', friday: 'Friday', fridays: 'Friday',
  sat: 'Saturday', saturday: 'Saturday', saturdays: 'Saturday',
}

function normalizeDay(raw: string): string | null {
  const key = raw.trim().toLowerCase()
  return DAYS[key] ?? null
}

function to24h(hStr: string, mStr: string): string {
  let hour = parseInt(hStr, 10)
  const minute = parseInt(mStr, 10)
  // Trivia nights are evenings. OutSpoken times never show am/pm; we
  // assume PM for 1-11, and 12 stays 12. 0/24 not expected.
  if (hour >= 1 && hour <= 11) hour += 12
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function hasMonthlyCadence(s: string): boolean {
  return /\b\d+(?:st|nd|rd|th)\b/i.test(s) || /\b(1st|2nd|3rd|4th|5th)\b/i.test(s)
}

interface ParsedEvent {
  event_type: string
  start_time: string
  day_of_week: string
}

/**
 * Parse an event specification segment like:
 *   "Trivia 7:00 Monday"
 *   "Music Bingo 9:00 (Fri)"
 *   "'Geek' Trivia 7:00 Thu"
 *   "Trivia - 7:00 Monday"
 *
 * Returns null if the segment looks like a monthly cadence we don't
 * support or we can't extract all three fields.
 */
function parseEventSegment(segRaw: string): ParsedEvent | null {
  const seg = segRaw.trim()
  if (!seg) return null
  if (hasMonthlyCadence(seg)) return null

  // Find the time token (H:MM, assume PM).
  const timeMatch = seg.match(/(\d{1,2}):(\d{2})/)
  if (!timeMatch) return null
  const start_time = to24h(timeMatch[1], timeMatch[2])

  // Find the day token — last alpha word in the segment, possibly
  // wrapped in parens.
  const dayMatches = seg.match(/([A-Za-z]+)/g) || []
  let day: string | null = null
  for (let i = dayMatches.length - 1; i >= 0; i--) {
    const maybe = normalizeDay(dayMatches[i])
    if (maybe) {
      day = maybe
      break
    }
  }
  if (!day) return null

  // Event type is everything before the time, stripped of separators
  // and day references. Keep it simple: take the substring before the
  // time match, trim punctuation.
  let typeRaw = seg.slice(0, timeMatch.index!).trim()
  typeRaw = typeRaw.replace(/[,\-–—]\s*$/, '').trim()
  // Strip all ASCII and typographic quotes from the type name.
  typeRaw = typeRaw.replace(/['"‘’“”]/g, '').trim()
  if (!typeRaw) return null

  // Filter to trivia-adjacent events. The OutSpoken list also
  // includes karaoke nights at some venues — those aren't relevant
  // to a trivia directory.
  if (!/trivia|bingo/i.test(typeRaw)) return null

  return { event_type: typeRaw, start_time, day_of_week: day }
}

/**
 * The first line of a block is "Venue Name, event spec, event spec, ...".
 * Splitting on ',' is tricky because venue names include commas
 * (e.g. "Streakers Sports Pub (located in Politan Row at Ashford Ln),").
 * Strategy: the venue ends at the first comma that is immediately
 * followed by something that looks like an event-type word. Find the
 * first segment that parses as a ParsedEvent and everything before it
 * is the venue.
 */
function parseVenueLine(line: string): { venue_name: string; events: ParsedEvent[] } | null {
  const parts = line.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null

  // Find the first part that parses as an event segment.
  let eventStart = -1
  for (let i = 1; i < parts.length; i++) {
    if (parseEventSegment(parts[i])) {
      eventStart = i
      break
    }
  }
  if (eventStart === -1) return null

  const venue_name = parts.slice(0, eventStart).join(', ').trim()
  const events: ParsedEvent[] = []
  for (let i = eventStart; i < parts.length; i++) {
    const ev = parseEventSegment(parts[i])
    if (ev) events.push(ev)
  }
  return { venue_name, events }
}

async function main() {
  const raw = await fs.readFile(INPUT, 'utf-8')
  const blocks = raw
    .split(/\n\s*Marker\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  const seeds: SeedEntry[] = []
  const skipped: Array<{ venue?: string; reason: string; raw: string }> = []

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) {
      skipped.push({ reason: 'block too short', raw: block.slice(0, 80) })
      continue
    }
    const parsed = parseVenueLine(lines[0])
    if (!parsed) {
      skipped.push({ reason: 'no parseable events', raw: lines[0] })
      continue
    }
    const address = lines[1]
    // Phone is lines[2] but we don't emit it — Google Places will fill
    // in google_phone_number during enrichment.

    for (const ev of parsed.events) {
      seeds.push({
        venue_name: parsed.venue_name,
        address,
        provider: PROVIDER,
        day_of_week: ev.day_of_week,
        start_time: ev.start_time,
        event_type: ev.event_type,
        prize: null,
        source: SOURCE_URL,
      })
    }

    if (parsed.events.length === 0) {
      skipped.push({ venue: parsed.venue_name, reason: 'parsed 0 events', raw: lines[0] })
    }
  }

  // Dedupe on venue|day|time|event_type
  const seen = new Set<string>()
  const deduped = seeds.filter((s) => {
    const key = `${s.venue_name}|${s.day_of_week}|${s.start_time}|${s.event_type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true })
  await fs.writeFile(OUTPUT, JSON.stringify(deduped, null, 2) + '\n', 'utf-8')

  console.log(`Parsed ${blocks.length} blocks`)
  console.log(`Wrote ${deduped.length} seed entries (${seeds.length - deduped.length} duplicates collapsed) to ${OUTPUT}`)

  if (skipped.length > 0) {
    console.log(`\nSkipped ${skipped.length}:`)
    for (const s of skipped) {
      console.log(`  - [${s.reason}] ${s.venue ?? ''} :: ${s.raw.slice(0, 100)}`)
    }
  }

  // Summary
  const byType: Record<string, number> = {}
  const byDay: Record<string, number> = {}
  for (const s of deduped) {
    byType[s.event_type] = (byType[s.event_type] || 0) + 1
    byDay[s.day_of_week] = (byDay[s.day_of_week] || 0) + 1
  }
  console.log('\nBy event type:')
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
  console.log('\nBy day:')
  for (const d of ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
    console.log(`  ${d}: ${byDay[d] || 0}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
