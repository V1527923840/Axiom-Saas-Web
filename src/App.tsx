import { Suspense, useEffect } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Providers } from '@/components/providers'
import { AppRouter } from '@/components/router/app-router'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { initGTM } from '@/utils/analytics'

// Get basename from environment (for deployment) or use empty string for development
const basename = import.meta.env.VITE_BASENAME || ''

function App() {
  // Initialize GTM on app load
  useEffect(() => {
    initGTM();
  }, []);

  return (
    <div className="font-sans antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
      <Router basename={basename}>
        <Providers>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>}>
            <AppRouter />
          </Suspense>
        </Providers>
      </Router>
    </div>
  )
}

export default App