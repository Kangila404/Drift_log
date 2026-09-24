import type { CityBuilder } from '../city/CityGeometry'
import { placeSuwon } from './SuwonPlacement'
import { buildHwaseomunGate } from './HwaseomunGate'
import { buildShopCourt, buildBrickWalkup } from './StreetBlocks'
import { buildRoofQuarter, buildBackstreetHomes } from './RoofQuarter'
import { buildSuwonConnections, parcelGround, terrainWidth } from './InlandTerrain'
import { SUWON_PARCELS } from './ParcelPlan'
export { SUWON_PARCELS } from './ParcelPlan'
const builders = { shops: buildShopCourt, walkup: buildBrickWalkup, roofs: buildRoofQuarter, homes: buildBackstreetHomes }

export function buildSuwonLandmark(kit: CityBuilder, portrait = false) {
  const scale = portrait ? .78 : 1.05
  placeSuwon(kit, [12 * terrainWidth(portrait), 4.25 * (1 - scale), -41], -.22, scale, buildHwaseomunGate)
}

export function buildSuwonNeighborhood(kit: CityBuilder, portrait = false) {
  const sx = terrainWidth(portrait), size = portrait ? .67 : 1
  for (const parcel of SUWON_PARCELS) {
    const x = parcel.x * sx, scale = parcel.scale * size
    const ground = parcel.uphill ? parcelGround(parcel) : parcel.base
    const base = parcel.uphill ? ground : 4.25 + (ground - 4.25) * size
    placeSuwon(kit, [x, base, parcel.z], parcel.yaw, scale, local => builders[parcel.kind](local, parcel.variant))
  }
  buildSuwonConnections(kit, portrait)
}
