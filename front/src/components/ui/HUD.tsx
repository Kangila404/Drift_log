import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type LogEntry = { id: number; date: string; from: string; to: string; note: string }

const MOCK = {
  from: '서울',
  to: '인천',
  progress: 0.63,
  compassDeg: 247,
  arrivalTime: Date.now() + 1000 * 60 * 87,
cities: [
  // 수도권
  { id: 'seoul', name: '서울', x: 45.5, y: 53.0, visited: true },
  { id: 'incheon', name: '인천', x: 36.0, y: 55.0, visited: false, current: true },
  { id: 'suwon', name: '수원', x: 46.2, y: 59.2, visited: false },

  // 중부
  { id: 'daejeon', name: '대전', x: 48.5, y: 69.0, visited: false },

  // 남서
  { id: 'gwangju', name: '광주', x: 43.0, y: 75.8, visited: false },

  // 영남
  { id: 'daegu', name: '대구', x: 64.0, y: 72.5, visited: false },
  { id: 'pohang', name: '포항', x: 75.0, y: 70.5, visited: false },
  { id: 'busan', name: '부산', x: 73.8, y: 75.2, visited: true },

  // 동해
  { id: 'gangneung', name: '강릉', x: 63.0, y: 50.0, visited: false },

  // 제주
  { id: 'jeju', name: '제주', x: 38.0, y: 95.5, visited: true },
],
  user: {
    name: '항해자',
    email: 'voyager@driftlog.kr',
    joined: '2026.04.01',
    totalVoyages: 4,
    visitedCities: 3,
  },
}

const INITIAL_LOGS: LogEntry[] = [
  { id: 1, date: '2026.05.24', from: '부산', to: '제주', note: '파도가 잔잔했다.' },
  { id: 2, date: '2026.05.21', from: '인천', to: '부산', note: '오늘은 유난히 조용했다.' },
  { id: 3, date: '2026.05.18', from: '서울', to: '인천', note: '' },
]

function Compass({ deg }: { deg: number }) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const dirLabel = dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8]

  return (
    <div className="relative w-16 h-16 group">
      <svg viewBox="0 0 64 64" className="w-full h-full opacity-40 group-hover:opacity-80 transition-opacity duration-500">
        <circle cx="32" cy="32" r="30" fill="none" stroke="#7eb8d4" strokeWidth="0.8" />

        {Array.from({ length: 32 }).map((_, i) => {
          const angle = (i / 32) * Math.PI * 2
          const isMajor = i % 4 === 0

          return (
            <line
              key={i}
              x1={32 + Math.sin(angle) * (isMajor ? 26 : 28)}
              y1={32 - Math.cos(angle) * (isMajor ? 26 : 28)}
              x2={32 + Math.sin(angle) * 30}
              y2={32 - Math.cos(angle) * 30}
              stroke="#7eb8d4"
              strokeWidth={isMajor ? 1 : 0.5}
              opacity={isMajor ? 0.8 : 0.4}
            />
          )
        })}

        <text x="32" y="10" textAnchor="middle" fill="#a8d4e8" fontSize="6" fontFamily="monospace">
          N
        </text>

        <g transform={`rotate(${deg}, 32, 32)`}>
          <polygon points="32,10 29.5,32 32,30 34.5,32" fill="#cce8f5" opacity="0.95" />
          <polygon points="32,54 29.5,32 32,34 34.5,32" fill="#3a6880" opacity="0.8" />
        </g>

        <circle cx="32" cy="32" r="2" fill="#7eb8d4" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-mono text-[#7eb8d4] opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-5">
          {dirLabel} {deg}°
        </span>
      </div>
    </div>
  )
}

