import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import faviconUrl from './assets/favicon.svg'

// Set from here rather than index.html: vite-plugin-singlefile leaves a
// <link rel="icon"> pointing at a separate file, and the app ships as one
// self-contained .html. Imported, the icon is inlined into this bundle.
const icon = document.createElement('link')
icon.rel = 'icon'
icon.type = 'image/svg+xml'
icon.href = faviconUrl
document.head.appendChild(icon)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
