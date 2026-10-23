import { describe, expect, it } from 'vitest'
import { MAP_STYLE, quietBasemap } from '../src/lib/geo'

type Layer = {
  id: string
  type: string
  layout?: Record<string, unknown>
  paint?: Record<string, unknown>
  'source-layer'?: string
}

describe('quiet basemap', () => {
  it('strips text labels and keeps border lines', () => {
    const style = quietBasemap({
      layers: [
        { id: 'boundary_2', type: 'line' },
        { id: 'label_city_capital', type: 'symbol', layout: { 'text-field': '{name:en}' } },
        { id: 'label_country_1', type: 'symbol', layout: { 'text-field': '{name}' } },
        { id: 'poi_r1', type: 'symbol', layout: { 'icon-image': 'poi' } },
        { id: 'peak', type: 'symbol', 'source-layer': 'mountain_peak', layout: { 'icon-image': 'peak' } },
        { id: 'road_one_way_arrow', type: 'symbol', layout: { 'icon-image': 'arrow' } },
      ] satisfies Layer[],
    })
    expect(style.layers.some((layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout)).toBe(false)
    expect(style.layers.map((layer) => layer.id)).toEqual(['boundary_2', 'road_one_way_arrow'])
  })

  it('loads Liberty with no symbol text and with borders', async () => {
    const response = await fetch(MAP_STYLE)
    expect(response.ok).toBe(true)
    const raw = (await response.json()) as { layers: Layer[] }
    expect(raw.layers.some((layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout)).toBe(true)
    const loaded = quietBasemap(raw)
    expect(loaded.layers.some((layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout)).toBe(false)
    expect(loaded.layers.some((layer) => layer.id === 'label_city_capital' || layer.id === 'poi_r1')).toBe(false)
    expect(loaded.layers.some((layer) => layer.id === 'boundary_2' && layer.type === 'line')).toBe(true)
    expect(loaded.layers.some((layer) => layer.id === 'boundary_disputed' && layer.type === 'line')).toBe(true)
  })
})
