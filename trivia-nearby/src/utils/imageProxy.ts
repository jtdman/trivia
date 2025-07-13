// Since Google Places Photo API has CORS issues when called from browser,
// we'll use the thumbnail_url from Supabase storage instead

export function getProxiedImageUrl(
  googlePhotoReference?: string | null,
  thumbnailUrl?: string | null,
  venueName?: string
): string {
  // Priority: Use thumbnail_url if available (already processed and stored in Supabase)
  if (thumbnailUrl) {
    return thumbnailUrl
  }
  
  // If no thumbnail but has Google reference, we need to process it server-side
  // For now, use fallback since direct Google API calls are blocked
  if (googlePhotoReference) {
    console.warn('Google photo reference exists but no thumbnail_url. Photo needs to be processed server-side.')
  }
  
  // Use fallback image
  return getFallbackImage(venueName || 'venue')
}

// Generate fallback image based on venue type/name
function getFallbackImage(venueName: string): string {
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