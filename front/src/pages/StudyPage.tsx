import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import OceanWater from '../components/r3f/OceanWater'
import OceanSky from '../components/r3f/OceanSky'
import Boat from '../components/r3f/Boat'
import Rain from '../components/r3f/Rain'
import StudyHUD from '../components/ui/StudyHUD'
import { useViewport } from '../hooks/useViewport'
import { useWeather } from '../contexts/WeatherContext'
import { useTimeOfDay } from '../hooks/useTimeOfDay'
import { useEclipse } from '../hooks/useEclipse'
import { resolveScene } from '../constants/scenePreset'
import { noise, type NoiseKey } from '../audio/noiseManager'
import { isNativeApp } from '../lib/nativeBridge'
import { useEffect, useState } from 'react'

const START_KEY = 'studyStartAt'

export default function StudyPage() {
  const { isMobile } = useViewport()
  const { weatherId, abnormalType } = useWeather()
  const timeOfDay = useTimeOfDay()

  const [studying, setStudying] = useState(() => !!localStorage.getItem(START_KEY))
  const [activeNoise, setActiveNoise] = useState<NoiseKey | null>(() => noise.getCurrent())

  // ── 웹 단독: localStorage / noise 이벤트 동기화 ──
  useEffect(() => {
    const sync = () => setStudying(!!localStorage.getItem(START_KEY))
    window.addEventListener('study-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('study-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    const sync = () => setActiveNoise(noise.getCurrent())
    window.addEventListener('noise-change', sync)
    return () => window.removeEventListener('noise-change', sync)
  }, [])

  // ── 앱: 네이티브 HUD → 웹 3D 제어 (공부 중 = 배 움직임, 소리 = 비/장작 효과) ──
  useEffect(() => {
    if (!isNativeApp()) return
    const onMsg = (e: MessageEvent) => {
      let msg: any = {}
      try { msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data } catch { return }
      if (msg.type === 'study-state') {
        setStudying(!!msg.studying)
      } else if (msg.type === 'study-noise') {
        setActiveNoise((msg.noise ?? null) as NoiseKey | null)
      }
    }
    window.addEventListener('message', onMsg)
    document.addEventListener('message', onMsg as any)   // 안드로이드 WebView
    return () => {
      window.removeEventListener('message', onMsg)
      document.removeEventListener('message', onMsg as any)
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
        <Boat preset={preset} forceSailing={studying} fireActive={activeNoise === 'fire'} />

        {/* 비는 월드 공간 — 배 따라 안 흔들림 */}
        <Rain active={activeNoise === 'rain'} />
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