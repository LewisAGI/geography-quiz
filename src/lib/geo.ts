import type { Question } from './types'

/** OpenFreeMap Liberty. Style, sprites, glyphs, and tiles are served from this origin with no API key. */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function mapScore(
  lat: number,
  lon: number,
  question: Question,
): { km: number; correct: boolean } {
  const km = haversineKm(lat, lon, question.lat ?? 0, question.lon ?? 0)
  const tolerance = question.tolerance_km ?? 0
  return { km: Math.round(km), correct: km <= tolerance }
}

export function withinTolerance(km: number, toleranceKm: number): boolean {
  return km <= toleranceKm
}
