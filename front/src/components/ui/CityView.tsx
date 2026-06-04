import { useEffect, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import HUD from './HUD'
import TraceModal from './TraceModal'
import VoyageSelectModal from './VoyageSelectModal'
import BoatMaintenanceModal from './BoatMaintenanceModal'
import { useVoyageStore } from '../../stores/voyageStore'
import { useVoyageActions } from '../../hooks/useVoyageActions'
import OceanWater from '../r3f/OceanWater'
import OceanSky from '../r3f/OceanSky'
import WeatherEffects from '../weather/WeatherEffects'
import { useWeather } from '../../contexts/WeatherContext'
import { useTimeOfDay } from '../../hooks/useTimeOfDay'
import { useEclipse } from '../../hooks/useEclipse'
import { resolveScene } from '../../constants/scenePreset'
import { bgm } from '../../audio/bgmManager'

// 도시 SVG
import Seoul from './cities/Seoul'
import Incheon from './cities/Incheon'
import Daejeon from './cities/Daejeon'
import Gangneung from './cities/Gangneung'
import Busan from './cities/Busan'
import Suwon from './cities/Suwon'
import Gwangju from './cities/Gwangju'
import Daegu from './cities/Daegu'
import Pohang from './cities/Pohang'
import Jeju from './cities/Jeju'

// cityId → SVG (DB city 테이블 id 순서와 동일)
const CITY_COMPONENTS: Record<number, React.ComponentType> = {
  1: Seoul,
  2: Incheon,
  3: Daejeon,
  4: Gangneung,
  5: Busan,
  6: Suwon,
  7: Gwangju,
  8: Daegu,
  9: Pohang,
  10: Jeju,
}

// 물 반사 shimmer 레이어
function WaterReflection() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
      background: 'linear-gradient(to bottom, transparent, rgba(4, 12, 28, 0.6))',
      pointerEvents: 'none', zIndex: 2,
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${10 + i * 15}%`, bottom: `${8 + (i % 3) * 12}%`,
          width: `${40 + i * 8}px`, height: '1px',
          background: 'rgba(120, 180, 220, 0.25)', borderRadius: '50%',
          animation: `shimmer ${2.5 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`,
        }} />
      ))}
    </div>
  )
}

// 파티클 (먼지/물방울)
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2 + 0.5, duration: Math.random() * 8 + 6,
    delay: Math.random() * 5, opacity: Math.random() * 0.3 + 0.1,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: `${p.size}px`, height: `${p.size}px`, borderRadius: '50%',
          background: `rgba(150, 190, 230, ${p.opacity})`,
          animation: `float ${p.duration}s ease-in-out infinite`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  )
}

export default function CityView() {
  const { currentCity, discoveredTrace } = useVoyageStore()
  const { startVoyage } = useVoyageActions()

  const { weatherId, abnormalType } = useWeather()
  const timeOfDay = useTimeOfDay()

  // 일식: 낮 + ECLIPSE일 때만
  const eclipseActive = abnormalType === 'ECLIPSE' && timeOfDay === 'day'

  // 일식이면 배경은 "낮 + 잔잔한 수면", 천체만 eclipse (어둠은 오버레이로)
  const preset = eclipseActive
    ? { ...resolveScene({ weatherId: 1, abnormalType: null, timeOfDay: 'day' }), celestialBody: 'eclipse' as const }
    : resolveScene({ weatherId, abnormalType, timeOfDay })

  const { phase, coverage } = useEclipse(eclipseActive)

  const [nameVisible, setNameVisible] = useState(true)
  const [buttonsVisible, setButtonsVisible] = useState(false)
  const [traceOpen, setTraceOpen] = useState(false)
  const [voyageOpen, setVoyageOpen] = useState(false)
  const [maintOpen, setMaintOpen] = useState(false)
  const [muted, setMuted] = useState(bgm.isMuted())

  // 첫 방문 흔적 자동 오픈 — 한 번만
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    const nameTimer = setTimeout(() => setNameVisible(false), 3000)
    const btnTimer = setTimeout(() => setButtonsVisible(true), 4000)
    return () => { clearTimeout(nameTimer); clearTimeout(btnTimer) }
  }, [])

  // 첫 방문(discoveredTrace 존재) 시 도시 연출 끝나고 흔적 모달 자동 오픈
  useEffect(() => {
    if (discoveredTrace && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      const t = setTimeout(() => setTraceOpen(true), 3500)
      return () => clearTimeout(t)
    }
  }, [discoveredTrace])

  if (!currentCity) return null

  // cityId로 도시 SVG 선택 (없으면 Suwon 폴백)
  const CityComponent = CITY_COMPONENTS[currentCity.cityId] ?? Suwon

  const handleVoyageStart = async (cityId: string) => {
    try {
      await startVoyage(Number(cityId))
    } catch (e) {
      console.error('항해 시작 실패:', e)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#040c1a' }}>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.2; transform: scaleX(1); }
          50% { opacity: 0.6; transform: scaleX(1.3); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-40px) translateX(10px); opacity: 0; }
        }
      `}</style>

      {/* 레이어 1: 하늘 + 바다 (Three.js) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.2, 10], fov: 50 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
        >
          <color attach="background" args={[preset.fogColor]} />
          <fogExp2 attach="fog" args={[preset.fogColor, preset.fogDensity]} />
          <ambientLight intensity={preset.ambientIntensity * (1 - coverage * 0.9)} color="#4a6fa8" />
          <directionalLight position={[5, 8, -10]} intensity={0.8 * (1 - coverage * 0.9)} color="#c8d8f0" />
          <OceanSky preset={preset} eclipsePhase={phase} eclipseCoverage={coverage} />
          <OceanWater preset={preset} />
        </Canvas>
      </div>

      {/* 일식 어둠 오버레이 */}
      {eclipseActive && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
          background: '#01030a', opacity: coverage * 0.88, transition: 'opacity 0.2s linear',
        }} />
      )}

      {/* 레이어 3: 도시 SVG 실루엣 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
        <CityComponent />
      </div>

      {/* 레이어 5: 물 반사 shimmer */}
      <WaterReflection />

      {/* 레이어 6: 파티클 */}
      <Particles />

      {/* 레이어 7: 날씨별 연출 (비/안개/블러/바람) */}
      <WeatherEffects effects={preset.effects} />

      {/* 상단 그라디언트 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '20%',
        background: 'linear-gradient(to bottom, rgba(4,10,24,0.5), transparent)',
        pointerEvents: 'none', zIndex: 6,
      }} />

      {/* BGM 음소거 — 우상단 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: buttonsVisible ? 1 : 0 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
        onClick={() => setMuted(bgm.toggleMute())}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        className="absolute top-8 right-8 z-20 w-12 h-12 rounded-full border flex items-center justify-center backdrop-blur-md transition-all duration-300 bg-[#050e18]/55 border-[#1a4a64]/70 text-[#7eb8d4]/80 hover:text-[#cce8f5] hover:border-[#7eb8d4]/70"
        style={{ pointerEvents: buttonsVisible ? 'auto' : 'none' }}
        aria-label={muted ? '소리 켜기' : '소리 끄기'}
        title={muted ? '소리 켜기' : '소리 끄기'}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
          {muted ? (
            <>
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </>
          ) : (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          )}
        </svg>
      </motion.button>

      {/* 도시 이름 */}
      <div style={{
        position: 'absolute', bottom: '38%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: nameVisible ? 1 : 0, y: nameVisible ? 0 : -10 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          style={{
            color: 'rgba(200, 220, 235, 0.9)', fontFamily: '"Noto Serif KR", serif',
            fontSize: '1.2rem', letterSpacing: '0.5em', fontWeight: 300,
            textShadow: '0 0 30px rgba(100,160,200,0.6), 0 0 60px rgba(100,160,200,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          {currentCity.name}
        </motion.div>
      </div>

      {/* 하단 버튼 */}
      <div style={{
        position: 'absolute', bottom: 'clamp(2rem, 5vh, 5rem)', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: buttonsVisible ? 1 : 0, y: buttonsVisible ? 0 : 10 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          style={{ display: 'flex', gap: '2rem', pointerEvents: buttonsVisible ? 'auto' : 'none' }}
        >
          {[
            { label: '흔적 보기', onClick: () => setTraceOpen(true) },
            { label: '배 정비', onClick: () => setMaintOpen(true) },
            { label: '항해하기', onClick: () => setVoyageOpen(true) },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              style={{
                background: 'rgba(4, 12, 28, 0.4)', border: '1px solid rgba(100, 160, 200, 0.3)',
                color: 'rgba(180, 210, 230, 0.7)', fontFamily: '"Noto Serif KR", serif',
                fontSize: '0.75rem', letterSpacing: '0.25em', padding: '0.6rem 1.6rem',
                cursor: 'pointer', transition: 'all 0.3s ease', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                const t = e.currentTarget
                t.style.borderColor = 'rgba(100, 160, 200, 0.7)'
                t.style.color = 'rgba(200, 230, 245, 0.95)'
                t.style.background = 'rgba(4, 12, 28, 0.6)'
              }}
              onMouseLeave={e => {
                const t = e.currentTarget
                t.style.borderColor = 'rgba(100, 160, 200, 0.3)'
                t.style.color = 'rgba(180, 210, 230, 0.7)'
                t.style.background = 'rgba(4, 12, 28, 0.4)'
              }}
            >
              {btn.label}
            </button>
          ))}
        </motion.div>
      </div>

      <HUD isAnchored />

      <TraceModal open={traceOpen} onClose={() => setTraceOpen(false)} trace={discoveredTrace} />
      <VoyageSelectModal open={voyageOpen} onClose={() => setVoyageOpen(false)} onConfirm={handleVoyageStart} />
      <BoatMaintenanceModal open={maintOpen} onClose={() => setMaintOpen(false)} />
    </div>
  )
}