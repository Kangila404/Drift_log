import { lazy, Suspense, type ComponentType } from 'react'
import FloodedCityScene, { FloodedCityWorld, type FloodedCitySceneProps } from '../FloodedCityScene'
import type { ScenePreset } from '../../../constants/scenePreset'
import { findCity } from './cityRegistry'

const SeoulScene = lazy(() => import('../seoul/SeoulScene'))
const IncheonScene = lazy(() => import('../incheon/IncheonScene'))
const SeoulWorld = lazy(() => import('../seoul/SeoulScene').then(module => ({ default: module.SeoulWorld })))
const IncheonWorld = lazy(() => import('../incheon/IncheonScene').then(module => ({ default: module.IncheonWorld })))
const geometry: Record<number, ComponentType<{ playing?: boolean }>> = {
  3: lazy(() => import('../cities/DaejeonCity')),
  4: lazy(() => import('../cities/GangneungCity')),
  5: lazy(() => import('../cities/BusanCity')),
  6: lazy(() => import('../cities/SuwonCity')),
  7: lazy(() => import('../cities/GwangjuCity')),
  8: lazy(() => import('../cities/DaeguCity')),
  9: lazy(() => import('../cities/PohangCity')),
  10: lazy(() => import('../cities/JejuCity')),
}

type CitySceneProps = Omit<FloodedCitySceneProps, 'sceneId' | 'children'> & { cityId: number }
type CityWorldProps = CitySceneProps & { preset: ScenePreset; eclipsePhase?: number; eclipseCoverage?: number }
const SKY: [number, number, number] = [0, 24, -90]
const JEJU_SKY: [number, number, number] = [420, 14, -200]

// Runtime and preview share geometry and framing; only the host owns the Canvas.
export function CityWorld({ cityId, ...props }: CityWorldProps) {
  const city = findCity(cityId)
  if (!city) throw new Error(`Unknown city: ${cityId}`)
  if (cityId === 1) return <SeoulWorld {...props} />
  if (cityId === 2) return <IncheonWorld {...props} />
  const Geometry = geometry[cityId]
  return <FloodedCityWorld key={cityId} {...props} sceneId={city.slug} framing={city.framing} skyOffset={cityId === 10 ? JEJU_SKY : SKY}>
    <Geometry playing={props.playing} />
  </FloodedCityWorld>
}

export default function CityScene({ cityId, ...props }: CitySceneProps) {
  const city = findCity(cityId)
  if (!city) return <div role="alert">{'\uB3C4\uC2DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'}</div>
  if (cityId === 1) return <Suspense fallback={null}><SeoulScene {...props} /></Suspense>
  if (cityId === 2) return <Suspense fallback={null}><IncheonScene {...props} /></Suspense>
  const Geometry = geometry[cityId]
  return <FloodedCityScene key={cityId} {...props} sceneId={city.slug} framing={city.framing} skyOffset={cityId === 10 ? JEJU_SKY : SKY}>
    <Suspense fallback={null}><Geometry playing={props.playing} /></Suspense>
  </FloodedCityScene>
}
