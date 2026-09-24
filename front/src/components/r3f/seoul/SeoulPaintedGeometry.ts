import * as THREE from 'three'

export const SEOUL_PAINTINGS = {
  bank: '/city-art/seoul/painted-bank-key-v2.png',
  ridge: '/city-art/seoul/painted-ridge-key-v2.png',
} as const
export const SEOUL_PAINTING = SEOUL_PAINTINGS.bank
export const SEOUL_PAINTED_FRAMING = { desktopDistance: 90, portraitDistance: 104, orbitLimit: .075, zoomMin: .92, zoomMax: 1.1 }
type Source = keyof typeof SEOUL_PAINTINGS
export interface SeoulPaintedPart { name: string; source: Source; geometry: THREE.BufferGeometry }

// Dimensions and visible baselines belong to newly generated chroma-matted art,
// not to any previous city model. The shader discards the background matte.
export const SEOUL_ART_LAYOUT = {
  bank: { width: 1024, height: 1536, baseline: 1228, top: 209 },
  ridge: { width: 1536, height: 1024, baseline: 802, top: 226 },
}

/** Layered painted meshes retain the chosen concept's surfaces. Modest supported
 * camera motion reveals separation between the near bank and the distant ridge;
 * the shared ocean reflects those actual placements rather than a painted sea.
 */
export function buildSeoulPaintedCity(width: number, height: number): SeoulPaintedPart[] {
  if (!(width > 0 && height > 0 && Number.isFinite(width + height))) throw new Error('Invalid Seoul viewport')
  const portrait = width / height < .9
  const distance = portrait ? SEOUL_PAINTED_FRAMING.portraitDistance : SEOUL_PAINTED_FRAMING.desktopDistance
  const yaw = Math.atan(.045)
  const create = (source: Source, depth: number, name: string) => {
    const dimensions = SEOUL_ART_LAYOUT[source]
    const art = { aspect: dimensions.width / dimensions.height, baseline: dimensions.baseline / dimensions.height, top: dimensions.top / dimensions.height }
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(14)) * (distance - depth)
    const viewWidth = viewHeight * width / height
    const plateWidth = source === 'ridge' ? Math.min(viewWidth * 1.6, viewHeight * .43 / (art.baseline - art.top) * art.aspect)
      : Math.min(viewWidth * 1.17, viewHeight * (portrait ? .44 : .66) / (art.baseline - art.top) * art.aspect)
    const plateHeight = plateWidth / art.aspect
    const x = source === 'ridge' ? -viewWidth * .08 : viewWidth * (portrait ? .56 : .52) - plateWidth / 2
    const y = -2.83 + (art.baseline - .5) * plateHeight
    const geometry = new THREE.PlaneGeometry(plateWidth, plateHeight, 64, 8)
    if (source === 'ridge' && !portrait) {
      // Extend only outer terrain to the viewport edges; the landmark's central
      // source region keeps its original proportions on wide screens.
      const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv')
      for (let i = 0; i < position.count; i++) {
        const u = uv.getX(i)
        if (u < .15) position.setX(i, THREE.MathUtils.lerp(-viewWidth * .58 - x, -.35 * plateWidth, u / .15))
        else if (u > .5) position.setX(i, THREE.MathUtils.lerp(0, viewWidth * .62 - x, (u - .5) / .5))
      }
      geometry.computeVertexNormals()
    }
    geometry.rotateY(yaw)
    geometry.translate(-depth * .045 + x * Math.cos(yaw), y, depth - x * Math.sin(yaw))
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    return { name, source, geometry }
  }
  return [
    create('ridge', -60, 'N Seoul Tower ridge'),
    create('bank', -6, 'Painted flooded hillside neighborhood'),
  ]
}
