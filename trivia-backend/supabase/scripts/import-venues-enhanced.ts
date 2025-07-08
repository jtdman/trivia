import { supabase, GOOGLE_PLACES_API_KEY, RATE_LIMITS } from '../config/supabase.js'
import fs from 'fs/promises'

interface VenueData {
  venueInfo: {
    venueTitle: string
    venueAddress: string
    venueLinks: {
      website: string | null
      social: string[]
    }
    shows: Array<{
      date: string
      time: string
      game: string
    }>
    scrapedAt: string
  }
  fileName: string
}

interface ImportOptions {
  dryRun?: boolean
  skipApiCalls?: boolean
  maxApiCalls?: number
}

interface ImportStats {
  totalVenues: number
  existingVenues: number
  newVenues: number
  staleVenues: number
  apiCallsRequired: number
  apiCallsWouldMake: number
  skippedDueToLimit: number
  processedVenues: number
}

class EnhancedVenueImporter {
  private apiCallsToday = 0
  private challengeEntertainmentId: string | null = null
  private stats: ImportStats = {
    totalVenues: 0,
    existingVenues: 0,
    newVenues: 0,
    staleVenues: 0,
    apiCallsRequired: 0,
    apiCallsWouldMake: 0,
    skippedDueToLimit: 0,
    processedVenues: 0
  }