function useCountdown(arrivalTime: number) {
  const [remaining, setRemaining] = useState(arrivalTime - Date.now())

  useEffect(() => {
    const tick = setInterval(() => setRemaining(arrivalTime - Date.now()), 1000)
    return () => clearInterval(tick)
  }, [arrivalTime])

  const total = Math.max(0, remaining)
  const h = Math.floor(total / 3600000)
  const m = Math.floor((total % 3600000) / 60000)
  const s = Math.floor((total % 60000) / 1000)

  if (total <= 0) return '도착'
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

function ProgressBar({
  from,
  to,
  progress,
  arrivalTime,
}: {
  from: string
  to: string
  progress: number
  arrivalTime: number
}) {
  const countdown = useCountdown(arrivalTime)

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-mono text-[#4a7a94] tracking-widest uppercase">{from}</span>
        <span className="text-[9px] font-mono text-[#7eb8d4] opacity-60 mx-2">→</span>
        <span className="text-[10px] font-mono text-[#a8d4e8] tracking-widest uppercase">{to}</span>
      </div>

      <div className="relative h-[2px] bg-[#0d2233] rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full bg-[#4a9abb] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>

      <div className="flex justify-between items-baseline">
        <span className="text-[9px] font-mono text-[#2a5a74]">
          도착까지 <span className="text-[#4a9abb]">{countdown}</span>
        </span>
        <span className="text-[9px] font-mono text-[#4a7a94]">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  )
}

const KOREA_PATH = `
  M 78.1,2.0 L 76.0,3.1 L 75.7,7.9 L 70.5,8.1 L 66.2,12.3
  L 60.1,11.4 L 55.5,12.5 L 58.3,14.8 L 58.0,18.3 L 47.2,17.5
  L 43.3,14.0 L 39.0,16.0 L 39.3,18.1 L 33.2,22.7 L 29.5,22.7
  L 13.0,30.3 L 16.1,35.3 L 21.0,34.3 L 25.2,37.2 L 21.3,42.4
  L 22.8,44.6 L 19.7,45.0 L 15.8,49.6 L 21.0,49.8 L 19.7,51.3
  L 22.2,51.3 L 22.8,53.3 L 25.8,53.3 L 28.0,50.6 L 32.6,53.3
  L 35.9,51.5 L 35.0,55.7 L 41.7,57.6 L 39.0,59.0 L 43.3,61.3
  L 41.7,62.0 L 37.8,60.3 L 32.3,63.0 L 35.0,63.8 L 35.3,67.0
  L 35.9,63.8 L 37.8,64.0 L 40.5,71.8 L 35.0,76.6 L 35.0,78.9
  L 30.7,81.0 L 31.0,85.0 L 35.0,83.3 L 31.0,87.5 L 36.2,84.0
  L 36.2,86.5 L 43.9,86.7 L 42.7,84.8 L 46.0,82.3 L 47.2,84.0
  L 44.5,85.8 L 49.4,85.8 L 48.2,82.7 L 52.1,83.3 L 52.8,80.6
  L 54.6,83.3 L 58.3,80.6 L 64.4,83.3 L 64.7,80.0 L 62.2,80.8
  L 61.9,79.1 L 67.1,79.8 L 74.5,75.4 L 75.7,69.9 L 72.9,70.3
  L 72.9,57.8 L 61.9,48.9 L 58.0,42.4 L 49.7,39.7 L 49.4,34.3
  L 61.6,30.9 L 63.8,28.4 L 69.0,27.4 L 69.0,25.9 L 75.7,23.2
  L 75.7,14.8 L 79.0,11.2 L 86.7,9.5 L 85.5,6.4 L 83.0,6.4 Z
`

const JEJU_PATH = `
  M 32.0,96.7 L 33.5,96.9 L 33.8,97.8 L 35.3,96.9 L 37.2,97.8
  L 37.5,96.9 L 41.4,96.9 L 41.4,95.5 L 42.7,94.7 L 35.3,94.6
  L 35.0,95.3 L 34.1,95.3 Z
`

function MapPanel() {
  const from = MOCK.cities.find(c => c.name === MOCK.from)
  const to = MOCK.cities.find(c => c.name === MOCK.to)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">
        항해 지도
      </h2>

      <div
        className="relative w-full bg-[#040d16] rounded border border-[#0d2233] overflow-hidden"
        style={{ paddingBottom: '115%' }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="#040d16" />

          <defs>
            <pattern id="seagrid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#0a1f2e" strokeWidth="0.25" />
            </pattern>

            <filter id="mapGlow">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="100" height="100" fill="url(#seagrid)" opacity="0.5" />

          <g transform="translate(10 2) scale(0.78)">
            <path d={KOREA_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.65" />
            <path d={KOREA_PATH} fill="none" stroke="#4a9abb" strokeWidth="0.22" opacity="0.5" filter="url(#mapGlow)" />

            <path d={JEJU_PATH} fill="#071826" stroke="#1a3a50" strokeWidth="0.45" />
            <path d={JEJU_PATH} fill="none" stroke="#4a9abb" strokeWidth="0.18" opacity="0.45" />

            {MOCK.cities
              .filter(c => c.visited)
              .flatMap(c =>
                MOCK.cities
                  .filter(d => d.visited && d.id > c.id)
                  .map(d => (
                    <line
                      key={`${c.id}-${d.id}`}
                      x1={c.x}
                      y1={c.y}
                      x2={d.x}
                      y2={d.y}
                      stroke="#1a3a50"
                      strokeWidth="0.3"
                      opacity="0.4"
                    />
                  )),
              )}

            {from && to && (
              <>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#1a4a64"
                  strokeWidth="0.5"
                  strokeDasharray="1.5,1.5"
                  opacity="0.5"
                />

                <line
                  x1={from.x}
                  y1={from.y}
                  x2={from.x + (to.x - from.x) * MOCK.progress}
                  y2={from.y + (to.y - from.y) * MOCK.progress}
                  stroke="#4a9abb"
                  strokeWidth="0.8"
                  opacity="0.9"
                  filter="url(#mapGlow)"
                />

                <circle
                  cx={from.x + (to.x - from.x) * MOCK.progress}
                  cy={from.y + (to.y - from.y) * MOCK.progress}
                  r="1.2"
                  fill="#7eb8d4"
                >
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </>
            )}

            {MOCK.cities.map(city => {
              const isCurrent = Boolean(city.current)
              const isVisited = city.visited

              return (
                <g key={city.id}>
                  {isCurrent && (
                    <circle cx={city.x} cy={city.y} r="3" fill="none" stroke="#7eb8d4" strokeWidth="0.4" opacity="0.4">
                      <animate attributeName="r" values="2;4.5;2" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={isCurrent ? 1.4 : isVisited ? 1.1 : 0.9}
                    fill={isCurrent ? '#7eb8d4' : isVisited ? '#2a5a74' : '#0d2233'}
                    stroke={isCurrent ? '#a8d4e8' : isVisited ? '#1a4a64' : '#1a3a50'}
                    strokeWidth="0.4"
                  />

                  <text
                    x={city.x + 2}
                    y={city.y + 0.8}
                    fontSize="2.4"
                    fill={isCurrent ? '#a8d4e8' : isVisited ? '#3a6880' : '#1a3a50'}
                    fontFamily="monospace"
                  >
                    {city.name}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      <div className="flex gap-3 flex-wrap">
        {[
          { color: '#7eb8d4', label: '현재 위치' },
          { color: '#2a5a74', label: '방문' },
          { color: '#0d2233', label: '미방문' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full border border-[#1a3a50]" style={{ background: l.color }} />
            <span className="text-[8px] font-mono text-[#2a5a74]">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="text-[9px] font-mono text-[#2a5a74] text-center tracking-widest">
        {MOCK.from} → {MOCK.to} · {Math.round(MOCK.progress * 100)}% 항해 중
      </div>
    </div>
  )
}

function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')

  const startEdit = (log: LogEntry) => {
    setEditingId(log.id)
    setEditNote(log.note)
  }

  const saveEdit = (id: number) => {
    setLogs(prev => prev.map(l => (l.id === id ? { ...l, note: editNote } : l)))
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">
        항해 기록
      </h2>

      <div className="flex flex-col gap-3">
        {logs.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="border-l border-[#0d2233] pl-3 py-1.5"
          >
            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-2 items-baseline">
                <span className="text-[9px] font-mono text-[#2a5a74]">{log.date}</span>
                <span className="text-[9px] font-mono text-[#1a3a50]">
                  {log.from} → {log.to}
                </span>
              </div>

              {editingId !== log.id && (
                <button onClick={() => startEdit(log)} className="text-[8px] font-mono text-[#1a3a50] hover:text-[#4a9abb] px-1">
                  수정
                </button>
              )}
            </div>

            {editingId === log.id ? (
              <div className="flex flex-col gap-1.5 mt-1">
                <textarea
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  maxLength={100}
                  rows={2}
                  placeholder="오늘의 항해를 기록하세요..."
                  className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-2 py-1.5 text-[11px] text-[#7eb8d4] resize-none outline-none focus:border-[#2a5a74] placeholder-[#1a3a50]"
                />

                <div className="flex justify-between">
                  <span className="text-[8px] font-mono text-[#1a3a50]">{editNote.length}/100</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="text-[8px] font-mono text-[#1a3a50]">
                      취소
                    </button>
                    <button onClick={() => saveEdit(log.id)} className="text-[8px] font-mono text-[#4a9abb]">
                      저장
                    </button>
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
    </div>
  )
}

type EditMode = 'nickname' | 'password' | null

function ProfilePanel() {
  const [user, setUser] = useState(MOCK.user)
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [newNickname, setNewNickname] = useState('')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const saveNickname = () => {
    if (!newNickname.trim()) return
    setUser(u => ({ ...u, name: newNickname.trim() }))
    setEditMode(null)
    setNewNickname('')
  }

  const savePassword = () => {
    setPwError('')

    if (!pwForm.current) return setPwError('현재 비밀번호를 입력하세요')
    if (pwForm.next.length < 6) return setPwError('비밀번호는 6자 이상')
    if (pwForm.next !== pwForm.confirm) return setPwError('비밀번호가 일치하지 않습니다')

    setPwSuccess(true)

    setTimeout(() => {
      setEditMode(null)
      setPwSuccess(false)
      setPwForm({ current: '', next: '', confirm: '' })
    }, 1200)
  }

  const inputCls =
    'w-full bg-[#040d16] border border-[#1a3a50] rounded px-2.5 py-1.5 text-[11px] text-[#7eb8d4] outline-none focus:border-[#2a5a74] placeholder-[#1a3a50]'

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">
        마이 페이지
      </h2>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-[#0d2233] bg-[#050e18] flex items-center justify-center">
          ⛵
        </div>

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

        <div className="bg-[#050e18] border border-[#0d2233] rounded p-3 text-center">
          <p className="text-[18px] font-mono text-[#4a9abb]">{user.visitedCities}곳</p>
          <p className="text-[9px] font-mono text-[#2a5a74] mt-0.5">방문 도시</p>
        </div>
      </div>

      <div className="border-t border-[#0d2233]" />

      {editMode === null && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] font-mono text-[#2a5a74] tracking-widest uppercase">계정 설정</p>

          <button
            onClick={() => {
              setEditMode('nickname')
              setNewNickname(user.name)
            }}
            className="text-left px-3 py-2 bg-[#050e18] border border-[#0d2233] rounded text-[10px] font-mono text-[#3a6880] hover:border-[#1a4a64] hover:text-[#7eb8d4]"
          >
            닉네임 변경
          </button>

          <button
            onClick={() => setEditMode('password')}
            className="text-left px-3 py-2 bg-[#050e18] border border-[#0d2233] rounded text-[10px] font-mono text-[#3a6880] hover:border-[#1a4a64] hover:text-[#7eb8d4]"
          >
            비밀번호 변경
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {editMode === 'nickname' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-col gap-2">
            <p className="text-[9px] font-mono text-[#4a7a94] tracking-widest uppercase">닉네임 변경</p>

            <input
              value={newNickname}
              onChange={e => setNewNickname(e.target.value)}
              maxLength={20}
              placeholder="새 닉네임"
              className={inputCls}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditMode(null)} className="text-[8px] font-mono text-[#1a3a50]">
                취소
              </button>
              <button onClick={saveNickname} className="text-[8px] font-mono text-[#4a9abb]">
                저장
              </button>
            </div>
          </motion.div>
        )}

        {editMode === 'password' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-col gap-2">
            <p className="text-[9px] font-mono text-[#4a7a94] tracking-widest uppercase">비밀번호 변경</p>

            <input
              type="password"
              value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              placeholder="현재 비밀번호"
              className={inputCls}
            />

            <input
              type="password"
              value={pwForm.next}
              onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
              placeholder="새 비밀번호 (6자 이상)"
              className={inputCls}
            />

            <input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="새 비밀번호 확인"
              className={inputCls}
            />

            {pwError && <p className="text-[9px] font-mono text-red-400/70">{pwError}</p>}
            {pwSuccess && <p className="text-[9px] font-mono text-[#4a9abb]">변경되었습니다</p>}

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditMode(null)} className="text-[8px] font-mono text-[#1a3a50]">
                취소
              </button>
              <button onClick={savePassword} className="text-[8px] font-mono text-[#4a9abb]">
                변경
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type Panel = 'map' | 'log' | 'profile' | null

export default function HUD() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<Panel>('map')
  const [hudOpacity, setHudOpacity] = useState(0.35)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    { id: 'log', icon: '≡', label: '항해록' },
    { id: 'profile', icon: '○', label: '나' },
  ] as const

  return (
    <div className="fixed inset-0 pointer-events-none z-10" style={{ transition: 'opacity 1.5s ease', opacity: hudOpacity }}>
      <div className="absolute top-6 right-6 pointer-events-auto">
        <ProgressBar from={MOCK.from} to={MOCK.to} progress={MOCK.progress} arrivalTime={MOCK.arrivalTime} />
      </div>

      <div className="absolute bottom-6 right-6 pointer-events-auto">
        <Compass deg={MOCK.compassDeg} />
      </div>

      <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto">
        <motion.button
          onClick={() => setPanelOpen(v => !v)}
          className="flex items-center pl-2 pr-3 py-3 bg-[#050e18]/60 border-r border-t border-b border-[#0d2233] rounded-r-sm hover:bg-[#071525]/80 transition-colors duration-300 group"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.96 }}
        >
          <motion.span animate={{ rotate: panelOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="text-[10px] font-mono text-[#2a5a74] group-hover:text-[#7eb8d4]">
            ›
          </motion.span>
        </motion.button>
      </div>

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="absolute left-0 top-0 bottom-0 w-72 bg-[#050e18]/92 border-r border-[#0d2233] pointer-events-auto flex flex-col"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <div className="flex border-b border-[#0d2233]">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActivePanel(item.id)}
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
                  {activePanel === 'profile' && <ProfilePanel />}
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              onClick={() => setPanelOpen(false)}
              className="p-3 border-t border-[#0d2233] text-[9px] font-mono text-[#1a3a50] hover:text-[#2a5a74] tracking-widest uppercase transition-colors"
            >
              ‹ 닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {panelOpen && <div className="absolute inset-0 pointer-events-auto" style={{ zIndex: -1 }} onClick={() => setPanelOpen(false)} />}
    </div>
  )
}