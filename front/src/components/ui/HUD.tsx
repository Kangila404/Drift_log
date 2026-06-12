import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../../api/client'
import { useVoyageStore } from '../../stores/voyageStore'
import EndingSequence from '../EndingSequence'
import { bgm } from '../../audio/bgmManager'
import { getDiscoveredTraces, type DiscoveredTrace } from '../../api/trace'
import OpeningSequence from '../OpeningSequence'
import CustomerCenter from '../CustomerCenter'
import { goModeSelect, notifyNativeLogout, isNativeApp, sendVoyageState } from '../../lib/nativeBridge'


type EventInfo = { name: string; text: string; imageUrl: string | null }
type LogEntry = { id: number; ts: number; date: string; from: string; to: string; note: string; autoText: string; events: EventInfo[] }

// ─── 도시 메타 ──────────────────
const CITY_META: Record<number, { name: string; img: string; desc: string }> = {
  1:  { name: '서울', img: '/city/seoul.png',     desc: '물에 잠긴 고궁. 한때 가장 번화했던 도시가 수면 아래 남아 있다.' },
  2:  { name: '인천', img: '/city/incheon.png',   desc: '수몰된 인천 대교, 파도가 잔잔한 날이면 물 아래로 도시의 윤곽이 희미하게 보인다.' },
  3:  { name: '대전', img: '/city/daejeon.png',   desc: '내륙 깊숙이 물이 차올랐다. 바람이 불면 도시였던 자리에서 이상한 소리가 들린다.' },
  4:  { name: '강릉', img: '/city/gangneung.png', desc: '산자락까지 물이 차올랐지만 높은 봉우리는 살아남았다. 안개가 자욱한 날이면 섬처럼 보이는 산봉우리들이 수평선 위로 떠오른다.' },
  5:  { name: '부산', img: '/city/busan.png',     desc: '남쪽 끝 항구 도시. 수몰을 피한 사람들이 모여들었다는 소문이 있다. 멀리서 보면 불빛이 깜빡이는 것 같기도 하다.' },
  6:  { name: '수원', img: '/city/suwon.png',     desc: '화성의 성벽이 수면 위로 드러나 있다. 성곽을 따라 물이 차오른 모습이 낯설다. 성 안쪽 깊은 곳에서 가끔 빛이 흔들린다.' },
  7:  { name: '광주', img: '/city/gwangju.png',   desc: '가장 낮은 고지의 있는 광주, 무등산 주상절리가 보인다.' },
  8:  { name: '대구', img: '/city/daegu.png',     desc: '분지였던 지형 탓에 물이 깊게 고였다.' },
  9:  { name: '포항', img: '/city/pohang.png',    desc: '가족과 함께 보았던 상생의 손이 보인다. 이젠 상생의 손마디인가.' },
  10: { name: '제주', img: '/city/jeju.png',      desc: '한라산 중턱까지 물이 찼다. 백록담이 섬이 되었다.' },
}

const CITY_BGM: Record<number, string> = {
  1: '/city/seoul_bgm.mp3', 2: '/city/incheon_bgm.mp3', 3: '/city/daejeon_bgm.mp3',
  4: '/city/gangneung_bgm.mp3', 5: '/city/busan_bgm.mp3', 6: '/city/suwon_bgm.mp3',
  7: '/city/gwangju_bgm.mp3', 8: '/city/daegu_bgm.mp3', 9: '/city/pohang_bgm.mp3', 10: '/city/jeju_bgm.mp3',
}

