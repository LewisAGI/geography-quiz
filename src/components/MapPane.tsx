import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import { MAP_STYLE, quietBasemap } from '../lib/geo'
import type { Question } from '../lib/types'

const LINE = 'guess-line'

function wrapLon(lon: number): number {
  return (((lon + 180) % 360) + 360) % 360 - 180
}

function pin(kind: 'sea' | 'clay'): HTMLDivElement {
  const element = document.createElement('div')
  element.className = `map-pin ${kind}`
  return element
}

export function MapPane({
  question,
  revealed,
  guessLat,
  guessLon,
  onGuess,
}: {
  question: Question
  revealed: boolean
  guessLat: number | null
  guessLon: number | null
  onGuess: (lat: number, lon: number) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onGuessRef = useRef(onGuess)
  const revealedRef = useRef(revealed)
  onGuessRef.current = onGuess
  revealedRef.current = revealed

  useEffect(() => {
    const element = host.current
    if (!element || mapRef.current) return
    const map = new maplibregl.Map({
      container: element,
      style: { version: 8, sources: {}, layers: [] },
      center: [10, 18],
      zoom: 1.4,
      minZoom: 1,
      maxZoom: 8,
      renderWorldCopies: true,
      fadeDuration: 0,
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: { compact: false },
    })
    map.setStyle(MAP_STYLE, {
      transformStyle: (_previous, next) => quietBasemap(next),
    })
    map.touchPitch.disable()
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.on('click', (event) => {
      if (revealedRef.current) return
      onGuessRef.current(event.lngLat.lat, wrapLon(event.lngLat.lng))
    })
    mapRef.current = map
    const resize = () => map.resize()
    resize()
    const timer = window.setTimeout(resize, 80)
    window.addEventListener('resize', resize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', resize)
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false

    const paint = () => {
      if (cancelled || !map.isStyleLoaded()) return
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      const dropLine = () => {
        if (map.getLayer(LINE)) map.removeLayer(LINE)
        if (map.getSource(LINE)) map.removeSource(LINE)
      }
      if (!revealed || question.lat == null || question.lon == null) {
        dropLine()
        map.jumpTo({ center: [10, 18], zoom: 1.4 })
        return
      }
      markersRef.current.push(
        new maplibregl.Marker({ element: pin('sea'), anchor: 'center' })
          .setLngLat([question.lon, question.lat])
          .addTo(map),
      )
      if (guessLat == null || guessLon == null) {
        dropLine()
        return
      }
      markersRef.current.push(
        new maplibregl.Marker({ element: pin('clay'), anchor: 'center' })
          .setLngLat([guessLon, guessLat])
          .addTo(map),
      )
      const data = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [guessLon, guessLat],
            [question.lon, question.lat],
          ],
        },
      }
      const existing = map.getSource(LINE) as GeoJSONSource | undefined
      if (existing) existing.setData(data)
      else {
        map.addSource(LINE, { type: 'geojson', data })
        map.addLayer({
          id: LINE,
          type: 'line',
          source: LINE,
          paint: {
            'line-color': '#14211b',
            'line-width': 2,
            'line-dasharray': [1.2, 1.6],
          },
        })
      }
      const bounds = new maplibregl.LngLatBounds()
      bounds.extend([guessLon, guessLat])
      bounds.extend([question.lon, question.lat])
      map.fitBounds(bounds, { padding: 72, maxZoom: 5, animate: false })
    }

    paint()
    map.on('load', paint)
    map.on('style.load', paint)
    return () => {
      cancelled = true
      map.off('load', paint)
      map.off('style.load', paint)
    }
  }, [question.id, question.lat, question.lon, revealed, guessLat, guessLon])

  return <div className="map-host" ref={host} data-testid="map" />
}
