import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import NewApp from './NewApp.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core'

// The web app caches itself for instant, offline-capable loads. A new deploy is
// applied straight away if it's found while the page is still opening; otherwise
// the next time the page is hidden (app switched away), so nobody gets reloaded
// mid-hole. Queued offline scores live in localStorage and survive the reload.
// The iOS app ships its own files, so it skips this.
if (!Capacitor.isNativePlatform()) {
  const openedAt = Date.now()
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (Date.now() - openedAt < 10000) return updateSW(true)
      const onHide = () => { if (document.hidden) updateSW(true) }
      document.addEventListener('visibilitychange', onHide)
    },
    // A page left open on the course never navigates, so poll for new deploys.
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => reg.update(), 30 * 60 * 1000)
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <NewApp />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
