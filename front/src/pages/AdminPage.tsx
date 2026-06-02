import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../api/client'

// ─── 타입 ──────────────────────────────────────────────
type Feedback = { userName: string; content: string; createdAt: string }
type Dashboard = { totalUser: number; todayUser: number; clearUser: number; feedbackList: Feedback[] }
type UserRow = { userId: string; email: string; name: string; userRole: string; userStatus: string }
type VoyageLogInfo = { fromCity: string; toCity: string; autoText: string; userText: string | null; weatherTheme: string }
type UserDetail = {
  userId: string; email: string; name: string; authType: string
  userRole: string; userStatus: string; lastLoginAt: string | null
  isStoryClear: boolean; endingFeedback: string | null; voyageLogInfo: VoyageLogInfo[]
}

const fmtDate = (s: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ─── 통계 카드 ──────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-[#050e18] border border-[#0d2233] rounded-lg p-6 flex flex-col gap-2">
      <span className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">{label}</span>
      <span className={`font-mono text-[32px] ${accent ? 'text-[#4a9abb]' : 'text-[#a8d4e8]'}`}>{value}</span>
    </div>
  )
}

// ─── 대시보드 탭 ────────────────────────────────────────
function DashboardTab() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    apiClient.get('/admin/dashboard').then(r => setData(r.data)).catch(() => setErr(true))
  }, [])

  if (err) return <p className="text-[11px] font-mono text-red-400/60">대시보드를 불러오지 못했습니다.</p>
  if (!data) return <p className="text-[11px] font-mono text-[#2a5a74] animate-pulse">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="총 유저" value={data.totalUser} accent />
        <StatCard label="오늘 가입" value={data.todayUser} />
        <StatCard label="엔딩 도달" value={data.clearUser} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase opacity-70">엔딩 피드백</h3>
        {data.feedbackList.length === 0 ? (
          <p className="text-[10px] font-mono text-[#1a3a50] italic">— 아직 피드백이 없습니다</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.feedbackList.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="border border-[#0d2233] rounded p-4 bg-[#050e18]/60"
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] font-mono text-[#7eb8d4] tracking-widest">{f.userName}</span>
                  <span className="text-[9px] font-mono text-[#2a5a74]">{fmtDate(f.createdAt)}</span>
                </div>
                <p className="text-[12px] text-[#4a7a94] font-light leading-relaxed whitespace-pre-line">{f.content}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 유저 목록 탭 ───────────────────────────────────────
function UserTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [err, setErr] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    apiClient.get('/admin/user').then(r => setUsers(r.data)).catch(() => setErr(true))
  }
  useEffect(load, [])

  const toggleStatus = async (u: UserRow) => {
    if (busyId) return
    const willBan = u.userStatus === 'ACTIVE'
    const action = willBan ? '정지' : '활성화'
    if (!window.confirm(`${u.name}(${u.email}) 계정을 ${action}하시겠습니까?`)) return

    setBusyId(u.userId)
    try {
      await apiClient.patch(`/admin/user/${u.userId}/${willBan ? 'ban' : 'activation'}`)
      setUsers(prev => prev.map(x =>
        x.userId === u.userId ? { ...x, userStatus: willBan ? 'SUSPENDED' : 'ACTIVE' } : x
      ))
    } catch {
      alert(`${action} 처리에 실패했습니다.`)
    } finally {
      setBusyId(null)
    }
  }

  if (err) return <p className="text-[11px] font-mono text-red-400/60">유저 목록을 불러오지 못했습니다.</p>

  return (
    <div className="flex flex-col gap-2">
      {/* 헤더 */}
      <div className="grid grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.9fr] gap-3 px-3 py-2 text-[9px] font-mono text-[#2a5a74] tracking-widest uppercase border-b border-[#0d2233]">
        <span>이름</span><span>이메일</span><span>권한</span><span>상태</span><span className="text-right">관리</span>
      </div>

      {users.map((u, i) => {
        const suspended = u.userStatus === 'SUSPENDED'
        return (
          <motion.div
            key={u.userId}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="grid grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.9fr] gap-3 px-3 py-3 items-center border-b border-[#0d2233]/50 hover:bg-[#071525]/40 transition-colors"
          >
            <button onClick={() => setSelectedId(u.userId)} className="text-left text-[11px] font-mono text-[#a8d4e8] hover:text-[#cce8f5] truncate">
              {u.name}
            </button>
            <span className="text-[10px] font-mono text-[#4a7a94] truncate">{u.email}</span>
            <span className={`text-[9px] font-mono tracking-widest ${u.userRole === 'ADMIN' ? 'text-[#4a9abb]' : 'text-[#2a5a74]'}`}>
              {u.userRole}
            </span>
            <span className={`text-[9px] font-mono tracking-widest ${suspended ? 'text-red-400/70' : 'text-[#3a8a6a]'}`}>
              {suspended ? '정지' : '활성'}
            </span>
            <div className="flex justify-end">
              {u.userRole === 'ADMIN' ? (
                <span className="text-[9px] font-mono text-[#1a3a50]">—</span>
              ) : (
                <button
                  onClick={() => toggleStatus(u)}
                  disabled={busyId === u.userId}
                  className={`px-3 py-1 rounded text-[9px] font-mono tracking-widest border transition-colors disabled:opacity-40 ${
                    suspended
                      ? 'border-[#1a4a64]/60 text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70'
                      : 'border-red-900/50 text-red-400/70 hover:text-red-300 hover:border-red-500/60'
                  }`}
                >
                  {suspended ? '활성화' : '정지'}
                </button>
              )}
            </div>
          </motion.div>
        )
      })}

      {selectedId && <UserDetailModal userId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

// ─── 유저 상세 모달 ─────────────────────────────────────
function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    apiClient.get(`/admin/user/${userId}`).then(r => setDetail(r.data)).catch(() => setErr(true))
  }, [userId])

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-6 cursor-pointer"
        style={{ background: 'rgba(2,6,14,0.85)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#050e18] border border-[#1a4a64]/50 rounded-lg p-7 flex flex-col gap-6 cursor-default"
          style={{ scrollbarWidth: 'none' }}
        >
          {err && <p className="text-[11px] font-mono text-red-400/60">상세 정보를 불러오지 못했습니다.</p>}
          {!detail && !err && <p className="text-[11px] font-mono text-[#2a5a74] animate-pulse">불러오는 중...</p>}

          {detail && (
            <>
              {/* 계정 정보 */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-[16px] font-serif text-[#a8d4e8] tracking-wider">{detail.name}</h3>
                  <span className={`text-[9px] font-mono tracking-widest ${detail.userStatus === 'SUSPENDED' ? 'text-red-400/70' : 'text-[#3a8a6a]'}`}>
                    {detail.userStatus === 'SUSPENDED' ? '정지됨' : '활성'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] font-mono">
                  <Field label="이메일" value={detail.email} />
                  <Field label="권한" value={detail.userRole} />
                  <Field label="가입 유형" value={detail.authType} />
                  <Field label="최근 로그인" value={fmtDate(detail.lastLoginAt)} />
                  <Field label="엔딩 도달" value={detail.isStoryClear ? '완료' : '미완료'} />
                </div>
              </div>

              {/* 엔딩 피드백 */}
              {detail.endingFeedback && (
                <div className="flex flex-col gap-2 border-t border-[#0d2233] pt-5">
                  <span className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">엔딩 피드백</span>
                  <p className="text-[12px] text-[#4a7a94] font-light leading-relaxed whitespace-pre-line">{detail.endingFeedback}</p>
                </div>
              )}

              {/* 항해 기록 */}
              <div className="flex flex-col gap-3 border-t border-[#0d2233] pt-5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">항해 기록</span>
                  <span className="text-[9px] font-mono text-[#1a3a50]">{detail.voyageLogInfo.length}건</span>
                </div>
                {detail.voyageLogInfo.length === 0 ? (
                  <p className="text-[10px] font-mono text-[#1a3a50] italic">— 항해 기록 없음</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {detail.voyageLogInfo.map((v, i) => (
                      <div key={i} className="border-l border-[#0d2233] pl-3 py-1">
                        <div className="flex gap-2 items-baseline mb-1">
                          <span className="text-[9px] font-mono text-[#3a6880]">{v.fromCity} → {v.toCity}</span>
                          <span className="text-[8px] font-mono text-[#1a3a50]">· {v.weatherTheme}</span>
                        </div>
                        <p className="text-[10px] text-[#2a5a74]">{v.autoText}</p>
                        {v.userText && <p className="text-[10px] text-[#4a7a94] font-light mt-0.5">“{v.userText}”</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={onClose} className="mt-1 py-2 border border-[#1a3a50] rounded text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/50 tracking-widest uppercase transition-colors">
                닫기
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] text-[#1a3a50] tracking-widest uppercase">{label}</span>
      <span className="text-[#7eb8d4] truncate">{value}</span>
    </div>
  )
}

// ─── 메인 ──────────────────────────────────────────────
type Tab = 'dashboard' | 'users'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="w-full min-h-screen bg-[#040d16] text-[#a8d4e8] px-6 sm:px-12 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex justify-between items-baseline">
          <h1 className="text-[14px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase">DriftLog · Admin</h1>
          <a href="/" className="text-[10px] font-mono text-[#2a5a74] hover:text-[#7eb8d4] tracking-widest transition-colors">← 항해로</a>
        </div>

        <div className="flex gap-1 border-b border-[#0d2233]">
          {([['dashboard', '대시보드'], ['users', '유저 관리']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-5 py-2.5 text-[10px] font-mono tracking-widest uppercase transition-colors ${
                tab === id ? 'text-[#7eb8d4] border-b border-[#4a9abb]' : 'text-[#1a3a50] hover:text-[#2a5a74]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {tab === 'dashboard' ? <DashboardTab /> : <UserTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}