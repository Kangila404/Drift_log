import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import OceanWater from '../components/r3f/OceanWater'
import OceanSky from '../components/r3f/OceanSky'
import Boat, { Wake } from '../components/r3f/Boat'
import HUD from '../components/ui/HUD'

export default function VoyagePage() {
  return (
    <div className="w-full h-screen relative bg-[#07111d] overflow-hidden">
      {/* 3D 씬 */}
      <Canvas
        dpr={[1.5, 2]}
        camera={{ position: [0, 1.45, 10.8], fov: 46 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.18,
        }}
      >
        <color attach="background" args={['#07111d']} />
        <ambientLight intensity={0.48} color="#6fa4d8" />
        <directionalLight position={[0, 8, -12]} intensity={1.6} color="#dcecff" />
        <pointLight position={[0, 1.6, 2.8]} intensity={1.1} color="#ffd28a" />
        <pointLight position={[0, 3.2, -3.5]} intensity={0.75} color="#9ed8ff" />

        <OceanSky />
        <OceanWater />
        <Wake />
        <Boat />
      </Canvas>

      {/* HTML UI 오버레이 */}
      <HUD />
    </div>
  )
}