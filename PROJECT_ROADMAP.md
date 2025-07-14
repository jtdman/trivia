# TriviaNearby Project Roadmap

## Current Status
- **Production URL**: https://trivianearby.com
- **Deployment**: Hetzner VPS
- **Stage**: MVP with active data collection

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
- **Styling**: Tailwind CSS v4 with dark theme default
- **Icons**: Lucide React and Tabler icons
- **Routing**: React Router
- **State Management**: React Context (Theme)

### Backend
- **Database**: Supabase with PostGIS extension
- **Authentication**: Supabase Auth
- **API**: Supabase REST API
- **Location Services**: Nominatim/OpenStreetMap with Vite proxy
- **Data Collection**: N8N workflows for automated scraping

### Infrastructure
- **Hosting**: Hetzner VPS
- **Domain**: trivianearby.com (potential expansion to .co.uk)
- **CI/CD**: Git-based deployment workflow

## Completed Features ✅

### Core Functionality
- [x] Location-based event discovery
- [x] Mobile-first responsive design
- [x] Dark theme with light mode toggle
- [x] Auto-location detection with manual fallback
- [x] Event filtering (today/tomorrow/this week)
- [x] Distance-based sorting
- [x] Event cards with venue details

### Data & Backend
- [x] Supabase database with PostGIS
- [x] Multi-provider data collection
- [x] Automated scraping (Challenge Entertainment, NerdyTalk)
- [x] Admin authentication system
- [x] Venue deduplication with Google Places API

### SEO & Performance
- [x] Comprehensive meta tags
- [x] Open Graph and Twitter Card support
- [x] JSON-LD structured data
- [x] Location-specific SEO pages
- [x] Performance optimization

## In Progress 🔄

### Partnership Development
- [ ] NerdyTalk data sharing agreement finalization
- [ ] Featured partner implementation
- [ ] Partnership analytics dashboard

### Data Quality
- [ ] Venue photo integration improvement
- [ ] Address standardization
- [ ] Event verification system

## High Priority Tasks 🔥

### SEO & Discoverability
- [ ] Generate sitemap.xml
- [ ] Create robots.txt
- [ ] Add social media images (og-image.jpg, twitter-image.jpg)
- [ ] Implement Google Analytics
- [ ] Submit to Google Search Console

### Partnership Outreach
- [ ] Contact JAMMIN' Trivia (steve@myjammindjs.com)
- [ ] Contact Trivia Nation (admin@trivianation.com)
- [ ] Contact OutSpoken Entertainment (404) 273-1645
- [ ] Contact Team Trivia Georgia (478) 887-4842
- [ ] Contact Dirty South Trivia (dirtysouthtrivia.com/contact)

### Data Enhancement
- [ ] Implement venue photo fallbacks
- [ ] Add event verification badges
- [ ] Create event reporting system
- [ ] Add prize money tracking

## Medium Priority Tasks 📋

### User Experience
- [ ] Add event favorites/bookmarks
- [ ] Implement user reviews/ratings
- [ ] Create event notifications
- [ ] Add event sharing functionality

### Admin Features
- [ ] Bulk event management
- [ ] Provider analytics dashboard
- [ ] Automated quality checks
- [ ] Event approval workflow

### Technical Improvements
- [ ] Implement caching strategy
- [ ] Add error monitoring (Sentry)
- [ ] Create automated testing suite
- [ ] Optimize bundle size

## Future Considerations 🚀

### Expansion
- [ ] UK market entry (trivianearby.co.uk)
- [ ] Native mobile app development
- [ ] Additional language support
- [ ] Corporate trivia booking system

### Monetization
- [ ] Premium venue listings
- [ ] Event promotion features
- [ ] Venue partnership program
- [ ] Sponsored event listings

### Advanced Features
- [ ] Trivia team matching
- [ ] Event check-in system
- [ ] Live event updates
- [ ] Trivia host marketplace

## Partnership Strategy

### Active Partners
- **NerdyTalk**: Local Tennessee provider, data sharing in progress
- **Challenge Entertainment**: Automated scraping active

### Target Partners (Prioritized)
1. **JAMMIN' Trivia**: Multi-state presence, direct owner contact
2. **Trivia Nation**: 220+ weekly shows in Florida
3. **OutSpoken Entertainment**: Atlanta metro, established since 2000
4. **Team Trivia Georgia**: Strong regional presence
5. **Dirty South Trivia**: Southeast coverage, growing company

### Partnership Value Proposition
- Free marketing to users actively searching for trivia
- SEO benefits for "trivia near me" searches
- Younger demographic discovery
- Detailed analytics and insights
- Featured partner status and branding

## Success Metrics

### Current Targets
- [ ] 500+ venues in database
- [ ] 5+ trivia provider partnerships
- [ ] 1000+ monthly active users
- [ ] 50+ cities covered

### Long-term Goals
- [ ] 5000+ venues nationwide
- [ ] 100+ provider partnerships
- [ ] 50K+ monthly active users
- [ ] International expansion

## Risk Mitigation

### Technical Risks
- **Data scraping reliability**: Diversify data sources, build direct partnerships
- **Server capacity**: Monitor usage, scale Hetzner resources as needed
- **API rate limits**: Implement caching, optimize requests

### Business Risks
- **Competition**: Focus on data quality and user experience
- **Legal issues**: Ensure compliance with scraping best practices
- **Provider relationships**: Build mutually beneficial partnerships

## Next Sprint (This Week)
1. Fix SEO URLs to use trivianearby.com
2. Create social media images for Open Graph
3. Implement sitemap.xml generation
4. Begin outreach to top 3 target partners
5. Add Google Analytics tracking

---

*Last updated: 2025-01-14*
*Next review: Weekly*