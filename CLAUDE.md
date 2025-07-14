# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a trivia directory app for finding nearby trivia events. The project consists of:

- **Root directory**: Contains shared dependencies and project documentation
- **trivia-nearby/**: React + TypeScript + Vite application with dark theme support
- **trivia-backend/**: Node.js backend with Supabase integration and data scraping

The app is designed as a mobile-first web application that helps users find trivia events based on location.

### Current Status
- **Production URL**: https://trivianearby.com
- **Deployment**: Hetzner VPS
- **Domain**: trivianearby.com (may expand to .co.uk depending on success)
- **Data Sources**: Active scraping from Challenge Entertainment, NerdyTalk, and other trivia providers

## Development Commands

All development commands should be run from the `trivia-nearby/` directory:

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

## Architecture & Key Components

### Frontend Stack
- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS v4** for styling
- **SWC** for fast React refresh
- **ESLint** with TypeScript and React configurations

### Project Structure
- `src/App.tsx`: Main application component with theme toggle
- `src/context/theme_context.tsx`: Theme management context (dark/light mode)
- `src/main.tsx`: Application entry point
- `src/index.css`: Global styles and Tailwind imports

### Theme System
The app uses a custom theme context that:
- Defaults to dark theme (as per PRD requirements)
- Persists theme preference in localStorage
- Sets `data-theme` attribute on document element
- Provides theme toggle functionality

### Backend Architecture (Active)
- **Supabase** with PostGIS for location-based queries
- **Database schema**: venues, events, trivia_providers, users, admin_users
- **Data Collection**: N8N workflows for automated scraping
- **Authentication**: Supabase Auth with admin dashboard
- **API**: REST endpoints for venue/event data
- **Location Services**: Nominatim/OpenStreetMap geocoding with Vite proxy
- Database schema includes: venues, events, trivia_providers, users
- Authentication system for venue owners to manage events
- **trivia-backend/** directory contains data processing scripts

### Backend Commands

All backend commands should be run from the `trivia-backend/` directory using **pnpm**:

```bash
# Install backend dependencies
pnpm install

# Import venues from providers
pnpm import-nerdytalk

# Validate venues with Google Places API (downloads images)
pnpm validate-places validate --limit 10

# Process existing photos (batch download)
pnpm process-photos

# Show validation statistics
pnpm validate-places stats
```

## Important Technical Details

### TypeScript Configuration
- Uses project references with separate configs for app and node
- Configured for strict type checking
- SWC plugin for fast compilation

### Styling Approach
- Mobile-first responsive design
- Dark theme as primary/default theme
- Tailwind CSS v4 with Vite plugin integration
- Uses Lucide React and Tabler icons (from root dependencies)

### Development Workflow
- ESLint configured for TypeScript, React hooks, and React refresh
- Vite provides hot module replacement for fast development
- pnpm as package manager (note: both root and trivia-nearby use pnpm)

## Key Requirements from PRD

1. Mobile-first, responsive design with dark theme default ✅
2. Location-based event discovery ✅
3. User authentication for venue owners ✅
4. Event management (add/edit) functionality ✅
5. Event cards showing: photo, name, venue, distance, address, time, prize money ✅

## Partnership Strategy

### Active Partnership
- **NerdyTalk**: Local Tennessee trivia provider, data sharing agreement in progress
- **Challenge Entertainment**: Automated scraping of event data

### Target Partnerships
- **JAMMIN' Trivia**: Multi-state presence (CO, GA, OR) - Contact: steve@myjammindjs.com
- **Trivia Nation**: 220+ shows weekly in Florida - Contact: admin@trivianation.com
- **OutSpoken Entertainment**: Atlanta metro area - Contact: (404) 273-1645
- **Team Trivia Georgia**: Atlanta region - Contact: (478) 887-4842
- **Dirty South Trivia**: Southeast region - Contact: dirtysouthtrivia.com/contact