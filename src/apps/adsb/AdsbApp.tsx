import React, { useState, useEffect, useCallback, useRef } from 'react'
import { adsbApi } from './lib/adsbSdk'
import type { Aircraft, AircraftTrail } from './types/adsb'
import {
  ADSB_CONFIG,
  MILITARY_HEX_PREFIXES,
  latLonToPixel,
  ADSB_PHILADELPHIA_REFERENCE_POINTS,
  ADSB_MAP_BOUNDS,
} from './config'

interface AdsbStats {
  totalAircraft: number
  withPosition: number
  emergency: number
  military: number
  commercial: number
  helicopters: number
}

const AdsbApp: React.FC = () => {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [aircraftTrails, setAircraftTrails] = useState<Map<string, AircraftTrail>>(new Map())
  const [stats, setStats] = useState<AdsbStats>({
    totalAircraft: 0,
    withPosition: 0,
    emergency: 0,
    military: 0,
    commercial: 0,
    helicopters: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mapImageRef = useRef<HTMLImageElement>(null)
  const [iconImages, setIconImages] = useState<{
    plane: { [color: string]: HTMLImageElement }
    helicopter: { [color: string]: HTMLImageElement }
  }>({ plane: {}, helicopter: {} })

  // Function to create colored SVG as image
  const createSvgImage = useCallback(
    (svgContent: string, color: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        // Replace the fill color in the SVG
        const coloredSvg = svgContent.replace(/fill="#[^"]*"/g, `fill="${color}"`)

        // Create a data URL from the SVG
        const svgDataUrl = `data:image/svg+xml;base64,${btoa(coloredSvg)}`

        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = svgDataUrl
      })
    },
    []
  )

  // Function to draw rotated icon
  const drawRotatedIcon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      image: HTMLImageElement,
      x: number,
      y: number,
      rotation: number = 0,
      size: number = 16
    ) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(image, -size / 2, -size / 2, size, size)
      ctx.restore()
    },
    []
  )

  // Load SVG icons with different colors
  useEffect(() => {
    const loadIcons = async () => {
      const colors = ['#74de80', '#ef4444', '#f59e0b', '#06b6d4'] // green, red, amber, cyan
      const planeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#888888" d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1l4 1v-1.5L13.5 19v-5.5z"/></svg>`
      const helicopterSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#888888" d="M20 5a1 1 0 0 1 0 2h-6v1c4.642 0 8 2.218 8 6a3 3 0 0 1-3 3h-3v1h3a1 1 0 0 1 0 2h-8a1 1 0 0 1 0-2h3v-1h-2c-1.652 0-3-1.348-3-3v-1.001L3 13a1 1 0 0 1-.894-.553l-1-2a1 1 0 0 1 1.788-.894L3.618 11L9 10.999l.005-.175A3 3 0 0 1 12 8V7H5a1 1 0 1 1 0-2zm-3.999 5.174L16 12h3.36c-.665-.906-1.825-1.539-3.359-1.826"/></svg>`

      try {
        const newIconImages: {
          plane: { [color: string]: HTMLImageElement }
          helicopter: { [color: string]: HTMLImageElement }
        } = { plane: {}, helicopter: {} }

        // Load plane icons in different colors
        for (const color of colors) {
          newIconImages.plane[color] = await createSvgImage(planeSvg, color)
          newIconImages.helicopter[color] = await createSvgImage(helicopterSvg, color)
        }

        setIconImages(newIconImages)
      } catch (error) {
        console.error('Failed to load aircraft icons:', error)
      }
    }

    loadIcons()
  }, [createSvgImage])

  const fetchAircraft = useCallback(async () => {
    try {
      setError(null)
      console.log('Fetching aircraft data from:', ADSB_CONFIG.BASE_URL)
      console.log('Location:', ADSB_CONFIG.DEFAULT_LOCATION)

      const data = await adsbApi.getAircraftByLocation({
        lat: ADSB_CONFIG.DEFAULT_LOCATION.lat,
        lon: ADSB_CONFIG.DEFAULT_LOCATION.lon,
        dist: ADSB_CONFIG.DEFAULT_LOCATION.radius,
      })

      // Limit aircraft display
      const limitedData = data.slice(0, ADSB_CONFIG.MAX_AIRCRAFT)
      setAircraft(limitedData)

      // Update aircraft trails from SDK
      setAircraftTrails(new Map(adsbApi.getAllTrails()))

      // Calculate stats
      const newStats: AdsbStats = {
        totalAircraft: limitedData.length,
        withPosition: limitedData.filter((ac) => ac.lat && ac.lon).length,
        emergency: limitedData.filter((ac) => ac.emergency && ac.emergency !== 'none').length,
        military: limitedData.filter((ac) =>
          MILITARY_HEX_PREFIXES.some((prefix) => ac.hex.toUpperCase().startsWith(prefix))
        ).length,
        commercial: limitedData.filter(
          (ac) => ac.category && ['A3', 'A4', 'A5'].includes(ac.category)
        ).length,
        helicopters: limitedData.filter((ac) => ac.category === 'A7').length,
      }
      setStats(newStats)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch aircraft:', err)

      // More detailed error information
      let errorMessage = 'Failed to fetch aircraft data'
      if (err instanceof Error) {
        errorMessage = err.message
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        })
      }

      // Check if it's a CORS or network issue
      if (errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error - check CORS policy or internet connection'
      }

      setError(errorMessage)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchAircraft()

    // Set up periodic updates
    const interval = setInterval(fetchAircraft, ADSB_CONFIG.REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchAircraft])

  // Canvas drawing function
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current
    const mapImage = mapImageRef.current
    if (!canvas || !mapImage) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw map background with reduced opacity
    ctx.globalAlpha = 0.3
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = 1.0 // Reset to full opacity for markers

    // Scale coordinates to canvas size
    const scaleX = canvas.width / ADSB_MAP_BOUNDS.imageWidth
    const scaleY = canvas.height / ADSB_MAP_BOUNDS.imageHeight

    // Draw ALL reference points for debugging (these should match their known positions)
    ADSB_PHILADELPHIA_REFERENCE_POINTS.forEach((point, index) => {
      const pixelPos = latLonToPixel(point.lat, point.lon)
      const x = pixelPos.x * scaleX
      const y = pixelPos.y * scaleY

      // Different colors for each reference point
      const colors = ['#eab308', '#ef4444', '#06b6d4', '#10b981']
      const color = colors[index % colors.length]

      console.log(`Reference Point ${point.name}:`, {
        lat: point.lat,
        lon: point.lon,
        expectedPixel: { x: point.x, y: point.y },
        calculatedPixel: pixelPos,
        pixelDifference: {
          x: pixelPos.x - point.x,
          y: pixelPos.y - point.y,
        },
        canvasPos: { x, y },
        expectedCanvas: { x: point.x * scaleX, y: point.y * scaleY },
      })

      // Draw calculated position (circle)
      ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      // Draw expected position (square) for comparison
      const expectedX = point.x * scaleX
      const expectedY = point.y * scaleY
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.rect(expectedX - 4, expectedY - 4, 8, 8)
      ctx.stroke()

      // Draw line connecting expected to calculated if they're different
      const distance = Math.sqrt((x - expectedX) ** 2 + (y - expectedY) ** 2)
      if (distance > 2) {
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(expectedX, expectedY)
        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw label
      ctx.fillStyle = color
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(point.name, x, y + 20)

      // Show distance if there's a difference
      if (distance > 2) {
        ctx.fillStyle = '#ff0000'
        ctx.font = '10px monospace'
        ctx.fillText(`±${distance.toFixed(1)}px`, x, y + 35)
      }
    })

    // Draw aircraft trails first (behind aircraft)
    aircraftTrails.forEach((trail) => {
      if (trail.positions.length < 2) return

      // Get aircraft color for trail
      const currentAircraft = aircraft.find((ac) => ac.hex === trail.hex)
      let trailColor = '#74de80' // Default green
      if (currentAircraft) {
        if (currentAircraft.emergency && currentAircraft.emergency !== 'none') {
          trailColor = '#ef4444' // Red for emergency
        } else if (
          MILITARY_HEX_PREFIXES.some((prefix) =>
            currentAircraft.hex.toUpperCase().startsWith(prefix)
          )
        ) {
          trailColor = '#f59e0b' // Amber for military
        } else if (
          currentAircraft.category &&
          ['A3', 'A4', 'A5'].includes(currentAircraft.category)
        ) {
          trailColor = '#06b6d4' // Cyan for commercial
        }
      }

      // Draw trail lines
      ctx.strokeStyle = trailColor
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      ctx.beginPath()

      for (let i = 0; i < trail.positions.length - 1; i++) {
        const pos1 = latLonToPixel(trail.positions[i].lat, trail.positions[i].lon)
        const pos2 = latLonToPixel(trail.positions[i + 1].lat, trail.positions[i + 1].lon)

        const x1 = pos1.x * scaleX
        const y1 = pos1.y * scaleY
        const x2 = pos2.x * scaleX
        const y2 = pos2.y * scaleY

        if (i === 0) {
          ctx.moveTo(x1, y1)
        }
        ctx.lineTo(x2, y2)
      }

      ctx.stroke()
      ctx.globalAlpha = 1.0
    })

    // Draw aircraft
    aircraft
      .filter((ac) => ac.lat && ac.lon)
      .forEach((ac, index) => {
        const pixelPos = latLonToPixel(ac.lat!, ac.lon!)
        const x = pixelPos.x * scaleX
        const y = pixelPos.y * scaleY

        // Debug logging for first few aircraft
        if (index < 5) {
          console.log(`Aircraft ${ac.hex}:`, {
            lat: ac.lat,
            lon: ac.lon,
            calculatedPixel: pixelPos,
            canvasPos: { x, y },
            flight: ac.flight,
            // Check if coordinates are within bounds
            withinBounds: {
              lat: ac.lat! >= ADSB_MAP_BOUNDS.south && ac.lat! <= ADSB_MAP_BOUNDS.north,
              lon: ac.lon! >= ADSB_MAP_BOUNDS.west && ac.lon! <= ADSB_MAP_BOUNDS.east,
            },
          })
        }

        // Skip aircraft that are clearly outside the visible area
        if (x < -50 || x > canvas.width + 50 || y < -50 || y > canvas.height + 50) {
          return
        }

        // Determine aircraft color and type
        let color = '#74de80' // Default green
        let isHelicopter = false

        if (ac.emergency && ac.emergency !== 'none') {
          color = '#ef4444' // Red for emergency
        } else if (
          MILITARY_HEX_PREFIXES.some((prefix) => ac.hex.toUpperCase().startsWith(prefix))
        ) {
          color = '#f59e0b' // Amber for military
        } else if (ac.category && ['A3', 'A4', 'A5'].includes(ac.category)) {
          color = '#06b6d4' // Cyan for commercial
        }

        // Check if it's a helicopter
        if (ac.category === 'A7') {
          isHelicopter = true
        }

        // Draw aircraft icon with rotation based on heading
        const rotation = ac.true_heading || ac.track || 0

        // Use proper SVG icons if available, fallback to circle
        const iconType = isHelicopter ? 'helicopter' : 'plane'
        const iconImage = iconImages[iconType]?.[color]

        if (iconImage) {
          drawRotatedIcon(ctx, iconImage, x, y, rotation, 16)
        } else {
          // Fallback to circle if icons not loaded yet
          ctx.fillStyle = color
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, 2 * Math.PI)
          ctx.fill()
          ctx.stroke()
        }

        // Draw aircraft label
        ctx.fillStyle = color
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        const label = ac.flight?.trim() || ac.hex.toUpperCase()
        ctx.fillText(label, x, y - 8)

        // Draw altitude
        if (ac.alt_baro !== undefined) {
          const altText = ac.alt_baro === 'ground' ? 'GND' : `${Math.round(ac.alt_baro / 100)}`
          ctx.fillText(altText, x, y + 18)
        }
      })
  }, [aircraft, aircraftTrails, iconImages, drawRotatedIcon])

  // Load map image and set up canvas
  useEffect(() => {
    const mapImage = new Image()
    mapImage.onload = () => {
      if (mapImageRef.current) {
        mapImageRef.current = mapImage
        drawMap()
      }
    }
    mapImage.src = '/adsb/philadelphia.webp'
    mapImageRef.current = mapImage
  }, [drawMap])

  // Redraw when aircraft data changes
  useEffect(() => {
    if (mapImageRef.current?.complete) {
      drawMap()
    }
  }, [aircraft, drawMap])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <h1 className="text-6xl md:text-8xl animate-pulse">ADS-B TRACKER</h1>
        <p className="text-3xl md:text-4xl opacity-80">Loading aircraft data...</p>
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
        <h1 className="text-6xl md:text-8xl text-red-400">ADS-B ERROR</h1>
        <p className="text-2xl md:text-3xl opacity-80 text-center max-w-4xl">{error}</p>
        <p className="text-xl opacity-60">Retrying in {ADSB_CONFIG.REFRESH_INTERVAL / 1000}s...</p>
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        width={ADSB_MAP_BOUNDS.imageWidth}
        height={ADSB_MAP_BOUNDS.imageHeight}
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* UI Overlay */}
      <div className="relative z-10 h-full p-4 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-6xl md:text-8xl font-bold">ADS-B TRACKER</h1>
            <div className="text-right text-lg opacity-80">
              <div className="text-xl font-bold">{ADSB_CONFIG.DEFAULT_LOCATION.name}</div>
              <div className="text-lg">{ADSB_CONFIG.DEFAULT_LOCATION.radius}nm radius</div>
              {lastUpdate && (
                <div className="text-lg">Updated: {lastUpdate.toLocaleTimeString()}</div>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-5 gap-4 text-center text-lg mb-6">
            <div
              className="border p-3 bg-black/50"
              style={{ borderColor: `rgb(var(--crt-primary))` }}
            >
              <div className="text-3xl font-bold">{stats.totalAircraft}</div>
              <div className="opacity-80 text-lg">TOTAL</div>
            </div>
            <div
              className="border p-3 bg-black/50"
              style={{ borderColor: `rgb(var(--crt-primary))` }}
            >
              <div className="text-3xl font-bold">{stats.commercial}</div>
              <div className="opacity-80 text-lg">COMMERCIAL</div>
            </div>
            <div
              className="border p-3 bg-black/50"
              style={{ borderColor: `rgb(var(--crt-primary))` }}
            >
              <div className="text-3xl font-bold">{stats.helicopters}</div>
              <div className="opacity-80 text-lg">HELICOPTERS</div>
            </div>
            <div
              className="border p-3 bg-black/50"
              style={{ borderColor: `rgb(var(--crt-primary))` }}
            >
              <div className="text-3xl font-bold">{stats.military}</div>
              <div className="opacity-80 text-lg">MILITARY</div>
            </div>
            <div
              className="border p-3 bg-black/50"
              style={{ borderColor: `rgb(var(--crt-primary))` }}
            >
              <div
                className={`text-3xl font-bold ${stats.emergency > 0 ? 'text-red-400 animate-pulse' : ''}`}
              >
                {stats.emergency}
              </div>
              <div className="opacity-80 text-lg">EMERGENCY</div>
            </div>
          </div>
        </div>

        {/* Spacer for map area */}
        <div className="flex-1"></div>
      </div>
    </div>
  )
}

export default AdsbApp
