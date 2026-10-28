import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './fonts.css'
import App from './App.jsx'
import { initData } from './js/data.js'
import './js/offline.js' // service worker + install prompt capture

// Load public/data/manifest.json (data versions) first; see src/js/data.js.
initData().finally(() =>
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
