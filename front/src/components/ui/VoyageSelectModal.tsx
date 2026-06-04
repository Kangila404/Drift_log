import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoyageStore } from '../../stores/voyageStore'
import { getRouteDuration } from '../../api/routes' // ← routes.ts 실제 경로에 맞춰 조정

interface City {
  id: string
  name: string
  x: number
  y: number
  visited: boolean
  current?: boolean
}

// DB ID 기준: 1:서울 2:인천 3:대전 4:강릉 5:부산 6:수원 7:광주 8:대구 9:포항 10:제주
// 좌표(x, y)는 SVG 지도 렌더용 프론트 고유 데이터. 소요 시간은 서버에서 받는다.
const CITIES: City[] = [
  { id: '1',  name: '서울', x: 45.5, y: 53.0, visited: true  },
  { id: '2',  name: '인천', x: 36.0, y: 55.0, visited: false },
  { id: '3',  name: '대전', x: 48.5, y: 69.0, visited: false },
  { id: '4',  name: '강릉', x: 63.0, y: 50.0, visited: false },
  { id: '5',  name: '부산', x: 73.8, y: 75.2, visited: false },
  { id: '6',  name: '수원', x: 46.2, y: 59.2, visited: false },
  { id: '7',  name: '광주', x: 43.0, y: 75.8, visited: false },
  { id: '8',  name: '대구', x: 64.0, y: 72.5, visited: false },
  { id: '9',  name: '포항', x: 75.0, y: 70.5, visited: false },
  { id: '10', name: '제주', x: 38.0, y: 95.5, visited: false },
]

const KOREA_PATH = `M 78.1,2.0 L 76.0,3.1 L 75.7,7.9 L 70.5,8.1 L 66.2,12.3 L 60.1,11.4 L 55.5,12.5 L 58.3,14.8 L 58.0,18.3 L 47.2,17.5 L 43.3,14.0 L 39.0,16.0 L 39.3,18.1 L 33.2,22.7 L 29.5,22.7 L 13.0,30.3 L 16.1,35.3 L 21.0,34.3 L 25.2,37.2 L 21.3,42.4 L 22.8,44.6 L 19.7,45.0 L 15.8,49.6 L 21.0,49.8 L 19.7,51.3 L 22.2,51.3 L 22.8,53.3 L 25.8,53.3 L 28.0,50.6 L 32.6,53.3 L 35.9,51.5 L 35.0,55.7 L 41.7,57.6 L 39.0,59.0 L 43.3,61.3 L 41.7,62.0 L 37.8,60.3 L 32.3,63.0 L 35.0,63.8 L 35.3,67.0 L 35.9,63.8 L 37.8,64.0 L 40.5,71.8 L 35.0,76.6 L 35.0,78.9 L 30.7,81.0 L 31.0,85.0 L 35.0,83.3 L 31.0,87.5 L 36.2,84.0 L 36.2,86.5 L 43.9,86.7 L 42.7,84.8 L 46.0,82.3 L 47.2,84.0 L 44.5,85.8 L 49.4,85.8 L 48.2,82.7 L 52.1,83.3 L 52.8,80.6 L 54.6,83.3 L 58.3,80.6 L 64.4,83.3 L 64.7,80.0 L 62.2,80.8 L 61.9,79.1 L 67.1,79.8 L 74.5,75.4 L 75.7,69.9 L 72.9,70.3 L 72.9,57.8 L 61.9,48.9 L 58.0,42.4 L 49.7,39.7 L 49.4,34.3 L 61.6,30.9 L 63.8,28.4 L 69.0,27.4 L 69.0,25.9 L 75.7,23.2 L 75.7,14.8 L 79.0,11.2 L 86.7,9.5 L 85.5,6.4 L 83.0,6.4 Z`
const JEJU_PATH = `M 32.0,96.7 L 33.5,96.9 L 33.8,97.8 L 35.3,96.9 L 37.2,97.8 L 37.5,96.9 L 41.4,96.9 L 41.4,95.5 L 42.7,94.7 L 35.3,94.6 L 35.0,95.3 L 34.1,95.3 Z`

