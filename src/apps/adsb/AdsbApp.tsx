import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { adsbApi } from './lib/adsbSdk'
import type { Aircraft, AircraftTrail } from './types/adsb'
import {
  ADSB_CONFIG,
  MILITARY_HEX_PREFIXES,
  latLonToPixel,
  ADSB_PHILADELPHIA_REFERENCE_POINTS,
  ADSB_MAP_BOUNDS,
  AIRCRAFT_CATEGORY_GROUPS,
  AIRCRAFT_COLORS,
  UI_CONFIG,
  REFERENCE_POINT_COLORS,
} from './config'
import StatsBar from './components/StatsBar'

// Extract constants from config for cleaner code
const {
  CANVAS_MARGIN,
  REFERENCE_POINT_SIZE,
  ARROW_SIZE,
  PULSE_CYCLE,
  DEFAULT_ICON_SIZE,
  DEFAULT_TRAIL_OPACITY,
  DEFAULT_MAP_OPACITY,
  INTERPOLATION_DURATION,
} = UI_CONFIG

// Type guards
const isInterpolatedAircraft = (ac: Aircraft | InterpolatedAircraft): ac is InterpolatedAircraft => 
  'interpolationProgress' in ac

interface AdsbStats {
  totalAircraft: number
  withPosition: number
  emergency: number
  military: number
  commercial: number
  helicopters: number
}

interface InterpolatedAircraft extends Aircraft {
  // Previous position for interpolation
  prevLat?: number
  prevLon?: number
  // Interpolation state
  interpolationProgress?: number // 0 to 1
  interpolationStartTime?: number
}

interface AdsbAppProps {
  // Location configuration
  location?: {
    name: string
    lat: number
    lon: number
    radius: number
  }
  
  // Display configuration
  maxAircraft?: number
  refreshInterval?: number
  showStats?: boolean
  showReferencePoints?: boolean
  mapOpacity?: number
  
  // Stats configuration
  showStatsTotal?: boolean
  showStatsCommercial?: boolean
  showStatsHelicopters?: boolean
  showStatsMilitary?: boolean
  showStatsEmergency?: boolean
  
  // Aircraft filtering
  showMilitary?: boolean
  showCommercial?: boolean
  showHelicopters?: boolean
  minAltitude?: number
  maxAltitude?: number
  
  // UI customization
  title?: string
  aircraftIconSize?: number
  trailOpacity?: number
  showOffScreenIndicators?: boolean
  enableSmoothMotion?: boolean
  interpolationDuration?: number // milliseconds
  
  // Callbacks
  onAircraftUpdate?: (aircraft: Aircraft[]) => void
  onStatsUpdate?: (stats: AdsbStats) => void
}

