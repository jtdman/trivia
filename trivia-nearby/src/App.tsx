import React, { useContext, useState } from 'react'
import { ThemeContext } from './context/theme_context'
import { Search, Brain, Beer, MapPin, Sun, Moon } from 'lucide-react'
import TriviaList from './components/TriviaList'
import DataTest from './components/DataTest'
import LocationAutocomplete from './components/LocationAutocomplete'
import { getLocationName } from './utils/location'

type AppState = 'splash' | 'manual-location' | 'trivia-list'

const App = () => {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const [appState, setAppState] = useState<AppState>('splash')
  const [location, setLocation] = useState<string>('')
  const [manualLocation, setManualLocation] = useState<string>('')
  const [geocodedCoords, setGeocodedCoords] = useState<{lat: number, lng: number} | null>(null)

  // Debug logging
  console.log('App render - current state:', { appState, location, theme })

  const handleShareLocation = () => {
    console.log('Share location clicked')
    if (navigator.geolocation) {
      console.log('Geolocation is available, requesting position...')
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('Position received:', position.coords)
          
          // Use reverse geocoding to get city name
          const locationString = await getLocationName(
            position.coords.latitude,
            position.coords.longitude
          )
          
          console.log('Setting location to:', locationString)
          setLocation(locationString)
          console.log('Changing app state to trivia-list')
          setAppState('trivia-list')
        },
        (error) => {
          console.error('Location access denied:', error)
          setAppState('manual-location')
        }
      )
    } else {
      console.log('Geolocation not available')
      setAppState('manual-location')
    }
  }

  const handleLocationSelect = (locationName: string, coords: {lat: number, lng: number}) => {
    setLocation(locationName)
    setGeocodedCoords(coords)
    setAppState('trivia-list')
  }

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (manualLocation.trim()) {
      setLocation(manualLocation.trim())
      
      // If no coordinates were set by autocomplete, try to geocode
      if (!geocodedCoords) {
        try {
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualLocation.trim())}&limit=1`
          const response = await fetch(geocodeUrl)
          const data = await response.json()
          
          if (data && data.length > 0) {
            const { lat, lon } = data[0]
            const coords = { lat: parseFloat(lat), lng: parseFloat(lon) }
            console.log('Manual geocoding result:', coords)
            setGeocodedCoords(coords)
          }
        } catch (error) {
          console.warn('Geocoding failed:', error)
        }
      }
      
      // Navigate to trivia list after geocoding attempt
      setAppState('trivia-list')
    }
  }

  if (appState === 'trivia-list') {
    return <TriviaList location={location} geocodedCoords={geocodedCoords} onBack={() => {
      setAppState('splash')
      setGeocodedCoords(null)
      setLocation('')
      setManualLocation('')
    }} />
  }

  if (appState === 'manual-location') {
    return (
      <div
        className='bg-white dark:bg-black w-full min-h-screen text-black dark:text-white px-6 py-8'
        data-theme={theme || 'dark'}
      >
        {/* Header with theme toggle */}
        <div className='flex justify-between items-center mb-8'>
          <button
            onClick={() => setAppState('splash')}
            className='text-purple-400 font-medium'
          >
            ← Back
          </button>
          
          {/* App title header */}
          <div className='flex items-center gap-3'>
            <h1 className='text-lg font-bold'>
              <span className='text-purple-400'>TRIVIA</span>
              <span className='text-black dark:text-white'>NEARBY</span>
            </h1>
            <div className='flex gap-2'>
              <Search className='w-4 h-4 text-black dark:text-white' />
              <Brain className='w-4 h-4 text-black dark:text-white' />
              <Beer className='w-4 h-4 text-black dark:text-white' />
            </div>
          </div>
          
          <button onClick={toggleTheme} className='p-2'>
            {theme === 'dark' ? (
              <Sun className='w-5 h-5' />
            ) : (
              <Moon className='w-5 h-5' />
            )}
          </button>
        </div>

        {/* Manual location form */}
        <div className='flex flex-col items-center text-center'>
          <div className='bg-purple-500/20 rounded-full p-8 mb-8'>
            <MapPin className='w-12 h-12 text-purple-400 fill-purple-400' />
          </div>

          <h2 className='text-2xl font-semibold mb-4'>Enter Your Location</h2>
          <p className='text-gray-600 dark:text-gray-400 mb-8 max-w-sm leading-relaxed'>
            Enter your city or zip code to find trivia events near you.
          </p>

          <form
            onSubmit={handleManualLocationSubmit}
            className='w-full max-w-sm space-y-4'
          >
            <LocationAutocomplete
              value={manualLocation}
              onChange={setManualLocation}
              onSelect={handleLocationSelect}
              placeholder="City or ZIP code"
            />
            <button
              type='submit'
              className='bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-8 rounded-lg w-full transition-colors'
            >
              Find Trivia Events
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Splash screen
  return (
    <div
      className='bg-white dark:bg-black w-full min-h-screen text-black dark:text-white px-6 py-8'
      data-theme={theme || 'dark'}
    >
      {/* Header with theme toggle */}
      <div className='flex justify-between items-center mb-12'>
        <div></div>
        <button onClick={toggleTheme} className='p-2'>
          {theme === 'dark' ? (
            <Sun className='w-5 h-5' />
          ) : (
            <Moon className='w-5 h-5' />
          )}
        </button>
      </div>

      {/* Main content */}
      <div className='flex flex-col items-center text-center'>
        {/* App title */}
        <h1 className='text-5xl font-bold mb-8'>
          <span className='text-purple-400'>TRIVIA</span>
          <span className='text-black dark:text-white'>NEARBY</span>
        </h1>

        {/* Logo icons */}
        <div className='flex gap-6 mb-12'>
          <Search className='w-8 h-8 text-black dark:text-white' />
          <Brain className='w-8 h-8 text-black dark:text-white' />
          <Beer className='w-8 h-8 text-black dark:text-white' />
        </div>

        {/* Location pin icon */}
        <div className='bg-purple-500/20 rounded-full p-8 mb-12'>
          <MapPin className='w-12 h-12 text-purple-400 fill-purple-400' />
        </div>

        {/* Headline and description */}
        <h2 className='text-2xl font-semibold mb-4'>Find Trivia Near You</h2>
        <p className='text-gray-600 dark:text-gray-400 mb-8 max-w-sm leading-relaxed'>
          Discover the best trivia nights at bars and restaurants in your area.
        </p>

        {/* Share location button */}
        <button
          onClick={handleShareLocation}
          className='bg-purple-500 hover:bg-purple-600 text-white font-medium py-4 px-8 rounded-lg w-full max-w-sm transition-colors mb-4'
        >
          Share My Location
        </button>

        {/* Manual location option */}
        <button
          onClick={() => setAppState('manual-location')}
          className='text-purple-400 font-medium hover:text-purple-300 transition-colors'
        >
          Enter location manually
        </button>

        {/* Privacy text */}
        <p className='text-gray-500 text-sm mt-6 max-w-sm leading-relaxed'>
          We only use your location to find trivia events near you. We don't
          store or share your precise location.
        </p>

        {/* Database test */}
        <div className='mt-8 w-full max-w-sm'>
          <DataTest />
        </div>
      </div>
    </div>
  )
}

export default App
