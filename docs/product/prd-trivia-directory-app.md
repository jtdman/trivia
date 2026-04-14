# Product Requirements Document: Trivia Directory App

## 1. Introduction/Overview

- **Project:** A mobile-first web application for finding nearby trivia events.
- **Goal:** Allow users to easily discover live trivia nights in their area. The web app should be built with a stack that facilitates future deployment to native mobile app stores (iOS/Android).
- **Core Feature:** Users can find events based on their location (or a manually entered location). Venue owners and users can sign up to add and manage event listings.

## 2. Goals

- Develop a functional MVP web application.
- Provide an intuitive, dark-themed, mobile-first user interface.
- Implement a system for users to find events by proximity.
- Implement user authentication for adding/editing events.
- Ensure the data schema is robust enough for initial needs and future expansion.

## 3. User Stories

- As a user, I want to open the app and immediately see a list of trivia events happening today near me, so I can find a game to join.
- As a user, if I decline to share my location, I want to be able to enter my city or zip code so I can still find events.
- As a user, I want to see key details for each event in the list, including the event name, venue, address, time, and distance from me, similar to the provided design mockup.
- As a venue owner, I want to sign up for an account so I can add my trivia night to the directory.
- As a venue owner, I want to be able to edit my event listing to keep the information (like theme or time) up to date.

## 4. Functional Requirements

1.  The application must default to a dark theme.
2.  On first load, the app must request the user's geolocation.
3.  If location is granted, the app will display a list of trivia events, sorted by nearest distance first and filtered to the current day of the week.
4.  If location is denied, the app must present an input field for the user to enter a city or zip code.
5.  The event list items must be styled based on the provided screenshot, displaying a photo, event name, venue name, distance, address, day/time, and prize money.
6.  The application must include a link or button labeled "Add or Edit Event".
7.  Clicking this button will lead to a sign-up/sign-in flow for users and venue owners.
8.  Authenticated users must be able to submit a new event by filling out a form.
9.  Authenticated users must be able to edit events they have submitted.

## 5. Non-Goals (Out of Scope for MVP)

- User reviews or ratings for trivia events.
- Administrator-only dashboards for managing all content.
- Advanced filtering by prize amount, theme, etc.

## 6. Design & Technical Considerations

### UI/UX

- Mobile-first, responsive design.
- Dark theme is the only theme for the MVP.
- Use Tailwind CSS for styling.
- Use Lucide React and Tabler for icons.
- The event card layout should closely match the provided screenshot.

### Technology Stack

- Frontend: React with Vite (chosen for its fast development server and build speeds).
- Backend: Supabase with PostGIS for location-based queries.

### Database Schema

- `venues`: `id`, `google_place_id`, `name`, `address`, `latitude`, `longitude`, `phone_number`, `website_url`, `photo_url`, `created_at`, `updated_at`.
- `events`: `id`, `venue_id`, `provider_id`, `day_of_week`, `start_time`, `theme`, `host_name`, `event_url`, `last_verified_at`, `is_active`, `notes`, `created_at`, `updated_at`.
- `trivia_providers`: `id`, `name`, `website_url`, `created_at`, `updated_at`.
- `users`: Standard Supabase auth user table. Link events to the user who created them.

## 7. Success Metrics

- Successful deployment of the web application MVP.
- Users can successfully find and view trivia events based on location.
- Venue owners can successfully sign up and add/edit an event.

## 8. Open Questions

- What is the data verification process for user-submitted events? Will there be an admin approval step before they go live? (To be decided post-MVP).
