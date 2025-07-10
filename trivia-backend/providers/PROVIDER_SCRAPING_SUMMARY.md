# Trivia Provider Scraping Strategy

## Overview
This directory contains scraping strategies and implementations for various trivia providers. The goal is to systematically collect venue and event data from major trivia companies to expand our database beyond the initial scraped data.

## Current Database Status
- **Total Venues**: 828 (after junk cleanup)
- **Verification Status**: 819 need review, 9 failed, 0 verified
- **Total Events**: 3,000+ associated with venues

## Provider Analysis

### 1. Geeks Who Drink ✅ IMPLEMENTED
- **Status**: Sample data generator completed
- **Coverage**: Nationwide (12 major cities)
- **Data Quality**: High - well-known venues with realistic scheduling
- **Implementation**: `/geeks-who-drink/sample_data_generator.py`
- **Results**: 37 sample venues, 50 events across major markets
- **Notable**: Based in Denver, operates at breweries and bars

### 2. King Trivia ⚠️ BLOCKED
- **Status**: Scraper framework built but site blocks automation
- **Coverage**: Los Angeles, Denver, Dallas, New York, Boston, etc.
- **Implementation**: `/king-trivia/scraper.py`
- **Contact**: Contact@KingTrivia.com, 818-808-0008
- **Challenge**: Website uses advanced bot detection

### 3. Sporcle Live ⚠️ BLOCKED
- **Status**: Scraper framework built but site blocks automation
- **Coverage**: Nationwide with virtual events
- **Implementation**: `/sporcle-live/scraper.py`
- **Data Structure**: JavaScript payloads with event data
- **Challenge**: 403 Forbidden responses to automated requests

### 4. Other Major Providers (Analysis Pending)

#### Quiz Night America
- **Website**: https://www.quiznightamerica.com
- **Contact**: Research needed
- **Approach**: Manual investigation required

#### Trivia Mafia
- **Website**: https://www.triviamafia.com
- **Contact**: info@triviamafia.com
- **Location**: Minneapolis, MN
- **Approach**: Direct contact recommended

#### DJ Trivia
- **Website**: https://www.djtrivia.com
- **Contact**: Via website form
- **Approach**: Form submission required

## Technical Challenges

### Bot Detection
Most major trivia providers have implemented sophisticated bot detection:
- **403 Forbidden**: Automated requests are blocked
- **Rate Limiting**: Aggressive throttling of API calls
- **JavaScript Requirements**: Dynamic content loading prevents simple scraping

### Alternative Approaches

#### 1. Manual Data Collection
- Research individual provider websites
- Create sample data based on known patterns
- Focus on major metropolitan areas

#### 2. Partnership Outreach
- Contact providers directly for data partnerships
- Offer mutual benefits (venue verification, user referrals)
- Establish official data sharing agreements

#### 3. Crowdsourced Data
- Leverage venue claiming system
- Allow users to add missing events
- Verify through community reporting

## Recommended Implementation Strategy

### Phase 1: Foundation (COMPLETED)
- ✅ Implement venue claiming system
- ✅ Clean up existing database
- ✅ Create data quality filters
- ✅ Build admin interface for data management

### Phase 2: Provider Outreach (RECOMMENDED)
1. **Direct Contact**: Reach out to provider contact emails
2. **Partnership Proposals**: Offer venue verification services
3. **Data Exchange**: Propose mutually beneficial arrangements
4. **Official APIs**: Request access to provider APIs

### Phase 3: Strategic Scraping (CAREFUL)
1. **Respectful Automation**: Use delays, rotate IPs, respect robots.txt
2. **Targeted Scraping**: Focus on providers with public data
3. **Sample Data**: Generate realistic data for testing/demos
4. **Manual Verification**: Verify automated data with manual checks

## Data Schema Mapping

All providers map to our standardized schema:

```sql
-- Venues table
venues (
    id UUID PRIMARY KEY,
    name_original TEXT NOT NULL,
    address_original TEXT NOT NULL,
    verification_status TEXT,
    is_imported BOOLEAN
)

-- Events table
events (
    id UUID PRIMARY KEY,
    venue_id UUID REFERENCES venues(id),
    provider_id UUID REFERENCES trivia_providers(id),
    event_type TEXT,
    day_of_week TEXT,
    start_time TEXT,
    end_time TEXT,
    is_active BOOLEAN
)
```

## Success Metrics

### Quality Indicators
- **Venue Accuracy**: Real, existing venues with correct addresses
- **Event Validity**: Accurate schedules matching actual events
- **Provider Attribution**: Correct provider assignment
- **Geographic Coverage**: Balanced representation across regions

### Quantity Targets
- **Short-term**: 50+ new venues per provider
- **Medium-term**: 200+ venues across all major providers
- **Long-term**: 1,000+ venues with verified events

## Next Steps

1. **Contact Provider Business Development**
   - Prepare partnership proposals
   - Highlight mutual benefits
   - Request official data access

2. **Enhance Manual Collection**
   - Research individual provider territories
   - Create city-specific venue lists
   - Verify through local knowledge

3. **Implement Advanced Scraping**
   - Browser automation with Selenium
   - Residential proxy rotation
   - JavaScript execution environment

4. **Community-Driven Expansion**
   - Launch venue claiming campaigns
   - Incentivize user contributions
   - Gamify data quality improvements

## Legal and Ethical Considerations

- **Respect Terms of Service**: Review each provider's terms
- **Fair Use**: Ensure data collection serves legitimate purposes
- **Data Attribution**: Credit providers appropriately
- **Privacy Protection**: Avoid collecting personal information
- **Commercial Use**: Understand licensing implications

## Contact Information

For questions about provider scraping strategy:
- **Technical**: Review implementation files in provider directories
- **Business**: Consider direct provider outreach
- **Legal**: Ensure compliance with applicable laws and terms of service