import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './context/theme_context'

const AppRouterSimple: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/test" element={<div style={{padding: '20px', color: 'red', fontSize: '24px'}}>Test Route Working!</div>} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default AppRouterSimple