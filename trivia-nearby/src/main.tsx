import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter.tsx'
import { ThemeProvider } from './context/theme_context.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  </StrictMode>,
)

// Register the service worker so the app is eligible for the PWA
// "Add to Home Screen" prompt. The worker itself is network-only (see
// public/service-worker.js) and exists primarily to clear any stale
// caches left behind by a previous SW. Dev builds skip registration
// so HMR works cleanly.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => console.warn('SW registration failed:', err))
  })
}
