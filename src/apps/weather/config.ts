// Weather App Configuration

export const WEATHER_CONFIG = {
  // API Configuration
  WEATHER_BASE_URL: 'https://api.open-meteo.com/v1/forecast',
  AIR_QUALITY_BASE_URL: 'https://air-quality-api.open-meteo.com/v1/air-quality',

  // Default location (Philadelphia, PA - matching ADSB app)
  DEFAULT_LOCATION: {
    name: 'Philadelphia, PA',
    latitude: 39.9526,
    longitude: -75.1652,
    timezone: 'America/New_York',
  },

  // Update intervals
  REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minutes

  // Display settings
  FORECAST_HOURS: 12, // Show next 12 hours
  MAX_HOURLY_ITEMS: 8, // Limit displayed hourly items for CRT aesthetic
} as const

// WMO Weather interpretation codes for CSS icon classes
export const WEATHER_ICON_CLASSES: Record<number, string> = {
  0: 'sunny', // Clear sky
  1: 'sunny', // Mainly clear
  2: 'sun-shower', // Partly cloudy
  3: 'cloudy', // Overcast
  45: 'cloudy', // Fog
  48: 'cloudy', // Depositing rime fog
  51: 'sun-shower', // Drizzle: Light
  53: 'rainy', // Drizzle: Moderate
  55: 'rainy', // Drizzle: Dense
  56: 'rainy', // Freezing Drizzle: Light
  57: 'rainy', // Freezing Drizzle: Dense
  61: 'rainy', // Rain: Slight
  63: 'rainy', // Rain: Moderate
  65: 'rainy', // Rain: Heavy
  66: 'flurries', // Freezing Rain: Light
  67: 'flurries', // Freezing Rain: Heavy
  71: 'flurries', // Snow fall: Slight
  73: 'flurries', // Snow fall: Moderate
  75: 'flurries', // Snow fall: Heavy
  77: 'flurries', // Snow grains
  80: 'sun-shower', // Rain showers: Slight
  81: 'rainy', // Rain showers: Moderate
  82: 'rainy', // Rain showers: Violent
  85: 'flurries', // Snow showers: Slight
  86: 'flurries', // Snow showers: Heavy
  95: 'thunder-storm', // Thunderstorm
  96: 'thunder-storm', // Thunderstorm with slight hail
  99: 'thunder-storm', // Thunderstorm with heavy hail
}

export const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear Sky',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  56: 'Light Freezing Drizzle',
  57: 'Dense Freezing Drizzle',
  61: 'Light Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Light Snow',
  73: 'Moderate Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Light Rain Showers',
  81: 'Moderate Rain Showers',
  82: 'Violent Rain Showers',
  85: 'Light Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Light Hail',
  99: 'Thunderstorm with Heavy Hail',
}

// US AQI Categories
export const AQI_CATEGORIES = {
  good: { min: 0, max: 50, color: '#00e400', description: 'Good' },
  moderate: { min: 51, max: 100, color: '#ffff00', description: 'Moderate' },
  unhealthy_sensitive: {
    min: 101,
    max: 150,
    color: '#ff7e00',
    description: 'Unhealthy for Sensitive Groups',
  },
  unhealthy: { min: 151, max: 200, color: '#ff0000', description: 'Unhealthy' },
  very_unhealthy: { min: 201, max: 300, color: '#8f3f97', description: 'Very Unhealthy' },
  hazardous: { min: 301, max: 500, color: '#7e0023', description: 'Hazardous' },
}

// Helper function to get AQI category from value
export function getAQICategory(aqi: number) {
  if (aqi <= 50) return AQI_CATEGORIES.good
  if (aqi <= 100) return AQI_CATEGORIES.moderate
  if (aqi <= 150) return AQI_CATEGORIES.unhealthy_sensitive
  if (aqi <= 200) return AQI_CATEGORIES.unhealthy
  if (aqi <= 300) return AQI_CATEGORIES.very_unhealthy
  return AQI_CATEGORIES.hazardous
}

// Helper function to get weather icon class from code
export function getWeatherIconClass(code: number): string {
  return WEATHER_ICON_CLASSES[code] || 'cloudy'
}

// Helper function to get weather description from code
export function getWeatherDescription(code: number): string {
  return WEATHER_DESCRIPTIONS[code] || 'Unknown'
}

// Wind direction helper
export function getWindDirection(degrees: number): string {
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ]
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

// Temperature formatting
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`
}

// Wind speed formatting
export function formatWindSpeed(speed: number): string {
  return `${Math.round(speed)} km/h`
}

// Precipitation formatting
export function formatPrecipitation(precip: number): string {
  return `${precip.toFixed(1)}mm`
}
