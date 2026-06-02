import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../../api/client'
import { useVoyageStore } from '../../stores/voyageStore'
import EndingSequence from '../EndingSequence'
import { bgm } from '../../audio/bgmManager'
import { getDiscoveredTraces, type DiscoveredTrace } from '../../api/trace'

type LogEntry = { id: number; date: string; from: string; to: string; note: string; autoText: string }

// ─── 도시 메타 (이름/이미지/설명 — city 테이블 기준 고정값) ──────────────────
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

// ─── 나침반 (framer-motion 흔들림 애니메이션) ─────────────────────────────────
function Compass({ deg }: { deg: number }) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const normalizedDeg = ((deg % 360) + 360) % 360
  const dirLabel = dirs[Math.round(normalizedDeg / 45) % 8]

  return (
    <div className="relative w-32 h-32 group">
      <svg viewBox="0 0 64 64" className="w-full h-full opacity-40 group-hover:opacity-80 transition-opacity duration-500">
        <circle cx="32" cy="32" r="30" fill="none" stroke="#7eb8d4" strokeWidth="0.8" />
        {Array.from({ length: 32 }).map((_, i) => {
          const angle = (i / 32) * Math.PI * 2
          const isMajor = i % 4 === 0
          return (
            <line key={i}
              x1={32 + Math.sin(angle) * (isMajor ? 26 : 28)} y1={32 - Math.cos(angle) * (isMajor ? 26 : 28)}
              x2={32 + Math.sin(angle) * 30} y2={32 - Math.cos(angle) * 30}
              stroke="#7eb8d4" strokeWidth={isMajor ? 1 : 0.5} opacity={isMajor ? 0.8 : 0.4}
            />
          )
        })}
        <text x="32" y="10" textAnchor="middle" fill="#a8d4e8" fontSize="6" fontFamily="monospace">N</text>

        {/* 바늘 — SVG foreignObject 대신 CSS transform으로 처리 */}
        <g style={{ transform: `rotate(${normalizedDeg}deg)`, transformOrigin: '32px 32px', transformBox: 'fill-box' }}>
          <polygon points="32,10 29.5,32 32,30 34.5,32" fill="#cce8f5" opacity="0.95" />
          <polygon points="32,54 29.5,32 32,34 34.5,32" fill="#3a6880" opacity="0.8" />
        </g>

        <circle cx="32" cy="32" r="2" fill="#7eb8d4" />
      </svg>

      {/* 흔들림 애니메이션 오버레이 — motion.div로 바늘 레이어 */}
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <motion.g
            style={{ transformOrigin: '32px 32px', transformBox: 'fill-box' }}
            animate={{
              rotate: [
                normalizedDeg - 4.5,
                normalizedDeg + 3.0,
                normalizedDeg - 2.4,
                normalizedDeg + 1.2,
                normalizedDeg - 0.6,
                normalizedDeg,
              ],
            }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], repeat: Infinity, repeatDelay: 4 }}
          >
            <polygon points="32,10 29.5,32 32,30 34.5,32" fill="#cce8f5" opacity="0.95" />
            <polygon points="32,54 29.5,32 32,34 34.5,32" fill="#3a6880" opacity="0.8" />
          </motion.g>
          <motion.circle cx="32" cy="32" r="2" fill="#7eb8d4"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-mono text-[#7eb8d4] opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-5">
          {dirLabel} {Math.round(normalizedDeg)}°
        </span>
      </div>
    </div>
  )
}


// 모바일 기기 판별 (카카오페이 링크는 모바일에서만 작동)
function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

