"use client"

import { useEffect, useRef, useState } from "react"
import { useGPSTracking } from "@/hooks/use-gps-tracking"
import { initializeSocket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Navigation, Wifi, WifiOff, Play, Pause, RotateCcw } from "lucide-react"

interface EnhancedMapComponentProps {
  touristId: string
  userAge?: number
  onLocationChange?: (location: { lat: number; lng: number }) => void
  onSafeScoreChange?: (score: number) => void
  initialZones?: any[]
}

export function EnhancedMapComponent({
  touristId,
  userAge,
  onLocationChange,
  onSafeScoreChange,
  initialZones,
}: EnhancedMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [userMarker, setUserMarker] = useState<any>(null)
  const [zoneCircles, setZoneCircles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)

  // Use GPS tracking hook
  const {
    currentPosition,
    isTracking,
    error: gpsError,
    permissionStatus,
    currentZones,
    safetyScore,
    emergencyAlert,
    startTracking,
    stopTracking,
    simulatePositionUpdate,
  } = useGPSTracking({
    touristId,
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000,
  })

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = initializeSocket()

    socket?.on("connect", () => {
      setSocketConnected(true)
      console.log("[v0] Socket.IO connected for real-time updates")
    })

    socket?.on("disconnect", () => {
      setSocketConnected(false)
      console.log("[v0] Socket.IO disconnected")
    })

    // Attempt connection
    socket?.connect()

    return () => {
      socket?.disconnect()
    }
  }, [])

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window !== "undefined" && mapRef.current && !map) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)

      import("leaflet")
        .then((L) => {
          try {
            // Fix default markers
            delete (L.Icon.Default.prototype as any)._getIconUrl
            L.Icon.Default.mergeOptions({
              iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
              iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            })

            // Create map instance
            const mapInstance = L.map(mapRef.current!, {
              center: [28.6139, 77.209], // Default to Delhi center
              zoom: 15,
              zoomControl: true,
              scrollWheelZoom: true,
              doubleClickZoom: true,
              touchZoom: true,
            })

            // Add tile layer
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "© OpenStreetMap contributors",
              maxZoom: 19,
              minZoom: 10,
            }).addTo(mapInstance)

            // Create custom user marker icon
            const userIcon = L.divIcon({
              className: "custom-user-marker",
              html: `
                <div style="
                  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                  color: white;
                  border-radius: 50%;
                  width: 40px;
                  height: 40px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 20px;
                  border: 4px solid white;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  cursor: move;
                  animation: pulse 2s infinite;
                ">📍</div>
                <style>
                  @keyframes pulse {
                    0% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 0 rgba(59, 130, 246, 0.7); }
                    70% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 20px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 0 0 rgba(59, 130, 246, 0); }
                  }
                </style>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })

            // Create draggable user marker
            const marker = L.marker([28.6139, 77.209], {
              draggable: true,
              icon: userIcon,
            }).addTo(mapInstance)

            // Handle marker drag events
            marker.on("dragstart", () => {
              mapInstance.closePopup()
            })

            marker.on("dragend", (e: any) => {
              const newPos = e.target.getLatLng()
              console.log("[v0] Marker dragged to:", newPos.lat, newPos.lng)

              // Simulate GPS update from dragged position
              simulatePositionUpdate(newPos.lat, newPos.lng)

              // Update popup with new coordinates
              marker
                .bindPopup(`
                <div style="text-align: center; min-width: 200px;">
                  <strong>📍 Your Location</strong><br/>
                  <small>Lat: ${newPos.lat.toFixed(6)}</small><br/>
                  <small>Lng: ${newPos.lng.toFixed(6)}</small><br/>
                  <div style="margin-top: 8px; padding: 4px 8px; background: #3b82f6; color: white; border-radius: 4px; font-weight: bold;">
                    Simulated GPS Position
                  </div>
                  <em style="color: #6b7280; font-size: 12px;">Drag to simulate movement</em>
                </div>
              `)
                .openPopup()
            })

            setMap(mapInstance)
            setUserMarker(marker)
            setIsLoading(false)
          } catch (err) {
            console.error("Map initialization error:", err)
            setError("Failed to initialize map")
            setIsLoading(false)
          }
        })
        .catch((err) => {
          console.error("Leaflet import error:", err)
          setError("Failed to load map library")
          setIsLoading(false)
        })
    }

    return () => {
      if (map) {
        map.remove()
        setMap(null)
        setUserMarker(null)
        setZoneCircles([])
      }
    }
  }, [])

  // Update map when GPS position changes
  useEffect(() => {
    if (map && userMarker && currentPosition) {
      const { lat, lng } = currentPosition

      // Update marker position
      userMarker.setLatLng([lat, lng])

      // Center map on new position (with smooth animation)
      map.panTo([lat, lng], { animate: true, duration: 1 })

      // Update marker popup
      userMarker.bindPopup(`
        <div style="text-align: center; min-width: 200px;">
          <strong>📍 Your Location</strong><br/>
          <small>Lat: ${lat.toFixed(6)}</small><br/>
          <small>Lng: ${lng.toFixed(6)}</small><br/>
          <div style="margin-top: 8px; padding: 4px 8px; background: ${safetyScore >= 70 ? "#10b981" : safetyScore >= 30 ? "#f59e0b" : "#dc2626"}; color: white; border-radius: 4px; font-weight: bold;">
            Safety Score: ${safetyScore}%
          </div>
          <small style="color: #6b7280;">
            ${isTracking ? "🟢 Live GPS Tracking" : "🔴 GPS Tracking Stopped"}
          </small><br/>
          <em style="color: #6b7280; font-size: 12px;">
            Accuracy: ±${currentPosition.accuracy?.toFixed(0) || "Unknown"}m
          </em>
        </div>
      `)

      console.log("[v0] Map updated with GPS position:", { lat, lng, safetyScore })
    }
  }, [map, userMarker, currentPosition, safetyScore, isTracking])

  useEffect(() => {
    if (currentPosition) {
      const { lat, lng } = currentPosition
      onLocationChange?.({ lat, lng })
    }
  }, [currentPosition, onLocationChange])

  useEffect(() => {
    onSafeScoreChange?.(safetyScore)
  }, [safetyScore, onSafeScoreChange])

  // Update geofence zones on map
  useEffect(() => {
    if (map && currentZones.length > 0) {
      // Clear existing zone circles
      zoneCircles.forEach((circle) => map.removeLayer(circle))

      // Add new zone circles
      const newCircles = currentZones.map((zone) => {
        const circle = (window as any).L.circle([zone.lat, zone.lng], {
          radius: zone.radius,
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: zone.type === "restricted" ? 0.3 : 0.15,
          weight: zone.type === "restricted" ? 3 : 2,
          dashArray: zone.type === "crowded" ? "10, 5" : undefined,
          className: zone.type === "restricted" ? "animate-pulse" : "",
        }).addTo(map)

        // Add zone popup
        circle.bindPopup(`
          <div style="text-align: center; min-width: 180px;">
            <strong style="color: ${zone.color};">${zone.name}</strong><br/>
            <span style="color: ${zone.color}; font-weight: bold;">
              ${zone.type.charAt(0).toUpperCase() + zone.type.slice(1)} Zone
            </span><br/>
            <small>Radius: ${zone.radius}m</small><br/>
            ${zone.type === "restricted" ? '<em style="color: #dc2626;">🚨 Avoid this area</em>' : ""}
            ${zone.type === "safe" ? '<em style="color: #10b981;">✅ Safe for tourists</em>' : ""}
            ${zone.type === "caution" ? '<em style="color: #f59e0b;">⚠️ Exercise caution</em>' : ""}
            ${zone.type === "crowded" ? '<em style="color: #7c3aed;">👥 Protect belongings</em>' : ""}
          </div>
        `)

        return circle
      })

      setZoneCircles(newCircles)
      console.log("[v0] Updated geofence zones on map:", currentZones.length)
    }
  }, [map, currentZones])

  // Handle GPS permission request
  const handleStartTracking = async () => {
    const success = await startTracking()
    if (!success && permissionStatus === "denied") {
      setError("GPS permission denied. Please enable location access in your browser settings.")
    }
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <div className="text-destructive mb-4">
            <MapPin className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Map Error</h3>
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* GPS Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Navigation className={`h-4 w-4 ${isTracking ? "animate-pulse text-green-500" : "text-gray-400"}`} />
              <span>Real-Time GPS Tracking</span>
              {emergencyAlert.isActive && (
                <Badge variant="destructive" className="animate-pulse">
                  🚨 EMERGENCY
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {socketConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-300">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={isTracking ? stopTracking : handleStartTracking}
                size="sm"
                variant={isTracking ? "destructive" : "default"}
                className="transition-all duration-200"
              >
                {isTracking ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop GPS
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start GPS
                  </>
                )}
              </Button>

              {permissionStatus === "denied" && (
                <Badge variant="destructive" className="text-xs">
                  Permission Denied
                </Badge>
              )}

              {gpsError && (
                <Badge variant="destructive" className="text-xs">
                  {gpsError}
                </Badge>
              )}
            </div>

            <div className="text-right text-sm">
              <div
                className={`font-semibold ${
                  safetyScore >= 70 ? "text-green-600" : safetyScore >= 30 ? "text-yellow-600" : "text-red-600"
                }`}
              >
                Safety: {safetyScore}%
              </div>
              <div className="text-xs text-muted-foreground">
                {currentPosition ? `±${currentPosition.accuracy?.toFixed(0) || "?"}m accuracy` : "No GPS signal"}
              </div>
            </div>
          </div>

          {currentPosition && (
            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 rounded p-2">
              <div>
                <span className="text-muted-foreground">Lat:</span>
                <div className="font-mono">{currentPosition.lat.toFixed(6)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Lng:</span>
                <div className="font-mono">{currentPosition.lng.toFixed(6)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <div ref={mapRef} className="h-96 w-full rounded-lg overflow-hidden" style={{ minHeight: "384px" }} />
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <div className="text-sm text-muted-foreground">Loading interactive map...</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zone Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Static Safety Zones (Predefined)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Green Safe Zones (3 zones)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Orange Caution Zones (4 zones)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Red Restricted Zones (6 zones)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Purple Crowded Areas (2 zones)</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Total Zones: {currentZones.length}</span>
              <span>📍 Drag marker to test emergency alerts</span>
            </div>
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300 font-medium">
                ⚠️ Red zones trigger automatic emergency alerts
              </p>
              <p className="text-red-600 dark:text-red-400 text-xs">
                Police call initiated if not dismissed within 5 seconds
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
