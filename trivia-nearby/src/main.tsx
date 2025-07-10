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

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registered:', registration)
      })
      .catch(error => {
        console.log('ServiceWorker registration failed:', error)
      })
  })
}
