import React from 'react'

interface StructuredDataProps {
  data: object
}

const StructuredData: React.FC<StructuredDataProps> = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2)
      }}
    />
  )
}

export default StructuredData

// Common structured data objects
export const createWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Trivia Nearby",
  "url": "https://trivianearby.com",
  "description": "Find trivia nights near you! Discover local trivia events at bars and restaurants.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://trivianearby.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
})

export const createLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Trivia Nearby",
  "description": "Find trivia nights near you! Discover local trivia events at bars and restaurants.",
  "url": "https://trivianearby.com",
  "sameAs": [
    "https://facebook.com/trivia-nearby",
    "https://twitter.com/trivia_nearby",
    "https://instagram.com/trivia_nearby"
  ],
  "serviceArea": {
    "@type": "Country",
    "name": "United States"
  },
  "areaServed": {
    "@type": "Country",
    "name": "United States"
  }
})

export const createEventSchema = (event: {
  name: string
  description: string
  startDate: string
  endDate: string
  location: {
    name: string
    address: string
    city: string
    state: string
    postalCode: string
  }
  organizer?: {
    name: string
    url?: string
  }
}) => ({
  "@context": "https://schema.org",
  "@type": "Event",
  "name": event.name,
  "description": event.description,
  "startDate": event.startDate,
  "endDate": event.endDate,
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": event.location.name,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": event.location.address,
      "addressLocality": event.location.city,
      "addressRegion": event.location.state,
      "postalCode": event.location.postalCode,
      "addressCountry": "US"
    }
  },
  "organizer": event.organizer ? {
    "@type": "Organization",
    "name": event.organizer.name,
    "url": event.organizer.url
  } : undefined
})

export const createBreadcrumbSchema = (breadcrumbs: Array<{name: string, url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((crumb, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": crumb.name,
    "item": crumb.url
  }))
})