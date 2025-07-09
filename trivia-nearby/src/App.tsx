import React, { useContext, useState } from 'react'
import { ThemeContext } from './context/theme_context'
import { Search, Brain, Beer, MapPin, Sun, Moon, Loader2 } from 'lucide-react'
import TriviaList from './components/TriviaList'
import LocationAutocomplete from './components/LocationAutocomplete'
import { getLocationName } from './utils/location'

type AppState = 'splash' | 'manual-location' | 'trivia-list'

const App = () => {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const [appState, setAppState] = useState<AppState>('splash')
  const [location, setLocation] = useState<string>('')
  const [manualLocation, setManualLocation] = useState<string>('')
  const [geocodedCoords, setGeocodedCoords] = useState<{lat: number, lng: number} | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  // Debug logging
  console.log('App render - current state:', { appState, location, theme })

  const handleShareLocation = () => {
    console.log('Share location clicked')
    setIsLoadingLocation(true)
    
    if (navigator.geolocation) {
      console.log('Geolocation is available, requesting position...')
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('Position received:', position.coords)
          
          try {
            // Use reverse geocoding to get city name
            const locationString = await getLocationName(
              position.coords.latitude,
              position.coords.longitude
            )
            
            console.log('Setting location to:', locationString)
            setLocation(locationString)
            console.log('Changing app state to trivia-list')
            setAppState('trivia-list')
          } catch (error) {
            console.error('Error getting location name:', error)
            // Still navigate but with coordinates as fallback
            setLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`)
            setAppState('trivia-list')
          } finally {
            setIsLoadingLocation(false)
          }
        },
        (error) => {
          console.error('Location access denied:', error)
          setIsLoadingLocation(false)
          setAppState('manual-location')
        }
      )
    } else {
      console.log('Geolocation not available')
      setIsLoadingLocation(false)
      setAppState('manual-location')
    }
  }

  const handleLocationSelect = (locationName: string, coords: {lat: number, lng: number}) => {
    console.log('Location selected from autocomplete:', locationName, coords)
    setLocation(locationName)
    setGeocodedCoords(coords)
    setAppState('trivia-list')
  }

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (manualLocation.trim()) {
      setLocation(manualLocation.trim())
      
      // Always clear existing coords and try fresh geocoding
      setGeocodedCoords(null)
      
      // Try to geocode the manual location
      try {
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualLocation.trim())}&limit=1&countrycodes=us`
        // Use CORS proxy for Nominatim
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(geocodeUrl)}`
        console.log('Geocoding URL:', geocodeUrl)
        const response = await fetch(proxyUrl)
        const proxyData = await response.json()
        const data = JSON.parse(proxyData.contents)
        
        console.log('Geocoding response:', data)
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0]
          const coords = { lat: parseFloat(lat), lng: parseFloat(lon) }
          console.log('Manual geocoding result:', coords)
          setGeocodedCoords(coords)
        } else {
          console.warn('No geocoding results found for:', manualLocation.trim())
        }
      } catch (error) {
        console.warn('Geocoding failed:', error)
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
        <div className='flex justify-between items-center mb-8 max-w-6xl mx-auto'>
          <button
            onClick={() => setAppState('splash')}
            className='text-purple-400 font-medium text-base md:text-lg'
          >
            ← Back
          </button>
          
          {/* App title header */}
          <div className='flex items-center gap-3'>
            <h1 className='text-lg md:text-xl font-bold'>
              <span className='text-purple-400'>TRIVIA</span>
              <span className='text-black dark:text-white'>NEARBY</span>
            </h1>
            <div className='flex gap-2'>
              <Search className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
              <Brain className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
              <Beer className='w-4 h-4 md:w-5 md:h-5 text-black dark:text-white' />
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
        <div className='flex flex-col items-center text-center max-w-6xl mx-auto'>
          <div className='max-w-2xl mx-auto'>
            <div className='bg-purple-500/20 rounded-full p-8 md:p-12 mb-8 md:mb-12 inline-block'>
              <MapPin className='w-12 h-12 md:w-20 md:h-20 text-purple-400 fill-purple-400' />
            </div>

            <h2 className='text-2xl md:text-5xl font-semibold mb-4 md:mb-8'>Enter Your Location</h2>
            <p className='text-gray-600 dark:text-gray-400 mb-8 md:mb-12 max-w-sm md:max-w-2xl leading-relaxed text-base md:text-xl mx-auto'>
              Enter your city or zip code to find trivia events near you.
            </p>

            <form
              onSubmit={handleManualLocationSubmit}
              className='w-full max-w-sm md:max-w-lg space-y-4 md:space-y-8 mx-auto'
            >
              <LocationAutocomplete
                value={manualLocation}
                onChange={setManualLocation}
                onSelect={handleLocationSelect}
                placeholder="City or ZIP code"
              />
              <button
                type='submit'
                className='bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 md:py-5 px-8 rounded-lg w-full transition-all duration-200 text-base md:text-xl hover:scale-105 hover:shadow-lg'
              >
                Find Trivia Events
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Splash screen
  return (
    <div
      className='bg-white dark:bg-black w-full min-h-screen text-black dark:text-white px-6 py-4'
      data-theme={theme || 'dark'}
    >
      {/* Header with theme toggle */}
      <div className='flex justify-between items-center mb-6 max-w-6xl mx-auto'>
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
      <div className='flex flex-col items-center text-center max-w-6xl mx-auto'>
        <div className='max-w-2xl mx-auto'>
          {/* App title */}
          <h1 className='text-5xl md:text-7xl font-bold mb-4 md:mb-8'>
            <span className='text-purple-400'>TRIVIA</span>
            <span className='text-black dark:text-white'>NEARBY</span>
          </h1>

          {/* Logo icons */}
          <div className='flex gap-6 md:gap-8 mb-6 md:mb-8 justify-center'>
            <Search className='w-8 h-8 md:w-12 md:h-12 text-black dark:text-white' />
            <Brain className='w-8 h-8 md:w-12 md:h-12 text-black dark:text-white' />
            <Beer className='w-8 h-8 md:w-12 md:h-12 text-black dark:text-white' />
          </div>

          {/* Location pin icon - reduced padding */}
          <div className='bg-purple-500/20 rounded-full p-6 md:p-8 mb-6 md:mb-8 inline-block'>
            <MapPin className='w-12 h-12 md:w-16 md:h-16 text-purple-400 fill-purple-400' />
          </div>

          {/* Headline and description */}
          <h2 className='text-2xl md:text-4xl font-semibold mb-4 md:mb-6'>Find Trivia Near You</h2>
          <p className='text-gray-600 dark:text-gray-400 mb-4 md:mb-8 max-w-sm md:max-w-2xl leading-relaxed text-base md:text-lg mx-auto'>
            Discover the best trivia nights at bars and restaurants in your area.
          </p>

          {/* Share location button */}
          <div className='w-full max-w-sm md:max-w-lg mx-auto mb-4 md:mb-6'>
            <button
              onClick={handleShareLocation}
              disabled={isLoadingLocation}
              className='bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 disabled:cursor-not-allowed text-white font-medium py-4 md:py-5 px-8 rounded-lg w-full transition-all duration-200 flex items-center justify-center gap-2 text-base md:text-xl hover:scale-105 hover:shadow-lg'
            >
              {isLoadingLocation && <Loader2 className='w-5 h-5 animate-spin' />}
              {isLoadingLocation ? 'Getting Location...' : 'Share My Location'}
            </button>
          </div>

          {/* Manual location option */}
          <button
            onClick={() => setAppState('manual-location')}
            className='text-purple-400 font-medium hover:text-purple-300 transition-all duration-200 text-base md:text-xl hover:scale-105'
          >
            Enter location manually
          </button>

          {/* Combined disclaimer text */}
          <div className='text-gray-500 text-sm md:text-base mt-3 md:mt-6 max-w-sm md:max-w-2xl leading-relaxed space-y-2 mx-auto'>
            <p>We only use your location to find trivia events near you. We don't store or share your precise location.</p>
            <p>Event details may change. Please check with venues to confirm current schedules.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
