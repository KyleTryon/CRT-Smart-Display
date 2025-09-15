// ADS-B API Response Types based on adsb.fi documentation
// Compatible with ADSBexchange v2 API format

export interface Aircraft {
  hex: string // Mode-S hex code
  type?: string // Type of ADS-B message
  flight?: string // Flight number/callsign
  r?: string // Registration
  t?: string // Aircraft type code
  desc?: string // Aircraft description
  alt_baro?: number | 'ground' // Barometric altitude in feet
  alt_geom?: number // Geometric altitude in feet
  gs?: number // Ground speed in knots
  ias?: number // Indicated airspeed in knots
  tas?: number // True airspeed in knots
  mach?: number // Mach number
  wd?: number // Wind direction
  ws?: number // Wind speed
  track?: number // Track angle in degrees
  track_rate?: number // Rate of change of track
  roll?: number // Roll angle in degrees
  mag_heading?: number // Magnetic heading
  true_heading?: number // True heading
  baro_rate?: number // Barometric rate of climb/descent
  geom_rate?: number // Geometric rate of climb/descent
  squawk?: string // Squawk code
  emergency?: string // Emergency status
  category?: string // Aircraft category
  nav_qnh?: number // QNH setting
  nav_altitude_mcp?: number // MCP selected altitude
  nav_heading?: number // MCP selected heading
  lat?: number // Latitude
  lon?: number // Longitude
  nic?: number // Navigation Integrity Category
  rc?: number // Radius of Containment
  seen_pos?: number // Time since last position update
  version?: number // ADS-B version
  nic_baro?: number // NIC for barometric altitude
  nac_p?: number // Navigation Accuracy Category for Position
  nac_v?: number // Navigation Accuracy Category for Velocity
  sil?: number // Source Integrity Level
  sil_type?: string // SIL type
  gva?: number // Geometric Vertical Accuracy
  sda?: number // System Design Assurance
  alert?: number // Alert flag
  spi?: number // Special Position Identification
  mlat?: string[] // Multilateration fields
  tisb?: string[] // TIS-B fields
  messages?: number // Number of messages received
  seen?: number // Time since last message
  rssi?: number // Signal strength
  dst?: number // Distance from receiver
  dir?: number // Direction from receiver
}

export interface AdsbResponse {
  ac?: Aircraft[] // Aircraft array (legacy format)
  aircraft?: Aircraft[] // Aircraft array (current format)
  now?: number // Current timestamp
  msg?: string // Message/error text
  total?: number // Total aircraft count
  ctime?: number // Cache time
  ptime?: number // Processing time
  resultCount?: number // Number of results
}

export interface LocationQuery {
  lat: number
  lon: number
  dist: number // Distance in nautical miles (max 250)
}

export interface AdsbApiOptions {
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface AircraftPosition {
  lat: number
  lon: number
  timestamp: number
  altitude?: number
  heading?: number
}

export interface AircraftTrail {
  hex: string
  positions: AircraftPosition[]
  maxLength: number
}

// Error types
export class AdsbApiError extends Error {
  statusCode?: number
  response?: unknown

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message)
    this.name = 'AdsbApiError'
    this.statusCode = statusCode
    this.response = response
  }
}

export class AdsbRateLimitError extends AdsbApiError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429)
    this.name = 'AdsbRateLimitError'
  }
}
