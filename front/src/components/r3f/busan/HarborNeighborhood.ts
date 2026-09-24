import type { CityBuilder } from '../city/CityGeometry'
import { placeBusan as place } from './BusanPlacement'
import { buildBusanTower } from './BusanTower'
import { buildShippingOffice } from './ShippingOffice'
import { buildWholesaleMarket } from './WholesaleMarket'
import { buildTerraceHouse } from './TerraceHouse'

export function buildBusanLandmark(kit: CityBuilder, portrait = false) {
  place(kit, portrait ? [-.8, 0, -45] : [-9, 0, -40], -.1, 1, buildBusanTower)
}

export function buildBusanNeighborhood(kit: CityBuilder, portrait = false) {
  if (portrait) {
    place(kit, [-8.2, 0, -4], -.17, .67, buildShippingOffice)
    place(kit, [5.8, 1, 18], .12, .58, buildWholesaleMarket)
    place(kit, [10.3, 1, -42], -.27, .68, buildTerraceHouse)
  } else {
    place(kit, [-22, 0, -1], -.2, 1, buildShippingOffice)
    place(kit, [5, 0, 18], .18, 1, buildWholesaleMarket)
    place(kit, [32, 0, -36], -.35, 1.1, buildTerraceHouse)
  }
}
