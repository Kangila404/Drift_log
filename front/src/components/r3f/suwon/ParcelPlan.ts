export type BlockKind = 'shops' | 'walkup' | 'roofs' | 'homes'
export interface Parcel { kind: BlockKind; x: number; z: number; base: number; scale: number; yaw: number; variant: number; uphill?: boolean }

// Irregular street banks close toward the gate; a side lane climbs the west bank.
export const SUWON_PARCELS: readonly Parcel[] = [
  { kind: 'shops', x: -17, z: 34, base: -2.4, scale: 1.1, yaw: -.13, variant: 0 },
  { kind: 'roofs', x: 23, z: 32, base: -.8, scale: 1.1, yaw: .19, variant: 0 },
  { kind: 'walkup', x: -23, z: 7, base: -1, scale: .93, yaw: -.12, variant: 0 },
  { kind: 'homes', x: 29, z: 9, base: -.9, scale: .85, yaw: .28, variant: 0 },
  { kind: 'shops', x: 27, z: -10, base: -1.8, scale: .87, yaw: .17, variant: 2 },
  { kind: 'roofs', x: -8, z: -24, base: 1.3, scale: .84, yaw: -.08, variant: 1 },
  { kind: 'homes', x: -31, z: -29, base: 0, scale: .8, yaw: -.19, variant: 0, uphill: true },
  { kind: 'homes', x: 36, z: -37, base: -1.4, scale: .8, yaw: .15, variant: 1 },
  { kind: 'shops', x: -47, z: -15, base: 0, scale: .77, yaw: -.32, variant: 1, uphill: true },
  { kind: 'roofs', x: -25, z: -46, base: 0, scale: .76, yaw: -.24, variant: 0, uphill: true },
  { kind: 'homes', x: 30, z: -66, base: 0, scale: .65, yaw: .12, variant: 0, uphill: true },
  { kind: 'homes', x: -1, z: -57, base: 0, scale: .66, yaw: -.09, variant: 1, uphill: true },
]

export const parcelHalfSize = (kind: BlockKind) => kind === 'shops' ? [11.5, 8] : kind === 'roofs' ? [13, 9] : kind === 'homes' ? [11, 8] : [6, 6]
