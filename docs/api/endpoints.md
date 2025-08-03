# API Endpoints Documentation

This document defines the API contract between frontend/admin and backend.

## Base URL
- Production: `https://api.trivianearby.com`
- Development: `http://localhost:3000`

## Authentication
- Uses Supabase Auth
- Bearer token in Authorization header
- Admin endpoints require admin role

## Endpoints

### Public Endpoints

#### Get Events Near Location
```
GET /api/events/nearby
```

Query Parameters:
- `lat` (required): Latitude
- `lng` (required): Longitude  
- `radius` (optional): Radius in miles (default: 10, max: 50)
- `date` (optional): ISO date string (default: today)
- `days` (optional): Number of days to include (default: 1, max: 7)

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Trivia Night at Joe's Bar",
      "venue": {
        "id": "uuid",
        "name": "Joe's Bar",
        "address": "123 Main St, Nashville, TN",
        "lat": 36.1627,
        "lng": -86.7816,
        "phone": "615-555-0123",
        "website": "https://joesbar.com",
        "photo_url": "https://..."
      },
      "start_time": "2024-01-15T19:00:00Z",
      "end_time": "2024-01-15T21:00:00Z",
      "recurrence_rule": "RRULE:FREQ=WEEKLY;BYDAY=TU",
      "prize_info": "$100 gift card",
      "registration_required": false,
      "registration_link": null,
      "distance_miles": 2.5,
      "provider": {
        "id": "uuid",
        "name": "Challenge Entertainment",
        "website": "https://..."
      }
    }
  ],
  "meta": {
    "total": 15,
    "radius_miles": 10,
    "center": {
      "lat": 36.1627,
      "lng": -86.7816
    }
  }
}
```

#### Get Event Details
```
GET /api/events/:id
```

Response:
```json
{
  "data": {
    "id": "uuid",
    "name": "Trivia Night",
    "description": "Join us for weekly trivia...",
    "venue": { /* venue object */ },
    "start_time": "2024-01-15T19:00:00Z",
    "end_time": "2024-01-15T21:00:00Z",
    "recurrence_rule": "RRULE:FREQ=WEEKLY;BYDAY=TU",
    "prize_info": "$100 gift card",
    "registration_required": false,
    "registration_link": null,
    "categories": ["general", "themed"],
    "difficulty": "medium",
    "team_size": "2-6 players",
    "notes": "Happy hour until 7pm",
    "provider": { /* provider object */ },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-10T00:00:00Z"
  }
}
```

#### Search Venues
```
GET /api/venues/search
```

Query Parameters:
- `q` (required): Search query
- `lat` (optional): User latitude for distance sorting
- `lng` (optional): User longitude for distance sorting
- `limit` (optional): Max results (default: 20)

### Authenticated Endpoints

#### User Favorites
```
GET /api/user/favorites
POST /api/user/favorites/:eventId
DELETE /api/user/favorites/:eventId
```

#### User Preferences
```
GET /api/user/preferences
PUT /api/user/preferences
```

Body for PUT:
```json
{
  "notification_radius": 10,
  "notification_days": ["tuesday", "wednesday"],
  "favorite_venues": ["uuid1", "uuid2"],
  "email_notifications": true,
  "push_notifications": false
}
```

### Admin Endpoints

All admin endpoints require `admin` role in auth token.

#### Venue Management
```
GET /api/admin/venues
GET /api/admin/venues/:id
POST /api/admin/venues
PUT /api/admin/venues/:id
DELETE /api/admin/venues/:id
POST /api/admin/venues/:id/approve
POST /api/admin/venues/:id/reject
```

#### Event Management  
```
GET /api/admin/events
GET /api/admin/events/:id
POST /api/admin/events
PUT /api/admin/events/:id
DELETE /api/admin/events/:id
POST /api/admin/events/bulk-import
```

#### Provider Management
```
GET /api/admin/providers
POST /api/admin/providers
PUT /api/admin/providers/:id
POST /api/admin/providers/:id/sync
```

#### Reports
```
GET /api/admin/reports/venues
GET /api/admin/reports/events
GET /api/admin/reports/users
GET /api/admin/reports/activity
```

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Human readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
```

Common error codes:
- `UNAUTHORIZED` - Missing or invalid auth token
- `FORBIDDEN` - Lacks required permissions
- `NOT_FOUND` - Resource not found
- `INVALID_REQUEST` - Validation error
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error

## Rate Limiting

- Public endpoints: 100 requests per minute
- Authenticated: 500 requests per minute  
- Admin: 1000 requests per minute

Rate limit headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Pagination

List endpoints support pagination:
- `page` (default: 1)
- `limit` (default: 20, max: 100)

Response includes:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```