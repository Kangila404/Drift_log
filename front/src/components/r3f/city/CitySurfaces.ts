import { Float32BufferAttribute, type BufferGeometry } from 'three'

const surfaces = { generic: 0, plaster: 1, masonry: 2, tile: 3, sheet: 4, timber: 5, foliage: 6 } as const
export type CitySurface = keyof typeof surfaces

// One scalar per vertex preserves material batching while separating physical surfaces.
export function setCitySurface(geometry: BufferGeometry, surface?: CitySurface) {
  if (surface === undefined && geometry.hasAttribute('citySurface')) return
  const values = new Float32Array(geometry.getAttribute('position').count)
  values.fill(surfaces[surface ?? 'generic'])
  geometry.setAttribute('citySurface', new Float32BufferAttribute(values, 1))
}
