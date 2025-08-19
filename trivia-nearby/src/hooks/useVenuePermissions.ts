import { useMemo } from 'react'
import { useAuth } from '../context/auth_context'
import type { Venue } from '../lib/supabase'

interface VenuePermissions {
  canEdit: boolean
  canDelete: boolean
  canEditGoogleData: boolean
  canEditOriginalData: boolean
  canChangeStatus: boolean
  reason?: string
}

export const useVenuePermissions = (venue?: Venue, userOwnsVenue = false): VenuePermissions => {
  const { user, isSuperAdmin, userProfile } = useAuth()

  return useMemo(() => {
    if (!user || !venue) {
      return {
        canEdit: false,
        canDelete: false,
        canEditGoogleData: false,
        canEditOriginalData: false,
        canChangeStatus: false,
        reason: 'No user or venue data'
      }
    }

    const isPlatformAdmin = isSuperAdmin
    const isOwner = userOwnsVenue || venue.created_by === user.id
    const isImported = venue.is_imported === true
    const hasEvents = false // TODO: Check if venue has events
    const needsReview = ['failed', 'needs_review'].includes(venue.verification_status)

    // Platform admin has most permissions
    if (isPlatformAdmin) {
      return {
        canEdit: true,
        canDelete: !hasEvents, // Can't delete if has events
        canEditGoogleData: false, // Never allow editing Google data manually
        canEditOriginalData: !isImported || needsReview, // Can edit original data if not imported or needs review
        canChangeStatus: true,
        reason: isImported && !needsReview ? 'Imported venue data is protected' : undefined
      }
    }

    // Trivia providers (venue owners)
    if (userProfile) {
      if (!isOwner) {
        return {
          canEdit: false,
          canDelete: false,
          canEditGoogleData: false,
          canEditOriginalData: false,
          canChangeStatus: false,
          reason: 'You can only edit venues you own or manage'
        }
      }

      return {
        canEdit: true,
        canDelete: !isImported && !hasEvents, // Can't delete imported venues or venues with events
        canEditGoogleData: false, // Never allow editing Google data
        canEditOriginalData: !isImported || venue.verification_status === 'pending', // Can edit if not imported or pending
        canChangeStatus: false, // Only platform admin can change status
        reason: isImported ? 'Cannot modify imported venue data' : undefined
      }
    }

    // Staff have very limited permissions
    return {
      canEdit: false,
      canDelete: false,
      canEditGoogleData: false,
      canEditOriginalData: false,
      canChangeStatus: false,
      reason: 'Staff role has read-only access'
    }
  }, [user, isSuperAdmin, userProfile, venue, userOwnsVenue])
}

export const useCanCreateVenue = (): boolean => {
  const { isSuperAdmin, hasProviderAccess } = useAuth()
  
  return useMemo(() => {
    return isSuperAdmin || hasProviderAccess
  }, [isSuperAdmin, hasProviderAccess])
}