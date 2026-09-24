import type { CityBuilder } from '../city/CityGeometry'
import { placeSuwon as place } from './SuwonPlacement'
import { buildHwaseomunGate } from './HwaseomunGate'
import { buildCourtyardHanok } from './CourtyardHanok'
import { buildPrintShop } from './PrintShop'
import { buildWaterfrontWorkshop } from './WaterfrontWorkshop'

export function buildSuwonLandmark(kit: CityBuilder, portrait = false) {
  place(kit, portrait ? [3, .55, -29] : [9, -.64, -29], -.42, portrait ? .87 : 1.15, buildHwaseomunGate)
}

export function buildSuwonNeighborhood(kit: CityBuilder, portrait = false) {
  if (portrait) {
    place(kit, [-8.5, 1.105, -14], -.22, .74, buildPrintShop)
    place(kit, [-5.8, 1.53, 16], -.25, .64, buildWaterfrontWorkshop)
    place(kit, [6.8, 1.53, 14], .38, .64, buildCourtyardHanok)
  } else {
    place(kit, [-28, -.21, -19], -.22, 1.05, buildPrintShop)
    place(kit, [-14, 0, 17], -.25, 1, buildWaterfrontWorkshop)
    place(kit, [23, 0, 10], .38, 1, buildCourtyardHanok)
  }
}