const fmtTime = (sec: number) => {
  if (!sec || !isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── 남은 시간 카운트다운 다이얼 (progress 비례 원호 + 매초 시간) ───
function CountdownDial({ remainingSeconds, progress, paused }: {
  remainingSeconds: number; progress: number; paused: boolean
}) {
  const [sec, setSec] = useState(remainingSeconds)

  useEffect(() => { setSec(remainingSeconds) }, [remainingSeconds])

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setSec(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [paused])

  const safeProgress = Math.max(0, Math.min(1, progress))
  const R = 46
  const CIRC = 2 * Math.PI * R

  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const p = (n: number) => String(n).padStart(2, '0')
  const timeText = sec <= 0 ? '도착' : h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`

  return (
    <div className="relative w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#0d2233" strokeWidth="2" />
        <motion.circle
          cx="50" cy="50" r={R} fill="none"
          stroke={paused ? '#2a5a74' : '#4a9abb'} strokeWidth="2" strokeLinecap="round"
          strokeDasharray={CIRC}
          animate={{ strokeDashoffset: CIRC * (1 - safeProgress) }}
          transition={{ duration: paused ? 0 : 1.2, ease: 'easeOut' }}
        />
        {!paused && safeProgress > 0.02 && safeProgress < 0.99 && (
          <circle
            cx={50 + R * Math.cos(2 * Math.PI * safeProgress)}
            cy={50 + R * Math.sin(2 * Math.PI * safeProgress)}
            r="2.2" fill="#9ee6ff"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] md:text-[19px] lg:text-[22px] font-mono text-[#cce8f5] tabular-nums tracking-wide leading-none">{timeText}</span>
        <span className="text-[7px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase mt-1">
          {paused ? '정지' : sec <= 0 ? '' : '남음'}
        </span>
      </div>
    </div>
  )
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}



// ─── 진행바 ───────────────────────────────────────────────────────────────────
function ProgressBar({ from, to, progress, voyageState }: {
  from: string; to: string; progress: number
  voyageState: 'ANCHORED' | 'SAILING' | 'PAUSED'
}) {
  const isPaused = voyageState === 'PAUSED'

  const safeProgress = Math.max(0, Math.min(1, progress))

  return (
    <div className="flex flex-col gap-3" style={{ width: 'clamp(200px, 35vw, 480px)' }}>
      <div className="flex justify-between items-baseline">
        <span className="text-[16px] font-mono text-[#4a7a94] tracking-widest uppercase">{from}</span>
        <span className="text-[14px] font-mono text-[#7eb8d4] opacity-60 mx-4">{isPaused ? 'Ⅱ' : '→'}</span>
        <span className="text-[16px] font-mono text-[#a8d4e8] tracking-widest uppercase">{to}</span>
      </div>
      <div className="relative h-[4px] bg-[#0d2233] rounded-full overflow-hidden">
        <motion.div
          className={`absolute top-0 left-0 h-full rounded-full ${isPaused ? 'bg-[#2a5a74]' : 'bg-[#4a9abb]'}`}
          initial={{ width: 0 }}
          animate={{ width: `${safeProgress * 100}%` }}
          transition={{ duration: isPaused ? 0 : 1.2, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-[14px] font-mono text-[#2a5a74]">
          {isPaused ? (
            <span className="text-[#7eb8d4]">항해 정지 중</span>
          ) : (
            <span className="text-[#4a9abb]">{to}로 항해 중</span>
          )}
        </span>
        <span className="text-[14px] font-mono text-[#4a7a94]">{Math.round(safeProgress * 100)}%</span>
      </div>
    </div>
  )
}

// ─── 지도 ─────────────────────────────────────────────────────────────────────
const KOREA_PATH = `M 78.1,2.0 L 76.0,3.1 L 75.7,7.9 L 70.5,8.1 L 66.2,12.3 L 60.1,11.4 L 55.5,12.5 L 58.3,14.8 L 58.0,18.3 L 47.2,17.5 L 43.3,14.0 L 39.0,16.0 L 39.3,18.1 L 33.2,22.7 L 29.5,22.7 L 13.0,30.3 L 16.1,35.3 L 21.0,34.3 L 25.2,37.2 L 21.3,42.4 L 22.8,44.6 L 19.7,45.0 L 15.8,49.6 L 21.0,49.8 L 19.7,51.3 L 22.2,51.3 L 22.8,53.3 L 25.8,53.3 L 28.0,50.6 L 32.6,53.3 L 35.9,51.5 L 35.0,55.7 L 41.7,57.6 L 39.0,59.0 L 43.3,61.3 L 41.7,62.0 L 37.8,60.3 L 32.3,63.0 L 35.0,63.8 L 35.3,67.0 L 35.9,63.8 L 37.8,64.0 L 40.5,71.8 L 35.0,76.6 L 35.0,78.9 L 30.7,81.0 L 31.0,85.0 L 35.0,83.3 L 31.0,87.5 L 36.2,84.0 L 36.2,86.5 L 43.9,86.7 L 42.7,84.8 L 46.0,82.3 L 47.2,84.0 L 44.5,85.8 L 49.4,85.8 L 48.2,82.7 L 52.1,83.3 L 52.8,80.6 L 54.6,83.3 L 58.3,80.6 L 64.4,83.3 L 64.7,80.0 L 62.2,80.8 L 61.9,79.1 L 67.1,79.8 L 74.5,75.4 L 75.7,69.9 L 72.9,70.3 L 72.9,57.8 L 61.9,48.9 L 58.0,42.4 L 49.7,39.7 L 49.4,34.3 L 61.6,30.9 L 63.8,28.4 L 69.0,27.4 L 69.0,25.9 L 75.7,23.2 L 75.7,14.8 L 79.0,11.2 L 86.7,9.5 L 85.5,6.4 L 83.0,6.4 Z`
const JEJU_PATH = `M 32.0,96.7 L 33.5,96.9 L 33.8,97.8 L 35.3,96.9 L 37.2,97.8 L 37.5,96.9 L 41.4,96.9 L 41.4,95.5 L 42.7,94.7 L 35.3,94.6 L 35.0,95.3 L 34.1,95.3 Z`

const CITY_COORDS: Record<number, { x: number; y: number; name: string }> = {
  1:  { x: 45.5, y: 53.0, name: '서울' }, 2:  { x: 36.0, y: 55.0, name: '인천' },
  3:  { x: 48.5, y: 69.0, name: '대전' }, 4:  { x: 63.0, y: 50.0, name: '강릉' },
  5:  { x: 73.8, y: 75.2, name: '부산' }, 6:  { x: 46.2, y: 59.2, name: '수원' },
  7:  { x: 43.0, y: 75.8, name: '광주' }, 8:  { x: 64.0, y: 72.5, name: '대구' },
  9:  { x: 75.0, y: 70.5, name: '포항' }, 10: { x: 38.0, y: 95.5, name: '제주' },
}

function MapPanel() {
  const { voyageState, currentCity, destinationCityId, progress } = useVoyageStore()
  const [mapOpen, setMapOpen] = useState(false)

  const fromCity = currentCity ? CITY_COORDS[currentCity.cityId] : null
  const toCity = destinationCityId ? CITY_COORDS[destinationCityId] : null
  const safeProgress = Math.max(0, Math.min(1, progress))

  const boatX = fromCity && toCity ? fromCity.x + (toCity.x - fromCity.x) * safeProgress : null
  const boatY = fromCity && toCity ? fromCity.y + (toCity.y - fromCity.y) * safeProgress : null
  const isSailing = voyageState === 'SAILING' || voyageState === 'PAUSED'

  const mapSvg = (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
      <rect width="100" height="100" fill="#040d16" />
      <defs>
        <pattern id="seagrid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#0a1f2e" strokeWidth="0.25" />
        </pattern>
        <filter id="mapGlow">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="boatGlow">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="100" height="100" fill="url(#seagrid)" opacity="0.5" />
      <g transform="translate(10 2) scale(0.78)">
        <path d={KOREA_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.65" />
        <path d={KOREA_PATH} fill="none" stroke="#4a9abb" strokeWidth="0.22" opacity="0.5" filter="url(#mapGlow)" />
        <path d={JEJU_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.45" />
        <path d={JEJU_PATH} fill="none" stroke="#4a9abb" strokeWidth="0.18" opacity="0.45" />
        {fromCity && toCity && isSailing && (
          <>
            <line x1={fromCity.x} y1={fromCity.y} x2={toCity.x} y2={toCity.y}
              stroke="#1a4a64" strokeWidth="0.5" strokeDasharray="1.5,1.5" opacity="0.5" />
            <line x1={fromCity.x} y1={fromCity.y}
              x2={fromCity.x + (toCity.x - fromCity.x) * safeProgress}
              y2={fromCity.y + (toCity.y - fromCity.y) * safeProgress}
              stroke="#4a9abb" strokeWidth="0.8" opacity="0.9" filter="url(#mapGlow)" />
            {boatX !== null && boatY !== null && (
              <>
                <circle cx={boatX} cy={boatY} r="2.5" fill="none" stroke="#7eb8d4" strokeWidth="0.4">
                  <animate attributeName="r" values="1.5;5;1.5" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <circle cx={boatX} cy={boatY} r="1.5" fill="none" stroke="#a8d4e8" strokeWidth="0.3">
                  <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.1s" repeatCount="indefinite" />
                </circle>
                <circle cx={boatX} cy={boatY} r="0.9" fill="#9ee6ff" filter="url(#boatGlow)">
                  <animate attributeName="opacity" values="1;0.4;1" dur="0.9s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </>
        )}
        {Object.entries(CITY_COORDS).map(([idStr, city]) => {
          const id = Number(idStr)
          const isCurrent = id === currentCity?.cityId
          return (
            <g key={id}>
              {isCurrent && (
                <circle cx={city.x} cy={city.y} r="3" fill="none" stroke="#7eb8d4" strokeWidth="0.4" opacity="0.4">
                  <animate attributeName="r" values="2;4.5;2" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={city.x} cy={city.y} r={isCurrent ? 1.4 : 1.0}
                fill={isCurrent ? '#7eb8d4' : '#2a5a74'}
                stroke={isCurrent ? '#a8d4e8' : '#1a4a64'} strokeWidth="0.4" />
              <text x={city.x + 2} y={city.y + 0.8} fontSize="2.4"
                fill={isCurrent ? '#a8d4e8' : '#3a6880'} fontFamily="monospace">{city.name}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )

  const legend = (
    <div className="flex gap-3 flex-wrap">
      {[{ color: '#7eb8d4', label: '현재 위치' }, { color: '#2a5a74', label: '도시' }].map(l => (
        <div key={l.label} className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full border border-[#1a3a50]" style={{ background: l.color }} />
          <span className="text-[8px] font-mono text-[#2a5a74]">{l.label}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">항해 지도</h2>
      <button
        onClick={() => setMapOpen(true)}
        className="relative w-full bg-[#040d16] rounded border border-[#0d2233] overflow-hidden hover:border-[#1a4a64] transition-colors cursor-pointer"
        style={{ paddingBottom: '115%' }}
      >
        {mapSvg}
      </button>
      {legend}
      {isSailing && currentCity && destinationCityId && (
        <div className="text-[9px] font-mono text-[#2a5a74] text-center tracking-widest">
          {currentCity.name} → {CITY_COORDS[destinationCityId]?.name} · {Math.round(safeProgress * 100)}% {voyageState === 'PAUSED' ? '정지' : '항해 중'}
        </div>
      )}
      {createPortal(
        <AnimatePresence>
          {mapOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMapOpen(false)}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer py-8"
              style={{ background: 'rgba(2,6,14,0.8)', backdropFilter: 'blur(4px)' }}
            >
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase mb-4 pointer-events-none shrink-0">항해 지도</p>
              <div
                onClick={e => e.stopPropagation()}
                className="cursor-default shrink min-h-0 relative bg-[#040d16] rounded border border-[#1a4a64]/50 overflow-hidden"
                style={{ width: 'min(58vh, 80vw)', maxWidth: 560, paddingBottom: 'min(66.7vh, 92vw)' }}
              >
                {mapSvg}
              </div>
              <div className="mt-4 shrink-0">{legend}</div>
              <button
                onClick={() => setMapOpen(false)}
                className="mt-4 px-8 py-2 border border-[#1a4a64]/60 rounded text-[11px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 tracking-widest uppercase transition-colors cursor-pointer shrink-0"
              >
                닫기
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// ─── 흔적 도감 ───────────────────────────────────────────────────────────────
const TOTAL_TRACES = 5

function TracePanel({ onReplayIntro }: { onReplayIntro: () => void }) {
  const [traces, setTraces] = useState<DiscoveredTrace[]>([])
  const [selected, setSelected] = useState<DiscoveredTrace | null>(null)
  const [replayEnding, setReplayEnding] = useState(false)

  useEffect(() => {
    getDiscoveredTraces().then(setTraces).catch(() => {})
  }, [])

  const discoveredCount = traces.length
  const lockedCount = Math.max(0, TOTAL_TRACES - discoveredCount)
  const allFound = discoveredCount >= TOTAL_TRACES

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-baseline">
        <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">가족의 흔적</h2>
        <span className="text-[9px] font-mono text-[#2a5a74]">{discoveredCount} / {TOTAL_TRACES}</span>
      </div>
      <button
        onClick={onReplayIntro}
        className="w-full py-3 border border-[#1a4a64]/50 rounded text-[11px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#4a9abb]/70 tracking-widest transition-colors bg-[#071826]/40"
      >
        ✦ 인트로 다시 보기
      </button>
      {allFound && (
        <button
          onClick={() => { bgm.playEnding(); setReplayEnding(true) }}
          className="w-full py-3 border border-[#1a4a64]/50 rounded text-[11px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#4a9abb]/70 tracking-widest transition-colors bg-[#071826]/40"
        >
          ✦ 엔딩 다시 보기
        </button>
      )}
      {replayEnding && createPortal(
        <EndingSequence
          showFeedback={false}
          onFinish={() => {
            setReplayEnding(false)
            const city = useVoyageStore.getState().currentCity
            if (city?.bgmUrl) bgm.playCity(city.bgmUrl)
          }}
        />,
        document.body
      )}
      <div className="flex flex-col gap-2">
        {traces.map((t, i) => (
          <motion.button
            key={`found-${i}`}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            onClick={() => setSelected(t)}
            className="text-left border rounded p-3 bg-[#071826]/60 border-[#1a4a64]/50 hover:border-[#4a9abb]/60 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-[#7eb8d4] tracking-widest">{t.cityName} · {t.familyMember}</span>
            </div>
            <p className="text-[11px] text-[#4a7a94] font-light leading-relaxed line-clamp-2">{t.traceName}</p>
          </motion.button>
        ))}
        {Array.from({ length: lockedCount }).map((_, i) => (
          <motion.div
            key={`locked-${i}`}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (discoveredCount + i) * 0.06 }}
            className="border rounded p-3 bg-[#050e18]/40 border-[#0d2233]"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-[#1a3a50] tracking-widest">??? · ???</span>
              <span className="text-[10px] text-[#1a3a50]">🔒</span>
            </div>
            <p className="text-[10px] text-[#1a3a50] italic">아직 발견하지 못한 흔적</p>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#02060e]/85 p-6 pointer-events-auto"
            onClick={() => setSelected(null)}
            style={{ backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#050e18] border border-[#1a4a64]/50 rounded-lg p-6 flex flex-col gap-4"
            >
              <div>
                <p className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">{selected.cityName} · {selected.familyMember}의 흔적</p>
                <h3 className="mt-1 text-[15px] font-serif text-[#a8d4e8]">{selected.traceName}</h3>
              </div>
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt={selected.traceName} className="w-full rounded border border-[#0d2233]" />
              )}
              <p className="text-[12px] text-[#7eb8d4] font-light leading-relaxed whitespace-pre-line">{selected.content}</p>
              <button onClick={() => setSelected(null)} className="mt-1 py-2 border border-[#1a3a50] rounded text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/50 tracking-widest uppercase transition-colors">닫기</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── 항해록 ───────────────────────────────────────────────────────────────────
function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [visitedCityIds, setVisitedCityIds] = useState<number[]>([])
  const [gridOpen, setGridOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState<number | null>(null)
  const [musicOpen, setMusicOpen] = useState(false)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [seekPos, setSeekPos] = useState(0)
  const [seekDur, setSeekDur] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null)
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})
  const [detailLog, setDetailLog] = useState<LogEntry | null>(null)
  const [editing, setEditing] = useState(false)
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.get('/voyage-log').then(res => {
      const mapped = res.data.map((l: any) => {
        const d = new Date(l.createdAt)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return {
          id: l.logId, ts: d.getTime(), date: `${y}.${m}.${day}.`,
          from: l.fromCity, to: l.toCity, note: l.userText ?? '', autoText: l.autoText,
          events: (l.events ?? []).filter((e: EventInfo) => e.imageUrl),
        }
      })
      mapped.sort((a: LogEntry, b: LogEntry) => b.ts - a.ts)
      setLogs(mapped)
    }).catch(() => {})

    apiClient.get('/users/me').then(res => {
      setVisitedCityIds(res.data.visitedCityIds ?? [])
    }).catch(() => {})
  }, [])

  const openDetail = (log: LogEntry) => { setDetailLog(log); setEditing(false); setEditNote(log.note) }
  const closeDetail = () => { setDetailLog(null); setEditing(false) }

  const saveEdit = async () => {
    if (!detailLog || saving) return
    setSaving(true)
    try {
      await apiClient.post(`/voyage-log/${detailLog.id}`, { userText: editNote })
      setLogs(prev => prev.map(l => (l.id === detailLog.id ? { ...l, note: editNote } : l)))
      setDetailLog(prev => prev ? { ...prev, note: editNote } : prev)
      setEditing(false)
    } catch (e) {
      console.error('기록 저장 실패:', e)
    } finally {
      setSaving(false)
    }
  }

  const restoreBgm = () => {
    const { voyageState, currentCity } = useVoyageStore.getState()
    if (voyageState === 'SAILING' || voyageState === 'PAUSED') bgm.playVoyage()
    else if (currentCity?.bgmUrl) bgm.playCity(currentCity.bgmUrl)
    else bgm.stop()
  }

  const togglePreview = (id: number) => {
    if (playingId === id) { setPlayingId(null); restoreBgm() }
    else {
      const url = CITY_BGM[id]
      if (!url) return
      setPlayingId(id)
      bgm.playCity(url)
    }
  }

  const closeMusic = () => {
    setMusicOpen(false)
    if (playingId !== null) { setPlayingId(null); restoreBgm() }
  }

  useEffect(() => {
    if (playingId === null) { setSeekPos(0); setSeekDur(0); return }
    const tick = () => { setSeekPos(bgm.getSeek()); setSeekDur(bgm.duration()) }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [playingId])

  const visited = visitedCityIds.filter(id => CITY_META[id])

  const monthGroups = (() => {
    const groups: { key: string; label: string; logs: LogEntry[] }[] = []
    const map = new Map<string, LogEntry[]>()
    for (const log of logs) {
      const d = new Date(log.ts)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(log)
    }
    for (const [key, list] of map) {
      const [y, m] = key.split('-')
      groups.push({ key, label: `${y}년 ${Number(m)}월`, logs: list })
    }
    return groups
  })()

  const isCollapsed = (key: string, idx: number) => collapsedMonths[key] ?? idx !== 0
  const toggleMonth = (key: string, idx: number) =>
    setCollapsedMonths(prev => ({ ...prev, [key]: !(prev[key] ?? idx !== 0) }))

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">항해 기록</h2>
      {visited.length > 0 && (
        <button onClick={() => setGridOpen(true)}
          className="w-full py-2.5 border border-[#1a4a64]/50 rounded text-[10px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#4a9abb]/70 tracking-widest uppercase transition-colors bg-[#071826]/40">
          ◳ 지나온 도시 사진 보기 ({visited.length})
        </button>
      )}
      {visited.length > 0 && (
        <button onClick={() => setMusicOpen(true)}
          className="w-full py-2.5 border border-[#1a4a64]/50 rounded text-[10px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#4a9abb]/70 tracking-widest uppercase transition-colors bg-[#071826]/40">
          ♫ 지나온 도시 음악 듣기 ({visited.length})
        </button>
      )}
      {logs.length === 0 && <p className="text-[10px] text-[#1a3a50] italic">— 아직 항해 기록이 없습니다</p>}
      <div className="flex flex-col gap-2">
        {monthGroups.map((group, gIdx) => {
          const collapsed = isCollapsed(group.key, gIdx)
          return (
            <div key={group.key} className="flex flex-col">
              <button onClick={() => toggleMonth(group.key, gIdx)}
                className="flex items-center justify-between py-2 px-1 border-b border-[#0d2233] hover:border-[#1a4a64] transition-colors group">
                <span className="text-[10px] font-mono text-[#4a7a94] group-hover:text-[#7eb8d4] tracking-widest">{group.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[#2a5a74]">{group.logs.length}건</span>
                  <motion.span animate={{ rotate: collapsed ? 0 : 90 }} transition={{ duration: 0.2 }}
                    className="text-[9px] font-mono text-[#2a5a74] group-hover:text-[#7eb8d4]">›</motion.span>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                    <div className="flex flex-col gap-2 pt-3">
                      {group.logs.map((log, i) => (
                        <motion.button key={log.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          onClick={() => openDetail(log)}
                          className="text-left border-l border-[#0d2233] hover:border-[#4a9abb]/60 pl-3 py-2 rounded-r transition-colors hover:bg-[#071826]/40 group">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex gap-2 items-baseline min-w-0">
                              <span className="text-[9px] font-mono text-[#2a5a74] shrink-0">{log.date}</span>
                              <span className="text-[9px] font-mono text-[#1a3a50] truncate">{log.from} → {log.to}</span>
                            </div>
                            <span className="text-[10px] font-mono text-[#1a3a50] group-hover:text-[#4a9abb] transition-colors shrink-0">›</span>
                          </div>
                          {log.events.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mb-1.5">
                              {log.events.map((ev, idx) => (
                                <div key={idx} className="w-9 h-9 rounded overflow-hidden border border-[#1a4a64]/50 shrink-0" title={ev.name}>
                                  <img src={ev.imageUrl!} alt={ev.name} className="w-full h-full object-cover" draggable={false} />
                                </div>
                              ))}
                            </div>
                          )}
                          {log.note ? (
                            <p className="text-[11px] text-[#4a7a94] font-light leading-relaxed line-clamp-2">{log.note}</p>
                          ) : (
                            <p className="text-[10px] text-[#1a3a50] italic">— 기록 없음 · 눌러서 작성</p>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {createPortal(
        <AnimatePresence>
          {detailLog && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={closeDetail}
              className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer px-4 py-8"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(8px)' }}>
              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#050e18] border border-[#1a4a64]/50 rounded-lg p-6 md:p-7 flex flex-col gap-4 cursor-default"
                style={{ scrollbarWidth: 'none' }}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">{detailLog.date}</p>
                    <h3 className="mt-1 text-[17px] font-serif text-[#a8d4e8] tracking-wide">
                      {detailLog.from} <span className="text-[#3a6880]">→</span> {detailLog.to}
                    </h3>
                  </div>
                  <button onClick={closeDetail}
                    className="shrink-0 w-8 h-8 rounded-full border border-[#1a3a50] flex items-center justify-center text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/50 transition-colors text-[14px]"
                    aria-label="닫기">✕</button>
                </div>
                <div className="border-l-2 border-[#1a4a64]/50 pl-3">
                  <p className="text-[8px] font-mono text-[#2a5a74] tracking-widest uppercase mb-1">항해 기록</p>
                  <p className="text-[12px] text-[#5a8aa4] font-light leading-relaxed whitespace-pre-line">{detailLog.autoText}</p>
                </div>
                {detailLog.events.length > 0 && (
                  <div>
                    <p className="text-[8px] font-mono text-[#2a5a74] tracking-widest uppercase mb-2">항해 중 마주친 것</p>
                    <div className="flex gap-2 flex-wrap">
                      {detailLog.events.map((ev, idx) => (
                        <button key={idx} onClick={() => setSelectedEvent(ev)}
                          className="w-14 h-14 rounded overflow-hidden border border-[#1a4a64]/50 hover:border-[#4a9abb] transition-colors shrink-0" title={ev.name}>
                          <img src={ev.imageUrl!} alt={ev.name} className="w-full h-full object-cover" draggable={false} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-[#0d2233] pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[8px] font-mono text-[#2a5a74] tracking-widest uppercase">나의 한 줄</p>
                    {!editing && <span className="text-[9px] font-mono text-[#3a6880]">{detailLog.note ? '수정' : '작성'} ›</span>}
                  </div>
                  {editing ? (
                    <div className="flex flex-col gap-2">
                      <textarea value={editNote} onChange={e => setEditNote(e.target.value)} maxLength={100} rows={4} autoFocus
                        placeholder="오늘의 항해를 기록하세요..."
                        className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-3 py-2.5 text-[13px] text-[#cce8f5] resize-none outline-none focus:border-[#4a9abb]/60 placeholder-[#1a3a50] leading-relaxed" />
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-[#1a3a50]">{editNote.length}/100</span>
                        <div className="flex gap-2">
                          <button onClick={() => setEditing(false)} className="px-4 py-2 text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors">취소</button>
                          <button onClick={saveEdit} disabled={saving}
                            className="px-5 py-2 border border-[#4a9abb]/50 rounded text-[10px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-widest uppercase transition-colors disabled:opacity-40">
                            {saving ? '저장 중' : '저장'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditing(true); setEditNote(detailLog.note) }}
                      className="w-full text-left rounded border border-transparent hover:border-[#1a4a64]/40 hover:bg-[#071826]/40 px-3 py-2.5 -mx-3 transition-colors cursor-text">
                      {detailLog.note ? (
                        <p className="text-[14px] text-[#7eb8d4] font-light leading-relaxed whitespace-pre-line">{detailLog.note}</p>
                      ) : (
                        <p className="text-[11px] text-[#1a3a50] italic">아직 기록이 없습니다. 눌러서 한 줄을 남겨보세요.</p>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {musicOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={closeMusic}
              className="fixed inset-0 z-[9998] flex flex-col items-center justify-center cursor-pointer py-10 px-6"
              style={{ background: 'rgba(2,6,14,0.92)', backdropFilter: 'blur(6px)' }}>
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase mb-6 pointer-events-none shrink-0">지나온 도시의 음악</p>
              <div onClick={e => e.stopPropagation()}
                className="cursor-default flex flex-col gap-2 overflow-y-auto min-h-0 w-full pb-28"
                style={{ maxWidth: 'min(92vw, 420px)', scrollbarWidth: 'none' }}>
                {visited.map(id => {
                  const c = CITY_META[id]
                  const isPlaying = playingId === id
                  const hasBgm = !!CITY_BGM[id]
                  return (
                    <button key={id} onClick={() => togglePreview(id)} disabled={!hasBgm}
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-colors text-left disabled:opacity-30 ${
                        isPlaying ? 'bg-[#0a2233]/80 border-[#4a9abb]/70' : 'bg-[#071826]/50 border-[#1a4a64]/40 hover:border-[#4a9abb]/60'
                      }`}>
                      <div className="w-14 h-14 rounded overflow-hidden border border-[#0d2233] shrink-0">
                        <img src={c.img} alt={c.name} className="w-full h-full object-cover" draggable={false} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-serif text-[#cce8f5] tracking-[0.2em]">{c.name}</p>
                        <p className="text-[9px] font-mono text-[#3a6880] mt-0.5">
                          {!hasBgm ? '음악 없음' : isPlaying ? '재생 중...' : '미리듣기'}
                        </p>
                      </div>
                      <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 font-mono text-[12px] ${
                        isPlaying ? 'border-[#7eb8d4]/70 text-[#cce8f5]' : 'border-[#1a4a64]/60 text-[#7eb8d4]/70'
                      }`}>
                        {isPlaying ? 'Ⅱ' : '▶'}
                      </div>
                    </button>
                  )
                })}
              </div>
              {playingId !== null && (
                <div onClick={e => e.stopPropagation()}
                  className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[9999] w-[min(92vw,420px)] rounded-lg border border-[#4a9abb]/40 bg-[#071826]/95 p-4 flex flex-col gap-2 cursor-default"
                  style={{ backdropFilter: 'blur(8px)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#cce8f5] tracking-widest">♫ {CITY_META[playingId]?.name}</span>
                    <span className="text-[9px] font-mono text-[#4a7a94]">{fmtTime(seekPos)} / {fmtTime(seekDur)}</span>
                  </div>
                  <input type="range" min={0} max={seekDur || 0} step={0.1} value={seekPos}
                    onChange={(e) => { const v = Number(e.target.value); setSeekPos(v); bgm.setSeek(v) }}
                    className="w-full h-1 appearance-none rounded-full cursor-pointer"
                    style={{ background: `linear-gradient(to right, #4a9abb ${seekDur > 0 ? (seekPos / seekDur) * 100 : 0}%, #0d2233 0%)` }} />
                </div>
              )}
              <button onClick={closeMusic}
                className="mt-6 px-8 py-2 border border-[#1a4a64]/60 rounded text-[11px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 tracking-widest uppercase transition-colors cursor-pointer shrink-0">
                닫기
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {gridOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={() => setGridOpen(false)}
              className="fixed inset-0 z-[9998] flex flex-col items-center justify-center cursor-pointer py-10 px-6"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(6px)' }}>
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase mb-6 pointer-events-none shrink-0">지나온 도시</p>
              <div onClick={e => e.stopPropagation()}
                className="grid gap-3 cursor-default overflow-y-auto min-h-0"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', width: 'min(94vw, 760px)', scrollbarWidth: 'none' }}>
                {visited.map(id => {
                  const c = CITY_META[id]
                  return (
                    <button key={id} onClick={() => setSelectedCity(id)}
                      className="relative rounded-lg overflow-hidden border border-[#1a4a64]/50 hover:border-[#4a9abb] transition-colors aspect-[3/2]">
                      <img src={c.img} alt={c.name} className="w-full h-full object-cover" draggable={false} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(2,6,14,0.95) 0%, rgba(2,6,14,0.1) 50%, transparent 100%)' }} />
                      <span className="absolute bottom-2.5 left-0 right-0 text-center text-[15px] font-serif text-[#cce8f5] tracking-[0.25em]" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
                        {c.name}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-6 text-[10px] font-mono text-[#4a7a94] tracking-[0.3em] uppercase pointer-events-none shrink-0">배경을 누르면 닫힙니다</p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {selectedCity !== null && CITY_META[selectedCity] && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={() => setSelectedCity(null)}
              className="fixed inset-0 z-[9999] bg-black cursor-pointer">
              <img src={CITY_META[selectedCity].img} alt={CITY_META[selectedCity].name} className="w-full h-full object-cover" draggable={false} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(2,6,14,0.3) 0%, rgba(2,6,14,0.05) 35%, rgba(2,6,14,0.2) 60%, rgba(2,6,14,0.92) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col items-center pointer-events-none">
                <h2 className="font-serif text-[#cce8f5] tracking-[0.3em] mb-4" style={{ fontSize: 'clamp(24px, 4vw, 44px)', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                  {CITY_META[selectedCity].name}
                </h2>
                <p className="text-center font-serif text-[#cce8f5] leading-relaxed" style={{ fontSize: 'clamp(14px, 2vw, 22px)', maxWidth: 680, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
                  {CITY_META[selectedCity].desc}
                </p>
                <p className="mt-8 text-[10px] font-mono text-[#4a7a94] tracking-[0.4em] uppercase">클릭하여 닫기</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 z-[10000] flex items-center justify-center cursor-pointer px-6"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(8px)' }}>
              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="w-full max-w-md bg-[#050e18] border border-[#1a4a64]/50 rounded-lg overflow-hidden flex flex-col cursor-default">
                {selectedEvent.imageUrl && (
                  <img src={selectedEvent.imageUrl} alt={selectedEvent.name} className="w-full aspect-video object-cover" draggable={false} />
                )}
                <div className="p-6 flex flex-col gap-3">
                  <p className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">항해 중 마주친 것</p>
                  <h3 className="text-[16px] font-serif text-[#a8d4e8] tracking-wide">{selectedEvent.name}</h3>
                  <p className="text-[12px] text-[#7eb8d4] font-light leading-relaxed whitespace-pre-line">{selectedEvent.text}</p>
                  <button onClick={() => setSelectedEvent(null)} className="mt-1 py-2 border border-[#1a3a50] rounded text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/50 tracking-widest uppercase transition-colors">닫기</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// ─── 프로필 ───────────────────────────────────────────────────────────────────
type EditMode = 'nickname' | 'password'

const MINI_CITY_COORDS: Record<number, { x: number; y: number; name: string }> = {
  1: { x: 45.5, y: 53.0, name: '서울' }, 2: { x: 36.0, y: 55.0, name: '인천' },
  3: { x: 48.5, y: 69.0, name: '대전' }, 4: { x: 63.0, y: 50.0, name: '강릉' },
  5: { x: 73.8, y: 75.2, name: '부산' }, 6: { x: 46.2, y: 59.2, name: '수원' },
  7: { x: 43.0, y: 75.8, name: '광주' }, 8: { x: 64.0, y: 72.5, name: '대구' },
  9: { x: 75.0, y: 70.5, name: '포항' }, 10: { x: 38.0, y: 95.5, name: '제주' },
}

function VisitedMiniMap({ visitedIds }: { visitedIds: number[] }) {
  const visitedNames = visitedIds.map(id => MINI_CITY_COORDS[id]?.name).filter(Boolean) as string[]
  return (
    <div className="w-full bg-[#040d16] rounded border border-[#1a4a64]/50 p-4">
      <div className="relative w-full" style={{ paddingBottom: '115%' }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <g transform="translate(10 2) scale(0.78)">
            <path d={KOREA_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.65" />
            <path d={JEJU_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.45" />
            {Object.entries(MINI_CITY_COORDS).map(([idStr, city]) => {
              const id = Number(idStr)
              const visited = visitedIds.includes(id)
              return (
                <g key={id}>
                  <circle cx={city.x} cy={city.y} r={visited ? 1.4 : 0.9}
                    fill={visited ? '#4a9abb' : '#0d2233'}
                    stroke={visited ? '#a8d4e8' : '#1a3a50'} strokeWidth="0.4" />
                  {visited && <text x={city.x + 2} y={city.y + 0.8} fontSize="2.4" fill="#a8d4e8" fontFamily="monospace">{city.name}</text>}
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      <p className="text-center text-[10px] font-mono text-[#2a5a74] mt-2">다녀온 도시 {visitedNames.length}곳</p>
      {visitedNames.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 justify-center mt-2">
          {visitedNames.map(name => (
            <span key={name} className="px-2 py-0.5 rounded-full border border-[#1a4a64]/50 bg-[#071826]/60 text-[9px] font-mono text-[#7eb8d4] tracking-widest">{name}</span>
          ))}
        </div>
      ) : (
        <p className="text-center text-[9px] font-mono text-[#1a3a50] italic mt-2">아직 다녀온 도시가 없습니다</p>
      )}
    </div>
  )
}

function ProfilePanel() {
  const [user, setUser] = useState({ name: '', email: '', joined: '', totalVoyages: 0, visitedCities: 0, userRole: 'USER', authType: 'LOCAL' })
  const [visitedCityIds, setVisitedCityIds] = useState<number[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editTab, setEditTab] = useState<EditMode>('nickname')
  const [newNickname, setNewNickname] = useState('')
  const [nickSaving, setNickSaving] = useState(false)
  const [nickSuccess, setNickSuccess] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [donateOpen, setDonateOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
  apiClient.get('/users/me').then(res => {
    setUser({
      name: res.data.name,
      email: res.data.email,
      joined: new Date(res.data.createdAt).toLocaleDateString('ko-KR'),
      totalVoyages: res.data.totalVoyages ?? 0,
      visitedCities: res.data.visitedCities ?? 0,
      userRole: res.data.userRole ?? 'USER',
      authType: (res.data.authType ?? 'LOCAL').toUpperCase(),
    })
    setVisitedCityIds(res.data.visitedCityIds ?? [])
  }).catch(() => {})
}, [])

const isSocial = user.authType !== 'LOCAL'

const openEdit = () => {
  setEditTab('nickname')
  setNewNickname(user.name)
  setPwForm({ current: '', next: '', confirm: '' })
  setPwError(''); setPwSuccess(false); setNickSuccess(false)
  setEditOpen(true)
}
  const saveNickname = async () => {
    if (!newNickname.trim() || nickSaving) return
    setNickSaving(true)
    try {
      await apiClient.patch('/users/me', { name: newNickname.trim() })
      setUser(u => ({ ...u, name: newNickname.trim() }))
      setNickSuccess(true)
      setTimeout(() => setNickSuccess(false), 1500)
    } catch {
      /* noop */
    } finally {
      setNickSaving(false)
    }
  }

  const savePassword = async () => {
    setPwError('')
    if (!pwForm.current) return setPwError('현재 비밀번호를 입력하세요')
    if (pwForm.next.length < 8) return setPwError('비밀번호는 8자 이상')
    if (pwForm.next !== pwForm.confirm) return setPwError('비밀번호가 일치하지 않습니다')
    if (pwSaving) return
    setPwSaving(true)
    try {
      await apiClient.patch('/users/me/password', { currentPassword: pwForm.current, newPassword: pwForm.next, newPasswordConfirm: pwForm.confirm })
      setPwSuccess(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 1500)
    } catch {
      setPwError('비밀번호 변경에 실패했습니다.')
    } finally {
      setPwSaving(false)
    }
  }

  const handleLogout = async () => {
    if (loggingOut) return
    if (!window.confirm('로그아웃 하시겠습니까?')) return
    setLoggingOut(true)
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) await apiClient.post('/auth/logout', { refreshToken })
    } catch (e) {
      console.error('로그아웃 요청 실패:', e)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      if (!notifyNativeLogout()) {
        window.location.href = '/login'
      }
    }
  }

  const inputCls = 'w-full bg-[#040d16] border border-[#1a3a50] rounded px-3 py-2.5 text-[13px] text-[#cce8f5] outline-none focus:border-[#4a9abb]/60 placeholder-[#1a3a50]'

  return (
    <div className="flex flex-col gap-4">
      {/* ─── 다녀온 도시 미니맵 모달 ─── */}
      {createPortal(
        <AnimatePresence>
          {mapOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setMapOpen(false)}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer py-8"
              style={{ background: 'rgba(2,6,14,0.8)', backdropFilter: 'blur(4px)' }}>
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase mb-4 pointer-events-none shrink-0">다녀온 도시</p>
              <div onClick={e => e.stopPropagation()} className="cursor-default shrink min-h-0" style={{ width: 'min(58vh, 80vw)', maxWidth: 560 }}>
                <VisitedMiniMap visitedIds={visitedCityIds} />
              </div>
              <button onClick={() => setMapOpen(false)}
                className="mt-6 px-8 py-2 border border-[#1a4a64]/60 rounded text-[11px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 tracking-widest uppercase transition-colors cursor-pointer shrink-0">
                닫기
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── 프로필 수정 모달 ─── */}
      {createPortal(
        <AnimatePresence>
          {editOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={() => setEditOpen(false)}
              className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer px-6"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(8px)' }}>
              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="w-full max-w-md bg-[#050e18] border border-[#1a4a64]/50 rounded-lg p-6 flex flex-col gap-5 cursor-default">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">Edit Profile</p>
                    <h3 className="mt-1 text-[16px] font-serif text-[#a8d4e8] tracking-wide">프로필 수정</h3>
                  </div>
                  <button onClick={() => setEditOpen(false)}
                    className="shrink-0 w-8 h-8 rounded-full border border-[#1a3a50] flex items-center justify-center text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/50 transition-colors text-[13px]"
                    aria-label="닫기">✕</button>
                </div>

               {/* 탭 — 소셜 계정은 닉네임만 가능하므로 숨김 */}
                {!isSocial && (
                  <div className="flex gap-1 p-1 rounded-lg bg-[#040d16] border border-[#0d2233]">
                    {([['nickname', '닉네임'], ['password', '비밀번호']] as const).map(([key, label]) => (
                      <button key={key} onClick={() => { setEditTab(key); setPwError('') }}
                        className={`flex-1 py-2 rounded-md text-[10px] font-mono tracking-widest transition-colors ${
                          editTab === key ? 'bg-[#0a2233] text-[#cce8f5] border border-[#4a9abb]/40' : 'text-[#3a6880] hover:text-[#7eb8d4]'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {(isSocial || editTab === 'nickname') ? (
                    <motion.div key="nick" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="flex flex-col gap-3">
                      <label className="text-[9px] font-mono text-[#4a7a94] tracking-widest uppercase">새 닉네임</label>
                      <input value={newNickname} onChange={e => setNewNickname(e.target.value)} maxLength={20} autoFocus placeholder="새 닉네임" className={inputCls} />
                      <div className="flex items-center justify-between">
                        {nickSuccess
                          ? <span className="text-[10px] font-mono text-[#4a9abb]">변경되었습니다</span>
                          : <span className="text-[9px] font-mono text-[#1a3a50]">{newNickname.length}/20</span>}
                        <button onClick={saveNickname} disabled={nickSaving || !newNickname.trim()}
                          className="px-5 py-2 border border-[#4a9abb]/50 rounded text-[10px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-widest uppercase transition-colors disabled:opacity-40">
                          {nickSaving ? '저장 중' : '저장'}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="pw" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="flex flex-col gap-3">
                      <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="현재 비밀번호" className={inputCls} />
                      <input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="새 비밀번호 (8자 이상)" className={inputCls} />
                      <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="새 비밀번호 확인" className={inputCls} />
                      {pwError && <p className="text-[10px] font-mono text-red-400/70">{pwError}</p>}
                      <div className="flex items-center justify-between">
                        {pwSuccess
                          ? <span className="text-[10px] font-mono text-[#4a9abb]">변경되었습니다</span>
                          : <span />}
                        <button onClick={savePassword} disabled={pwSaving}
                          className="px-5 py-2 border border-[#4a9abb]/50 rounded text-[10px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-widest uppercase transition-colors disabled:opacity-40">
                          {pwSaving ? '변경 중' : '변경'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── 후원 모달 ─── */}
      {createPortal(
        <AnimatePresence>
          {donateOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={() => setDonateOpen(false)}
              className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer px-6"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(8px)' }}>
              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="w-full max-w-[340px] rounded-2xl p-8 flex flex-col items-center cursor-default"
                style={{ background: 'linear-gradient(180deg, #0a1828 0%, #050e18 100%)', border: '1px solid rgba(74,154,187,0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'rgba(126,184,212,0.1)', border: '1px solid rgba(126,184,212,0.25)' }}>
                  <span className="text-[18px] font-serif text-[#7eb8d4]">⛵</span>
                </div>
                <p className="text-[10px] font-mono text-[#4a9abb] tracking-[0.4em] uppercase mb-5">Support</p>
                <div className="flex flex-col gap-3 text-center mb-7">
                  <p className="text-[14px] font-serif text-[#cce8f5] leading-relaxed">본 서비스는 사용자 경험을 위해<br />광고 없이 운영됩니다.</p>
                  <p className="text-[12px] text-[#5a8aa4] leading-relaxed font-light">한분 한분<br />모두 기억하겠습니다.</p>
                </div>
                {isMobileDevice() ? (
                  <>
                    <a href="https://qr.kakaopay.com/FHjo39K0L" target="_blank" rel="noopener noreferrer"
                      className="w-full py-3.5 rounded-xl flex items-center justify-center text-[15px] font-bold tracking-wide transition-all duration-200 hover:brightness-105 hover:-translate-y-0.5"
                      style={{ background: '#FEE500', color: '#3C1E1E', boxShadow: '0 6px 20px rgba(254,229,0,0.18)' }}>
                      카카오페이로 후원하기
                    </a>
                    <p className="text-[10px] font-mono text-[#2a5a74] tracking-wider mt-4">버튼을 누르면 카카오페이로 연결됩니다</p>
                  </>
                ) : (
                  <>
                    <div className="w-40 h-40 rounded-xl overflow-hidden bg-white p-2">
                      <img src="/donate/toss_qr.png" alt="후원 QR" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-[10px] font-mono text-[#2a5a74] tracking-wider mt-4 text-center leading-relaxed">카카오페이 앱으로 QR을 스캔해 주세요</p>
                  </>
                )}
                <button onClick={() => setDonateOpen(false)} className="mt-6 text-[11px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors">닫기</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">마이 페이지</h2>

      {/* 프로필 카드 + 수정 버튼 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-[#0d2233] bg-[#050e18] flex items-center justify-center">⛵</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-mono text-[#a8d4e8] truncate">{user.name}</p>
          <p className="text-[9px] font-mono text-[#2a5a74] truncate">{user.email}</p>
          <p className="text-[8px] font-mono text-[#1a3a50]">항해 시작 {user.joined}</p>
        </div>
        <button onClick={openEdit}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#1a4a64]/50 bg-[#071826]/40 text-[9px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/60 tracking-widest transition-colors"
          aria-label="프로필 수정">
          ✎ 수정
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#050e18] border border-[#0d2233] rounded p-3 text-center">
          <p className="text-[18px] font-mono text-[#4a9abb]">{user.totalVoyages}회</p>
          <p className="text-[9px] font-mono text-[#2a5a74] mt-0.5">총 항해</p>
        </div>
        <button onClick={() => setMapOpen(true)}
          className="bg-[#050e18] border border-[#0d2233] rounded p-3 text-center hover:border-[#4a9abb]/60 transition-colors cursor-pointer">
          <p className="text-[18px] font-mono text-[#4a9abb]">{user.visitedCities}곳</p>
          <p className="text-[9px] font-mono text-[#2a5a74] mt-0.5">방문 도시 ›</p>
        </button>
      </div>

      <div className="border-t border-[#0d2233]" />
      <CustomerCenter />
      <button onClick={() => setDonateOpen(true)}
        className="w-full py-2.5 border border-[#1a4a64]/40 rounded text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/60 tracking-widest transition-colors">
        ♡ 개발자 후원하기
      </button>
      {user.userRole === 'ADMIN' && (
        <a href="/admin" className="w-full py-2.5 border border-[#4a9abb]/40 rounded text-[10px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/70 tracking-widest transition-colors text-center">
          ⚙ 관리자 페이지
        </a>
      )}
      <button onClick={handleLogout} disabled={loggingOut}
        className="w-full py-2.5 border border-[#1a3a50] rounded text-[10px] font-mono text-[#3a6880] hover:text-red-300 hover:border-red-500/50 tracking-widest transition-colors disabled:opacity-40">
        ⏻ 로그아웃
      </button>
    </div>
  )
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
type Panel = 'map' | 'log' | 'trace' | 'profile' | null

interface HUDProps {
  isAnchored?: boolean
  initReady?: boolean
}

export default function HUD({ isAnchored = false, initReady = true }: HUDProps) {
  const { voyageState, progress, currentCity, destinationCityId, remainingSeconds } = useVoyageStore()
  const [panelOpen, setPanelOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<Panel>('map')
  const [hudOpacity, setHudOpacity] = useState(isNativeApp() ? 1 : 0.35)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [muted, setMuted] = useState(bgm.isMuted())
  const [replayIntro, setReplayIntro] = useState(false)

  useEffect(() => {
    if (voyageState !== 'SAILING') return
    const { setProgress, setVoyageState, setRemainingSeconds } = useVoyageStore.getState()

    const poll = async () => {
      try {
        const { data } = await apiClient.get('/voyages/status')
        const newProgress: number = data.progress ?? 0
        const newVoyageState: string = data.voyageState

        if (newVoyageState !== 'SAILING') {
          setVoyageState(newVoyageState as any)
          return
        }
        setProgress(newProgress)
        if (data.remainingSeconds != null) setRemainingSeconds(data.remainingSeconds)
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 10000)
    return () => { clearInterval(interval) }
  }, [voyageState])

  useEffect(() => {
    if (isNativeApp()) { setHudOpacity(1); return }   // 앱: 항상 선명
    const resetIdle = () => {
      setHudOpacity(1)
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setHudOpacity(0.35), 8000)
    }
    resetIdle()
    window.addEventListener('mousemove', resetIdle)
    window.addEventListener('touchstart', resetIdle)
    return () => {
      window.removeEventListener('mousemove', resetIdle)
      window.removeEventListener('touchstart', resetIdle)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [])

  const menuItems = [
    { id: 'map', icon: '◎', label: '지도' },
    { id: 'trace', icon: '✦', label: '흔적' },
    { id: 'log', icon: '≡', label: '항해록' },
    { id: 'profile', icon: '○', label: '나' },
  ] as const

  const fromName = currentCity?.name ?? '—'
  const toName = destinationCityId ? CITY_COORDS[destinationCityId]?.name ?? '—' : '—'

  const [pauseLoading, setPauseLoading] = useState(false)

  const handlePauseResume = async () => {
    if (pauseLoading) return
    setPauseLoading(true)
    const currentState = useVoyageStore.getState().voyageState
    try {
      if (currentState === 'SAILING') {
        await apiClient.post('/voyages/stop')
        useVoyageStore.getState().setVoyageState('PAUSED')
      } else if (currentState === 'PAUSED') {
        await apiClient.post('/voyages/resume')
        useVoyageStore.getState().setVoyageState('SAILING')
      }
    } catch (e) {
      console.error('일시정지/재개 실패:', e)
    } finally {
      setPauseLoading(false)
    }
  }

useEffect(() => {
    if (!isNativeApp()) return
    sendVoyageState({ voyageState, progress, fromName, toName, remainingSeconds, initReady })
  }, [voyageState, progress, fromName, toName, remainingSeconds, initReady])

  useEffect(() => {
    if (!isNativeApp()) return
    const handler = (e: MessageEvent) => {
      let data: any
      try { data = JSON.parse(e.data) } catch { return }
      if (data?.type === 'voyage-control' && data.action === 'pause-resume') handlePauseResume()
    }
    window.addEventListener('message', handler)
    document.addEventListener('message', handler as any)
    return () => {
      window.removeEventListener('message', handler)
      document.removeEventListener('message', handler as any)
    }
  }, [])


  if (isNativeApp()) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-10" style={{ transition: 'opacity 1.5s ease', opacity: hudOpacity }}>
      {!isAnchored && (
        <div className="absolute top-8 right-8 pointer-events-auto">
          <div className="flex items-start gap-4">
            <ProgressBar from={fromName} to={toName} progress={progress} voyageState={voyageState} />
            <div className="flex flex-col items-center gap-3 mt-[2px]">
              {(voyageState === 'SAILING' || voyageState === 'PAUSED') && (
                <motion.button
                  onClick={handlePauseResume}
                  disabled={pauseLoading || !initReady}
                  whileHover={{ scale: pauseLoading ? 1 : 1.04 }} whileTap={{ scale: pauseLoading ? 1 : 0.94 }}
                  className={`relative w-12 h-12 rounded-full border flex items-center justify-center font-mono text-[13px] backdrop-blur-md transition-all duration-300 ${
                    voyageState === 'PAUSED'
                      ? 'bg-[#7eb8d4]/12 border-[#7eb8d4]/60 text-[#cce8f5] shadow-[0_0_24px_rgba(126,184,212,0.22)]'
                      : 'bg-[#050e18]/55 border-[#1a4a64]/70 text-[#7eb8d4]/70 hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 hover:shadow-[0_0_18px_rgba(126,184,212,0.16)]'
                  }`}
                  aria-label={voyageState === 'PAUSED' ? '항해 재개' : '항해 일시정지'}
                >
                  {voyageState === 'PAUSED' && (
                    <motion.span className="absolute inset-0 rounded-full border border-[#7eb8d4]/30"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
                  )}
                  <span className="relative z-10">{voyageState === 'PAUSED' ? '▶' : 'Ⅱ'}</span>
                </motion.button>
              )}
              <motion.button
                onClick={() => setMuted(bgm.toggleMute())}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                className="w-12 h-12 rounded-full border flex items-center justify-center backdrop-blur-md transition-all duration-300 bg-[#050e18]/55 border-[#1a4a64]/70 text-[#7eb8d4]/80 hover:text-[#cce8f5] hover:border-[#7eb8d4]/70"
                aria-label={muted ? '소리 켜기' : '소리 끄기'} title={muted ? '소리 켜기' : '소리 끄기'}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                  {muted ? (
                    <><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></>
                  ) : (
                    <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>
                  )}
                </svg>
              </motion.button>
            </div>
          </div>
          {voyageState === 'PAUSED' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-right">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#050e18]/60 border border-[#1a4a64]/40 text-[10px] font-mono text-[#7eb8d4]/80 tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7eb8d4]/70" />
                항해 정지 중
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* 나침반 자리 → 남은 시간 카운트다운 다이얼 */}
      {!isAnchored && (voyageState === 'SAILING' || voyageState === 'PAUSED') && (
        <div className="absolute bottom-8 right-8 pointer-events-auto">
          <CountdownDial remainingSeconds={remainingSeconds} progress={progress} paused={voyageState === 'PAUSED'} />
        </div>
      )}

      <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto">
        <motion.button onClick={() => setPanelOpen(v => !v)}
          className="flex items-center gap-1 pl-3 pr-4 py-5 bg-[#050e18]/70 border-r border-t border-b border-[#1a4a64]/50 rounded-r-lg hover:bg-[#071525]/90 hover:border-[#4a9abb]/50 transition-colors group"
          whileHover={{ x: 3 }} whileTap={{ scale: 0.96 }}>
          <motion.span animate={{ rotate: panelOpen ? 180 : 0 }} transition={{ duration: 0.3 }}
            className="text-[18px] text-[#7eb8d4] group-hover:text-[#cce8f5] transition-colors">›</motion.span>
          <span className="text-[10px] font-mono text-[#4a7a94] group-hover:text-[#7eb8d4] tracking-widest [writing-mode:vertical-rl] mt-1">메뉴</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {panelOpen && (
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="absolute left-0 top-0 bottom-0 w-72 bg-[#050e18]/92 border-r border-[#0d2233] pointer-events-auto flex flex-col"
            style={{ backdropFilter: 'blur(8px)' }}>
            {/* 헤더 — 제목 + 닫기 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#0d2233]">
              <span className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase">메뉴</span>
              <button onClick={() => setPanelOpen(false)}
                className="flex items-center gap-1 text-[10px] font-mono text-[#3a6880] hover:text-[#cce8f5] tracking-widest uppercase transition-colors">
                닫기 ›
              </button>
            </div>
            <div className="flex border-b border-[#0d2233]">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => setActivePanel(item.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[9px] font-mono tracking-widest uppercase transition-colors duration-200 ${
                    activePanel === item.id ? 'text-[#7eb8d4] border-b border-[#4a9abb]' : 'text-[#1a3a50] hover:text-[#2a5a74]'
                  }`}>
                  <span className="text-[14px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'none' }}>
              <AnimatePresence mode="wait">
                <motion.div key={activePanel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                  {activePanel === 'map' && <MapPanel />}
                  {activePanel === 'log' && <LogPanel />}
                  {activePanel === 'trace' && <TracePanel onReplayIntro={() => { setPanelOpen(false); setReplayIntro(true) }} />}
                  {activePanel === 'profile' && <ProfilePanel />}
                </motion.div>
              </AnimatePresence>
            </div>
             <button onClick={() => { goModeSelect(() => { window.location.href = '/' }) }}
              className="p-3.5 border-t border-[#0d2233] text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors text-center">
              ‹ 모드 선택으로
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {panelOpen && <div className="absolute inset-0 pointer-events-auto" style={{ zIndex: -1 }} onClick={() => setPanelOpen(false)} />}

      {replayIntro && createPortal(
        <OpeningSequence onFinish={() => setReplayIntro(false)} />,
        document.body
      )}
    </div>
  )
}