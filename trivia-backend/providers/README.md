# Trivia Providers Directory Structure

This directory contains provider-specific scrapers, importers, and data for different trivia/event companies.

## Directory Structure

```
providers/
├── nerdytalk/              # NerdyTalk Trivia
│   ├── scrape-*.js         # Scrapers for NerdyTalk website
│   ├── import-*.ts         # Database import scripts
│   ├── *.json              # Scraped data files
│   └── corrections.json    # Manual venue corrections
├── challenge-entertainment/ # Challenge Entertainment
│   ├── *.json              # CE data files
│   └── import-*.ts         # CE-specific import scripts
└── [future-providers]/     # Other trivia companies
```

## Provider Standards

Each provider directory should contain:

1. **Scrapers** (`scrape-*.js`):
   - Web scrapers for gathering venue/event data
   - Should output standardized JSON format
   - Include city/location context when possible

2. **Importers** (`import-*.ts`):
   - Scripts to import scraped data into Supabase
   - Handle Google Places API lookups
   - Apply provider-specific corrections

3. **Data Files** (`*.json`):
   - Raw scraped data
   - Cleaned/processed data
   - Manual corrections/overrides

4. **Documentation**:
   - Provider-specific notes
   - Data structure explanations
   - Common issues and fixes

## Current Providers

### NerdyTalk Trivia
- **Website**: http://nerdytalktrivia.com
- **Data Source**: /locations and /weekly-clues pages
- **Key Feature**: City-aware scraping to properly associate venues with locations
- **Known Issues**: ML Rose locations, Casa Mexicana disambiguation

### Challenge Entertainment  
- **Data Source**: JSON files provided by company
- **Key Feature**: Structured venue data with addresses
- **Import**: Direct JSON import with Google Places validation

## Usage

```bash
# Scrape NerdyTalk with city context
npm run scrape-nerdytalk-city-aware

# Import NerdyTalk data with corrections
npm run import-nerdytalk-corrected

# Import Challenge Entertainment data
npm run import-venues path/to/ce-data.json
```

## Adding New Providers

1. Create new directory: `providers/[provider-name]/`
2. Implement scraper following existing patterns
3. Create import script using Supabase integration
4. Add npm scripts to package.json
5. Document provider-specific details