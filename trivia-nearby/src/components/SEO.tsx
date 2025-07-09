import React from 'react'
import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  canonical?: string
  ogImage?: string
  ogType?: string
  location?: string
  breadcrumbs?: Array<{name: string, url: string}>
}

const SEO: React.FC<SEOProps> = ({
  title = "Find Trivia Near Me - Trivia Nearby | Local Trivia Events",
  description = "Find trivia nights near you! Discover local trivia events at bars and restaurants. Search by location to find the best trivia games in your area.",
  keywords = "trivia near me, trivia nearby, local trivia, trivia events, trivia nights, bar trivia, restaurant trivia, pub quiz",
  canonical = "https://trivia-nearby.com",
  ogImage = "/og-image.jpg",
  ogType = "website",
  location
}) => {
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

  return (
    <Helmet>
      <title>{locationTitle}</title>
      <meta name="description" content={locationDescription} />
      <meta name="keywords" content={locationKeywords} />
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph */}
      <meta property="og:title" content={locationTitle} />
      <meta property="og:description" content={locationDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={locationTitle} />
      <meta name="twitter:description" content={locationDescription} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Location-specific geo tags */}
      {location && (
        <>
          <meta name="geo.placename" content={location} />
          <meta name="geo.region" content="US" />
        </>
      )}
    </Helmet>
  )
}

export default SEO