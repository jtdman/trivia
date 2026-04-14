/**
 * Trivia Nation scraper.
 *
 * Fetches https://trivianation.com/find-a-show/ and writes a seed JSON
 * in the shape that ingest/seed-city.ts consumes:
 *
 *   [{ venue_name, address, provider, day_of_week, start_time,
 *      event_type, prize, source }, ...]
 *
 * The page is server-rendered HTML with two parallel structures:
 *   - <div class="marker" data-lat=".." data-lng="..">  map pins
 *   - full list items with class="address-phone" + class="address"
 * Both reference the same /trivia-tonight/<slug>/ URL, so we merge
 * lat/lng into the list-item rows by slug.
 *
 * Skips venues flagged "MEMBERS ONLY" or "On Hold" in the day-time
 * text.
 *
 * Usage:
 *   pnpm tsx providers/trivia-nation/scrape.ts
 *   pnpm tsx providers/trivia-nation/scrape.ts --out /tmp/tn.json
 */

import fs from 'fs/promises'
import path from 'path'
import * as cheerio from 'cheerio'

const SOURCE_URL = 'https://trivianation.com/find-a-show/'
const DEFAULT_OUT = path.resolve(
  new URL('../../ingest/seeds/trivia-nation.json', import.meta.url).pathname,
)

interface SeedEntry {
  venue_name: string
  address: string
  provider: string
  day_of_week: string
  start_time: string
  event_type: string
  prize: string | null
  source: string
  latitude?: number
  longitude?: number
}

const DAYS = new Set([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
])

function parseDayTime(text: string): { day: string; time24: string } | null {
  // Expected: "Wednesday - 7:00 pm" (HTML entities decoded by cheerio already)
  const m = text.trim().match(/^(\w+)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (!m) return null
  const [, day, hourStr, minStr, meridiem] = m
  if (!DAYS.has(day)) return null
  let hour = parseInt(hourStr, 10)
  const minute = parseInt(minStr, 10)
  if (meridiem.toLowerCase() === 'pm' && hour !== 12) hour += 12
  if (meridiem.toLowerCase() === 'am' && hour === 12) hour = 0
  return {
    day,
    time24: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  }
}

function cleanAddress(raw: string): string {
  // Observed duplicated zip: "205 Apollo Beach Blvd, Apollo Beach, FL 33572, USA 33572"
  // -> collapse trailing ", USA <ZIP>" duplicates and trim.
  return raw
    .replace(/,\s*USA\s+\d{5}$/, ', USA')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function slugFromUrl(href: string): string | null {
  const m = href.match(/\/trivia-tonight\/([^/]+)\/?$/)
  return m ? m[1] : null
}

async function main() {
  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--out')
  const outPath = outIdx >= 0 ? args[outIdx + 1] : DEFAULT_OUT

  console.log(`Fetching ${SOURCE_URL}...`)
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'trivianearby-scraper/1.0 (contact: info@trivianearby.com)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${SOURCE_URL}`)
  const html = await res.text()

  const $ = cheerio.load(html)

  // Step 1: map marker → lat/lng by slug
  const coordsBySlug = new Map<string, { lat: number; lng: number }>()
  $('div.marker').each((_, el) => {
    const lat = parseFloat($(el).attr('data-lat') || '')
    const lng = parseFloat($(el).attr('data-lng') || '')
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const href = $(el).find('a.show-title').first().attr('href') || ''
    const slug = slugFromUrl(href)
    if (slug && !coordsBySlug.has(slug)) coordsBySlug.set(slug, { lat, lng })
  })
  console.log(`Collected lat/lng for ${coordsBySlug.size} unique slugs`)

  // Step 2: walk full list items (those with .address-phone)
  const seeds: SeedEntry[] = []
  const skipped: { venue: string; reason: string }[] = []

  $('div.address-phone').each((_, addressPhoneEl) => {
    const showWrap = $(addressPhoneEl).closest('.show-wrap')
    if (!showWrap.length) return

    const titleEl = showWrap.find('a.show-title').first()
    const href = titleEl.attr('href') || ''
    const slug = slugFromUrl(href)
    const venueName = titleEl.text().trim()
    if (!venueName) return

    const address = cleanAddress(
      showWrap.find('div.address').first().text() || '',
    )
    if (!address) {
      skipped.push({ venue: venueName, reason: 'no address' })
      return
    }

    const dayTimeBlocks = showWrap.find('div.day-time')
    if (dayTimeBlocks.length === 0) {
      skipped.push({ venue: venueName, reason: 'no day-time' })
      return
    }

    const coords = slug ? coordsBySlug.get(slug) : undefined

    dayTimeBlocks.each((_, dtEl) => {
      // Each day-time is "Wednesday - 7:00 pm<br>General Knowledge Trivia..."
      // Cheerio flattens <br> -> we split on newline after converting.
      const html = $(dtEl).html() || ''
      const text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()
      if (/members only|on hold/i.test(text)) {
        skipped.push({ venue: venueName, reason: `status tag (${text.slice(0, 40)})` })
        return
      }

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length === 0) return
      const dt = parseDayTime(lines[0])
      if (!dt) {
        skipped.push({ venue: venueName, reason: `unparsable day-time (${lines[0]})` })
        return
      }
      const eventType = lines[1] || 'Trivia'

      seeds.push({
        venue_name: venueName,
        address,
        provider: 'Trivia Nation',
        day_of_week: dt.day,
        start_time: dt.time24,
        event_type: eventType,
        prize: null,
        source: SOURCE_URL,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      })
    })
  })

  // Dedupe — same venue+day+time+event_type
  const seen = new Set<string>()
  const deduped: SeedEntry[] = []
  for (const s of seeds) {
    const key = `${s.venue_name}|${s.day_of_week}|${s.start_time}|${s.event_type}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(s)
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify(deduped, null, 2) + '\n', 'utf-8')

  console.log(`\nWrote ${deduped.length} entries to ${outPath}`)
  console.log(`Skipped ${skipped.length}:`)
  const byReason: Record<string, number> = {}
  for (const s of skipped) byReason[s.reason.split(' (')[0]] = (byReason[s.reason.split(' (')[0]] || 0) + 1
  for (const [k, v] of Object.entries(byReason)) console.log(`  - ${k}: ${v}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
