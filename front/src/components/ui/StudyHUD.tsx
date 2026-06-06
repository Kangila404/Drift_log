import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { createPortal } from 'react-dom'
import { saveStudyTime, getStudySummary, getStudyLogs, updateStudySubject, deleteStudyLog, type StudySummary, type StudyLog } from '../../api/study'
import { noise, type NoiseKey } from '../../audio/noiseManager'


const PRESETS = [25, 50, 90]
const START_KEY = 'studyStartAt'
const GOAL_KEY = 'studyGoalMin'
const SUBJ_KEY = 'studySubject'


const emitStudyChange = () => window.dispatchEvent(new Event('study-change'))

const fmtClock = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}
const fmtSummary = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}
const fmtHM = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
const logMinutes = (l: StudyLog) =>
  Math.max(0, Math.round((new Date(l.studyEndTimeAt).getTime() - new Date(l.studyStartTimeAt).getTime()) / 60000))
const logSeconds = (l: StudyLog) =>
  Math.max(0, Math.round((new Date(l.studyEndTimeAt).getTime() - new Date(l.studyStartTimeAt).getTime()) / 1000))

const NOISES: { key: NoiseKey; label: string; icon: string }[] = [
  { key: 'rain', label: '비', icon: '☂' },
  { key: 'wave', label: '파도', icon: '≈' },
  { key: 'fire', label: '장작', icon: '✺' },
]

