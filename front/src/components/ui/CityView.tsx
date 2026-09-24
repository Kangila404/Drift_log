import { lazy, Suspense, useEffect, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import HUD from './HUD'
import TraceModal from './TraceModal'
import VoyageSelectModal from './VoyageSelectModal'
import BoatMaintenanceModal from './BoatMaintenanceModal'
import { useVoyageStore } from '../../stores/voyageStore'
import { useVoyageActions } from '../../hooks/useVoyageActions'
import { useWeather } from '../../contexts/WeatherContext'
import { useTimeOfDay } from '../../hooks/useTimeOfDay'
import { useEclipse } from '../../hooks/useEclipse'
import { resolveScene } from '../../constants/scenePreset'
import { bgm } from '../../audio/bgmManager'
import { haptic, notifyOverlay, isNativeApp } from '../../lib/nativeBridge'
import type { CityCameraAction } from '../r3f/FloodedCityScene'

const CityWorld = lazy(() => import('../r3f/city/CityScene').then(module => ({ default: module.CityWorld })))

// 파티클 (먼지/물방울)
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => {
    const sample = (salt: number) => ((i * 73 + salt * 41) % 97) / 97
    return {
      id: i, x: sample(1) * 100, y: sample(2) * 100,
      size: sample(3) * 2 + .5, duration: sample(4) * 8 + 6,
      delay: sample(5) * 5, opacity: sample(6) * .3 + .1,
    }
  })
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

interface CityViewProps {
  isFirstVoyage?: boolean
}

