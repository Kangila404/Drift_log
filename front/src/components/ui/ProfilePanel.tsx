// src/components/ui/ProfilePanel.tsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../../api/client'
import CustomerCenter from '../CustomerCenter'

type EditMode = 'nickname' | 'password'

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

const KOREA_PATH = `M 78.1,2.0 L 76.0,3.1 L 75.7,7.9 L 70.5,8.1 L 66.2,12.3 L 60.1,11.4 L 55.5,12.5 L 58.3,14.8 L 58.0,18.3 L 47.2,17.5 L 43.3,14.0 L 39.0,16.0 L 39.3,18.1 L 33.2,22.7 L 29.5,22.7 L 13.0,30.3 L 16.1,35.3 L 21.0,34.3 L 25.2,37.2 L 21.3,42.4 L 22.8,44.6 L 19.7,45.0 L 15.8,49.6 L 21.0,49.8 L 19.7,51.3 L 22.2,51.3 L 22.8,53.3 L 25.8,53.3 L 28.0,50.6 L 32.6,53.3 L 35.9,51.5 L 35.0,55.7 L 41.7,57.6 L 39.0,59.0 L 43.3,61.3 L 41.7,62.0 L 37.8,60.3 L 32.3,63.0 L 35.0,63.8 L 35.3,67.0 L 35.9,63.8 L 37.8,64.0 L 40.5,71.8 L 35.0,76.6 L 35.0,78.9 L 30.7,81.0 L 31.0,85.0 L 35.0,83.3 L 31.0,87.5 L 36.2,84.0 L 36.2,86.5 L 43.9,86.7 L 42.7,84.8 L 46.0,82.3 L 47.2,84.0 L 44.5,85.8 L 49.4,85.8 L 48.2,82.7 L 52.1,83.3 L 52.8,80.6 L 54.6,83.3 L 58.3,80.6 L 64.4,83.3 L 64.7,80.0 L 62.2,80.8 L 61.9,79.1 L 67.1,79.8 L 74.5,75.4 L 75.7,69.9 L 72.9,70.3 L 72.9,57.8 L 61.9,48.9 L 58.0,42.4 L 49.7,39.7 L 49.4,34.3 L 61.6,30.9 L 63.8,28.4 L 69.0,27.4 L 69.0,25.9 L 75.7,23.2 L 75.7,14.8 L 79.0,11.2 L 86.7,9.5 L 85.5,6.4 L 83.0,6.4 Z`
const JEJU_PATH = `M 32.0,96.7 L 33.5,96.9 L 33.8,97.8 L 35.3,96.9 L 37.2,97.8 L 37.5,96.9 L 41.4,96.9 L 41.4,95.5 L 42.7,94.7 L 35.3,94.6 L 35.0,95.3 L 34.1,95.3 Z`

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

export default function ProfilePanel() {
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
    // 진행 중 공부 세션도 함께 폐기 (study 모드에서 로그아웃 시 부활 방지)
    localStorage.removeItem('studyStartAt')
    localStorage.removeItem('studyGoalMin')
    localStorage.removeItem('studySubject')
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) await apiClient.post('/auth/logout', { refreshToken })
    } catch (e) {
      console.error('로그아웃 요청 실패:', e)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
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