export default function StudyHUD() {
  const nav = useNavigate()
  const [goalMin, setGoalMin] = useState(25)
  const [subject, setSubject] = useState('')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [summary, setSummary] = useState<StudySummary>({ todaySeconds: 0, totalSeconds: 0 })
  const [saving, setSaving] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [soundOpen, setSoundOpen] = useState(false)
  const startAtRef = useRef<Date | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const refreshSummary = () => getStudySummary().then(setSummary).catch(() => {})
  useEffect(() => { refreshSummary() }, [])

  // 새로고침 복구
  useEffect(() => {
    const saved = localStorage.getItem(START_KEY)
    if (saved) {
      startAtRef.current = new Date(saved)
      setGoalMin(Number(localStorage.getItem(GOAL_KEY)) || 25)
      setSubject(localStorage.getItem(SUBJ_KEY) || '')
      setElapsed(Math.floor((Date.now() - startAtRef.current.getTime()) / 1000))
      setRunning(true)
    }
  }, [])

  // 파도 기본 — 첫 사용자 인터랙션에 확실히 재생 (자동재생 정책 회피)
  useEffect(() => {
    noise.select('wave') // 시도 (대개 막힘)
    const kick = () => {
      if (!noise.getCurrent()) noise.select('wave')
      else if (noise.getCurrent()) noise.select(noise.getCurrent()) // 이미 current면 play 재시도
      cleanup()
    }
    const cleanup = () => {
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
      window.removeEventListener('click', kick)
    }
    window.addEventListener('pointerdown', kick)
    window.addEventListener('keydown', kick)
    window.addEventListener('click', kick)
    return cleanup
  }, [])

    useEffect(() => {
    if (!running || !startAtRef.current) return
    const id = setInterval(() => {
      const e = Math.floor((Date.now() - startAtRef.current!.getTime()) / 1000)
      setElapsed(e)
      if (e >= goalMin * 60) {
        clearInterval(id) 
        finish()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [running, goalMin])

  const startSession = () => {
    const now = new Date()
    startAtRef.current = now
    localStorage.setItem(START_KEY, now.toISOString())
    localStorage.setItem(GOAL_KEY, String(goalMin))
    localStorage.setItem(SUBJ_KEY, subject)
    setElapsed(0)
    setRunning(true)
    setSetupOpen(false)
    emitStudyChange()
  }

  const finish = async () => {
    if (saving || !startAtRef.current) return
    const start = startAtRef.current
    startAtRef.current = null
    setRunning(false)
    try {
      await saveStudyTime(start, new Date(), subject)
      await refreshSummary()
    } catch (e) {
      console.error('공부 기록 저장 실패:', e)
    } finally {
      localStorage.removeItem(START_KEY)
      localStorage.removeItem(GOAL_KEY)
      localStorage.removeItem(SUBJ_KEY)
      setElapsed(0)
      setSubject('')
      setSaving(false)
      
    }
  }
  
  const confirmFinish = () => {
  setConfirmOpen(false)
  finish()
}

  

  const leaveStudy = () => {
    if (running && !window.confirm('진행 중인 공부가 저장되지 않습니다. 나가시겠습니까?')) return
    nav('/')
  }

  const handleLogout = async () => {
    if (running && !window.confirm('진행 중인 공부가 저장되지 않습니다. 로그아웃하시겠습니까?')) return
    if (!window.confirm('로그아웃 하시겠습니까?')) return
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) {
        const { apiClient } = await import('../../api/client')
        await apiClient.post('/auth/logout', { refreshToken })
      }
    } catch (e) {
      console.error('로그아웃 요청 실패:', e)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
  }

  const liveToday = summary.todaySeconds + (running ? elapsed : 0)
  const progress = running ? Math.min(1, elapsed / (goalMin * 60)) : 0

  return (
    <>
      {/* ── 우상단: 음악 아이콘 (소리 선택 + 뮤트) ── */}
      <div className="fixed top-6 right-6 z-10 pointer-events-auto">
        <SoundButton open={soundOpen} setOpen={setSoundOpen} />
      </div>

      {/* ── 하단 가로 긴 바: 오늘 공부량 + 타이머 + 버튼 ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-auto w-[min(92vw,640px)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-6 py-3.5 rounded-2xl"
          style={{ background: 'rgba(5,14,24,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(26,74,100,0.45)' }}>

          {/* 위(모바일)/왼쪽(데스크탑): 오늘 공부량 + 타이머 */}
          <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
            <div className="flex flex-col shrink-0">
              <p className="text-[14px] font-mono text-[#a8d4e8] tabular-nums leading-none">{fmtSummary(liveToday)}</p>
              <p className="text-[8px] font-mono text-[#2a5a74] tracking-[0.25em] uppercase mt-1">오늘 공부량</p>
            </div>
            <div className="w-px self-stretch bg-[#1a3a50]/50" />
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[26px] sm:text-[28px] font-mono text-[#cce8f5] tabular-nums tracking-wider leading-none shrink-0">{fmtClock(elapsed)}</p>
                {running && <span className="text-[10px] font-mono text-[#4a7a94] truncate">{subject || '공부 중'} · 목표 {goalMin}분</span>}
              </div>
              {running && (
                <div className="relative h-[3px] bg-[#0d2233] rounded-full overflow-hidden">
                  <motion.div className="absolute top-0 left-0 h-full bg-[#4a9abb] rounded-full"
                    animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                </div>
              )}
            </div>
          </div>

          {/* 아래(모바일)/오른쪽(데스크탑): 버튼 */}
          {!running ? (
            <button onClick={() => setSetupOpen(true)}
              className="w-full sm:w-auto shrink-0 px-8 py-2.5 border border-[#4a9abb]/50 rounded-lg text-[13px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-[0.25em] uppercase transition-colors">
              시작
            </button>
          ) : (
            <button onClick={() => setConfirmOpen(true)} disabled={saving}
              className="w-full sm:w-auto shrink-0 px-6 py-2.5 border border-[#1a4a64]/60 rounded-lg text-[13px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 tracking-[0.15em] uppercase transition-colors disabled:opacity-40 whitespace-nowrap">
              {saving ? '저장 중' : '종료 및 저장'}
            </button>
          )}
        </div>
      </div>

      {/* ── 좌측 패널 열기 버튼 ── */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-auto">
        <motion.button onClick={() => setPanelOpen(true)}
          className="flex items-center gap-1 pl-3 pr-4 py-5 bg-[#050e18]/70 border-r border-t border-b border-[#1a4a64]/50 rounded-r-lg hover:bg-[#071525]/90 hover:border-[#4a9abb]/50 transition-colors group"
          whileHover={{ x: 3 }} whileTap={{ scale: 0.96 }}>
          <span className="text-[18px] text-[#7eb8d4] group-hover:text-[#cce8f5] transition-colors">≡</span>
          <span className="text-[10px] font-mono text-[#4a7a94] group-hover:text-[#7eb8d4] tracking-widest [writing-mode:vertical-rl] mt-1">일지</span>
        </motion.button>
      </div>

      {/* ── 좌측 슬라이드 패널 (공부일지만) ── */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPanelOpen(false)}
              className="fixed inset-0 z-20 pointer-events-auto" style={{ background: 'rgba(2,6,14,0.4)' }} />

            <motion.div initial={{ x: -340 }} animate={{ x: 0 }} exit={{ x: -340 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-[#050e18]/95 border-r border-[#0d2233] z-30 pointer-events-auto flex flex-col"
              style={{ backdropFilter: 'blur(8px)' }}>
              {/* 헤더 — 제목 + 닫기(좌측 화살표 형태로 자연스럽게) */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#0d2233]">
                <span className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase">공부일지</span>
                <button onClick={() => setPanelOpen(false)}
                  className="flex items-center gap-1 text-[10px] font-mono text-[#3a6880] hover:text-[#cce8f5] tracking-widest uppercase transition-colors">
                  닫기 ›
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'none' }}>
                <LogTab totalSeconds={summary.totalSeconds} onChanged={refreshSummary} />
              </div>

              <div className="p-4">
                <button onClick={handleLogout}
                  className="w-full py-2.5 border border-[#1a3a50] rounded text-[10px] font-mono text-[#3a6880] hover:text-red-300 hover:border-red-500/50 tracking-widest transition-colors text-center">
                  ⏻ 로그아웃
                </button>
              </div>
              <button onClick={leaveStudy}
                className="p-3.5 border-t border-[#0d2233] text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors text-center">
                ‹ 모드 선택으로
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 목표 설정 모달 ── */}
      {createPortal(
        <AnimatePresence>
          {setupOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSetupOpen(false)}
              className="fixed inset-0 z-[9999] flex items-center justify-center px-6 cursor-pointer"
              style={{ background: 'rgba(2,6,14,0.85)', backdropFilter: 'blur(8px)' }}>
              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="w-full max-w-sm bg-[#050e18] border border-[#1a4a64]/50 rounded-2xl p-7 flex flex-col gap-6 cursor-default">
                <p className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase text-center">공부 설정</p>
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[36px] font-mono text-[#cce8f5] tabular-nums leading-none">
                    {goalMin}<span className="text-[14px] text-[#4a7a94] ml-1">분</span>
                  </p>
                  <input type="range" min={5} max={180} step={5} value={goalMin}
                    onChange={e => setGoalMin(Number(e.target.value))}
                    className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
                    style={{ background: `linear-gradient(to right, #4a9abb ${((goalMin - 5) / 175) * 100}%, #0d2233 0%)` }} />
                  <div className="flex gap-2">
                    {PRESETS.map(g => (
                      <button key={g} onClick={() => setGoalMin(g)}
                        className={`px-4 py-1.5 rounded border text-[11px] font-mono tracking-widest transition-colors ${
                          goalMin === g ? 'border-[#4a9abb]/70 text-[#cce8f5] bg-[#0a2233]/60'
                            : 'border-[#1a4a64]/40 text-[#3a6880] hover:text-[#7eb8d4]'
                        }`}>{g}분</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[9px] font-mono text-[#2a5a74] tracking-widest uppercase">무슨 공부 (선택)</p>
                  <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={40}
                    placeholder="예: 알고리즘 복습"
                    className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-3 py-2 text-[13px] text-[#cce8f5] outline-none focus:border-[#4a9abb]/60 placeholder-[#1a3a50]" />
                </div>
                <button onClick={startSession}
                  className="py-3 border border-[#4a9abb]/50 rounded-lg text-[13px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-[0.3em] uppercase transition-colors">
                  시작하기
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {/* ── 종료 확인 모달 ── */}
      {createPortal(
        <AnimatePresence>
          {confirmOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmOpen(false)}
              className="fixed inset-0 z-[9999] flex items-center justify-center px-6 cursor-pointer"
              style={{ background: 'rgba(2,6,14,0.85)', backdropFilter: 'blur(8px)' }}>
              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="w-full max-w-xs bg-[#050e18] border border-[#1a4a64]/50 rounded-2xl p-7 flex flex-col gap-6 cursor-default">
                <div className="flex flex-col items-center gap-2.5">
                  <p className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase">공부 종료</p>
                  <p className="text-[32px] font-mono text-[#cce8f5] tabular-nums leading-none">{fmtClock(elapsed)}</p>
                  <p className="text-[12px] font-mono text-[#4a7a94] text-center">
                    {subject || '이번 공부'} 기록을 저장하고 종료할까요?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmOpen(false)}
                    className="flex-1 py-2.5 border border-[#1a3a50] rounded-lg text-[12px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#1a4a64] tracking-[0.2em] uppercase transition-colors">
                    취소
                  </button>
                  <button onClick={confirmFinish} disabled={saving}
                    className="flex-1 py-2.5 border border-[#4a9abb]/50 rounded-lg text-[12px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-[0.2em] uppercase transition-colors disabled:opacity-40">
                    확인
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// ─── 음악 아이콘 + 팝오버 (소리 선택 + 뮤트) ───
function SoundButton({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [current, setCurrent] = useState<NoiseKey | null>(noise.getCurrent())
  const [muted, setMuted] = useState(noise.isMuted())


  const pick = (key: NoiseKey) => { noise.select(key); setCurrent(noise.getCurrent()) }
  const off = () => { noise.select(null); setCurrent(null) }
  const toggleMute = () => setMuted(noise.toggleMute())
  

  return (
    <div className="relative">
      <motion.button onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}
        className={`w-12 h-12 rounded-full border flex items-center justify-center backdrop-blur-md transition-colors ${
          open ? 'border-[#7eb8d4]/70 text-[#cce8f5] bg-[#0a2233]/70' : 'border-[#1a4a64]/60 text-[#7eb8d4]/80 bg-[#050e18]/60 hover:text-[#cce8f5] hover:border-[#7eb8d4]/60'
        }`}
        aria-label="소리">
        <span className="text-[18px]">♫</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* 바깥 클릭 닫기 */}
            <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute top-14 right-0 w-56 bg-[#050e18]/95 border border-[#1a4a64]/50 rounded-xl p-3 flex flex-col gap-2"
              style={{ backdropFilter: 'blur(10px)' }}>
              <div className="flex justify-between items-center px-1 pb-1">
                <span className="text-[10px] font-mono text-[#7eb8d4] tracking-widest uppercase">백색소음</span>
                <button onClick={toggleMute}
                  className={`text-[9px] font-mono tracking-widest uppercase transition-colors ${muted ? 'text-[#4a9abb]' : 'text-[#3a6880] hover:text-[#7eb8d4]'}`}>
                  {muted ? '🔇 음소거' : '🔊 소리'}
                </button>
              </div>

              {NOISES.map(n => {
                const active = current === n.key
                return (
                  <button key={n.key} onClick={() => pick(n.key)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      active ? 'border-[#4a9abb]/70 bg-[#0a2233]/70' : 'border-[#1a4a64]/40 hover:border-[#4a9abb]/50'
                    }`}>
                    <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-[14px] shrink-0 ${
                      active ? 'border-[#7eb8d4]/70 text-[#cce8f5]' : 'border-[#1a4a64]/60 text-[#7eb8d4]/70'
                    }`}>{n.icon}</span>
                    <span className={`text-[12px] font-mono tracking-widest ${active ? 'text-[#cce8f5]' : 'text-[#4a7a94]'}`}>{n.label}</span>
                    {active && !muted && <span className="ml-auto text-[9px] font-mono text-[#4a9abb]">재생</span>}
                  </button>
                )
              })}

              <button onClick={off}
                className={`py-2 rounded-lg border text-[10px] font-mono tracking-widest uppercase transition-colors ${
                  current === null ? 'border-[#4a9abb]/60 text-[#cce8f5]' : 'border-[#1a4a64]/40 text-[#3a6880] hover:text-[#7eb8d4]'
                }`}>
                소리 끄기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── 공부일지 탭 ───
function LogTab({ totalSeconds, onChanged }: { totalSeconds: number; onChanged: () => void }) {
  const [logs, setLogs] = useState<StudyLog[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<StudyLog | null>(null)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({})

  const load = () => getStudyLogs().then(l => { setLogs(l); setLoaded(true) }).catch(() => setLoaded(true))
  useEffect(() => { load() }, [])

  const openDetail = (l: StudyLog) => { setSelected(l); setEditing(false); setEditVal(l.subject ?? '') }
  const closeDetail = () => { setSelected(null); setEditing(false) }

  const saveEdit = async () => {
    if (!selected || busy) return
    setBusy(true)
    try {
      await updateStudySubject(selected.id, editVal)
      const next = editVal.trim() || null
      setLogs(prev => prev.map(l => l.id === selected.id ? { ...l, subject: next } : l))
      setSelected(prev => prev ? { ...prev, subject: next } : prev)
      setEditing(false)
    } catch (e) { console.error('수정 실패:', e) }
    finally { setBusy(false) }
  }

  // 상세 모달용 삭제 (확인창)
  const remove = async () => {
    if (!selected || busy || !window.confirm('이 기록을 삭제할까요?')) return
    setBusy(true)
    try {
      await deleteStudyLog(selected.id)
      setLogs(prev => prev.filter(l => l.id !== selected.id))
      closeDetail()
      onChanged()
    } catch (e) { console.error('삭제 실패:', e) }
    finally { setBusy(false) }
  }

  // 스와이프 삭제 — 확인 후 삭제(낙관적 업데이트). 취소 시 false 반환 → 항목 제자리 복귀
  const removeById = async (id: number): Promise<boolean> => {
    if (!window.confirm('이 기록을 삭제할까요?')) return false
    const target = logs.find(l => l.id === id)
    setLogs(prev => prev.filter(l => l.id !== id))
    onChanged()
    try {
      await deleteStudyLog(id)
    } catch (e) {
      console.error('삭제 실패:', e)
      if (target) setLogs(prev => [...prev, target]) // 실패 시 복구
      onChanged()
    }
    return true
  }

  const sorted = [...logs].sort((a, b) =>
    new Date(b.studyStartTimeAt).getTime() - new Date(a.studyStartTimeAt).getTime())

  const monthGroups = (() => {
    const mMap = new Map<string, StudyLog[]>()
    for (const l of sorted) {
      const d = new Date(l.studyStartTimeAt)
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!mMap.has(mKey)) mMap.set(mKey, [])
      mMap.get(mKey)!.push(l)
    }
    return Array.from(mMap.entries()).map(([mKey, mLogs]) => {
      const [y, m] = mKey.split('-')
      const dMap = new Map<string, StudyLog[]>()
      for (const l of mLogs) {
        const d = new Date(l.studyStartTimeAt)
        const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (!dMap.has(dKey)) dMap.set(dKey, [])
        dMap.get(dKey)!.push(l)
      }
      const days = Array.from(dMap.entries()).map(([dKey, dLogs]) => ({
        dKey, label: `${Number(dKey.split('-')[2])}일`,
        logs: dLogs, totalSec: dLogs.reduce((s, l) => s + logSeconds(l), 0),
      }))
      return { mKey, label: `${y}년 ${Number(m)}월`, days, totalSec: mLogs.reduce((s, l) => s + logSeconds(l), 0) }
    })
  })()

  // 월: 첫 달만 펼침 / 일: 기본 펼침
  const isCollapsed = (key: string, idx: number) => collapsedMonths[key] ?? idx !== 0
  const toggleMonth = (key: string, idx: number) =>
    setCollapsedMonths(prev => ({ ...prev, [key]: !(prev[key] ?? idx !== 0) }))
  const isCollapsedDay = (key: string) => collapsedDays[key] ?? false
  const toggleDay = (key: string) =>
    setCollapsedDays(prev => ({ ...prev, [key]: !(prev[key] ?? false) }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1 py-4 rounded-xl border border-[#1a4a64]/40 bg-[#071826]/40">
        <p className="text-[22px] font-mono text-[#cce8f5] tabular-nums leading-none">{fmtSummary(totalSeconds)}</p>
        <p className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">총 공부량</p>
      </div>

      {loaded && logs.length === 0 && <p className="text-[10px] text-[#1a3a50] italic mt-1">— 아직 기록이 없습니다</p>}

      {monthGroups.map((mg, mIdx) => {
        const collapsed = isCollapsed(mg.mKey, mIdx)
        return (
          <div key={mg.mKey} className="flex flex-col">
            <button onClick={() => toggleMonth(mg.mKey, mIdx)}
              className="flex items-center justify-between py-2 px-1 border-b border-[#0d2233] hover:border-[#1a4a64] transition-colors group">
              <span className="text-[10px] font-mono text-[#4a7a94] group-hover:text-[#7eb8d4] tracking-widest">{mg.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#4a9abb]">월간 공부량 {fmtSummary(mg.totalSec)}</span>
                <motion.span animate={{ rotate: collapsed ? 0 : 90 }} transition={{ duration: 0.2 }}
                  className="text-[9px] font-mono text-[#2a5a74] group-hover:text-[#7eb8d4]">›</motion.span>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                  <div className="flex flex-col gap-3 pt-3">
                    {mg.days.map(day => {
                      const dayCollapsed = isCollapsedDay(day.dKey)
                      return (
                        <div key={day.dKey} className="flex flex-col gap-1.5">
                          <button onClick={() => toggleDay(day.dKey)}
                            className="flex justify-between items-baseline px-1 py-0.5 rounded hover:bg-[#071826]/40 transition-colors group">
                            <span className="flex items-center gap-1.5">
                              <motion.span animate={{ rotate: dayCollapsed ? 0 : 90 }} transition={{ duration: 0.2 }}
                                className="text-[8px] font-mono text-[#2a5a74] group-hover:text-[#7eb8d4]">›</motion.span>
                              <span className="text-[9px] font-mono text-[#3a6880] group-hover:text-[#7eb8d4] tracking-widest">{day.label}</span>
                            </span>
                            <span className="text-[9px] font-mono text-[#2a5a74]">일간 공부량 {fmtSummary(day.totalSec)}</span>
                          </button>

                          <AnimatePresence initial={false}>
                            {!dayCollapsed && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: 'easeInOut' }} className="overflow-hidden">
                                <div className="flex flex-col gap-1.5">
                                  <AnimatePresence initial={false}>
                                    {day.logs.map((l, i) => (
                                      <SwipeLog key={l.id} log={l} index={i}
                                        onOpen={() => openDetail(l)}
                                        onDelete={() => removeById(l.id)} />
                                    ))}
                                  </AnimatePresence>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {createPortal(
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={closeDetail}
              className="fixed inset-0 z-[9999] flex items-center justify-center px-6 cursor-pointer"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(8px)' }}>
              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="w-full max-w-sm bg-[#050e18] border border-[#1a4a64]/50 rounded-2xl p-6 flex flex-col gap-5 cursor-default">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">{fmtDate(selected.studyStartTimeAt)}</p>
                    <h3 className="mt-1 text-[18px] font-mono text-[#cce8f5]">{fmtHM(selected.studyStartTimeAt)} ~ {fmtHM(selected.studyEndTimeAt)}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-mono text-[#4a9abb] tabular-nums">{logMinutes(selected)}분</p>
                    <p className="text-[8px] font-mono text-[#2a5a74] tracking-widest uppercase">공부 시간</p>
                  </div>
                </div>
                <div className="border-t border-[#0d2233]" />
                <div className="flex flex-col gap-2">
                  <p className="text-[8px] font-mono text-[#2a5a74] tracking-widest uppercase">무슨 공부</p>
                  {editing ? (
                    <div className="flex flex-col gap-2">
                      <input value={editVal} onChange={e => setEditVal(e.target.value)} maxLength={40} autoFocus
                        placeholder="예: 알고리즘 복습"
                        className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-3 py-2.5 text-[14px] text-[#cce8f5] outline-none focus:border-[#4a9abb]/60 placeholder-[#1a3a50]" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase">취소</button>
                        <button onClick={saveEdit} disabled={busy}
                          className="px-4 py-1.5 border border-[#4a9abb]/50 rounded text-[10px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-widest uppercase disabled:opacity-40">
                          {busy ? '저장 중' : '저장'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditing(true); setEditVal(selected.subject ?? '') }}
                      className="w-full text-left rounded-lg border border-[#1a4a64]/40 hover:border-[#4a9abb]/60 hover:bg-[#071826]/50 px-4 py-4 transition-colors cursor-text min-h-[64px] flex items-center">
                      {selected.subject ? (
                        <p className="text-[15px] text-[#cce8f5] font-light">{selected.subject}</p>
                      ) : (
                        <p className="text-[12px] text-[#1a3a50] italic">눌러서 무슨 공부였는지 적어보세요</p>
                      )}
                    </button>
                  )}
                </div>
                <div className="border-t border-[#0d2233]" />
                <div className="flex justify-between items-center">
                  <button onClick={remove} disabled={busy}
                    className="px-4 py-2 text-[10px] font-mono text-[#3a6880] hover:text-red-300 tracking-widest uppercase transition-colors disabled:opacity-40">삭제</button>
                  <button onClick={closeDetail}
                    className="px-5 py-2 border border-[#1a3a50] rounded text-[10px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#4a9abb]/50 tracking-widest uppercase transition-colors">닫기</button>
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

// ─── 스와이프로 삭제되는 로그 항목 ───
function SwipeLog({ log, index, onOpen, onDelete }: {
  log: StudyLog; index: number; onOpen: () => void; onDelete: () => Promise<boolean>
}) {
  const x = useMotionValue(0)
  const bgOpacity = useTransform(x, [-90, -25, 0], [1, 0.35, 0])
  const iconScale = useTransform(x, [-90, -45], [1, 0.5])
  const draggedRef = useRef(false)

  const snapBack = () => animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 })

  return (
    <motion.div className="relative" layout
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      exit={{ height: 0, opacity: 0, marginTop: 0, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.03 }}>
      {/* 뒤에 드러나는 삭제 배경 */}
      <motion.div style={{ opacity: bgOpacity }}
        className="absolute inset-0 flex items-center justify-end pr-4 rounded-r bg-red-950/40 pointer-events-none">
        <motion.span style={{ scale: iconScale }}
          className="text-[10px] font-mono text-red-300/90 tracking-widest">삭제 ✕</motion.span>
      </motion.div>

      <motion.button
        drag="x"
        dragConstraints={{ left: -110, right: 0 }}
        dragElastic={0.15}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => { draggedRef.current = true }}
        onDragEnd={async (_, info) => {
          if (info.offset.x < -90 || info.velocity.x < -600) {
            const ok = await onDelete()   // confirm 포함
            if (!ok) snapBack()           // 취소하면 제자리로
          } else {
            snapBack()                    // 덜 밀었으면 제자리로
          }
          setTimeout(() => { draggedRef.current = false }, 60)
        }}
        onClick={() => { if (!draggedRef.current) onOpen() }}
        className="relative w-full text-left border-l border-[#0d2233] hover:border-[#4a9abb]/60 pl-3 pr-2 py-2 rounded-r transition-colors group cursor-pointer bg-[#050e18]">
        <div className="flex justify-between items-center">
          <p className="text-[11px] font-mono text-[#7eb8d4]">{fmtHM(log.studyStartTimeAt)} ~ {fmtHM(log.studyEndTimeAt)}</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[#4a9abb]">{logMinutes(log)}분</span>
            <span className="text-[11px] font-mono text-[#1a3a50] group-hover:text-[#4a9abb] transition-colors">›</span>
          </div>
        </div>
        <p className={`text-[11px] font-light mt-0.5 line-clamp-1 ${log.subject ? 'text-[#4a7a94]' : 'text-[#1a3a50] italic'}`}>
          {log.subject || '내용을 추가하려면 눌러주세요'}
        </p>
      </motion.button>
    </motion.div>
  )
}