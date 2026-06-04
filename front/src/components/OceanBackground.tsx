import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import OceanWater from './r3f/OceanWater'
import OceanSky from './r3f/OceanSky'
import Boat, { Wake } from './r3f/Boat'
import { resolveScene } from '../constants/scenePreset'


export default function OceanBackground() {
  const preset = resolveScene({ weatherId: 1, abnormalType: null, timeOfDay: 'night' })

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1.5, 2]}
        camera={{ position: [0, 1.45, 10.8], fov: 46 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.18 }}
      >
        <color attach="background" args={[preset.fogColor]} />
        <fogExp2 attach="fog" args={[preset.fogColor, preset.fogDensity]} />
        <ambientLight intensity={0.48 * preset.ambientIntensity} color="#6fa4d8" />
        <directionalLight position={[0, 8, -12]} intensity={1.6} color="#dcecff" />
        <pointLight position={[0, 1.6, 2.8]} intensity={1.1} color="#ffd28a" />
        <pointLight position={[0, 3.2, -3.5]} intensity={0.75} color="#9ed8ff" />
        <OceanSky preset={preset} eclipsePhase={2.5} eclipseCoverage={0} />
        <OceanWater preset={preset} />
        <Wake />
        <Boat preset={preset} />
      </Canvas>
    </div>
  )
}