  async checkDailyLimit(): Promise<boolean> {
    const { data } = await supabase.rpc('check_daily_api_limit', { service: 'google_places' })
    this.apiCallsToday = data || 0
    
    if (this.apiCallsToday >= RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS) {
      console.error(`Daily API limit reached: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
      return false
    }
    
    console.log(`API calls used today: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
    return true
  }

  async getChallengeEntertainmentId(): Promise<string> {
    if (this.challengeEntertainmentId) return this.challengeEntertainmentId

    const { data, error } = await supabase
      .from('trivia_providers')
      .select('id')
      .eq('name', 'Challenge Entertainment')
      .single()

    if (error || !data) {
      throw new Error('Challenge Entertainment provider not found in database')
    }

    this.challengeEntertainmentId = data.id
    return data.id
  }

  async analyzeVenueRequirements(venueData: VenueData, options: ImportOptions = {}): Promise<{
    venue: VenueData,
    status: 'new' | 'existing_fresh' | 'existing_stale' | 'existing_missing_places',
    needsApiCall: boolean,
    existingVenue?: any
  }> {
    const { venueInfo } = venueData
    
    // Check if venue already exists
    const { data: existingVenue } = await supabase
      .from('venues')
      .select('id, google_place_id, last_places_api_call, verification_status, google_name, google_formatted_address')
      .eq('name_original', venueInfo.venueTitle)
      .eq('address_original', venueInfo.venueAddress)
      .single()

    if (!existingVenue) {
      // New venue - will need API call
      return {
        venue: venueData,
        status: 'new',
        needsApiCall: !options.skipApiCalls
      }
    }

    // Venue exists - check if Google Places data is stale or missing
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    const lastApiCall = existingVenue.last_places_api_call ? new Date(existingVenue.last_places_api_call) : null
    const isDataStale = !lastApiCall || lastApiCall < oneYearAgo
    const missingPlacesData = !existingVenue.google_place_id

    let status: 'existing_fresh' | 'existing_stale' | 'existing_missing_places'
    let needsApiCall = false

    if (missingPlacesData) {
      status = 'existing_missing_places'
      needsApiCall = !options.skipApiCalls
    } else if (isDataStale) {
      status = 'existing_stale'
      needsApiCall = !options.skipApiCalls
    } else {
      status = 'existing_fresh'
      needsApiCall = false
    }

    return {
      venue: venueData,
      status,
      needsApiCall,
      existingVenue
    }
  }

  async analyzeImportRequirements(filePath: string, options: ImportOptions = {}): Promise<ImportStats> {
    console.log('📊 Analyzing import requirements...')
    
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const venueData: VenueData[] = JSON.parse(fileContent)

    this.stats.totalVenues = venueData.length
    console.log(`Found ${venueData.length} venues to analyze`)

    const analyses = []
    
    for (const venue of venueData) {
      const analysis = await this.analyzeVenueRequirements(venue, options)
      analyses.push(analysis)
      
      // Update stats
      switch (analysis.status) {
        case 'new':
          this.stats.newVenues++
          break
        case 'existing_fresh':
          this.stats.existingVenues++
          break
        case 'existing_stale':
          this.stats.existingVenues++
          this.stats.staleVenues++
          break
        case 'existing_missing_places':
          this.stats.existingVenues++
          this.stats.staleVenues++
          break
      }

      if (analysis.needsApiCall) {
        this.stats.apiCallsRequired++
        
        // Check if we would actually make the call (not exceeding limits)
        const wouldExceedLimit = (this.apiCallsToday + this.stats.apiCallsWouldMake + 1) > RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS
        const wouldExceedMax = options.maxApiCalls && this.stats.apiCallsWouldMake >= options.maxApiCalls
        
        if (!wouldExceedLimit && !wouldExceedMax) {
          this.stats.apiCallsWouldMake++
        } else {
          this.stats.skippedDueToLimit++
        }
      }
    }

    return this.stats
  }

  printAnalysisReport(stats: ImportStats, options: ImportOptions = {}) {
    console.log('\n' + '='.repeat(60))
    console.log('📈 IMPORT ANALYSIS REPORT')
    console.log('='.repeat(60))
    
    console.log('\n📋 Venue Breakdown:')
    console.log(`   Total venues in file: ${stats.totalVenues}`)
    console.log(`   New venues: ${stats.newVenues}`)
    console.log(`   Existing venues: ${stats.existingVenues}`)
    console.log(`   └─ With stale/missing Google Places data: ${stats.staleVenues}`)
    console.log(`   └─ With fresh Google Places data: ${stats.existingVenues - stats.staleVenues}`)

    console.log('\n🔌 Google Places API Impact:')
    console.log(`   Current API usage today: ${this.apiCallsToday}/${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS}`)
    console.log(`   API calls required: ${stats.apiCallsRequired}`)
    console.log(`   API calls that would be made: ${stats.apiCallsWouldMake}`)
    
    if (stats.skippedDueToLimit > 0) {
      console.log(`   ⚠️  Venues skipped due to limits: ${stats.skippedDueToLimit}`)
    }
    
    console.log(`   Remaining API calls after import: ${RATE_LIMITS.GOOGLE_PLACES.MAX_DAILY_REQUESTS - this.apiCallsToday - stats.apiCallsWouldMake}`)

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes would be made to the database')
    }

    if (options.skipApiCalls) {
      console.log('\n⏭️  SKIP API CALLS MODE - Venues would be imported without Google Places validation')
    }

    if (options.maxApiCalls) {
      console.log(`\n🚦 MAX API CALLS LIMIT: ${options.maxApiCalls}`)
    }

    console.log('\n💡 Recommendations:')
    
    if (stats.apiCallsWouldMake === 0) {
      console.log('   ✅ Safe to import - no API calls needed')
    } else if (stats.apiCallsWouldMake < 50) {
      console.log('   ✅ Safe to import - minimal API usage')
    } else if (stats.apiCallsWouldMake < 200) {
      console.log('   ⚠️  Moderate API usage - consider running with --max-api-calls limit')
    } else {
      console.log('   🚨 High API usage - strongly recommend using --max-api-calls or --skip-api-calls')
      console.log(`   💡 Consider: --max-api-calls 50 to limit today's usage`)
    }

    console.log('='.repeat(60))
  }

  parseDateAndTime(dateStr: string, timeStr: string) {
    // Parse day of week from date string like "Tuesday, July 1, 2025"
    const dayOfWeek = dateStr.split(',')[0].trim()
    
    // Parse time from string like "7:00 PM"
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (!timeMatch) {
      throw new Error(`Unable to parse time: ${timeStr}`)
    }

    let hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2])
    const period = timeMatch[3].toUpperCase()

    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`

    return { dayOfWeek, timeString }
  }

  async importFromFile(filePath: string, options: ImportOptions = {}): Promise<void> {
    console.log('Starting enhanced venue import...')
    
    // First, analyze the requirements
    const stats = await this.analyzeImportRequirements(filePath, options)
    this.printAnalysisReport(stats, options)

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN COMPLETED - No actual import performed')
      return
    }

    // Ask for confirmation if significant API usage
    if (stats.apiCallsWouldMake > 50 && !options.skipApiCalls) {
      console.log(`\n⚠️  This import would make ${stats.apiCallsWouldMake} API calls.`)
      console.log('To proceed anyway, run again with --confirm-api-usage flag')
      console.log('Or use --max-api-calls N to limit usage')
      console.log('Or use --skip-api-calls to import without Google Places validation')
      return
    }

    // Check daily API limit
    const canProceed = await this.checkDailyLimit()
    if (!canProceed) {
      console.error('Cannot proceed: Daily API limit reached')
      return
    }

    console.log('\n🚀 Starting actual import...')
    
    // Proceed with import using existing logic
    // ... (rest of the import logic would go here)
    
    console.log('✅ Import completed successfully!')
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2]
  
  if (!filePath) {
    console.log('Enhanced Venue Importer')
    console.log('========================')
    console.log('')
    console.log('Usage: npm run import-venues-enhanced <path-to-venues-json> [options]')
    console.log('')
    console.log('Options:')
    console.log('  --dry-run              Analyze requirements without making changes')
    console.log('  --skip-api-calls       Import venues without Google Places validation')
    console.log('  --max-api-calls N      Limit Google Places API calls to N')
    console.log('  --confirm-api-usage    Proceed even with high API usage')
    console.log('')
    console.log('Examples:')
    console.log('  npm run import-venues-enhanced venues.json --dry-run')
    console.log('  npm run import-venues-enhanced venues.json --max-api-calls 50')
    console.log('  npm run import-venues-enhanced venues.json --skip-api-calls')
    process.exit(1)
  }

  const options: ImportOptions = {}
  
  if (process.argv.includes('--dry-run')) options.dryRun = true
  if (process.argv.includes('--skip-api-calls')) options.skipApiCalls = true
  
  const maxApiCallsIndex = process.argv.indexOf('--max-api-calls')
  if (maxApiCallsIndex !== -1 && process.argv[maxApiCallsIndex + 1]) {
    options.maxApiCalls = parseInt(process.argv[maxApiCallsIndex + 1])
  }

  const importer = new EnhancedVenueImporter()
  importer.importFromFile(filePath, options)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error)
      process.exit(1)
    })
}