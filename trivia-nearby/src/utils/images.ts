// Google Places Photo API utilities
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

export function getGooglePlacesPhotoUrl(
  photoReference: string, 
  maxWidth: number = 400,
  maxHeight: number = 300
): string {
  if (!GOOGLE_PLACES_API_KEY || !photoReference) {
    return getFallbackImage('venue')
  }

  const params = new URLSearchParams({
    photo_reference: photoReference,
    maxwidth: maxWidth.toString(),
    maxheight: maxHeight.toString(),
    key: GOOGLE_PLACES_API_KEY
  })

  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`
}

// Generate fallback image based on venue type/name
export function getFallbackImage(venueName: string): string {
  const name = venueName.toLowerCase()
  
  // Categorize venues by type for better fallback images
  if (name.includes('brewery') || name.includes('brewing')) {
    return 'https://images.unsplash.com/photo-1571342810885-dd9dd5cbe7e7?w=400&h=300&fit=crop&auto=format'
  }
  
  if (name.includes('pub') || name.includes('tavern')) {
    return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop&auto=format'
  }
  
  if (name.includes('restaurant') || name.includes('grill')) {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop&auto=format'
  }
  
  if (name.includes('bar') || name.includes('lounge')) {
    return 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop&auto=format'
  }
  
  if (name.includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop&auto=format'
  }
  
  // Default trivia/bar scene
  return 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=400&h=300&fit=crop&auto=format'
}

// Smart image URL generator
export function getVenueImageUrl(
  googlePhotoReference?: string | null,
  thumbnailUrl?: string | null,
  venueName?: string
): string {
  // Priority: thumbnail_url > google photo > fallback
  if (thumbnailUrl) {
    return thumbnailUrl
  }
  
  if (googlePhotoReference) {
    return getGooglePlacesPhotoUrl(googlePhotoReference, 400, 300)
  }
  
  return getFallbackImage(venueName || 'venue')
}

// Image component props helper
export function getImageProps(
  googlePhotoReference?: string | null,
  thumbnailUrl?: string | null,
  venueName?: string
) {
  const imageUrl = getVenueImageUrl(googlePhotoReference, thumbnailUrl, venueName)
  const isGooglePhoto = !!googlePhotoReference && !thumbnailUrl
  const isFallback = !googlePhotoReference && !thumbnailUrl
  
  return {
    src: imageUrl,
    alt: `${venueName || 'Venue'} photo`,
    className: `w-full h-full object-cover ${isGooglePhoto ? 'google-photo' : ''} ${isFallback ? 'fallback-image' : ''}`,
    loading: 'lazy' as const,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      // Silently fallback to default image on error
      if (!e.currentTarget.src.includes('unsplash.com')) {
        e.currentTarget.src = getFallbackImage(venueName || 'venue')
      }
    }
  }
}