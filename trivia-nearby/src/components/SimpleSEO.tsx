import { useEffect } from 'react'

interface SimpleSEOProps {
  title?: string
  description?: string
  keywords?: string
  canonical?: string
  location?: string
}

const SimpleSEO: React.FC<SimpleSEOProps> = ({
  title = "Find Trivia Near Me - Trivia Nearby | Local Trivia Events",
  description = "Find trivia nights near you! Discover local trivia events at bars and restaurants. Search by location to find the best trivia games in your area.",
  keywords = "trivia near me, trivia nearby, local trivia, trivia events, trivia nights, bar trivia, restaurant trivia, pub quiz",
  canonical = "https://trivia-nearby.com",
  location
}) => {
  useEffect(() => {
    // Create location-specific SEO content
    const locationTitle = location 
      ? `Trivia Events in ${location} - Find Trivia Near Me | Trivia Nearby`
      : title
    
    const locationDescription = location
      ? `Find trivia nights in ${location}! Discover local trivia events at bars and restaurants near you. See weekly schedules, prizes, and venue details.`
      : description
    
    const locationKeywords = location
      ? `${keywords}, trivia ${location}, trivia events ${location}, trivia nights ${location}, bars ${location}, restaurants ${location}`
      : keywords

    // Update document title
    document.title = locationTitle

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
      let meta = document.querySelector(selector) as HTMLMetaElement
      if (!meta) {
        meta = document.createElement('meta')
        if (property) {
          meta.setAttribute('property', name)
        } else {
          meta.setAttribute('name', name)
        }
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', content)
    }

    // Update meta tags
    updateMeta('description', locationDescription)
    updateMeta('keywords', locationKeywords)
    updateMeta('og:title', locationTitle, true)
    updateMeta('og:description', locationDescription, true)
    updateMeta('og:url', canonical, true)
    updateMeta('twitter:title', locationTitle)
    updateMeta('twitter:description', locationDescription)

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.rel = 'canonical'
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.href = canonical

    // Location-specific geo tags
    if (location) {
      updateMeta('geo.placename', location)
      updateMeta('geo.region', 'US')
    }
  }, [title, description, keywords, canonical, location])

  return null
}

export default SimpleSEO