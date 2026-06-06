import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getDashboard,
  getUserList,
  getUserDetail,
  banUser,
  activateUser,
  updateVersion,
} from '../api/admin'
import { getVersion } from '../api/version'
import { getAdminInquiries, writeAnswer, updateAnswer, deleteAnswer, type Inquiry } from '../api/inquiry'
import { getAdminNotices, writeNotice, updateNotice, deleteNotice, type Notice } from '../api/notice'  // ← 이 줄 추가


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
    getDashboard().then(setData).catch(() => setErr(true))
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

  useEffect(() => {
    getUserList().then(setUsers).catch(() => setErr(true))
  }, [])

  const toggleStatus = async (u: UserRow) => {
    if (busyId) return
    const willBan = u.userStatus === 'ACTIVE'
    const action = willBan ? '정지' : '활성화'
    if (!window.confirm(`${u.name}(${u.email}) 계정을 ${action}하시겠습니까?`)) return

    setBusyId(u.userId)
    try {
      if (willBan) await banUser(u.userId)
      else await activateUser(u.userId)
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
    getUserDetail(userId).then(setDetail).catch(() => setErr(true))
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

// ─── 버전 관리 탭 ───────────────────────────────────────
function VersionTab() {
  const [current, setCurrent] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [err, setErr] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getVersion()
      .then(d => { setCurrent(d.version); setInput(d.version) })
      .catch(() => setErr(true))
  }, [])

  const trimmed = input.trim()
  const dirty = trimmed !== '' && trimmed !== current
  const tooLong = trimmed.length > 50

  const save = async () => {
    if (!dirty || tooLong || saving) return
    setSaving(true)
    setSaved(false)
    try {
      await updateVersion(trimmed)
      setCurrent(trimmed)
      setSaved(true)
    } catch {
      alert('버전 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (err) return <p className="text-[11px] font-mono text-red-400/60">버전 정보를 불러오지 못했습니다.</p>

  return (
    <div className="flex flex-col gap-8 max-w-md">
      {/* 현재 버전 */}
      <div className="bg-[#050e18] border border-[#0d2233] rounded-lg p-6 flex flex-col gap-2">
        <span className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">현재 버전</span>
        <span className="font-mono text-[32px] text-[#4a9abb]">
          {current === null ? '...' : current}
        </span>
      </div>

      {/* 수정 */}
      <div className="flex flex-col gap-3">
        <span className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">버전 수정</span>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setSaved(false) }}
          onKeyDown={e => { if (e.key === 'Enter') save() }}
          placeholder="v1.1.0"
          disabled={current === null}
          className="bg-[#040d16] border border-[#0d2233] rounded px-4 py-3 text-[13px] font-mono text-[#a8d4e8] tracking-widest placeholder:text-[#1a3a50] focus:outline-none focus:border-[#1a4a64]/70 disabled:opacity-40 transition-colors"
        />
        <div className="flex items-center justify-between min-h-[16px]">
          {tooLong ? (
            <span className="text-[9px] font-mono text-red-400/70">50자를 초과할 수 없습니다</span>
          ) : saved ? (
            <span className="text-[9px] font-mono text-[#3a8a6a] tracking-widest">저장됨</span>
          ) : (
            <span />
          )}
          <button
            onClick={save}
            disabled={!dirty || tooLong || saving}
            className="px-4 py-1.5 rounded text-[9px] font-mono tracking-widest uppercase border border-[#1a4a64]/60 text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 disabled:opacity-30 disabled:hover:text-[#7eb8d4] disabled:hover:border-[#1a4a64]/60 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 고객센터 관리 탭 (공지 관리 / 문의 관리) ──────────────
function SupportTab() {
  const [sub, setSub] = useState<'notice' | 'inquiry'>('notice')
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {([['notice', '공지 관리'], ['inquiry', '문의 관리']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            className={`px-4 py-1.5 rounded border text-[10px] font-mono tracking-widest uppercase transition-colors ${
              sub === id
                ? 'border-[#4a9abb]/70 text-[#cce8f5] bg-[#0a2233]/60'
                : 'border-[#1a4a64]/40 text-[#3a6880] hover:text-[#7eb8d4]'
            }`}>
            {label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sub}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {sub === 'notice' ? <AdminNoticeManage /> : <AdminInquiryManage />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── 공지 관리 ───
function AdminNoticeManage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [err, setErr] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () =>
    getAdminNotices().then(n => { setNotices(n); setLoaded(true) }).catch(() => setErr(true))
  useEffect(() => { load() }, [])

  const handleDelete = async (n: Notice) => {
    if (busyId) return
    if (!window.confirm(`"${n.title}" 공지를 삭제하시겠습니까?`)) return
    setBusyId(n.noticeId)
    try {
      await deleteNotice(n.noticeId)
      setNotices(prev => prev.filter(x => x.noticeId !== n.noticeId))
    } catch {
      alert('삭제에 실패했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  if (err) return <p className="text-[11px] font-mono text-red-400/60">공지 목록을 불러오지 못했습니다.</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono text-[#2a5a74] tracking-widest uppercase">{notices.length}개의 공지</span>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 border border-[#4a9abb]/50 rounded text-[10px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-widest uppercase transition-colors">
          + 새 공지 작성
        </button>
      </div>

      {loaded && notices.length === 0 && (
        <p className="text-[10px] font-mono text-[#1a3a50] italic">— 등록된 공지가 없습니다</p>
      )}

      <div className="flex flex-col gap-2">
        {notices.map((n, i) => (
          <motion.div key={n.noticeId}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="border border-[#0d2233] rounded p-4 bg-[#050e18]/60 flex flex-col gap-2">
            <div className="flex justify-between items-baseline gap-3">
              <span className="text-[13px] font-serif text-[#cce8f5] truncate">{n.title}</span>
              <span className="text-[9px] font-mono text-[#2a5a74] shrink-0">{n.authorName} · {fmtDate(n.createdAt)}</span>
            </div>
            <p className="text-[11px] text-[#4a7a94] font-light leading-relaxed line-clamp-2 whitespace-pre-line">{n.content}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(n)}
                className="px-3 py-1 rounded text-[9px] font-mono tracking-widest border border-[#1a4a64]/60 text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 transition-colors">
                수정
              </button>
              <button onClick={() => handleDelete(n)} disabled={busyId === n.noticeId}
                className="px-3 py-1 rounded text-[9px] font-mono tracking-widest border border-red-900/50 text-red-400/70 hover:text-red-300 hover:border-red-500/60 transition-colors disabled:opacity-40">
                삭제
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {(creating || editing) && (
        <NoticeFormModal notice={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={load} />
      )}
    </div>
  )
}

// ─── 문의 관리 (답변 작성/수정/삭제) ───
function AdminInquiryManage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [err, setErr] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [answerDraft, setAnswerDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    getAdminInquiries()
      .then(list => {
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setInquiries(sorted); setLoaded(true)
      })
      .catch(() => setErr(true))
  useEffect(() => { load() }, [])

  const openInquiry = (n: Inquiry) => {
    setExpandedId(expandedId === n.inquiryId ? null : n.inquiryId)
    setAnswerDraft(n.answerContent ?? '')
  }

  const submitAnswer = async (n: Inquiry) => {
    if (!answerDraft.trim() || busy) return
    setBusy(true)
    try {
      if (n.answerContent) await updateAnswer(n.inquiryId, { content: answerDraft.trim() })
      else await writeAnswer(n.inquiryId, { content: answerDraft.trim() })
      await load()
    } catch {
      alert('답변 저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const removeAnswer = async (n: Inquiry) => {
    if (busy || !window.confirm('답변을 삭제할까요?')) return
    setBusy(true)
    try {
      await deleteAnswer(n.inquiryId)
      await load()
      setAnswerDraft('')
    } catch {
      alert('답변 삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (err) return <p className="text-[11px] font-mono text-red-400/60">문의 목록을 불러오지 못했습니다.</p>

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-mono text-[#2a5a74] tracking-widest uppercase">{inquiries.length}개의 문의</span>
      {loaded && inquiries.length === 0 && (
        <p className="text-[10px] font-mono text-[#1a3a50] italic">— 등록된 문의가 없습니다</p>
      )}

      {inquiries.map((n, i) => {
        const isOpen = expandedId === n.inquiryId
        const answered = n.inquiryStatus === 'ANSWERED'
        return (
          <motion.div key={n.inquiryId}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="border border-[#0d2233] rounded bg-[#050e18]/60 overflow-hidden">
            <button onClick={() => openInquiry(n)}
              className="w-full text-left px-4 py-3 flex justify-between items-center gap-3 hover:bg-[#071525]/40 transition-colors">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded shrink-0 tracking-widest ${
                  answered ? 'bg-[#1a4a3a]/60 text-[#5abb8a]' : 'bg-[#3a3a1a]/60 text-[#bbaa5a]'
                }`}>{answered ? '답변완료' : '대기중'}</span>
                <span className="text-[13px] font-serif text-[#cce8f5] truncate">{n.title}</span>
              </span>
              <span className="text-[9px] font-mono text-[#2a5a74] shrink-0">{n.authorName} · {fmtDate(n.createdAt)}</span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                  <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-[#1a4a64]/30">
                    <p className="text-[12px] text-[#7eb8d4] font-light leading-relaxed whitespace-pre-line">{n.content}</p>

                    <div className="flex flex-col gap-2">
                      <p className="text-[9px] font-mono text-[#4a9abb] tracking-[0.2em] uppercase">
                        {n.answerContent ? '답변 수정' : '답변 작성'}
                      </p>
                      <textarea value={answerDraft} onChange={e => setAnswerDraft(e.target.value)} rows={4}
                        placeholder="답변 내용"
                        className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-3 py-2.5 text-[12px] text-[#cce8f5] resize-none outline-none focus:border-[#4a9abb]/60 placeholder-[#1a3a50] leading-relaxed" />
                      <div className="flex justify-end gap-2">
                        {n.answerContent && (
                          <button onClick={() => removeAnswer(n)} disabled={busy}
                            className="px-3 py-1.5 rounded text-[9px] font-mono tracking-widest border border-red-900/50 text-red-400/70 hover:text-red-300 hover:border-red-500/60 transition-colors disabled:opacity-40">
                            답변 삭제
                          </button>
                        )}
                        <button onClick={() => submitAnswer(n)} disabled={busy || !answerDraft.trim()}
                          className="px-4 py-1.5 rounded text-[9px] font-mono tracking-widest border border-[#4a9abb]/50 text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 transition-colors disabled:opacity-40">
                          {busy ? '저장 중' : n.answerContent ? '답변 수정' : '답변 등록'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── 공지 작성/수정 모달 ───
function NoticeFormModal({ notice, onClose, onSaved }: {
  notice: Notice | null; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!notice
  const [title, setTitle] = useState(notice?.title ?? '')
  const [content, setContent] = useState(notice?.content ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim() || !content.trim() || saving) return
    setSaving(true)
    try {
      if (isEdit) await updateNotice(notice!.noticeId, { title: title.trim(), content: content.trim() })
      else await writeNotice({ title: title.trim(), content: content.trim() })
      onSaved()
      onClose()
    } catch {
      alert('저장에 실패했습니다.')
      setSaving(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-6 cursor-pointer"
        style={{ background: 'rgba(2,6,14,0.85)', backdropFilter: 'blur(6px)' }}>
        <motion.div onClick={e => e.stopPropagation()}
          initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }}
          className="w-full max-w-lg bg-[#050e18] border border-[#1a4a64]/50 rounded-lg p-7 flex flex-col gap-5 cursor-default">
          <p className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase">{isEdit ? '공지 수정' : '새 공지 작성'}</p>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono text-[#2a5a74] tracking-widest uppercase">제목</span>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              placeholder="공지 제목"
              className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-3 py-2.5 text-[13px] text-[#cce8f5] outline-none focus:border-[#4a9abb]/60 placeholder-[#1a3a50]" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono text-[#2a5a74] tracking-widest uppercase">내용</span>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
              placeholder="공지 내용"
              className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-3 py-2.5 text-[13px] text-[#cce8f5] resize-none outline-none focus:border-[#4a9abb]/60 placeholder-[#1a3a50] leading-relaxed" />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors">취소</button>
            <button onClick={save} disabled={saving || !title.trim() || !content.trim()}
              className="px-5 py-2 border border-[#4a9abb]/50 rounded text-[10px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-widest uppercase transition-colors disabled:opacity-40">
              {saving ? '저장 중' : isEdit ? '수정' : '작성'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ─── 메인 ──────────────────────────────────────────────
type Tab = 'dashboard' | 'users' | 'support' | 'version'

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
          {([['dashboard', '대시보드'], ['users', '유저 관리'], ['support', '고객센터'], ['version', '버전 관리']] as const).map(([id, label]) => (
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
            {tab === 'dashboard' && <DashboardTab />}
            {tab === 'users' && <UserTab />}
            {tab === 'support' && <SupportTab />}
            {tab === 'version' && <VersionTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}