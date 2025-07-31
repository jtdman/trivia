import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter.tsx'
import { ThemeProvider } from './context/theme_context.tsx'
// import { HelmetProvider } from 'react-helmet-async'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <HelmetProvider> */}
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    {/* </HelmetProvider> */}
  </StrictMode>
)

// Service worker disabled temporarily
// TODO: Re-enable for production with proper dev exclusions
