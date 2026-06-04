import { useEffect, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import OceanWater from '../components/r3f/OceanWater'
import OceanSky from '../components/r3f/OceanSky'
import Boat, { Wake } from '../components/r3f/Boat'
import HUD from '../components/ui/HUD'
import CityView from '../components/ui/CityView'
import WeatherEffects from '../components/weather/WeatherEffects'
import EndingSequence from '../components/EndingSequence'
import { useVoyageStore } from '../stores/voyageStore'
import { useVoyageInit } from '../hooks/useVoyageInit'
import { useVoyageActions } from '../hooks/useVoyageActions'
import { useWeather } from '../contexts/WeatherContext'
import { useTimeOfDay } from '../hooks/useTimeOfDay'
import { useEclipse } from '../hooks/useEclipse'
import { useViewport } from '../hooks/useViewport'
import { resolveScene } from '../constants/scenePreset'
import EventOverlay from '../components/event/EventOverlay'
import { useRandomEvent } from '../hooks/useRandomEvent'
import { apiClient } from '../api/client'
import CityArrivalSequence from '../components/CityArrivalSequence'
import { bgm } from '../audio/bgmManager'

type Scene = 'ocean' | 'arriving' | 'cityIntro' | 'city'

export default function VoyagePage() {
  const { ready } = useVoyageInit()
  const { voyageState, currentCity, isFamilyReunited, cityArrival } = useVoyageStore()
  const { completeVoyage } = useVoyageActions()
  const [scene, setScene] = useState<Scene>('ocean')
  const randomEvent = useRandomEvent()
  const { isMobile } = useViewport()

  const completedRef = useRef(false)
  const prevStateRef = useRef(voyageState)   // 직전 항해 상태
  const [showEnding, setShowEnding] = useState(false)

  // ── BGM (항해/도시) ──
  useEffect(() => {
    if (voyageState === 'SAILING' || voyageState === 'PAUSED') {
      bgm.playVoyage()
    } else if (voyageState === 'ANCHORED' && currentCity?.bgmUrl) {
      bgm.playCity(currentCity.bgmUrl)
    }
  }, [voyageState, currentCity])

  // ── 진입 인사 (로그인/회원가입 직후 1회) ──
  const [greeting, setGreeting] = useState<{ msg: string; name: string } | null>(null)

  useEffect(() => {
    if (localStorage.getItem('justLoggedIn') !== '1') return
    localStorage.removeItem('justLoggedIn')

    const hour = new Date().getHours()
    const msg =
      hour < 6 ? '깊은 밤입니다.' :
      hour < 12 ? '좋은 아침입니다.' :
      hour < 18 ? '좋은 오후입니다.' :
      '좋은 저녁입니다.'

    apiClient.get('/users/me')
      .then(res => {
        setGreeting({ msg, name: res.data.name })
        setTimeout(() => setGreeting(null), 4000)
      })
      .catch(() => {})
  }, [])

  // ── 날씨/시간대 → preset ──
  const { weatherId, abnormalType } = useWeather()
  const timeOfDay = useTimeOfDay()

  const eclipseActive = abnormalType === 'ECLIPSE' && timeOfDay === 'day'

  const preset = eclipseActive
    ? { ...resolveScene({ weatherId: 1, abnormalType: null, timeOfDay: 'day' }), celestialBody: 'eclipse' as const }
    : resolveScene({ weatherId, abnormalType, timeOfDay })

  const { phase, coverage } = useEclipse(eclipseActive)

  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = voyageState

    if (voyageState === 'ANCHORED' && currentCity) {
      // SAILING/PAUSED → ANCHORED로 "전환"됐을 때만 = 방금 도착
      const justArrived = prev === 'SAILING' || prev === 'PAUSED'
      if (justArrived && !completedRef.current) {
        completedRef.current = true
        completeVoyage().catch((e) => console.error('항해 완료 처리 실패:', e))
      }
      if (justArrived && scene === 'ocean') {
        setScene('arriving')
        setTimeout(() => {
          if (useVoyageStore.getState().cityArrival) {
            setScene('cityIntro')
          } else {
            setScene('city')
          }
        }, 2800)
      }
    } else if (voyageState === 'SAILING' || voyageState === 'PAUSED') {
      completedRef.current = false  // 다음 항해 위해 리셋
      setScene('ocean')
    }
  }, [voyageState, currentCity])

  useEffect(() => {
    if (ready && voyageState === 'ANCHORED' && currentCity) {
      setScene('city')
    }
  }, [ready])

  // ── 엔딩 — 방금 complete로 재회했을 때만 (새로고침/재진입 X) ──
  useEffect(() => {
    if (isFamilyReunited && completedRef.current) {
      const t = setTimeout(() => setShowEnding(true), 1000)
      return () => clearTimeout(t)
    }
  }, [isFamilyReunited])

  // ── 엔딩 BGM ──
  useEffect(() => {
    if (showEnding) bgm.playEnding()
  }, [showEnding])

  return (
    <div className="w-full h-[100dvh] relative bg-[#07111d] overflow-hidden">

{/* 오션 씬 — arriving까지 유지 */}
      {(scene === 'ocean' || scene === 'arriving') && (
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: scene === 'arriving' ? 0 : 1 }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
        >
          {/* 하늘 배경 — preset의 skyTop → skyBottom 그라데이션 */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, ${preset.skyTop} 0%, ${preset.skyBottom} 100%)`,
            }}
          />

          <Canvas
            dpr={[1.5, 2]}
            camera={{ position: [0, 1.45, 10.8], fov: isMobile ? 60 : 46 }}
            gl={{
              antialias: true,
              alpha: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.18,
            }}
            style={{ background: 'transparent' }}
          >
            {/* <color attach="background" .../> 제거 — 그라데이션 div가 배경 담당 */}
            <fogExp2 attach="fog" args={[preset.fogColor, preset.fogDensity]} />
            <ambientLight intensity={0.48 * preset.ambientIntensity * (1 - coverage * 0.9)} color="#6fa4d8" />
            <directionalLight position={[0, 8, -12]} intensity={1.6 * (1 - coverage * 0.9)} color="#dcecff" />
            <pointLight position={[0, 1.6, 2.8]} intensity={1.1 * (1 - coverage * 0.9)} color="#ffd28a" />
            <pointLight position={[0, 3.2, -3.5]} intensity={0.75 * (1 - coverage * 0.9)} color="#9ed8ff" />
            <OceanSky preset={preset} eclipsePhase={phase} eclipseCoverage={coverage} />
            <OceanWater preset={preset} />
            <Wake />
            <Boat preset={preset} />
          </Canvas>

          {/* 일식 어둠 오버레이 */}
          {eclipseActive && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none',
              background: '#01030a', opacity: coverage * 0.88, transition: 'opacity 0.2s linear',
            }} />
          )}

          <WeatherEffects effects={preset.effects} />
          <EventOverlay event={randomEvent} />
          <HUD initReady={ready} />
        </motion.div>
      )}

      {/* 진입 인사 (로그인 직후 1회) */}
      <AnimatePresence>
        {greeting && (
          <motion.div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <motion.p
              className="text-[12px] md:text-[14px] font-mono text-[#7eb8d4] tracking-[0.4em]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              {greeting.msg}
            </motion.p>
            <motion.p
              className="mt-4 font-serif text-[20px] md:text-[26px] text-[#a8d4e8] tracking-[0.3em]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              {greeting.name}님
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 도착 중간 전환 오버레이 */}
      <AnimatePresence>
        {scene === 'arriving' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.p
              className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.5em] uppercase"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              도착
            </motion.p>
            {currentCity && (
              <motion.p
                className="mt-3 font-serif text-[18px] md:text-[22px] text-[#a8d4e8] tracking-[0.3em]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                {currentCity.name}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 도시 씬 */}
      <AnimatePresence>
        {scene === 'city' && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <CityView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 첫 방문 도시 인트로 */}
      {scene === 'cityIntro' && cityArrival && (
        <CityArrivalSequence
          cityName={cityArrival.cityName}
          imageUrl={cityArrival.imageUrl}
          description={cityArrival.description}
          onFinish={() => {
            useVoyageStore.getState().setCityArrival(null)
            setScene('city')
          }}
        />
      )}

      {/* 엔딩 시퀀스 (방금 재회 시 1회, 피드백 포함) */}
      {showEnding && (
        <EndingSequence onFinish={() => setShowEnding(false)} />
      )}
    </div>
  )
}