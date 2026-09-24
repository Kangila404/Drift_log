import SeoulCity from '../cities/SeoulCity'
import FloodedCityScene, { FloodedCityWorld, type FloodedCitySceneProps } from '../FloodedCityScene'
import type { ScenePreset } from '../../../constants/scenePreset'
import { resolveScene } from '../../../constants/scenePreset'
import { SEOUL_MODELED_FRAMING } from './SeoulModeledGeometry'

export { CityCameraRig as SeoulCameraRig } from '../FloodedCityScene'
export type { CityCameraAction as SeoulCameraAction } from '../FloodedCityScene'

type SeoulSceneProps = Omit<FloodedCitySceneProps, 'sceneId' | 'children'>
const FRAMING = SEOUL_MODELED_FRAMING
const SKY: [number, number, number] = [-3, 32, -90]

export function SeoulWorld({ playing = true, ...props }: SeoulSceneProps & { preset: ScenePreset; eclipsePhase?: number; eclipseCoverage?: number }) {
  return <FloodedCityWorld {...props} sceneId="seoul" playing={playing} framing={FRAMING} skyOffset={SKY}>
    <SeoulCity preset={props.preset} eclipseCoverage={props.eclipseCoverage} />
  </FloodedCityWorld>
}

export default function SeoulScene({ playing = true, ...props }: SeoulSceneProps) {
  const preset = resolveScene({ weatherId: 1, abnormalType: null, timeOfDay: props.light ?? 'night' })
  return <FloodedCityScene {...props} sceneId="seoul" playing={playing} framing={FRAMING} skyOffset={SKY}>
    <SeoulCity preset={preset} />
  </FloodedCityScene>
}
