import type {
  Aircraft,
  AdsbResponse,
  LocationQuery,
  AdsbApiOptions,
  AircraftTrail,
  AircraftPosition,
} from '../types/adsb'
import { AdsbApiError, AdsbRateLimitError } from '../types/adsb'
import { ADSB_CONFIG, ADSB_ENDPOINTS, MILITARY_HEX_PREFIXES, ADSB_MAP_CONFIG } from '../config'

/**
 * ADS-B SDK for adsb.fi API
 * Based on the adsb.fi open data API documentation
 * https://raw.githubusercontent.com/adsbfi/opendata/refs/heads/main/README.md
 */

// Global state for rate limiting and aircraft trails
let lastRequestTime = 0
const aircraftTrails = new Map<string, AircraftTrail>()

// Internal config type for more flexibility
interface InternalConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
}

// Default configuration
const defaultConfig: InternalConfig = {
  baseUrl: ADSB_CONFIG.BASE_URL,
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: ADSB_CONFIG.RATE_LIMIT_DELAY,
}

/**
 * Enforce rate limiting (1 request per second for public endpoints)
 */
async function enforceRateLimit(config: InternalConfig = defaultConfig): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < config.retryDelay) {
    const waitTime = config.retryDelay - timeSinceLastRequest
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

/**
 * Make HTTP request with error handling and retries
 */
async function makeRequest(
  url: string,
  config: InternalConfig = defaultConfig,
  attempt = 1
): Promise<AdsbResponse> {
  await enforceRateLimit(config)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CRT-Smart-Display/1.0',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 429) {
        throw new AdsbRateLimitError()
      }
      throw new AdsbApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
    }

    const data: AdsbResponse = await response.json()
    return data
  } catch (error) {
    if (error instanceof AdsbRateLimitError) {
      if (attempt < config.retryAttempts) {
        const backoffDelay = config.retryDelay * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
        return makeRequest(url, config, attempt + 1)
      }
    }

    if (error instanceof AdsbApiError) {
      throw error
    }

    throw new AdsbApiError(
      `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error
    )
  }
}

/**
 * Get aircraft by Mode-S hex code
 */
export async function getAircraftByHex(hex: string, options?: AdsbApiOptions): Promise<Aircraft[]> {
  const config = { ...defaultConfig, ...options }
  const url = `${config.baseUrl}${ADSB_ENDPOINTS.HEX}/${hex}`
  const response = await makeRequest(url, config)
  return response.ac || response.aircraft || []
}

/**
 * Get aircraft by ICAO hex codes (comma-separated)
 */
export async function getAircraftByIcao(
  icaoCodes: string[],
  options?: AdsbApiOptions
): Promise<Aircraft[]> {
  const config = { ...defaultConfig, ...options }
  const codes = icaoCodes.join(',')
  const url = `${config.baseUrl}${ADSB_ENDPOINTS.ICAO}/${codes}`
  const response = await makeRequest(url, config)
  return response.ac || response.aircraft || []
}

/**
 * Get aircraft by callsign
 */
export async function getAircraftByCallsign(
  callsign: string,
  options?: AdsbApiOptions
): Promise<Aircraft[]> {
  const config = { ...defaultConfig, ...options }
  const url = `${config.baseUrl}${ADSB_ENDPOINTS.CALLSIGN}/${callsign}`
  const response = await makeRequest(url, config)
  return response.ac || response.aircraft || []
}

/**
 * Get aircraft by registration
 */
export async function getAircraftByRegistration(
  registration: string,
  options?: AdsbApiOptions
): Promise<Aircraft[]> {
  const config = { ...defaultConfig, ...options }
  const url = `${config.baseUrl}${ADSB_ENDPOINTS.REGISTRATION}/${registration}`
  const response = await makeRequest(url, config)
  return response.ac || response.aircraft || []
}

/**
 * Get aircraft by squawk code
 */
export async function getAircraftBySquawk(
  squawk: string,
  options?: AdsbApiOptions
): Promise<Aircraft[]> {
  const config = { ...defaultConfig, ...options }
  const url = `${config.baseUrl}${ADSB_ENDPOINTS.SQUAWK}/${squawk}`
  const response = await makeRequest(url, config)
  return response.ac || response.aircraft || []
}

/**
 * Get military aircraft
 */
export async function getMilitaryAircraft(options?: AdsbApiOptions): Promise<Aircraft[]> {
  const config = { ...defaultConfig, ...options }
  const url = `${config.baseUrl}${ADSB_ENDPOINTS.MILITARY}`
  const response = await makeRequest(url, config)
  return response.ac || response.aircraft || []
}

/**
 * Get aircraft within specified distance from coordinates
 * @param query Location query with lat, lon, and distance (max 250 NM)
 */
export async function getAircraftByLocation(
  query: LocationQuery,
  options?: AdsbApiOptions
): Promise<Aircraft[]> {
  if (query.dist > 250) {
    throw new AdsbApiError('Distance cannot exceed 250 nautical miles')
  }

  const config = { ...defaultConfig, ...options }
  const url = `${config.baseUrl}${ADSB_ENDPOINTS.LOCATION}/${query.lat}/lon/${query.lon}/dist/${query.dist}`
  const response = await makeRequest(url, config)

  const aircraft = response.aircraft || []

  // Update aircraft trails
  updateAircraftTrails(aircraft)

  return aircraft
}

/**
 * Get all aircraft snapshot (requires feeder access)
 * Note: This endpoint is rate limited to 1 request every 30 seconds
 */
export async function getSnapshot(options?: AdsbApiOptions): Promise<Aircraft[]> {
  const config = { ...defaultConfig, ...options }
  const url = `${config.baseUrl}${ADSB_ENDPOINTS.SNAPSHOT}`
  const response = await makeRequest(url, config)

  const aircraft = response.aircraft || []
  updateAircraftTrails(aircraft)

  return aircraft
}

/**
 * Update aircraft position trails
 */
function updateAircraftTrails(aircraft: Aircraft[]): void {
  const now = Date.now()

  aircraft.forEach((ac) => {
    if (ac.lat && ac.lon) {
      const position: AircraftPosition = {
        lat: ac.lat,
        lon: ac.lon,
        timestamp: now,
        altitude: typeof ac.alt_baro === 'number' ? ac.alt_baro : undefined,
        heading: ac.true_heading || ac.track,
      }

      if (!aircraftTrails.has(ac.hex)) {
        aircraftTrails.set(ac.hex, {
          hex: ac.hex,
          positions: [position],
          maxLength: ADSB_MAP_CONFIG.TRAIL_LENGTH,
        })
      } else {
        const trail = aircraftTrails.get(ac.hex)!
        trail.positions.push(position)

        // Keep only the last N positions
        if (trail.positions.length > trail.maxLength) {
          trail.positions = trail.positions.slice(-trail.maxLength)
        }
      }
    }
  })

  // Clean up old trails (aircraft not seen in last 5 minutes)
  const cutoffTime = now - 5 * 60 * 1000
  const activeHexCodes = new Set(aircraft.map((ac) => ac.hex))

  for (const [hex, trail] of aircraftTrails.entries()) {
    const lastPosition = trail.positions[trail.positions.length - 1]
    if (!activeHexCodes.has(hex) && lastPosition.timestamp < cutoffTime) {
      aircraftTrails.delete(hex)
    }
  }
}

/**
 * Get aircraft trail by hex code
 */
export function getAircraftTrail(hex: string): AircraftTrail | undefined {
  return aircraftTrails.get(hex)
}

/**
 * Get all aircraft trails
 */
export function getAllTrails(): Map<string, AircraftTrail> {
  return new Map(aircraftTrails)
}

/**
 * Clear all aircraft trails
 */
export function clearTrails(): void {
  aircraftTrails.clear()
}

/**
 * Filter aircraft by various criteria
 */
export function filterAircraft(
  aircraft: Aircraft[],
  filters: {
    minAltitude?: number
    maxAltitude?: number
    emergencyOnly?: boolean
    militaryOnly?: boolean
    withPosition?: boolean
    categories?: string[]
  }
): Aircraft[] {
  return aircraft.filter((ac) => {
    // Altitude filter
    if (filters.minAltitude !== undefined && typeof ac.alt_baro === 'number') {
      if (ac.alt_baro < filters.minAltitude) return false
    }
    if (filters.maxAltitude !== undefined && typeof ac.alt_baro === 'number') {
      if (ac.alt_baro > filters.maxAltitude) return false
    }

    // Emergency filter
    if (filters.emergencyOnly && ac.emergency === 'none') return false

    // Military filter (check against known military hex prefixes)
    if (
      filters.militaryOnly &&
      !MILITARY_HEX_PREFIXES.some((prefix) => ac.hex.toUpperCase().startsWith(prefix))
    ) {
      return false
    }

    // Position filter
    if (filters.withPosition && (!ac.lat || !ac.lon)) return false

    // Category filter
    if (filters.categories && ac.category && !filters.categories.includes(ac.category)) {
      return false
    }

    return true
  })
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065 // Earth's radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Export a legacy API object for backward compatibility
export const adsbApi = {
  getAircraftByHex,
  getAircraftByIcao,
  getAircraftByCallsign,
  getAircraftByRegistration,
  getAircraftBySquawk,
  getMilitaryAircraft,
  getAircraftByLocation,
  getSnapshot,
  getAircraftTrail,
  getAllTrails,
  clearTrails,
}
