import React, { useState, useEffect, useCallback } from 'react'
import { fetchWeatherApi } from 'openmeteo'
import {
  WEATHER_CONFIG,
  getWeatherDescription,
  getAQICategory,
  getWindDirection,
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
} from './config'

interface WeatherStats {
  currentTemp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDirection: string
  precipitation: number
  aqi: number
  aqiCategory: string
  aqiColor: string
}

interface HourlyForecast {
  time: Date
  temperature: number
  weatherCode: number
  precipitation: number
  precipitationProbability: number
  windSpeed: number
  isDay: boolean
}

const WeatherApp: React.FC = () => {
  const [weatherStats, setWeatherStats] = useState<WeatherStats | null>(null)
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Helper function to render weather emoji
  const renderWeatherIcon = (code: number) => {
    // Use weather code directly for more accurate emoji mapping
    switch (code) {
      case 0: // Clear sky
      case 1: // Mainly clear
        return <div className="text-8xl">☀️</div>
      case 2: // Partly cloudy
        return <div className="text-8xl">⛅</div>
      case 3: // Overcast
      case 45: // Fog
      case 48: // Depositing rime fog
        return <div className="text-8xl">☁️</div>
      case 51: // Light drizzle
      case 56: // Light freezing drizzle
      case 80: // Light rain showers
        return <div className="text-8xl">🌦️</div>
      case 53: // Moderate drizzle
      case 55: // Dense drizzle
      case 57: // Dense freezing drizzle
      case 61: // Light rain
      case 63: // Moderate rain
      case 65: // Heavy rain
      case 81: // Moderate rain showers
      case 82: // Violent rain showers
        return <div className="text-8xl">🌧️</div>
      case 66: // Light freezing rain
      case 67: // Heavy freezing rain
      case 71: // Light snow
      case 73: // Moderate snow
      case 75: // Heavy snow
      case 77: // Snow grains
      case 85: // Light snow showers
      case 86: // Heavy snow showers
        return <div className="text-8xl">🌨️</div>
      case 95: // Thunderstorm
      case 96: // Thunderstorm with slight hail
      case 99: // Thunderstorm with heavy hail
        return <div className="text-8xl">⛈️</div>
      default:
        return <div className="text-8xl">☁️</div>
    }
  }

  const fetchWeatherData = useCallback(async () => {
    try {
      setError(null)
      console.log('Fetching weather data for:', WEATHER_CONFIG.DEFAULT_LOCATION)

      // Fetch weather data
      const weatherParams = {
        latitude: WEATHER_CONFIG.DEFAULT_LOCATION.latitude,
        longitude: WEATHER_CONFIG.DEFAULT_LOCATION.longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'weather_code',
          'wind_speed_10m',
          'wind_direction_10m',
          'is_day',
        ],
        hourly: [
          'temperature_2m',
          'weather_code',
          'precipitation',
          'precipitation_probability',
          'wind_speed_10m',
          'is_day',
        ],
        timezone: WEATHER_CONFIG.DEFAULT_LOCATION.timezone,
        forecast_days: 1,
      }

      // Fetch air quality data
      const airQualityParams = {
        latitude: WEATHER_CONFIG.DEFAULT_LOCATION.latitude,
        longitude: WEATHER_CONFIG.DEFAULT_LOCATION.longitude,
        current: ['us_aqi', 'pm2_5', 'pm10'],
        timezone: WEATHER_CONFIG.DEFAULT_LOCATION.timezone,
        forecast_days: 1,
      }

      const [weatherResponses, airQualityResponses] = await Promise.all([
        fetchWeatherApi(WEATHER_CONFIG.WEATHER_BASE_URL, weatherParams),
        fetchWeatherApi(WEATHER_CONFIG.AIR_QUALITY_BASE_URL, airQualityParams),
      ])

      // Process weather data
      const weatherResponse = weatherResponses[0]
      const current = weatherResponse.current()!
      const hourly = weatherResponse.hourly()!

      // Process current weather
      const currentTemp = current.variables(0)!.value() // temperature_2m
      const humidity = current.variables(1)!.value() // relative_humidity_2m
      const feelsLike = current.variables(2)!.value() // apparent_temperature
      const windSpeed = current.variables(4)!.value() // wind_speed_10m
      const windDirection = current.variables(5)!.value() // wind_direction_10m

      // Process air quality data
      const airQualityResponse = airQualityResponses[0]
      const airQualityCurrent = airQualityResponse.current()!
      const aqi = airQualityCurrent.variables(0)!.value() // us_aqi
      const aqiCategory = getAQICategory(aqi)

      // Process hourly forecast (next 12 hours)
      const hourlyData: HourlyForecast[] = []

      // Get enough time steps to ensure we have current + 5 hours
      const timeSteps = Math.min(24, 168) // Get 24 hours to ensure we have enough data

      for (let i = 0; i < timeSteps; i++) {
        const time = new Date((Number(hourly.time()) + i * hourly.interval()) * 1000)

        // Safely get values with null checks
        const temperature = hourly.variables(0)!.values(i) ?? 0
        const weatherCodeValue = hourly.variables(1)!.values(i) ?? 0
        const precipitation = hourly.variables(2)!.values(i) ?? 0
        const precipitationProbability = hourly.variables(3)!.values(i) ?? 0
        const windSpeed = hourly.variables(4)!.values(i) ?? 0
        const isDay = (hourly.variables(5)!.values(i) ?? 0) === 1

        hourlyData.push({
          time,
          temperature,
          weatherCode: weatherCodeValue,
          precipitation,
          precipitationProbability,
          windSpeed,
          isDay,
        })
      }

      setWeatherStats({
        currentTemp,
        feelsLike,
        humidity,
        windSpeed,
        windDirection: getWindDirection(windDirection),
        precipitation: 0, // Current precipitation not available in this setup
        aqi,
        aqiCategory: aqiCategory.description,
        aqiColor: aqiCategory.color,
      })

      // Find the current hour in the hourly data based on actual timestamps
      const currentTime = new Date()
      
      console.log(`Current time: ${currentTime.toISOString()}, Total hourly data: ${hourlyData.length}`)

      // Find the closest current hour in the data (the first entry should be current or very recent)
      let currentHourIndex = 0
      let minTimeDiff = Math.abs(hourlyData[0].time.getTime() - currentTime.getTime())
      
      for (let i = 1; i < Math.min(3, hourlyData.length); i++) {
        const timeDiff = Math.abs(hourlyData[i].time.getTime() - currentTime.getTime())
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff
          currentHourIndex = i
        }
      }

      console.log(`Current hour index: ${currentHourIndex}, time: ${hourlyData[currentHourIndex].time.toISOString()}`)

      // Get current weather and exactly 5 hours from now
      const futureHourIndex = Math.min(currentHourIndex + 5, hourlyData.length - 1)
      console.log(`Future hour index: ${futureHourIndex}, time: ${hourlyData[futureHourIndex].time.toISOString()}`)

      const todaysForecast = [
        hourlyData[currentHourIndex], // Current hour
        hourlyData[futureHourIndex], // 5 hours from now (or last available)
      ].filter(Boolean) // Remove any undefined entries

      console.log(`Forecast items: ${todaysForecast.length}`)
      console.log(`NOW: ${todaysForecast[0]?.time.toLocaleString()}`)
      console.log(`+5 HOURS: ${todaysForecast[1]?.time.toLocaleString()}`)

      setHourlyForecast(todaysForecast)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch weather data:', err)

      let errorMessage = 'Failed to fetch weather data'
      if (err instanceof Error) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchWeatherData()

    // Set up periodic updates
    const interval = setInterval(fetchWeatherData, WEATHER_CONFIG.REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchWeatherData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <h1 className="text-6xl md:text-8xl animate-pulse">WEATHER STATION</h1>
        <p className="text-3xl md:text-4xl opacity-80">Loading weather data...</p>
        <div className="flex space-x-2 mt-8">
          <span className="animate-bounce delay-0">▓</span>
          <span className="animate-bounce delay-75">▓</span>
          <span className="animate-bounce delay-150">▓</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <h1 className="text-6xl md:text-8xl text-red-400">WEATHER ERROR</h1>
        <p className="text-2xl md:text-3xl opacity-80 text-center max-w-4xl">{error}</p>
        <p className="text-xl opacity-60">
          Retrying in {WEATHER_CONFIG.REFRESH_INTERVAL / 1000}s...
        </p>
      </div>
    )
  }

  if (!weatherStats) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <h1 className="text-6xl md:text-8xl text-yellow-400">NO DATA</h1>
        <p className="text-2xl md:text-3xl opacity-80">Weather data unavailable</p>
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden p-4 flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-6xl md:text-8xl font-bold">WEATHER STATION</h1>
          <div className="text-right text-lg opacity-80">
            <div className="text-xl font-bold">{WEATHER_CONFIG.DEFAULT_LOCATION.name}</div>
            {lastUpdate && (
              <div className="text-lg">Updated: {lastUpdate.toLocaleTimeString()}</div>
            )}
          </div>
        </div>

        {/* Current Weather Stats */}
        <div className="grid grid-cols-4 gap-4 text-center text-lg mb-6">
          <div
            className="border p-3 bg-black/50"
            style={{ borderColor: `rgb(var(--crt-primary))` }}
          >
            <div className="text-4xl font-bold">{formatTemperature(weatherStats.currentTemp)}</div>
            <div className="opacity-80 text-lg">TEMPERATURE</div>
            <div className="text-sm opacity-60">
              Feels {formatTemperature(weatherStats.feelsLike)}
            </div>
          </div>
          <div
            className="border p-3 bg-black/50"
            style={{ borderColor: `rgb(var(--crt-primary))` }}
          >
            <div className="text-4xl font-bold">{weatherStats.humidity}%</div>
            <div className="opacity-80 text-lg">HUMIDITY</div>
          </div>
          <div
            className="border p-3 bg-black/50"
            style={{ borderColor: `rgb(var(--crt-primary))` }}
          >
            <div className="text-4xl font-bold">{formatWindSpeed(weatherStats.windSpeed)}</div>
            <div className="opacity-80 text-lg">WIND</div>
            <div className="text-sm opacity-60">{weatherStats.windDirection}</div>
          </div>
          <div
            className="border p-3 bg-black/50"
            style={{ borderColor: `rgb(var(--crt-primary))` }}
          >
            <div className="text-4xl font-bold" style={{ color: weatherStats.aqiColor }}>
              {Math.round(weatherStats.aqi)}
            </div>
            <div className="opacity-80 text-lg">AQI</div>
            <div className="text-sm opacity-60" style={{ color: weatherStats.aqiColor }}>
              {weatherStats.aqiCategory}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Forecast */}
      <div className="flex-1">
        <h2 className="text-3xl font-bold mb-4">TODAY'S FORECAST</h2>
        <div className="grid grid-cols-2 gap-6">
          {hourlyForecast.map((hour, index) => (
            <div
              key={index}
              className="border p-4 bg-black/50 text-center"
              style={{ borderColor: `rgb(var(--crt-primary))` }}
            >
              <div className="text-lg font-bold mb-2">
                {index === 0 ? 'NOW' : `+${Math.round((hour.time.getTime() - hourlyForecast[0].time.getTime()) / (1000 * 60 * 60))} HOURS`}
              </div>
              <div className="text-sm opacity-60 mb-2">
                {hour.time.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
              <div className="mb-2 flex justify-center">{renderWeatherIcon(hour.weatherCode)}</div>
              <div className="text-xl font-bold mb-1">{formatTemperature(hour.temperature)}</div>
              <div className="text-sm opacity-80 mb-1">
                {getWeatherDescription(hour.weatherCode)}
              </div>
              {hour.precipitation > 0 && (
                <div className="text-sm opacity-60">{formatPrecipitation(hour.precipitation)}</div>
              )}
              {hour.precipitationProbability > 0 && (
                <div className="text-sm opacity-60">
                  {Math.round(hour.precipitationProbability)}% chance
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WeatherApp
