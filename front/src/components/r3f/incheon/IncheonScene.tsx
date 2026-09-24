import FloodedCityScene, { FloodedCityWorld, type FloodedCitySceneProps } from '../FloodedCityScene'
import type { ScenePreset } from '../../../constants/scenePreset'
import IncheonCity from '../cities/IncheonCity'
import { INCHEON_FRAMING } from './ChinatownNeighborhood'

type IncheonSceneProps = Omit<FloodedCitySceneProps, 'sceneId' | 'children'>
const FRAMING = INCHEON_FRAMING
const SKY: [number, number, number] = [0, 24, -90]

export function IncheonWorld({ playing = true, ...props }: IncheonSceneProps & { preset: ScenePreset; eclipsePhase?: number; eclipseCoverage?: number }) {
  return <FloodedCityWorld {...props} playing={playing} sceneId="incheon" framing={FRAMING} skyOffset={SKY}><IncheonCity /></FloodedCityWorld>
}

export default function IncheonScene({ playing = true, ...props }: IncheonSceneProps) {
  return <FloodedCityScene {...props} playing={playing} sceneId="incheon" framing={FRAMING} skyOffset={SKY}><IncheonCity /></FloodedCityScene>
}
