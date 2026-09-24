import type { CityBuilder } from '../city/CityGeometry'
import { buildTower83 } from './Tower83'
import { buildTextileWorkshop, buildCoveredMarket, buildCourtyardHousing, buildCornerShops, buildWalkupTenement } from './MarketBuildings'
import { layoutPoint, place } from './Placement'
import { groundHeight } from './DuryuRelief'

type Parcel = { build: (kit: CityBuilder) => void; x: number; z: number; base: number; yaw: number; sx: number; sy: number; sz: number }
export const MARKET_PARCELS: readonly Parcel[] = [
  { build: buildTextileWorkshop, x: -27, z: 25, base: .2, yaw: -.3, sx: 1.25, sy: 1.15, sz: 1.85 },
  { build: buildCornerShops, x: -15, z: 15, base: -.5, yaw: -.3, sx: 1.1, sy: 1.05, sz: 1.4 },
  { build: buildCoveredMarket, x: -19, z: 0, base: .3, yaw: -.3, sx: 1.15, sy: 1.1, sz: 1.2 },
  { build: buildCourtyardHousing, x: 6, z: 9, base: -.4, yaw: -.3, sx: 1, sy: .98, sz: 1.15 },
  { build: buildCornerShops, x: 18, z: -7, base: .2, yaw: -.3, sx: 1, sy: 1.05, sz: 1.2 },
  { build: buildTextileWorkshop, x: -30, z: -7, base: .4, yaw: 1.39, sx: .75, sy: 1.1, sz: .8 },
  { build: buildWalkupTenement, x: -6, z: -10, base: 1, yaw: -.3, sx: 1, sy: .94, sz: .95 },
  { build: buildCourtyardHousing, x: 12, z: -24, base: 1.2, yaw: -.3, sx: .9, sy: 1.03, sz: .9 },
  { build: buildCoveredMarket, x: -23, z: -24, base: 1.6, yaw: -.18, sx: .8, sy: .9, sz: .8 },
  { build: buildTextileWorkshop, x: -36, z: -25, base: 1.8, yaw: -.18, sx: .85, sy: 1, sz: .85 },
  { build: buildCornerShops, x: -7, z: -31, base: 2.4, yaw: -.18, sx: .85, sy: .96, sz: .9 },
  { build: buildWalkupTenement, x: 34, z: -15, base: 3.3, yaw: .1, sx: .8, sy: .87, sz: 1.1 },
  { build: buildCourtyardHousing, x: -21, z: -42, base: 3.5, yaw: -.18, sx: .8, sy: .95, sz: .9 },
  { build: buildTextileWorkshop, x: 1, z: -40, base: 3.6, yaw: -.18, sx: .8, sy: .9, sz: .9 },
  { build: buildCornerShops, x: -10, z: 2, base: -.6, yaw: -.3, sx: .66, sy: .78, sz: .9 },
  { build: buildTextileWorkshop, x: 26, z: 12, base: -.5, yaw: -.3, sx: .95, sy: .94, sz: 1.4 },
  { build: buildWalkupTenement, x: 16, z: 18, base: -.65, yaw: -.3, sx: .9, sy: .87, sz: 1 },
  { build: buildCornerShops, x: -38, z: 19, base: .3, yaw: -.3, sx: .78, sy: 1.2, sz: 1.1 },
  { build: buildTextileWorkshop, x: 30, z: -33, base: 5.1, yaw: -.24, sx: .65, sy: .7, sz: .9 },
]

export function buildMarketQuarter(kit: CityBuilder, portrait = false) {
  for (const p of MARKET_PARCELS) {
    const shrink = portrait ? .58 : 1
    const at = layoutPoint(p.x, p.base, p.z, portrait)
    if (portrait) at[0] += p.x < 0 ? -.65 : .65
    place(kit, p.build, at, p.yaw, [p.sx * shrink, p.sy * (portrait ? .82 : 1), p.sz * (portrait ? .64 : 1)])
  }
  // Contiguous submerged street edges link parcels rather than displaying islands.
  const paths: [number, number, number, number][] = [[-35, 26, -27, -39], [-9, 21, -3, -12], [1, -12, 7, -28], [-3, 16, 9, -12], [-34, -17, 5, -24]]
  for (const [x1, z1, x2, z2] of paths) {
    kit.beam('edge', layoutPoint(x1, 4.22, z1, portrait), layoutPoint(x2, 4.32, z2, portrait), .16, .28, 'masonry')
  }
}

export function buildDuryuLandmark(kit: CityBuilder, portrait = false) {
  const x = 23, z = -34, base = groundHeight(x, z)
  place(kit, buildTower83, layoutPoint(x, base, z, portrait), -.16,
    portrait ? [.75, .75, .75] : [.91, .91, .91])
}
