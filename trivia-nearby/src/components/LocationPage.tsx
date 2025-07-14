import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TriviaList from './TriviaList'
import SimpleSEO from './SimpleSEO'
import StructuredData, { createBreadcrumbSchema } from './StructuredData'

interface LocationPageProps {
  onBack: () => void
}

const LocationPage: React.FC<LocationPageProps> = ({ onBack }) => {
  const { location } = useParams<{ location: string }>()
  const [geocodedCoords, setGeocodedCoords] = useState<{lat: number, lng: number} | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Convert URL slug back to readable location
  const locationName = location 
    ? location.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Unknown Location'

  useEffect(() => {
    const geocodeLocation = async () => {
      if (!location) return
      
      try {
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1&countrycodes=us`
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(geocodeUrl)}`
        const response = await fetch(proxyUrl)
        const proxyData = await response.json()
        const data = JSON.parse(proxyData.contents)
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0]
          setGeocodedCoords({ lat: parseFloat(lat), lng: parseFloat(lon) })
        }
      } catch (error) {
        console.error('Geocoding failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    geocodeLocation()
  }, [location, locationName])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <>
      <SimpleSEO
        title={`Trivia Events in ${locationName} - Find Trivia Near Me | Trivia Nearby`}
        description={`Find trivia nights in ${locationName}! Discover local trivia events at bars and restaurants. See weekly schedules, prizes, and venue details.`}
        keywords={`trivia ${locationName}, trivia events ${locationName}, trivia nights ${locationName}, bars ${locationName}, restaurants ${locationName}`}
        canonical={`https://trivianearby.com/trivia-near-${location}`}
        location={locationName}
      />
      
      <StructuredData 
        data={createBreadcrumbSchema([
          { name: 'Home', url: 'https://trivianearby.com' },
          { name: `Trivia in ${locationName}`, url: `https://trivianearby.com/trivia-near-${location}` }
        ])}
      />
      
      <TriviaList
        location={locationName}
        geocodedCoords={geocodedCoords}
        onBack={onBack}
      />
    </>
  )
}

export default LocationPage