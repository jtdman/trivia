## Relevant Files

- `index.html` - The main HTML entry point for the Vite application.
- `src/main.tsx` - The main React render entry point.
- `vite.config.ts` - Vite configuration file.
- `src/index.css` - Global CSS file including Tailwind directives.
- `src/App.tsx` - The root React component.
- `src/components/EventCard.tsx` - Component to display a single trivia event.
- `src/components/EventList.tsx` - Component to display the list of all nearby events.
- `src/components/LocationPrompt.tsx` - Component to handle geolocation.
- `src/components/AuthForm.tsx` - Component for user sign-up and sign-in.
- `src/components/EventForm.tsx` - Form for authenticated users to add or edit events.
- `lib/supabase.ts` - Supabase client and helper functions.
- `lib/utils.ts` - Utility functions.

### Notes

- Unit tests should be placed alongside the code files they are testing (e.g., `EventCard.test.tsx`).
- Use `npm test` to run the test suite.

## Tasks

- [ ] 1.0 Project Setup & Foundation

  - [x] 1.1 Initialize a new Vite (React) project.
  - [x] 1.2 Install and configure Tailwind CSS.
  - [ ] 1.3 Configure the dark theme as the default in `tailwind.config.js`.
  - [ ] 1.4 Install Lucide React and Tabler icon libraries.
  - [ ] 1.5 Set up the Supabase client and environment variables.

- [ ] 2.0 Core UI & Event Display

  - [ ] 2.1 Create the `EventCard.tsx` component based on the PRD screenshot.
  - [ ] 2.2 Create the `EventList.tsx` component to render a list of event cards.
  - [ ] 2.3 Implement the `LocationPrompt.tsx` component to request geolocation or accept manual input.
  - [ ] 2.4 Develop the main page (`src/app/page.tsx`) to conditionally render `LocationPrompt` or `EventList`.

- [ ] 3.0 Data & Backend Integration

  - [ ] 3.1 Implement Supabase functions in `lib/supabase.ts` to fetch events from the database.
  - [ ] 3.2 Write the PostGIS query to fetch events sorted by distance from a given coordinate.
  - [ ] 3.3 Connect the frontend to fetch and display events based on user's location.
  - [ ] 3.4 Implement filtering logic to show events for the current day of the week by default.

- [ ] 4.0 User Authentication & Event Management

  - [ ] 4.1 Create the `AuthForm.tsx` component for sign-up and sign-in using Supabase Auth.
  - [ ] 4.2 Create the `EventForm.tsx` for submitting and editing event data.
  - [ ] 4.3 Implement the "Add or Edit Event" page and protect it behind authentication.
  - [ ] 4.4 Write Supabase functions to insert and update events, linking them to the `user.id`.

- [ ] 5.0 Finalization & Deployment
  - [ ] 5.1 Conduct a final review of all components and functionality.
  - [ ] 5.2 Write basic unit tests for critical components like `EventCard` and utility functions.
  - [ ] 5.3 Prepare the application for deployment (e.g., Vercel, Netlify).
