import type { CityFraming } from '../FloodedCityScene'

export interface CityDefinition {
  id: number
  slug: string
  name: string
  landmark: string
  framing: CityFraming
}

const framing = { desktopDistance: 90, portraitDistance: 130 }

export const CITY_DEFINITIONS: readonly CityDefinition[] = [
  { id: 1, slug: 'seoul', name: '\uC11C\uC6B8', landmark: '\u666F\u798F\u5BAE', framing },
  { id: 2, slug: 'incheon', name: '\uC778\uCC9C', landmark: '\uC778\uCC9C\uB300\uAD50', framing },
  { id: 3, slug: 'daejeon', name: '\uB300\uC804', landmark: '\uD55C\uBE5B\uD0D1', framing: { desktopDistance: 100, portraitDistance: 118, orbitLimit: .1, zoomMin: .85, zoomMax: 1.15 } },
  { id: 4, slug: 'gangneung', name: '\uAC15\uB989', landmark: '\uC36C\uD06C\uB8E8\uC988', framing: { desktopDistance: 108, portraitDistance: 126, portraitAspect: 390 / 844, cameraHeight: 13.6, orbitLimit: .09, zoomMin: .88, zoomMax: 1.15 } },
  { id: 5, slug: 'busan', name: '\uBD80\uC0B0', landmark: '\uBD80\uC0B0\uD0C0\uC6CC', framing: { desktopDistance: 100, portraitDistance: 130, portraitAspect: 390 / 844, cameraHeight: 18, orbitLimit: .09, zoomMin: .9, zoomMax: 1.15 } },
  { id: 6, slug: 'suwon', name: '\uC218\uC6D0', landmark: '\uD654\uC11C\uBB38', framing: { desktopDistance: 122, portraitDistance: 120, portraitAspect: 390 / 844, portraitMinDistance: 108, cameraHeight: 24, minPolarAngle: Math.PI * .445, orbitLimit: .08, zoomMin: .94, zoomMax: 1.15 } },
  { id: 7, slug: 'gwangju', name: '\uAD11\uC8FC', landmark: '\uC61B \uC804\uB0A8\uB3C4\uCCAD', framing: { desktopDistance: 120, portraitDistance: 136, portraitAspect: 390 / 844, portraitMinDistance: 128, cameraHeight: 24, minPolarAngle: Math.PI * .445, orbitLimit: .08, zoomMin: .94, zoomMax: 1.15 } },
  { id: 8, slug: 'daegu', name: '\uB300\uAD6C', landmark: '83\uD0C0\uC6CC', framing: { desktopDistance: 103, portraitDistance: 126, portraitAspect: 390 / 844, portraitMinDistance: 119, cameraHeight: 24.5, minPolarAngle: Math.PI * .43, orbitLimit: .07, zoomMin: .96, zoomMax: 1.15 } },
  { id: 9, slug: 'pohang', name: '\uD3EC\uD56D', landmark: '\uD638\uBBF8\uACF6 \uB4F1\uB300', framing: { desktopDistance: 110, portraitDistance: 129, portraitAspect: 390 / 844, portraitMinDistance: 121, cameraHeight: 24, minPolarAngle: Math.PI * .435, orbitLimit: .07, zoomMin: .96, zoomMax: 1.15 } },
  { id: 10, slug: 'jeju', name: '\uC81C\uC8FC', landmark: '\uC81C\uC8FC \uD574\uC548 \uB9C8\uC744', framing: { desktopDistance: 48, portraitDistance: 70, portraitAspect: 390 / 844, portraitMinDistance: 64, portraitTargetX: -1.1, cameraHeight: 6.05, targetHeight: 5.15, targetZ: -15, minPolarAngle: Math.PI * .475, orbitLimit: .075, zoomMin: .9, zoomMax: 1.14 } },
]

export function findCity(id: number) {
  return CITY_DEFINITIONS.find(city => city.id === id)
}
