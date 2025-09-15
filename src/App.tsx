import React, { useState, useEffect } from 'react'
import CrtLayout from './layouts/CrtLayout'
import WelcomeApp from './apps/WelcomeApp'
import ClockApp from './apps/ClockApp'
import { AdsbApp } from './apps/adsb'
import { WeatherApp } from './apps/weather'
import { DISPLAY_CONFIG } from './shared/consts'
import { themeManager } from './shared/themes'

// Define the available apps
const apps = [
  { component: WelcomeApp, name: 'welcome', displayName: 'Welcome' },
  { component: ClockApp, name: 'clock', displayName: 'Clock' },
  { component: AdsbApp, name: 'adsb', displayName: 'ADS-B Tracker' },
  { component: WeatherApp, name: 'weather', displayName: 'Weather' },
]

const App: React.FC = () => {
  // Determine initial app based on config
  const getInitialAppIndex = () => {
    if (!DISPLAY_CONFIG.ENABLE_CYCLING && DISPLAY_CONFIG.STATIC_APP) {
      const staticAppIndex = apps.findIndex((app) => app.name === DISPLAY_CONFIG.STATIC_APP)
      return staticAppIndex >= 0 ? staticAppIndex : 0
    }
    return 0
  }

  const [currentAppIndex, setCurrentAppIndex] = useState(getInitialAppIndex)

  useEffect(() => {
    // Initialize theme manager (themes are applied automatically)
    console.log(`Current theme: ${themeManager.getCurrentThemeObject().displayName}`)

    // Add keyboard shortcuts for theme switching and app navigation
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'x':
          event.preventDefault()
          setCurrentAppIndex((prevIndex) => (prevIndex + 1) % apps.length)
          console.log(`Switched to app: ${apps[(currentAppIndex + 1) % apps.length].displayName}`)
          break
        case 'z':
          event.preventDefault()
          setCurrentAppIndex((prevIndex) => (prevIndex - 1 + apps.length) % apps.length)
          console.log(
            `Switched to app: ${apps[(currentAppIndex - 1 + apps.length) % apps.length].displayName}`
          )
          break
        case ']':
          event.preventDefault()
          themeManager.nextTheme()
          console.log(`Switched to theme: ${themeManager.getCurrentThemeObject().displayName}`)
          break
        case '[':
          event.preventDefault()
          themeManager.previousTheme()
          console.log(`Switched to theme: ${themeManager.getCurrentThemeObject().displayName}`)
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)

    // Only cycle if cycling is enabled
    let interval: number | undefined
    if (DISPLAY_CONFIG.ENABLE_CYCLING) {
      interval = setInterval(() => {
        setCurrentAppIndex((prevIndex) => (prevIndex + 1) % apps.length)
      }, DISPLAY_CONFIG.APP_CYCLE_TIME)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const CurrentApp = apps[currentAppIndex].component

  return (
    <CrtLayout>
      <CurrentApp />
    </CrtLayout>
  )
}

export default App
