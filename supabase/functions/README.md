# Supabase Edge Functions

This directory contains Edge Functions for the Trivia Nearby application.

## Functions

### 1. `process-venue-images`
Processes a single venue's image from Google Places API and stores it in Supabase Storage.

**Endpoint**: `POST /functions/v1/process-venue-images`

**Request Body**:
```json
{
  "venue_id": "uuid",
  "google_photo_reference": "string"
}
```

**Response**:
```json
{
  "success": true,
  "venue_id": "uuid",
  "thumbnail_url": "https://...",
  "message": "Image processed successfully"
}
```

### 2. `process-venue-images-bulk`
Bulk processes multiple venues that have `google_photo_reference` but no `thumbnail_url`.

**Endpoint**: `POST /functions/v1/process-venue-images-bulk`

**Request Body** (optional):
```json
{
  "limit": 10  // Max number of venues to process (default: 10)
}
```

**Response**:
```json
{
  "success": true,
  "message": "Processed X venues successfully, Y failed",
  "processed": 8,
  "failed": 2,
  "results": [...]
}
```

## Deployment

### 1. Set Environment Variables

First, set the required secrets in your Supabase project:

```bash
# Set Google Places API key
supabase secrets set GOOGLE_PLACES_API_KEY=your_api_key_here
```

### 2. Deploy Functions

Deploy individual functions:

```bash
# Deploy single image processor
supabase functions deploy process-venue-images

# Deploy bulk processor
supabase functions deploy process-venue-images-bulk
```

Or deploy all functions:

```bash
supabase functions deploy
```

### 3. Test Functions

Test locally:
```bash
# Run locally
supabase functions serve process-venue-images

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/process-venue-images' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"venue_id":"uuid","google_photo_reference":"reference"}'
```

Test in production:
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-venue-images' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"venue_id":"uuid","google_photo_reference":"reference"}'
```

## Storage Bucket

The functions automatically create a `venue-thumbnails` bucket if it doesn't exist with:
- Public access enabled
- 5MB file size limit
- Allowed MIME types: image/jpeg, image/png, image/webp

## Cost Optimization

- The bulk processor limits concurrency to 3 parallel requests to avoid Google API rate limits
- Includes 500ms delay between batches
- Default limit is 10 venues per bulk call to prevent timeouts
- Images are resized to max 800x600 pixels to optimize storage

## Database Schema

Ensure your database has the required field:
```sql
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS image_processed_at TIMESTAMP WITH TIME ZONE;
```