function formatDuration(min: number): string {
  if (min < 60) return `약 ${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `약 ${h}시간` : `약 ${h}시간 ${m}분`
}

interface VoyageSelectModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (cityId: string) => void
}

export default function VoyageSelectModal({ open, onClose, onConfirm }: VoyageSelectModalProps) {
  const { currentCity } = useVoyageStore()
  const [selected, setSelected] = useState<City | null>(null)
  const [durationMin, setDurationMin] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // 데스크탑 여부 — md(768px) 기준, 리사이즈 따라감 (isTall 판별과 동일 패턴)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  )
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 최신 요청만 반영하기 위한 토큰 (도시 빠르게 전환 시 stale 응답 무시)
  const reqIdRef = useRef(0)

  // 현재 도시 ID 기반으로 current 표시
  const citiesWithCurrent = CITIES.map(c => ({
    ...c,
    current: c.id === String(currentCity?.cityId),
  }))

  const current = citiesWithCurrent.find(c => c.current)

  const resetSelection = () => {
    reqIdRef.current++      // 진행 중인 요청 무효화
    setSelected(null)
    setDurationMin(null)
    setLoading(false)
  }

  const handleCityClick = async (city: City) => {
    if (city.current) return
    // 같은 도시 다시 누르면 선택 해제
    if (selected?.id === city.id) {
      resetSelection()
      return
    }
    setSelected(city)
    setDurationMin(null)
    setLoading(true)

    const myReq = ++reqIdRef.current   // 이번 요청 고유 번호
    try {
      // 현재 도시는 서버가 JWT로 식별 → 목적지(toCityId)만 전달
      const data = await getRouteDuration(city.id)
      if (myReq === reqIdRef.current) setDurationMin(data.durationTime)
    } catch {
      if (myReq === reqIdRef.current) setDurationMin(null) // 실패해도 모달 유지, 시간만 비움
    } finally {
      if (myReq === reqIdRef.current) setLoading(false)
    }
  }

  const handleClose = () => {
    resetSelection()
    onClose()
  }

  const handleConfirm = () => {
    if (!selected) return
    onConfirm(selected.id)
    resetSelection()
    onClose()
  }

  // ── 지도 SVG (데스크탑/모바일 공유) ──
  const mapSvg = (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
      <rect width="100" height="100" fill="#040d16" />
      <defs>
        <pattern id="grid2" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#0a1f2e" strokeWidth="0.25" />
        </pattern>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="100" height="100" fill="url(#grid2)" opacity="0.5" />

      <g transform="translate(10 2) scale(0.78)">
        <path d={KOREA_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.65" />
        <path d={KOREA_PATH} fill="none" stroke="#4a9abb" strokeWidth="0.22" opacity="0.5" filter="url(#glow2)" />
        <path d={JEJU_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.45" />
        <path d={JEJU_PATH} fill="none" stroke="#4a9abb" strokeWidth="0.18" opacity="0.45" />

        {selected && current && (
          <line x1={current.x} y1={current.y} x2={selected.x} y2={selected.y} stroke="#4a9abb" strokeWidth="0.6" strokeDasharray="1.5,1.5" opacity="0.6" />
        )}

        {citiesWithCurrent.map(city => {
          const isCurrent = Boolean(city.current)
          const isSelected = selected?.id === city.id
          return (
            <g key={city.id} style={{ cursor: isCurrent ? 'default' : 'pointer' }} onClick={() => handleCityClick(city)}>
              {isSelected && (
                <circle cx={city.x} cy={city.y} r="3.5" fill="none" stroke="#7eb8d4" strokeWidth="0.4" opacity="0.4">
                  <animate attributeName="r" values="2.5;5;2.5" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              {isCurrent && (
                <circle cx={city.x} cy={city.y} r="3" fill="none" stroke="#7eb8d4" strokeWidth="0.4" opacity="0.4">
                  <animate attributeName="r" values="2;4.5;2" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={city.x} cy={city.y} r={isCurrent ? 1.4 : isSelected ? 1.6 : 1.0} fill={isCurrent ? '#7eb8d4' : isSelected ? '#a8d4e8' : city.visited ? '#2a5a74' : '#0d2233'} stroke={isCurrent ? '#a8d4e8' : isSelected ? '#cce8f5' : city.visited ? '#1a4a64' : '#1a3a50'} strokeWidth="0.4" />
              <text x={city.x + 2} y={city.y + 0.8} fontSize="2.4" fill={isCurrent ? '#a8d4e8' : isSelected ? '#cce8f5' : city.visited ? '#3a6880' : '#1a3a50'} fontFamily="monospace">{city.name}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )

  // ── 선택 결과 + 예상 항해 시간 (공유) ──
  const selectionInfo = (
    <div style={{ minHeight: '3rem' }}>
      {selected ? (
        <>
          <p style={{ textAlign: 'center', fontFamily: '"Noto Serif KR", serif', fontSize: '0.8rem', color: 'rgba(180, 210, 230, 0.8)', letterSpacing: '0.2em', marginBottom: '0.7rem' }}>
            {current?.name} &rarr; {selected.name}
          </p>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.2em', color: 'rgba(100, 160, 200, 0.4)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              예상 항해 시간
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'rgba(126, 184, 212, 0.85)' }}>
              {loading ? '계산 중…' : durationMin != null ? formatDuration(durationMin) : '—'}
            </p>
          </div>
        </>
      ) : (
        <p style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.65rem', color: 'rgba(100, 160, 200, 0.3)', letterSpacing: '0.2em', lineHeight: '3rem' }}>
          지도에서 목적지를 선택하세요
        </p>
      )}
    </div>
  )

  // ── 출항 버튼 (공유) ──
  const confirmButton = (
    <button
      onClick={handleConfirm}
      disabled={!selected}
      style={{
        background: 'transparent',
        border: `1px solid ${selected ? 'rgba(100, 160, 200, 0.5)' : 'rgba(100, 160, 200, 0.15)'}`,
        color: selected ? 'rgba(180, 210, 230, 0.85)' : 'rgba(100, 160, 200, 0.25)',
        fontFamily: '"Noto Serif KR", serif',
        fontSize: '0.75rem', letterSpacing: '0.3em',
        padding: '0.7rem', cursor: selected ? 'pointer' : 'default',
        transition: 'all 0.3s ease', width: '100%',
      }}
      onMouseEnter={e => {
        if (!selected) return
        ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(100, 160, 200, 0.8)'
        ;(e.target as HTMLButtonElement).style.color = 'rgba(220, 240, 255, 0.95)'
      }}
      onMouseLeave={e => {
        if (!selected) return
        ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(100, 160, 200, 0.5)'
        ;(e.target as HTMLButtonElement).style.color = 'rgba(180, 210, 230, 0.85)'
      }}
    >
      출항하기
    </button>
  )

  // ── 헤더 (공유) ──
  const header = (
    <div>
      <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(100, 160, 200, 0.5)', marginBottom: '0.4rem' }}>
        SELECT DESTINATION
      </p>
      <p style={{ fontFamily: '"Noto Serif KR", serif', fontSize: '0.95rem', color: 'rgba(180, 210, 230, 0.8)', letterSpacing: '0.15em' }}>
        목적지를 선택하세요
      </p>
    </div>
  )

  const closeButton = (
    <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'rgba(100, 160, 200, 0.4)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0.2rem' }}>✕</button>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(2, 8, 18, 0.75)',
              zIndex: 50, backdropFilter: 'blur(4px)',
            }}
          />

          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 51,
            width: isDesktop ? 'min(1100px, 94vw)' : 'min(380px, 92vw)',
            height: isDesktop ? 'min(760px, 90vh)' : 'auto',
          }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                position: 'relative',
                backgroundColor: '#050e18',
                border: '1px solid rgba(100, 160, 200, 0.15)',
                width: '100%', height: '100%',
                display: 'flex',
                flexDirection: isDesktop ? 'row' : 'column',
                gap: isDesktop ? 0 : '1.2rem',
                padding: isDesktop ? 0 : '2rem',
                overflow: 'hidden',
              }}
            >
              {isDesktop ? (
                <>
                  {/* 닫기 — 모달 우상단 고정 */}
                  <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 2 }}>
                    {closeButton}
                  </div>

                  {/* 왼쪽 — 헤더 + 큰 지도 */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '2.2rem', gap: '1.5rem' }}>
                    {header}
                    <div style={{ height: '1px', backgroundColor: 'rgba(100, 160, 200, 0.1)' }} />
                    <div style={{ flex: 1, minHeight: 0, backgroundColor: '#040d16', border: '1px solid #0d2233' }}>
                      {mapSvg}
                    </div>
                  </div>

                  {/* 오른쪽 — 선택 정보 + 출항 */}
                  <div style={{
                    width: '340px', flexShrink: 0,
                    borderLeft: '1px solid rgba(100, 160, 200, 0.1)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    gap: '2rem', padding: '2.5rem 2rem',
                  }}>
                    {selectionInfo}
                    {confirmButton}
                  </div>
                </>
              ) : (
                <>
                  {/* 모바일 — 기존 세로 스택 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {header}
                    {closeButton}
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'rgba(100, 160, 200, 0.1)' }} />

                  <div style={{ width: '100%', height: '320px', backgroundColor: '#040d16', border: '1px solid #0d2233' }}>
                    {mapSvg}
                  </div>

                  {selectionInfo}
                  {confirmButton}
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}