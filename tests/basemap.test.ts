import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { quietBasemap } from '../src/lib/geo'

type Layer = {
  id: string
  type: string
  layout?: Record<string, unknown>
  paint?: Record<string, unknown>
  'source-layer'?: string
}

type LibertyStyle = {
  layers: Layer[]
  sources: Record<string, { attribution?: string; type?: string; url?: string }>
}

const liberty = JSON.parse(
  readFileSync(new URL('./fixtures/liberty.style.json', import.meta.url), 'utf8'),
) as LibertyStyle

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

  it('uses the saved Liberty style, keeps OSM borders, and keeps attribution', () => {
    expect(liberty.layers.some((layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout)).toBe(true)
    const credited = {
      ...liberty,
      sources: {
        ...liberty.sources,
        openmaptiles: {
          ...liberty.sources.openmaptiles,
          attribution:
            '<a href="https://openfreemap.org">OpenFreeMap</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      },
    }
    const loaded = quietBasemap(credited)
    expect(loaded.layers.some((layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout)).toBe(false)
    expect(loaded.layers.some((layer) => layer.id === 'label_city_capital' || layer.id === 'poi_r1')).toBe(false)
    for (const id of ['boundary_2', 'boundary_3', 'boundary_disputed']) {
      expect(loaded.layers.some((layer) => layer.id === id && layer.type === 'line')).toBe(true)
    }
    const attribution = loaded.sources.openmaptiles?.attribution ?? ''
    expect(attribution).toContain('OpenFreeMap')
    expect(attribution).toContain('OpenStreetMap')
  })
})
