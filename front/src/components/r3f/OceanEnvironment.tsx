import OceanSky from './OceanSky'
import OceanWater from './OceanWater'
import type { ScenePreset } from '../../constants/scenePreset'
import { getWeatherAtmosphere } from '../../constants/weatherAtmosphere'
import Rain from './Rain'

interface OceanEnvironmentProps {
  preset: ScenePreset
  playing?: boolean
  eclipsePhase?: number
  eclipseCoverage?: number
  sheltered?: boolean
  skyOffset?: [number, number, number]
  moonlightStrength?: number
  reflectArchitecture?: boolean
  reflectionRevision?: number
  starOpacityScale?: number
  rainOverride?: boolean
}

export default function OceanEnvironment({ preset, playing = true, eclipsePhase, eclipseCoverage, sheltered = false, skyOffset = [0, 0, 0], moonlightStrength = 0, reflectArchitecture = false, reflectionRevision = 0, starOpacityScale = 1, rainOverride = false }: OceanEnvironmentProps) {
  const weather = getWeatherAtmosphere(preset.effects)
  return <group name="Shared ocean environment">
    <hemisphereLight args={['#a6bacb', '#527080', (1 - weather.transmission) * (sheltered ? .15 : .4)]} />
    {!sheltered && <directionalLight position={[0, 2, 12]} color="#8c9fab" intensity={.24 + weather.cloudiness * .22} />}
    <group position={skyOffset}><OceanSky preset={preset} playing={playing} eclipsePhase={eclipsePhase} eclipseCoverage={eclipseCoverage} starOpacityScale={starOpacityScale} /></group>
    <OceanWater preset={preset} playing={playing} waveStrength={sheltered ? .22 : 1} moonlightStrength={moonlightStrength} reflectArchitecture={reflectArchitecture} reflectionRevision={reflectionRevision + Math.round((eclipseCoverage ?? 0) * 12)}
      celestialPosition={[skyOffset[0], skyOffset[1] + 8.4, skyOffset[2] - 20]} />
    {(weather.rain > 0 || rainOverride) && <Rain intensity={Math.max(weather.rain, rainOverride ? .65 : 0)}
      maxOpacity={rainOverride ? .42 : .3} wind={weather.wind} playing={playing} />}
  </group>
}
