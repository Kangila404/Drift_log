import type { CityBuilder } from '../city/CityGeometry'
import { place } from './Placement'
import { buildProvincialOffice } from './ProvincialOffice'
import { buildPrintworks, buildCornerShops, buildLaneTerrace, buildOfficeCourt } from './StreetArchitecture'

export const CIVIC_PARCELS = [
  { kind: 'print', x: -19, z: 46, scale: .92, yaw: -.09, base: .6, variant: 0 },
  { kind: 'corner', x: 21, z: 38, scale: .96, yaw: .24, base: -.7, variant: 0 },
  { kind: 'lane', x: -20, z: 28, scale: .88, yaw: 1.49, base: .7, variant: 1 },
  { kind: 'lane', x: 22, z: 21, scale: .86, yaw: -1.4, base: .9, variant: 0 },
  { kind: 'lane', x: -18, z: 4.5, scale: .9, yaw: 1.48, base: .1, variant: 0 },
  { kind: 'lane', x: 20, z: -1.5, scale: .88, yaw: -1.42, base: .5, variant: 1 },
  { kind: 'court', x: -24, z: -13, scale: .88, yaw: -.06, base: .1, variant: 0 },
  { kind: 'court', x: 25, z: -21, scale: .84, yaw: .16, base: .4, variant: 1 },
  { kind: 'lane', x: -19, z: -61, scale: .78, yaw: -.18, base: 2.2, variant: 1 },
  { kind: 'lane', x: 13, z: -70, scale: .75, yaw: .1, base: 2.6, variant: 0 },
  { kind: 'lane', x: 39, z: -51, scale: .78, yaw: .35, base: 1.8, variant: 1 },
  { kind: 'lane', x: -43, z: -40, scale: .8, yaw: -.28, base: 1.6, variant: 0 },
] as const
const builders = { print: buildPrintworks, corner: buildCornerShops, lane: buildLaneTerrace, court: buildOfficeCourt }
const streetDepth = (z: number, portrait: boolean) => portrait ? 38 + (z - 38) * .64 : z

export function buildCivicLandmark(kit: CityBuilder, portrait = false) {
  const scale = portrait ? .66 : 1.05
  place(kit, [portrait ? .6 : 1, 4.25 * (1 - scale) + .55 * scale, streetDepth(-38, portrait)], -.08, scale, buildProvincialOffice)
}

export function buildCivicQuarter(kit: CityBuilder, portrait = false) {
  const sx = portrait ? .57 : 1, size = portrait ? .59 : 1
  for (const parcel of CIVIC_PARCELS) {
    const scale = parcel.scale * size
    // Scale the exposed floors about the common flood level, not ground zero.
    place(kit, [parcel.x * sx, 4.25 + (parcel.base - 4.25) * scale, streetDepth(parcel.z, portrait)], parcel.yaw, scale,
      local => builders[parcel.kind](local, parcel.variant))
  }
}