// ─── 카운트다운 (매초 흐름, remainingSeconds 바뀔 때만 리셋) ──────────────────
function useCountdown(remainingSeconds: number, isRunning: boolean) {
  const [display, setDisplay] = useState(remainingSeconds)
  const remainingRef = useRef(remainingSeconds)

  // 서버에서 새 값 오면 즉시 반영
  useEffect(() => {
    remainingRef.current = remainingSeconds
    setDisplay(remainingSeconds)
  }, [remainingSeconds])

  // 매초 감소
  useEffect(() => {
    if (!isRunning) return
    const tick = setInterval(() => {
      remainingRef.current = Math.max(0, remainingRef.current - 1)
      setDisplay(remainingRef.current)
    }, 1000)
    return () => clearInterval(tick)
  }, [isRunning, remainingSeconds])

  if (display <= 0) return '도착'
  const h = Math.floor(display / 3600)
  const m = Math.floor((display % 3600) / 60)
  const s = display % 60
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

// ─── 진행바 ───────────────────────────────────────────────────────────────────
function ProgressBar({ from, to, progress, remainingSeconds, voyageState }: {
  from: string; to: string; progress: number; remainingSeconds: number
  voyageState: 'ANCHORED' | 'SAILING' | 'PAUSED'
}) {
  const isPaused = voyageState === 'PAUSED'
  const countdown = useCountdown(remainingSeconds, voyageState === 'SAILING')
  const safeProgress = Math.max(0, Math.min(1, progress))
  const [muted, setMuted] = useState(bgm.isMuted())
  

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
            <span className="text-[#7eb8d4]">항해 정지 중 · 시간 멈춤</span>
          ) : remainingSeconds === 0 ? (
            <span className="text-[#4a9abb] animate-pulse">계산 중...</span>
          ) : countdown === '도착' ? (
            <span className="text-[#4a9abb]">도착</span>
          ) : (
            <>도착까지 <span className="text-[#4a9abb]">{countdown}</span></>
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
  1:  { x: 45.5, y: 53.0, name: '서울' },
  2:  { x: 36.0, y: 55.0, name: '인천' },
  3:  { x: 48.5, y: 69.0, name: '대전' },
  4:  { x: 63.0, y: 50.0, name: '강릉' },
  5:  { x: 73.8, y: 75.2, name: '부산' },
  6:  { x: 46.2, y: 59.2, name: '수원' },
  7:  { x: 43.0, y: 75.8, name: '광주' },
  8:  { x: 64.0, y: 72.5, name: '대구' },
  9:  { x: 75.0, y: 70.5, name: '포항' },
  10: { x: 38.0, y: 95.5, name: '제주' },
}

function MapPanel() {
  const { voyageState, currentCity, destinationCityId, progress } = useVoyageStore()
  const [mapData, setMapData] = useState<any>(null)
  const [mapOpen, setMapOpen] = useState(false)

  useEffect(() => {
    apiClient.get('/map').then(res => setMapData(res.data)).catch(() => {})
  }, [])

  const visitedCityIds: number[] = mapData?.maps?.map((c: any) => c.cityId) ?? []
  const fromCity = currentCity ? CITY_COORDS[currentCity.cityId] : null
  const toCity = destinationCityId ? CITY_COORDS[destinationCityId] : null
  const safeProgress = Math.max(0, Math.min(1, progress))

  const boatX = fromCity && toCity ? fromCity.x + (toCity.x - fromCity.x) * safeProgress : null
  const boatY = fromCity && toCity ? fromCity.y + (toCity.y - fromCity.y) * safeProgress : null
  const isSailing = voyageState === 'SAILING' || voyageState === 'PAUSED'

  // 지도 SVG (작은 패널/큰 모달 공유)
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
          const isVisited = visitedCityIds.includes(id)
          return (
            <g key={id}>
              {isCurrent && (
                <circle cx={city.x} cy={city.y} r="3" fill="none" stroke="#7eb8d4" strokeWidth="0.4" opacity="0.4">
                  <animate attributeName="r" values="2;4.5;2" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={city.x} cy={city.y} r={isCurrent ? 1.4 : isVisited ? 1.1 : 0.9}
                fill={isCurrent ? '#7eb8d4' : isVisited ? '#2a5a74' : '#0d2233'}
                stroke={isCurrent ? '#a8d4e8' : isVisited ? '#1a4a64' : '#1a3a50'} strokeWidth="0.4" />
              <text x={city.x + 2} y={city.y + 0.8} fontSize="2.4"
                fill={isCurrent ? '#a8d4e8' : isVisited ? '#3a6880' : '#1a3a50'} fontFamily="monospace">{city.name}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )

  const legend = (
    <div className="flex gap-3 flex-wrap">
      {[{ color: '#7eb8d4', label: '현재 위치' }, { color: '#2a5a74', label: '방문' }, { color: '#0d2233', label: '미방문' }].map(l => (
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

      {/* 작은 지도 — 클릭하면 크게 */}
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

      {/* 큰 지도 모달 */}
      {createPortal(
        <AnimatePresence>
          {mapOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
const TOTAL_TRACES = 4  // 전체 흔적 수 (서울 제외, 도시당 1개)

function TracePanel() {
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

{/* 엔딩 다시 보기 — 흔적 다 모았을 때만 (피드백 없음) */}
      {allFound && (
        <button
          onClick={() => {
            bgm.playEnding()        // 엔딩 BGM 시작
            setReplayEnding(true)
          }}
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
            // 엔딩 끝 → 현재 도시 BGM으로 복귀
            const city = useVoyageStore.getState().currentCity
            if (city?.bgmUrl) bgm.playCity(city.bgmUrl)
          }}
        />,
        document.body
      )}

      <div className="flex flex-col gap-2">
        {/* 발견한 흔적 */}
        {traces.map((t, i) => (
          <motion.button
            key={`found-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setSelected(t)}
            className="text-left border rounded p-3 bg-[#071826]/60 border-[#1a4a64]/50 hover:border-[#4a9abb]/60 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-[#7eb8d4] tracking-widest">{t.cityName} · {t.familyMember}</span>
            </div>
            <p className="text-[11px] text-[#4a7a94] font-light leading-relaxed line-clamp-2">{t.traceName}</p>
          </motion.button>
        ))}

        {/* 잠긴 슬롯 */}
        {Array.from({ length: lockedCount }).map((_, i) => (
          <motion.div
            key={`locked-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (discoveredCount + i) * 0.06 }}
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

      {/* 상세 보기 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#02060e]/85 p-6 pointer-events-auto"
            onClick={() => setSelected(null)}
            style={{ backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
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
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  const [visitedCityIds, setVisitedCityIds] = useState<number[]>([])
  const [gridOpen, setGridOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState<number | null>(null)

  useEffect(() => {
    apiClient.get('/voyage-log').then(res => {
      const mapped = res.data.map((l: any) => {
        const d = new Date(l.createdAt)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return {
          id: l.logId,
          date: `${y}.${m}.${day}.`,
          from: l.fromCity, to: l.toCity, note: l.userText ?? '', autoText: l.autoText,
        }
      })
      setLogs(mapped)
    }).catch(() => {})

    apiClient.get('/users/me').then(res => {
      setVisitedCityIds(res.data.visitedCityIds ?? [])
    }).catch(() => {})
  }, [])

  const startEdit = (log: LogEntry) => { setEditingId(log.id); setEditNote(log.note) }
  const saveEdit = async (id: number) => {
    await apiClient.post(`/voyage-log/${id}`, { userText: editNote })
    setLogs(prev => prev.map(l => (l.id === id ? { ...l, note: editNote } : l)))
    setEditingId(null)
  }

  const visited = visitedCityIds.filter(id => CITY_META[id])

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">항해 기록</h2>

      {/* 사진 보기 버튼 */}
      {visited.length > 0 && (
        <button
          onClick={() => setGridOpen(true)}
          className="w-full py-2.5 border border-[#1a4a64]/50 rounded text-[10px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#4a9abb]/70 tracking-widest uppercase transition-colors bg-[#071826]/40"
        >
          ◳ 지나온 도시 사진 보기 ({visited.length})
        </button>
      )}

      {/* 기록 목록 */}
      {logs.length === 0 && <p className="text-[10px] text-[#1a3a50] italic">— 아직 항해 기록이 없습니다</p>}
      <div className="flex flex-col gap-3">
        {logs.map((log, i) => (
          <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="border-l border-[#0d2233] pl-3 py-1.5">
            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-2 items-baseline">
                <span className="text-[9px] font-mono text-[#2a5a74]">{log.date}</span>
                <span className="text-[9px] font-mono text-[#1a3a50]">{log.from} → {log.to}</span>
              </div>
              {editingId !== log.id && (
                <button onClick={() => startEdit(log)} className="text-[8px] font-mono text-[#1a3a50] hover:text-[#4a9abb] px-1">수정</button>
              )}
            </div>
            <p className="text-[9px] text-[#2a5a74] mb-1">{log.autoText}</p>
            {editingId === log.id ? (
              <div className="flex flex-col gap-1.5 mt-1">
                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} maxLength={100} rows={2} placeholder="오늘의 항해를 기록하세요..." className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-2 py-1.5 text-[11px] text-[#7eb8d4] resize-none outline-none focus:border-[#2a5a74] placeholder-[#1a3a50]" />
                <div className="flex justify-between">
                  <span className="text-[8px] font-mono text-[#1a3a50]">{editNote.length}/100</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="text-[8px] font-mono text-[#1a3a50]">취소</button>
                    <button onClick={() => saveEdit(log.id)} className="text-[8px] font-mono text-[#4a9abb]">저장</button>
                  </div>
                </div>
              </div>
            ) : log.note ? (
              <p className="text-[11px] text-[#4a7a94] font-light leading-relaxed">{log.note}</p>
            ) : (
              <p className="text-[10px] text-[#1a3a50] italic">— 기록 없음 · 수정으로 추가</p>
            )}
          </motion.div>
        ))}
      </div>

{/* 그리드 모달 */}
      {createPortal(
        <AnimatePresence>
          {gridOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setGridOpen(false)}
              className="fixed inset-0 z-[9998] flex flex-col items-center justify-center cursor-pointer py-10 px-6"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(6px)' }}
            >
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase mb-6 pointer-events-none shrink-0">지나온 도시</p>
                <div
                onClick={e => e.stopPropagation()}
                className="grid gap-3 cursor-default overflow-y-auto min-h-0"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))',
                  width: 'min(94vw, 760px)',
                  scrollbarWidth: 'none',
                }}
              >
                {visited.map(id => {
                  const c = CITY_META[id]
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedCity(id)}
                      className="relative rounded-lg overflow-hidden border border-[#1a4a64]/50 hover:border-[#4a9abb] transition-colors aspect-[3/2]"
                    >
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

      {/* 도시 상세 — PNG + 설명 확대 */}
      {createPortal(
        <AnimatePresence>
          {selectedCity !== null && CITY_META[selectedCity] && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setSelectedCity(null)}
              className="fixed inset-0 z-[9999] bg-black cursor-pointer"
            >
              <img src={CITY_META[selectedCity].img} alt={CITY_META[selectedCity].name}
                className="w-full h-full object-cover" draggable={false} />
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to bottom, rgba(2,6,14,0.3) 0%, rgba(2,6,14,0.05) 35%, rgba(2,6,14,0.2) 60%, rgba(2,6,14,0.92) 100%)',
              }} />
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
    </div>
  )
}

// ─── 프로필 ───────────────────────────────────────────────────────────────────
type EditMode = 'nickname' | 'password' | null

// 미니 지도용 (MapPanel의 좌표 재사용)
const MINI_KOREA_PATH = `M 78.1,2.0 L 76.0,3.1 L 75.7,7.9 L 70.5,8.1 L 66.2,12.3 L 60.1,11.4 L 55.5,12.5 L 58.3,14.8 L 58.0,18.3 L 47.2,17.5 L 43.3,14.0 L 39.0,16.0 L 39.3,18.1 L 33.2,22.7 L 29.5,22.7 L 13.0,30.3 L 16.1,35.3 L 21.0,34.3 L 25.2,37.2 L 21.3,42.4 L 22.8,44.6 L 19.7,45.0 L 15.8,49.6 L 21.0,49.8 L 19.7,51.3 L 22.2,51.3 L 22.8,53.3 L 25.8,53.3 L 28.0,50.6 L 32.6,53.3 L 35.9,51.5 L 35.0,55.7 L 41.7,57.6 L 39.0,59.0 L 43.3,61.3 L 41.7,62.0 L 37.8,60.3 L 32.3,63.0 L 35.0,63.8 L 35.3,67.0 L 35.9,63.8 L 37.8,64.0 L 40.5,71.8 L 35.0,76.6 L 35.0,78.9 L 30.7,81.0 L 31.0,85.0 L 35.0,83.3 L 31.0,87.5 L 36.2,84.0 L 36.2,86.5 L 43.9,86.7 L 42.7,84.8 L 46.0,82.3 L 47.2,84.0 L 44.5,85.8 L 49.4,85.8 L 48.2,82.7 L 52.1,83.3 L 52.8,80.6 L 54.6,83.3 L 58.3,80.6 L 64.4,83.3 L 64.7,80.0 L 62.2,80.8 L 61.9,79.1 L 67.1,79.8 L 74.5,75.4 L 75.7,69.9 L 72.9,70.3 L 72.9,57.8 L 61.9,48.9 L 58.0,42.4 L 49.7,39.7 L 49.4,34.3 L 61.6,30.9 L 63.8,28.4 L 69.0,27.4 L 69.0,25.9 L 75.7,23.2 L 75.7,14.8 L 79.0,11.2 L 86.7,9.5 L 85.5,6.4 L 83.0,6.4 Z`
const MINI_JEJU_PATH = `M 32.0,96.7 L 33.5,96.9 L 33.8,97.8 L 35.3,96.9 L 37.2,97.8 L 37.5,96.9 L 41.4,96.9 L 41.4,95.5 L 42.7,94.7 L 35.3,94.6 L 35.0,95.3 L 34.1,95.3 Z`
const MINI_CITY_COORDS: Record<number, { x: number; y: number; name: string }> = {
  1: { x: 45.5, y: 53.0, name: '서울' },
  2: { x: 36.0, y: 55.0, name: '인천' },
  3: { x: 48.5, y: 69.0, name: '대전' },
  4: { x: 63.0, y: 50.0, name: '강릉' },
  5: { x: 73.8, y: 75.2, name: '부산' },
  6: { x: 46.2, y: 59.2, name: '수원' },
  7: { x: 43.0, y: 75.8, name: '광주' },
  8: { x: 64.0, y: 72.5, name: '대구' },
  9: { x: 75.0, y: 70.5, name: '포항' },
  10: { x: 38.0, y: 95.5, name: '제주' },
}

function VisitedMiniMap({ visitedIds }: { visitedIds: number[] }) {
  return (
    <div className="w-full bg-[#040d16] rounded border border-[#1a4a64]/50 p-4">
      <div className="relative w-full" style={{ paddingBottom: '115%' }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <g transform="translate(10 2) scale(0.78)">
            <path d={MINI_KOREA_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.65" />
            <path d={MINI_JEJU_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.45" />
            {Object.entries(MINI_CITY_COORDS).map(([idStr, city]) => {
              const id = Number(idStr)
              const visited = visitedIds.includes(id)
              return (
                <g key={id}>
                  <circle cx={city.x} cy={city.y} r={visited ? 1.4 : 0.9}
                    fill={visited ? '#4a9abb' : '#0d2233'}
                    stroke={visited ? '#a8d4e8' : '#1a3a50'} strokeWidth="0.4" />
                  {visited && (
                    <text x={city.x + 2} y={city.y + 0.8} fontSize="2.4" fill="#a8d4e8" fontFamily="monospace">{city.name}</text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      <p className="text-center text-[10px] font-mono text-[#2a5a74] mt-2">다녀온 도시</p>
    </div>
  )
}

function ProfilePanel() {
  const [user, setUser] = useState({ name: '', email: '', joined: '', totalVoyages: 0, visitedCities: 0, userRole: 'USER' })
  const [visitedCityIds, setVisitedCityIds] = useState<number[]>([])
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [newNickname, setNewNickname] = useState('')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [donateOpen, setDonateOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    apiClient.get('/users/me').then(res => {
      setUser({ name: res.data.name, email: res.data.email, joined: new Date(res.data.createdAt).toLocaleDateString('ko-KR'), totalVoyages: res.data.totalVoyages ?? 0, visitedCities: res.data.visitedCities ?? 0, userRole: res.data.userRole ?? 'USER' })
      setVisitedCityIds(res.data.visitedCityIds ?? [])
    }).catch(() => {})
  }, [])

  const saveNickname = async () => {
    if (!newNickname.trim()) return
    await apiClient.patch('/users/me', { name: newNickname.trim() })
    setUser(u => ({ ...u, name: newNickname.trim() })); setEditMode(null); setNewNickname('')
  }

  const savePassword = async () => {
    setPwError('')
    if (!pwForm.current) return setPwError('현재 비밀번호를 입력하세요')
    if (pwForm.next.length < 8) return setPwError('비밀번호는 8자 이상')
    if (pwForm.next !== pwForm.confirm) return setPwError('비밀번호가 일치하지 않습니다')
    try {
      await apiClient.patch('/users/me/password', { currentPassword: pwForm.current, newPassword: pwForm.next, newPasswordConfirm: pwForm.confirm })
      setPwSuccess(true)
      setTimeout(() => { setEditMode(null); setPwSuccess(false); setPwForm({ current: '', next: '', confirm: '' }) }, 1200)
    } catch { setPwError('비밀번호 변경에 실패했습니다.') }
  }

  const handleLogout = async () => {
    if (loggingOut) return
    if (!window.confirm('로그아웃 하시겠습니까?')) return
    setLoggingOut(true)
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) await apiClient.post('/auth/logout', { refreshToken })
    } catch (e) {
      console.error('로그아웃 요청 실패:', e) // 서버 실패해도 클라 토큰은 지움
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
  }

  const inputCls = 'w-full bg-[#040d16] border border-[#1a3a50] rounded px-2.5 py-1.5 text-[11px] text-[#7eb8d4] outline-none focus:border-[#2a5a74] placeholder-[#1a3a50]'

  return (
    <div className="flex flex-col gap-4">

      {createPortal(
        <AnimatePresence>
          {mapOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMapOpen(false)}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer py-8"
              style={{ background: 'rgba(2,6,14,0.8)', backdropFilter: 'blur(4px)' }}
            >
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase mb-4 pointer-events-none shrink-0">다녀온 도시</p>
              <div
                onClick={e => e.stopPropagation()}
                className="cursor-default shrink min-h-0"
                style={{ width: 'min(58vh, 80vw)', maxWidth: 560 }}
              >
                <VisitedMiniMap visitedIds={visitedCityIds} />
              </div>
              <button
                onClick={() => setMapOpen(false)}
                className="mt-6 px-8 py-2 border border-[#1a4a64]/60 rounded text-[11px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 tracking-widest uppercase transition-colors cursor-pointer shrink-0"
              >
                닫기
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 후원 모달 */}
      {createPortal(
        <AnimatePresence>
          {donateOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDonateOpen(false)}
              className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer px-6"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(8px)' }}
            >
              <motion.div
                onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="w-full max-w-[340px] rounded-2xl p-8 flex flex-col items-center cursor-default"
                style={{
                  background: 'linear-gradient(180deg, #0a1828 0%, #050e18 100%)',
                  border: '1px solid rgba(74,154,187,0.25)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'rgba(126,184,212,0.1)', border: '1px solid rgba(126,184,212,0.25)' }}>
                  <span className="text-[18px] font-serif text-[#7eb8d4]">⛵</span>
                </div>

                <p className="text-[10px] font-mono text-[#4a9abb] tracking-[0.4em] uppercase mb-5">Support</p>

                <div className="flex flex-col gap-3 text-center mb-7">
                  <p className="text-[14px] font-serif text-[#cce8f5] leading-relaxed">
                    본 서비스는 사용자 경험을 위해<br />광고 없이 운영됩니다.
                  </p>
                  <p className="text-[12px] text-[#5a8aa4] leading-relaxed font-light">
                    한분 한분<br />모두 기억하겠습니다.
                  </p>
                </div>

                {isMobileDevice() ? (
                  <>
                    <a
                      href="https://qr.kakaopay.com/FHjo39K0L"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 rounded-xl flex items-center justify-center text-[15px] font-bold tracking-wide transition-all duration-200 hover:brightness-105 hover:-translate-y-0.5"
                      style={{ background: '#FEE500', color: '#3C1E1E', boxShadow: '0 6px 20px rgba(254,229,0,0.18)' }}
                    >
                      카카오페이로 후원하기
                    </a>
                    <p className="text-[10px] font-mono text-[#2a5a74] tracking-wider mt-4">
                      버튼을 누르면 카카오페이로 연결됩니다
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-40 h-40 rounded-xl overflow-hidden bg-white p-2">
                      <img src="/donate/toss_qr.png" alt="후원 QR" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-[10px] font-mono text-[#2a5a74] tracking-wider mt-4 text-center leading-relaxed">
                      카카오페이 앱으로 QR을 스캔해 주세요
                    </p>
                  </>
                )}

                <button
                  onClick={() => setDonateOpen(false)}
                  className="mt-6 text-[11px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors"
                >
                  닫기
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">마이 페이지</h2>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-[#0d2233] bg-[#050e18] flex items-center justify-center">⛵</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-mono text-[#a8d4e8] truncate">{user.name}</p>
          <p className="text-[9px] font-mono text-[#2a5a74] truncate">{user.email}</p>
          <p className="text-[8px] font-mono text-[#1a3a50]">항해 시작 {user.joined}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#050e18] border border-[#0d2233] rounded p-3 text-center">
          <p className="text-[18px] font-mono text-[#4a9abb]">{user.totalVoyages}회</p>
          <p className="text-[9px] font-mono text-[#2a5a74] mt-0.5">총 항해</p>
        </div>

        <button
          onClick={() => setMapOpen(true)}
          className="bg-[#050e18] border border-[#0d2233] rounded p-3 text-center hover:border-[#4a9abb]/60 transition-colors cursor-pointer"
        >
          <p className="text-[18px] font-mono text-[#4a9abb]">{user.visitedCities}곳</p>
          <p className="text-[9px] font-mono text-[#2a5a74] mt-0.5">방문 도시 ›</p>
        </button>
      </div>

      <div className="border-t border-[#0d2233]" />

      {editMode === null && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] font-mono text-[#2a5a74] tracking-widest uppercase">계정 설정</p>
          <button onClick={() => { setEditMode('nickname'); setNewNickname(user.name) }} className="text-left px-3 py-2 bg-[#050e18] border border-[#0d2233] rounded text-[10px] font-mono text-[#3a6880] hover:border-[#1a4a64] hover:text-[#7eb8d4]">닉네임 변경</button>
          <button onClick={() => setEditMode('password')} className="text-left px-3 py-2 bg-[#050e18] border border-[#0d2233] rounded text-[10px] font-mono text-[#3a6880] hover:border-[#1a4a64] hover:text-[#7eb8d4]">비밀번호 변경</button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {editMode === 'nickname' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-col gap-2">
            <p className="text-[9px] font-mono text-[#4a7a94] tracking-widest uppercase">닉네임 변경</p>
            <input value={newNickname} onChange={e => setNewNickname(e.target.value)} maxLength={20} placeholder="새 닉네임" className={inputCls} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditMode(null)} className="text-[8px] font-mono text-[#1a3a50]">취소</button>
              <button onClick={saveNickname} className="text-[8px] font-mono text-[#4a9abb]">저장</button>
            </div>
          </motion.div>
        )}
        {editMode === 'password' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-col gap-2">
            <p className="text-[9px] font-mono text-[#4a7a94] tracking-widest uppercase">비밀번호 변경</p>
            <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="현재 비밀번호" className={inputCls} />
            <input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="새 비밀번호 (8자 이상)" className={inputCls} />
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="새 비밀번호 확인" className={inputCls} />
            {pwError && <p className="text-[9px] font-mono text-red-400/70">{pwError}</p>}
            {pwSuccess && <p className="text-[9px] font-mono text-[#4a9abb]">변경되었습니다</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditMode(null)} className="text-[8px] font-mono text-[#1a3a50]">취소</button>
              <button onClick={savePassword} className="text-[8px] font-mono text-[#4a9abb]">변경</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 개발자 후원 */}
      <div className="border-t border-[#0d2233]" />
      <button
        onClick={() => setDonateOpen(true)}
        className="w-full py-2.5 border border-[#1a4a64]/40 rounded text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/60 tracking-widest transition-colors"
      >
        ♡ 개발자 후원하기
      </button>

      {/* 관리자 페이지 — ADMIN만 */}
      {user.userRole === 'ADMIN' && (
        <a
          href="/admin"
          className="w-full py-2.5 border border-[#4a9abb]/40 rounded text-[10px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/70 tracking-widest transition-colors text-center"
        >
          ⚙ 관리자 페이지
        </a>
      )}

      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full py-2.5 border border-[#1a3a50] rounded text-[10px] font-mono text-[#3a6880] hover:text-red-300 hover:border-red-500/50 tracking-widest transition-colors disabled:opacity-40"
      >
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
  const [hudOpacity, setHudOpacity] = useState(0.35)
  const [compassDeg, setCompassDeg] = useState(0)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
const [muted, setMuted] = useState(bgm.isMuted())
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

        const { directionAngle } = useVoyageStore.getState()
        if (directionAngle !== null) setCompassDeg(directionAngle)

        if (data.remainingSeconds != null) {
          setRemainingSeconds(data.remainingSeconds)
        }
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 10000)
    return () => { clearInterval(interval) }
  }, [voyageState])

  useEffect(() => {
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

  // 항해 중일 때 출발지 이름 — destinationCityId가 있으면 currentCity가 출발지
  const fromName = currentCity?.name ?? '—'
  const toName = destinationCityId ? CITY_COORDS[destinationCityId]?.name ?? '—' : '—'

  const [pauseLoading, setPauseLoading] = useState(false)

  const handlePauseResume = async () => {
    if (pauseLoading) return
    setPauseLoading(true)
    // 클로저 문제 방지 — store에서 직접 최신값 읽기
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

  

  return (
    <div className="fixed inset-0 pointer-events-none z-10" style={{ transition: 'opacity 1.5s ease', opacity: hudOpacity }}>

      {!isAnchored && (
        <div className="absolute top-8 right-8 pointer-events-auto">
          <div className="flex items-start gap-4">
            <ProgressBar
              from={fromName} to={toName} progress={progress}
              remainingSeconds={remainingSeconds} voyageState={voyageState}
            />

            <div className="flex flex-col items-center gap-3 mt-[2px]">
              {/* 일시정지/재개 */}
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
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <span className="relative z-10">{voyageState === 'PAUSED' ? '▶' : 'Ⅱ'}</span>
                </motion.button>
              )}

              {/* BGM 음소거 — 정지 버튼 아래, 항상 표시 */}
              <motion.button
                onClick={() => setMuted(bgm.toggleMute())}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                className="w-12 h-12 rounded-full border flex items-center justify-center backdrop-blur-md transition-all duration-300 bg-[#050e18]/55 border-[#1a4a64]/70 text-[#7eb8d4]/80 hover:text-[#cce8f5] hover:border-[#7eb8d4]/70"
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

      {!isAnchored && (
        <div className="absolute bottom-8 right-8 pointer-events-auto">
          <Compass deg={compassDeg} />
        </div>
      )}

      <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto">
        <motion.button onClick={() => setPanelOpen(v => !v)}
          className="flex items-center pl-2 pr-3 py-3 bg-[#050e18]/60 border-r border-t border-b border-[#0d2233] rounded-r-sm hover:bg-[#071525]/80 transition-colors duration-300 group"
          whileHover={{ x: 2 }} whileTap={{ scale: 0.96 }}
        >
          <motion.span animate={{ rotate: panelOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="text-[10px] font-mono text-[#2a5a74] group-hover:text-[#7eb8d4]">›</motion.span>
        </motion.button>
      </div>

      <AnimatePresence>
        {panelOpen && (
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="absolute left-0 top-0 bottom-0 w-72 bg-[#050e18]/92 border-r border-[#0d2233] pointer-events-auto flex flex-col"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <div className="flex border-b border-[#0d2233]">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => setActivePanel(item.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[9px] font-mono tracking-widest uppercase transition-colors duration-200 ${
                    activePanel === item.id ? 'text-[#7eb8d4] border-b border-[#4a9abb]' : 'text-[#1a3a50] hover:text-[#2a5a74]'
                  }`}
                >
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
                  {activePanel === 'trace' && <TracePanel />}
                  {activePanel === 'profile' && <ProfilePanel />}
                </motion.div>
              </AnimatePresence>
            </div>
            <button onClick={() => setPanelOpen(false)} className="p-3 border-t border-[#0d2233] text-[9px] font-mono text-[#1a3a50] hover:text-[#2a5a74] tracking-widest uppercase transition-colors">
              ‹ 닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {panelOpen && <div className="absolute inset-0 pointer-events-auto" style={{ zIndex: -1 }} onClick={() => setPanelOpen(false)} />}
    </div>
  )
}