const AdsbApp: React.FC<AdsbAppProps> = ({
  location = ADSB_CONFIG.DEFAULT_LOCATION,
  maxAircraft = ADSB_CONFIG.MAX_AIRCRAFT,
  refreshInterval = ADSB_CONFIG.REFRESH_INTERVAL,
  showStats = true,
  showReferencePoints = true,
  mapOpacity = DEFAULT_MAP_OPACITY,
  showStatsTotal = true,
  showStatsCommercial = true,
  showStatsHelicopters = true,
  showStatsMilitary = true,
  showStatsEmergency = true,
  showMilitary = true,
  showCommercial = true,
  showHelicopters = true,
  minAltitude,
  maxAltitude,
  title = 'ADS-B TRACKER',
  aircraftIconSize = DEFAULT_ICON_SIZE,
  trailOpacity = DEFAULT_TRAIL_OPACITY,
  showOffScreenIndicators = true,
  enableSmoothMotion = true,
  interpolationDuration = INTERPOLATION_DURATION,
  onAircraftUpdate,
  onStatsUpdate,
}) => {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [interpolatedAircraft, setInterpolatedAircraft] = useState<Map<string, InterpolatedAircraft>>(new Map())
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

  // Memoized aircraft filtering and processing
  const filteredAircraft = useMemo(() => {
    const aircraftToProcess = enableSmoothMotion ? Array.from(interpolatedAircraft.values()) : aircraft
    
    return aircraftToProcess.filter((ac) => {
      if (!ac.lat || !ac.lon) return false
      
      // Category filtering
      if (ac.category === AIRCRAFT_CATEGORY_GROUPS.HELICOPTERS[0] && !showHelicopters) return false
      if (ac.category && (AIRCRAFT_CATEGORY_GROUPS.COMMERCIAL as readonly string[]).includes(ac.category) && !showCommercial) return false
      if (MILITARY_HEX_PREFIXES.some((prefix) => ac.hex.toUpperCase().startsWith(prefix)) && !showMilitary) return false
      
      return true
    })
  }, [aircraft, interpolatedAircraft, enableSmoothMotion, showHelicopters, showCommercial, showMilitary])

  // Memoized aircraft color calculation
  const getAircraftColor = useCallback((ac: Aircraft) => {
    if (ac.emergency && ac.emergency !== 'none') return AIRCRAFT_COLORS.EMERGENCY
    if (MILITARY_HEX_PREFIXES.some((prefix) => ac.hex.toUpperCase().startsWith(prefix))) return AIRCRAFT_COLORS.MILITARY
    if (ac.category && (AIRCRAFT_CATEGORY_GROUPS.COMMERCIAL as readonly string[]).includes(ac.category)) return AIRCRAFT_COLORS.COMMERCIAL
    return AIRCRAFT_COLORS.DEFAULT
  }, [])

  // Memoized interpolated position calculation
  const getInterpolatedPosition = useCallback((ac: Aircraft | InterpolatedAircraft) => {
    let currentLat = ac.lat!
    let currentLon = ac.lon!
    
    if (enableSmoothMotion && isInterpolatedAircraft(ac) && ac.interpolationProgress !== undefined) {
      const progress = ac.interpolationProgress
      currentLat = ac.prevLat! + (ac.lat! - ac.prevLat!) * progress
      currentLon = ac.prevLon! + (ac.lon! - ac.prevLon!) * progress
    }
    
    return { lat: currentLat, lon: currentLon }
  }, [enableSmoothMotion])

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
      const colors = [
        AIRCRAFT_COLORS.DEFAULT,
        AIRCRAFT_COLORS.EMERGENCY,
        AIRCRAFT_COLORS.MILITARY,
        AIRCRAFT_COLORS.COMMERCIAL,
      ]
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
      console.log('Location:', location)

      const data = await adsbApi.getAircraftByLocation({
        lat: location.lat,
        lon: location.lon,
        dist: location.radius,
      })

      // Apply altitude filtering if specified
      let filteredData = data
      if (minAltitude !== undefined || maxAltitude !== undefined) {
        filteredData = data.filter((ac) => {
          if (typeof ac.alt_baro !== 'number') return true
          if (minAltitude !== undefined && ac.alt_baro < minAltitude) return false
          if (maxAltitude !== undefined && ac.alt_baro > maxAltitude) return false
          return true
        })
      }

      // Limit aircraft display
      const limitedData = filteredData.slice(0, maxAircraft)
      setAircraft(limitedData)

      // Update interpolated aircraft positions for smooth motion
      if (enableSmoothMotion) {
        setInterpolatedAircraft(prevInterpolated => {
          const newInterpolated = new Map<string, InterpolatedAircraft>()
          const now = Date.now()

          limitedData.forEach(ac => {
            if (ac.lat && ac.lon) {
              const existing = prevInterpolated.get(ac.hex)
              
              if (existing) {
                // Update existing aircraft with interpolation
                newInterpolated.set(ac.hex, {
                  ...ac,
                  prevLat: existing.lat,
                  prevLon: existing.lon,
                  interpolationProgress: 0,
                  interpolationStartTime: now,
                })
              } else {
                // New aircraft - start immediately
                newInterpolated.set(ac.hex, {
                  ...ac,
                  prevLat: ac.lat,
                  prevLon: ac.lon,
                  interpolationProgress: 1,
                  interpolationStartTime: now,
                })
              }
            }
          })

          // Clean up aircraft that are no longer present
          limitedData.forEach(ac => {
            if (ac.hex) {
              const existing = prevInterpolated.get(ac.hex)
              if (existing && existing.interpolationProgress !== undefined) {
                // Keep for a bit to allow fade-out animation
                if (now - (existing.interpolationStartTime || 0) < 1000) {
                  newInterpolated.set(ac.hex, {
                    ...existing,
                    interpolationProgress: Math.max(0, 1 - (now - (existing.interpolationStartTime || 0)) / 1000),
                  })
                }
              }
            }
          })

          return newInterpolated
        })
      }

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
          (ac) => ac.category && (AIRCRAFT_CATEGORY_GROUPS.COMMERCIAL as readonly string[]).includes(ac.category)
        ).length,
        helicopters: limitedData.filter((ac) => ac.category === AIRCRAFT_CATEGORY_GROUPS.HELICOPTERS[0]).length,
      }
      setStats(newStats)
      setLastUpdate(new Date())
      setLoading(false)

      // Call callbacks if provided
      onAircraftUpdate?.(limitedData)
      onStatsUpdate?.(newStats)
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
    const interval = setInterval(() => {
      fetchAircraft()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [location, maxAircraft, minAltitude, maxAltitude, onAircraftUpdate, onStatsUpdate]) // Include dependencies that affect data fetching

  // Animation loop for smooth interpolation using requestAnimationFrame
  useEffect(() => {
    if (!enableSmoothMotion) return

    let animationId: number

    const animate = () => {
      setInterpolatedAircraft(prevInterpolated => {
        const now = Date.now()
        const updated = new Map<string, InterpolatedAircraft>()

        for (const [hex, ac] of prevInterpolated) {
          if (ac.interpolationStartTime && ac.interpolationProgress !== undefined) {
            const elapsed = now - ac.interpolationStartTime
            const progress = Math.min(elapsed / interpolationDuration, 1)

            // Use ease-out easing for smoother motion
            const easedProgress = 1 - Math.pow(1 - progress, 3)

            updated.set(hex, {
              ...ac,
              interpolationProgress: easedProgress,
            })

            // Remove completed animations
            if (progress >= 1) {
              const final = updated.get(hex)!
              updated.set(hex, {
                ...final,
                interpolationProgress: 1,
                prevLat: final.lat,
                prevLon: final.lon,
              })
            }
          } else {
            updated.set(hex, ac)
          }
        }

        return updated
      })

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [enableSmoothMotion, interpolationDuration])

  // Canvas drawing function
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current
    const mapImage = mapImageRef.current
    if (!canvas || !mapImage) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw map background with configurable opacity
    ctx.globalAlpha = mapOpacity
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = 1.0 // Reset to full opacity for markers

    // Scale coordinates to canvas size
    const scaleX = canvas.width / ADSB_MAP_BOUNDS.imageWidth
    const scaleY = canvas.height / ADSB_MAP_BOUNDS.imageHeight

    // Draw visible reference points for debugging (these should match their known positions)
    if (showReferencePoints) {
      ADSB_PHILADELPHIA_REFERENCE_POINTS.filter(point => point.visible).forEach((point, index) => {
      const pixelPos = latLonToPixel(point.lat, point.lon)
      const x = pixelPos.x * scaleX
      const y = pixelPos.y * scaleY

      // Different colors for each reference point
      const color = REFERENCE_POINT_COLORS[index % REFERENCE_POINT_COLORS.length]


      // Draw calculated position (circle)
      ctx.fillStyle = color
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, REFERENCE_POINT_SIZE, 0, 2 * Math.PI)
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
    }

    // Draw aircraft trails first (behind aircraft)
    aircraftTrails.forEach((trail) => {
      if (trail.positions.length < 2) return

      // Get aircraft color for trail
      const currentAircraft = aircraft.find((ac) => ac.hex === trail.hex)
      const trailColor = currentAircraft ? getAircraftColor(currentAircraft) : AIRCRAFT_COLORS.DEFAULT

      // Draw trail lines
      ctx.strokeStyle = trailColor
      ctx.lineWidth = 2
      ctx.globalAlpha = trailOpacity
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

    // Draw aircraft using memoized filtering
    filteredAircraft.forEach((ac) => {
      const { lat: currentLat, lon: currentLon } = getInterpolatedPosition(ac)
      const pixelPos = latLonToPixel(currentLat, currentLon)
      const x = pixelPos.x * scaleX
      const y = pixelPos.y * scaleY


      // Skip aircraft that are clearly outside the visible area
      if (x < -CANVAS_MARGIN || x > canvas.width + CANVAS_MARGIN || y < -CANVAS_MARGIN || y > canvas.height + CANVAS_MARGIN) {
        return
      }

      // Get aircraft color and type using memoized function
      const color = getAircraftColor(ac)
      const isHelicopter = ac.category === AIRCRAFT_CATEGORY_GROUPS.HELICOPTERS[0]

        // Draw aircraft icon with rotation based on heading
        const rotation = ac.true_heading || ac.track || 0

        // Use proper SVG icons if available, fallback to circle
        const iconType = isHelicopter ? 'helicopter' : 'plane'
        const iconImage = iconImages[iconType]?.[color]

        if (iconImage) {
          drawRotatedIcon(ctx, iconImage, x, y, rotation, aircraftIconSize)
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

    // Draw off-screen aircraft indicators
    if (showOffScreenIndicators) {
      const offScreenAircraft = filteredAircraft.filter((ac) => {
        const { lat: currentLat, lon: currentLon } = getInterpolatedPosition(ac)
        const pixelPos = latLonToPixel(currentLat, currentLon)
        const x = pixelPos.x * scaleX
        const y = pixelPos.y * scaleY
        
        return x < -CANVAS_MARGIN || x > canvas.width + CANVAS_MARGIN || y < -CANVAS_MARGIN || y > canvas.height + CANVAS_MARGIN
      })

      offScreenAircraft.forEach((ac) => {
        const { lat: currentLat, lon: currentLon } = getInterpolatedPosition(ac)
        const pixelPos = latLonToPixel(currentLat, currentLon)
        const x = pixelPos.x * scaleX
        const y = pixelPos.y * scaleY

        // Calculate angle from center to aircraft
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const angle = Math.atan2(y - centerY, x - centerX)

        // Calculate position on screen edge
        const edgeDistance = Math.min(centerX, centerY) - 20 // 20px margin from edge
        const edgeX = centerX + Math.cos(angle) * edgeDistance
        const edgeY = centerY + Math.sin(angle) * edgeDistance

        // Create pulsing amber glow effect
        const time = Date.now() / 1000
        const pulseIntensity = (Math.sin(time * PULSE_CYCLE) + 1) / 2 // 0 to 1
        const alpha = 0.3 + pulseIntensity * 0.4 // 0.3 to 0.7

        // Draw glow circle
        ctx.globalAlpha = alpha
        ctx.fillStyle = AIRCRAFT_COLORS.OFF_SCREEN_INDICATOR
        ctx.beginPath()
        ctx.arc(edgeX, edgeY, ARROW_SIZE, 0, 2 * Math.PI)
        ctx.fill()

        // Draw arrow pointing to aircraft
        ctx.globalAlpha = 1.0
        ctx.fillStyle = AIRCRAFT_COLORS.OFF_SCREEN_INDICATOR
        ctx.save()
        ctx.translate(edgeX, edgeY)
        ctx.rotate(angle)
        
        // Draw arrow shape
        ctx.beginPath()
        ctx.moveTo(6, 0)
        ctx.lineTo(-4, -3)
        ctx.lineTo(-2, 0)
        ctx.lineTo(-4, 3)
        ctx.closePath()
        ctx.fill()
        
        ctx.restore()

        // Draw aircraft label if space allows
        if (edgeX > 60 && edgeX < canvas.width - 60 && edgeY > 20 && edgeY < canvas.height - 20) {
          ctx.fillStyle = AIRCRAFT_COLORS.OFF_SCREEN_INDICATOR
          ctx.font = '10px monospace'
          ctx.textAlign = 'center'
          const label = ac.flight?.trim() || ac.hex.toUpperCase()
          ctx.fillText(label, edgeX, edgeY + 20)
        }
      })

      // Draw the reference circle showing where indicators are positioned
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const edgeDistance = Math.min(centerX, centerY) - 20 // Same as indicator positioning
      
      ctx.globalAlpha = 0.25
      ctx.strokeStyle = AIRCRAFT_COLORS.OFF_SCREEN_INDICATOR
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5]) // Dashed line
      ctx.beginPath()
      ctx.arc(centerX, centerY, edgeDistance, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.setLineDash([]) // Reset dash
      ctx.globalAlpha = 1.0
    }
  }, [filteredAircraft, aircraftTrails, iconImages, drawRotatedIcon, showReferencePoints, mapOpacity, trailOpacity, aircraftIconSize, showOffScreenIndicators, getAircraftColor, getInterpolatedPosition])

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
        <h1 className="text-6xl md:text-8xl animate-pulse">{title}</h1>
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
        <p className="text-xl opacity-60">Retrying in {refreshInterval / 1000}s...</p>
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
            <h1 className="text-6xl md:text-8xl font-bold">{title}</h1>
            <div className="text-right text-lg opacity-80">
              <div className="text-xl font-bold">{location.name}</div>
              <div className="text-lg">{location.radius}nm radius</div>
              {lastUpdate && (
                <div className="text-lg">Updated: {lastUpdate.toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer for map area */}
        <div className="flex-1"></div>

        {/* Stats Bar - moved to bottom */}
        {showStats && (
          <StatsBar
            stats={stats}
            showTotal={showStatsTotal}
            showCommercial={showStatsCommercial}
            showHelicopters={showStatsHelicopters}
            showMilitary={showStatsMilitary}
            showEmergency={showStatsEmergency}
          />
        )}
      </div>
    </div>
  )
}

export default AdsbApp
