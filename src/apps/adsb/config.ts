// Reference points for coordinate transformation between lat/lon and image pixels
export const ADSB_PHILADELPHIA_REFERENCE_POINTS = [
  {
    name: 'city_hall',
    lat: 39.952351414037274,
    lon: -75.1636342534157,
    x: 557,
    y: 441,
    visible: true, // Only City Hall visible by default
  },
  {
    name: 'west_lehigh_ave',
    lat: 39.99822295610221,
    lon: -75.18745246451326,
    x: 400,
    y: 49,
    visible: false,
  },
  {
    name: 'wiggins_marina',
    lat: 39.9421035968403,
    lon: -75.13209582939922,
    x: 763.53,
    y: 527.56,
    visible: false,
  },
  {
    name: 'camden_petty_island_guard_house',
    lat: 39.96757021845487,
    lon: -75.08649891063769,
    x: 1062.53,
    y: 309.56,
    visible: false,
  },
  {
    name: '30th_street_station',
    lat: 39.95604952583959,
    lon: -75.18185780117068,
    x: 439,
    y: 413,
    visible: false,
  },
  {
    name: 'cobbs_creek',
    lat: 39.93353340824558,
    lon: -75.24189835798911,
    x: 42,
    y: 602,
    visible: false,
  },
  {
    name: 'bala_train_station',
    lat: 40.00105056344761,
    lon: -75.22779169462568,
    x: 138,
    y: 27,
    visible: false,
  },
  {
    name: 'knight_park',
    lat: 39.91819424158287,
    lon: -75.08181761497721,
    x: 1095,
    y: 731,
    visible: false,
  },
  {
    name: 'crown_boiler_co',
    lat: 40.00249064009536,
    lon: -75.09255878450267,
    x: 1024,
    y: 12,
    visible: false,
  },
]

// Aircraft Categories (from ADS-B Exchange format)
export const AIRCRAFT_CATEGORIES = {
  A0: 'No ADS-B Emitter Category Information',
  A1: 'Light (< 15500 lbs)',
  A2: 'Small (15500 to 75000 lbs)',
  A3: 'Large (75000 to 300000 lbs)',
  A4: 'High Vortex Large (aircraft such as B-757)',
  A5: 'Heavy (> 300000 lbs)',
  A6: 'High Performance (> 5g acceleration and 400 kts)',
  A7: 'Rotorcraft',
  B0: 'No ADS-B Emitter Category Information',
  B1: 'Glider / sailplane',
  B2: 'Lighter-than-air',
  B3: 'Parachutist / Skydiver',
  B4: 'Ultralight / hang-glider / paraglider',
  B5: 'Reserved',
  B6: 'Unmanned Aerial Vehicle',
  B7: 'Space / Trans-atmospheric vehicle',
  C0: 'No ADS-B Emitter Category Information',
  C1: 'Surface Vehicle – Emergency Vehicle',
  C2: 'Surface Vehicle – Service Vehicle',
  C3: 'Point Obstacle (includes tethered balloons)',
  C4: 'Cluster Obstacle',
  C5: 'Line Obstacle',
} as const

// Emergency Codes
export const EMERGENCY_CODES = {
  none: 'No Emergency',
  general: 'General Emergency',
  lifeguard: 'Lifeguard/Medical Emergency',
  minfuel: 'Minimum Fuel',
  nordo: 'No Radio',
  unlawful: 'Unlawful Interference',
  downed: 'Downed Aircraft',
  reserved: 'Reserved',
} as const

// ADS-B specific configuration
export const ADSB_CONFIG = {
  BASE_URL: import.meta.env.DEV ? '/api/adsb' : 'https://opendata.adsb.fi/api/v2',
  DEFAULT_LOCATION: {
    name: 'Philadelphia',
    lat: ADSB_PHILADELPHIA_REFERENCE_POINTS[0].lat,
    lon: ADSB_PHILADELPHIA_REFERENCE_POINTS[0].lon,
    radius: 10, // nautical miles
  },
  REFRESH_INTERVAL: 5000, // 5 seconds - more reasonable for public API
  MAX_AIRCRAFT: 50,
  RATE_LIMIT_DELAY: 1000, // 1 request per second for public endpoints
  FEEDER_RATE_LIMIT: 30000, // 30 seconds for feeder endpoints
} as const

// ADS-B API Endpoints
export const ADSB_ENDPOINTS = {
  HEX: '/hex',
  ICAO: '/icao',
  CALLSIGN: '/callsign',
  REGISTRATION: '/registration',
  SQUAWK: '/sqk',
  MILITARY: '/mil',
  LOCATION: '/lat',
  SNAPSHOT: '/snapshot', // Feeder endpoint
} as const

// Map Configuration for ADS-B display
export const ADSB_MAP_CONFIG = {
  TRAIL_LENGTH: 24, // Number of position points to keep for aircraft trails (reduced from 50)
} as const

// Military aircraft hex code prefixes (basic detection)
export const MILITARY_HEX_PREFIXES = [
  'AE', // United States military
  'ADF', // United States military
  '43C', // United Kingdom military
  '3C6', // Germany military
  // Add more as needed
] as const

// Map bounds based on provided edge coordinates
export const ADSB_MAP_BOUNDS = {
  // Your provided map edge coordinates
  north: 40.00625428909761,
  south: 39.91109220993336,
  east: -75.07785015941104,
  west: -75.25254159751591,
  // Image dimensions
  imageWidth: 1123,
  imageHeight: 794,
} as const

/**
 * Convert geographic coordinates (lat, lon) to image pixel coordinates (x, y)
 * Uses bilinear interpolation based on reference points for accurate positioning
 */
export function latLonToPixel(lat: number, lon: number): { x: number; y: number } {
  const points = ADSB_PHILADELPHIA_REFERENCE_POINTS

  // Find the bounds of our reference points
  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  // Use simple linear interpolation based on the reference points
  // This was the working algorithm before
  const latNorm = (lat - minLat) / (maxLat - minLat)
  const lonNorm = (lon - minLon) / (maxLon - minLon)

  // Get pixel bounds from reference points
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const x = minX + lonNorm * (maxX - minX)
  const y = minY + (1 - latNorm) * (maxY - minY) // Flip Y axis

  return { x, y }
}

/**
 * Convert pixel coordinates back to geographic coordinates (for debugging)
 */
export function pixelToLatLon(x: number, y: number): { lat: number; lon: number } {
  const bounds = ADSB_MAP_BOUNDS

  // Normalize pixel coordinates to 0-1 range
  const xNorm = x / bounds.imageWidth
  const yNorm = y / bounds.imageHeight

  // Convert to geographic coordinates
  const lat = bounds.south + (1 - yNorm) * (bounds.north - bounds.south)
  const lon = bounds.west + xNorm * (bounds.east - bounds.west)

  return { lat, lon }
}
