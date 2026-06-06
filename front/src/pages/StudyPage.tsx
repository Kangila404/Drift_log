import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import OceanWater from '../components/r3f/OceanWater'
import OceanSky from '../components/r3f/OceanSky'
import Boat from '../components/r3f/Boat'          // ← Wake import 제거
import StudyHUD from '../components/ui/StudyHUD'
import { useViewport } from '../hooks/useViewport'
import { useWeather } from '../contexts/WeatherContext'
import { useTimeOfDay } from '../hooks/useTimeOfDay'
import { useEclipse } from '../hooks/useEclipse'
import { resolveScene } from '../constants/scenePreset'
import { noise } from '../audio/noiseManager'
import { useEffect, useState } from 'react'

const START_KEY = 'studyStartAt'

export default function StudyPage() {
  const { isMobile } = useViewport()
  const { weatherId, abnormalType } = useWeather()
  const timeOfDay = useTimeOfDay()

  const [studying, setStudying] = useState(() => !!localStorage.getItem(START_KEY))

  useEffect(() => {
    const sync = () => setStudying(!!localStorage.getItem(START_KEY))
    window.addEventListener('study-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('study-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const eclipseActive = abnormalType === 'ECLIPSE' && timeOfDay === 'day'

  const preset = eclipseActive
    ? { ...resolveScene({ weatherId: 1, abnormalType: null, timeOfDay: 'day' }), celestialBody: 'eclipse' as const }
    : resolveScene({ weatherId, abnormalType, timeOfDay })

  const { phase, coverage } = useEclipse(eclipseActive)

  useEffect(() => {
    return () => noise.stopAll()
  }, [])

  return (
    <div className="w-full h-[100dvh] relative bg-[#07111d] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, ${preset.skyTop} 0%, ${preset.skyBottom} 100%)` }}
      />

      <Canvas
        dpr={[1.5, 2]}
        camera={{ position: [0, 1.45, 10.8], fov: isMobile ? 60 : 46 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.18 }}
        style={{ background: 'transparent' }}
      >
        <fogExp2 attach="fog" args={[preset.fogColor, preset.fogDensity]} />
        <ambientLight intensity={0.48 * preset.ambientIntensity * (1 - coverage * 0.9)} color="#6fa4d8" />
        <directionalLight position={[0, 8, -12]} intensity={1.6 * (1 - coverage * 0.9)} color="#dcecff" />
        <pointLight position={[0, 1.6, 2.8]} intensity={1.1 * (1 - coverage * 0.9)} color="#ffd28a" />
        <pointLight position={[0, 3.2, -3.5]} intensity={0.75 * (1 - coverage * 0.9)} color="#9ed8ff" />
        <OceanSky preset={preset} eclipsePhase={phase} eclipseCoverage={coverage} />
        <OceanWater preset={preset} />
        <Boat preset={preset} forceSailing={studying} />   {/* ← 공부 중이면 항적 */}
      </Canvas>

      {eclipseActive && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none',
          background: '#01030a', opacity: coverage * 0.88, transition: 'opacity 0.2s linear',
        }} />
      )}

      <StudyHUD />
    </div>
  )
}