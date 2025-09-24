import React, { useState, useEffect } from 'react'
import CrtLayout from './layouts/CrtLayout'
import WelcomeApp from './apps/WelcomeApp'
import ClockApp from './apps/ClockApp'
import { AdsbApp } from './apps/adsb'
import { WeatherApp } from './apps/weather'
import config from './config/config.json'
import { themeManager } from './shared/themes'

// Define the available apps
const apps = [
  { component: WelcomeApp, name: 'welcome', displayName: 'Welcome' },
  { component: ClockApp, name: 'clock', displayName: 'Clock' },
  { component: AdsbApp, name: 'adsb', displayName: 'ADS-B Tracker' },
  { component: WeatherApp, name: 'weather', displayName: 'Weather' },
]

const App: React.FC = () => {
  // Get apps available for cycling (excludes welcome app if configured)
  const getCyclingApps = () => {
    return config.display.enableCycling && (config.display.skipWelcomeInCycling ?? true)
      ? apps.filter((app) => app.name !== 'welcome') 
      : apps
  }

  // Determine initial app based on config
  const getInitialAppIndex = () => {
    if (!config.display.enableCycling && config.display.staticApp) {
      const staticAppIndex = apps.findIndex((app) => app.name === config.display.staticApp)
      return staticAppIndex >= 0 ? staticAppIndex : 0
    }
    // If cycling is enabled and welcome should be skipped, start with the second app
    return config.display.enableCycling && (config.display.skipWelcomeInCycling ?? true) ? 1 : 0
  }

  const [currentAppIndex, setCurrentAppIndex] = useState(getInitialAppIndex)

  useEffect(() => {
    // Initialize theme manager (themes are applied automatically)
    console.log(`Current theme: ${themeManager.getCurrentThemeObject().displayName}`)

    // Add keyboard shortcuts for theme switching and app navigation
    const handleKeyPress = (event: KeyboardEvent) => {
      const cyclingApps = getCyclingApps()
      
      switch (event.key.toLowerCase()) {
        case 'x':
          event.preventDefault()
          if (config.display.enableCycling && (config.display.skipWelcomeInCycling ?? true)) {
            // Navigate within cycling apps only (excludes welcome)
            const currentCyclingIndex = cyclingApps.findIndex((app) => app === apps[currentAppIndex])
            const nextCyclingIndex = (currentCyclingIndex + 1) % cyclingApps.length
            const nextAppIndex = apps.findIndex((app) => app === cyclingApps[nextCyclingIndex])
            setCurrentAppIndex(nextAppIndex)
            console.log(`Switched to app: ${cyclingApps[nextCyclingIndex].displayName}`)
          } else {
            setCurrentAppIndex((prevIndex) => (prevIndex + 1) % apps.length)
            console.log(`Switched to app: ${apps[(currentAppIndex + 1) % apps.length].displayName}`)
          }
          break
        case 'z':
          event.preventDefault()
          if (config.display.enableCycling && (config.display.skipWelcomeInCycling ?? true)) {
            // Navigate within cycling apps only (excludes welcome)
            const currentCyclingIndex = cyclingApps.findIndex((app) => app === apps[currentAppIndex])
            const prevCyclingIndex = (currentCyclingIndex - 1 + cyclingApps.length) % cyclingApps.length
            const prevAppIndex = apps.findIndex((app) => app === cyclingApps[prevCyclingIndex])
            setCurrentAppIndex(prevAppIndex)
            console.log(`Switched to app: ${cyclingApps[prevCyclingIndex].displayName}`)
          } else {
            setCurrentAppIndex((prevIndex) => (prevIndex - 1 + apps.length) % apps.length)
            console.log(
              `Switched to app: ${apps[(currentAppIndex - 1 + apps.length) % apps.length].displayName}`
            )
          }
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
    if (config.display.enableCycling) {
      const cyclingApps = getCyclingApps()
      interval = setInterval(() => {
        setCurrentAppIndex((prevIndex) => {
          // Find current app in cycling apps and move to next
          const currentCyclingIndex = cyclingApps.findIndex((app) => app === apps[prevIndex])
          const nextCyclingIndex = (currentCyclingIndex + 1) % cyclingApps.length
          return apps.findIndex((app) => app === cyclingApps[nextCyclingIndex])
        })
      }, config.display.appCycleTime)
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