export default function CityView({ isFirstVoyage = false }: CityViewProps) {
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
  const [voyageStarted, setVoyageStarted] = useState(false)   // 첫 항해 시작 여부
  const [cameraAction, setCameraAction] = useState<CityCameraAction>({ id: 0, kind: 'reset' })

  // 첫 방문 흔적 자동 오픈 — 한 번만
  const autoOpenedRef = useRef(false)

    // 웹 모달 열림 → 네이티브 HUD 버튼 숨김
  useEffect(() => {
    const anyOpen = traceOpen || voyageOpen || maintOpen
    notifyOverlay(anyOpen)
  }, [traceOpen, voyageOpen, maintOpen])
  
  useEffect(() => {
    const nameTimer = setTimeout(() => setNameVisible(false), 3000)
    const btnTimer = setTimeout(() => setButtonsVisible(true), 4000)
    return () => { clearTimeout(nameTimer); clearTimeout(btnTimer) }
  }, [])

  // 첫 방문(discoveredTrace 존재) 시 도시 연출 끝나고 흔적 모달 자동 오픈
  useEffect(() => {
    if (discoveredTrace && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      const t = setTimeout(() => setTraceOpen(true), 500)
      return () => clearTimeout(t)
    }
  }, [discoveredTrace])

  if (!currentCity) return null

  const adjustCamera = (kind: CityCameraAction['kind']) => {
    haptic('light')
    setCameraAction(current => ({ id: current.id + 1, kind }))
  }

  const handleVoyageStart = async (cityId: string) => {
    try {
      setVoyageStarted(true)   // 항해 시작 → 안내 영구 종료
      await startVoyage(Number(cityId))
    } catch (e) {
      console.error('항해 시작 실패:', e)
    }
  }

  // 첫 유저 안내: 버튼 떠있고 / 흔적·항해 모달 안 떠있고 / 아직 항해 시작 안 했을 때
  const showHint = isFirstVoyage && buttonsVisible && !traceOpen && !voyageOpen && !voyageStarted

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', backgroundColor: '#040c1a' }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-40px) translateX(10px); opacity: 0; }
        }
      `}</style>

      {/* All cities share one sky, water surface and camera inside this Canvas. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas
          dpr={[1, 1.25]}
          camera={{ position: [3.24, 1.25, 72], fov: 28, near: .2, far: 650 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: .94 }}
        >
          <Suspense fallback={null}>
            <CityWorld key={currentCity.cityId} cityId={currentCity.cityId} preset={preset} eclipsePhase={phase} eclipseCoverage={coverage} cameraAction={cameraAction} />
          </Suspense>
        </Canvas>
      </div>

      {/* 일식 어둠 오버레이 */}
      {eclipseActive && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
          background: '#01030a', opacity: coverage * 0.36, transition: 'opacity 0.2s linear',
        }} />
      )}

      {/* 레이어 6: 파티클 */}
      <Particles />

      {/* 상단 그라디언트 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '20%',
        background: 'linear-gradient(to bottom, rgba(4,10,24,0.5), transparent)',
        pointerEvents: 'none', zIndex: 6,
      }} />

      {/* BGM 음소거 — 우상단 (웹 전용, 앱은 네이티브 버튼 사용) */}
      {!isNativeApp() && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: buttonsVisible ? 1 : 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          onClick={() => { haptic('light'); setMuted(bgm.toggleMute()) }}
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
      )}

      <div className="absolute top-[5.5rem] right-8 z-20 flex flex-col overflow-hidden rounded border border-[#1a4a64]/70 bg-[#050e18]/55 backdrop-blur-md">
        <button type="button" data-camera-control="in" aria-label="확대" title="확대" onClick={() => adjustCamera('in')}
          className="grid h-10 w-12 place-items-center border-b border-[#1a4a64]/55 text-[#7eb8d4]/80 transition-colors hover:bg-[#0a2233]/70 hover:text-[#cce8f5]">
          <ZoomIn size={17} />
        </button>
        <button type="button" data-camera-control="out" aria-label="축소" title="축소" onClick={() => adjustCamera('out')}
          className="grid h-10 w-12 place-items-center border-b border-[#1a4a64]/55 text-[#7eb8d4]/80 transition-colors hover:bg-[#0a2233]/70 hover:text-[#cce8f5]">
          <ZoomOut size={17} />
        </button>
        <button type="button" data-camera-control="reset" aria-label="시점 초기화" title="시점 초기화" onClick={() => adjustCamera('reset')}
          className="grid h-10 w-12 place-items-center text-[#7eb8d4]/80 transition-colors hover:bg-[#0a2233]/70 hover:text-[#cce8f5]">
          <RotateCcw size={17} />
        </button>
      </div>

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

      {/* 하단 버튼 + 첫 유저 안내 */}
      <div style={{
        position: 'absolute',
        bottom: 'calc(9rem + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem',
        zIndex: 10, pointerEvents: 'none',
      }}>
        {/* 첫 유저 안내 텍스트 */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: showHint ? 1 : 0, y: showHint ? 0 : 8 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          className="font-serif text-[#a8d4e8] text-center px-6"
          style={{
            fontSize: 'clamp(13px, 1.6vw, 16px)', letterSpacing: '0.15em',
            textShadow: '0 0 20px rgba(100,160,200,0.4)',
            pointerEvents: 'none',
          }}
        >
          항해하기 버튼을 눌러 항해를 시작하세요
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: buttonsVisible ? 1 : 0, y: buttonsVisible ? 0 : 10 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="flex flex-row flex-wrap justify-center gap-2.5 sm:gap-6 px-4 w-full max-w-md sm:max-w-none"
          style={{ pointerEvents: buttonsVisible ? 'auto' : 'none' }}
        >
          {[
            { label: '흔적 보기', onClick: () => { haptic('light'); setTraceOpen(true) } },
            { label: '배 정비', onClick: () => { haptic('light'); setMaintOpen(true) } },
            { label: '항해하기', onClick: () => { haptic('medium'); setVoyageOpen(true) } },
          ].map(btn => {
            const highlight = showHint && btn.label === '항해하기'
            return (
              <motion.button
                key={btn.label}
                onClick={btn.onClick}
                animate={highlight ? {
                  boxShadow: [
                    '0 0 0px rgba(126,184,212,0)',
                    '0 0 22px rgba(126,184,212,0.55)',
                    '0 0 0px rgba(126,184,212,0)',
                  ],
                } : { boxShadow: '0 0 0px rgba(126,184,212,0)' }}
                transition={highlight ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
                className={`rounded font-serif whitespace-nowrap transition-colors duration-300 backdrop-blur-md
                           text-[0.7rem] sm:text-[0.75rem] tracking-[0.2em] sm:tracking-[0.25em]
                           px-4 py-2.5 sm:px-6 sm:py-2.5 border
                           ${highlight
                             ? 'border-[#7eb8d4]/80 text-[#cce8f5] bg-[#0a2233]/70'
                             : 'border-[#64a0c8]/30 text-[#b4d2e6]/70 bg-[#040c1c]/40 hover:border-[#64a0c8]/70 hover:text-[#c8e6f5]/95 hover:bg-[#040c1c]/60'}`}
              >
                {btn.label}
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      <HUD isAnchored />

      <TraceModal open={traceOpen} onClose={() => setTraceOpen(false)} trace={discoveredTrace} />
      <VoyageSelectModal open={voyageOpen} onClose={() => setVoyageOpen(false)} onConfirm={handleVoyageStart} />
      <BoatMaintenanceModal open={maintOpen} onClose={() => setMaintOpen(false)} />
    </div>
  )
}
