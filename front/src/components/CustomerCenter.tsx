// src/components/CustomerCenter.tsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getNotices, type Notice } from '../api/notice'
import { getMyInquiries, writeInquiry, updateInquiry, deleteInquiry, type Inquiry } from '../api/inquiry'

const fmtDate = (s: string) => {
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

type CenterTab = 'notice' | 'inquiry'

export default function CustomerCenter({ buttonClassName }: { buttonClassName?: string }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<CenterTab>('notice')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const close = () => { setOpen(false); setExpandedId(null) }

  // 배경/닫기: 펼친 상세가 있으면 접기(고객센터로 복귀), 없으면 모달 닫기
  const handleBackdrop = () => {
    if (expandedId !== null) setExpandedId(null)
    else close()
  }

  const switchTab = (id: CenterTab) => { setTab(id); setExpandedId(null) }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={buttonClassName ?? 'w-full py-2.5 border border-[#1a4a64]/40 rounded text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/60 tracking-widest transition-colors'}>
        ✉ 고객센터
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={handleBackdrop}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer py-10 px-6"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(8px)' }}>
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase mb-5 pointer-events-none shrink-0">고객센터</p>

              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="cursor-default w-full max-h-[72vh] bg-[#050e18] border border-[#1a4a64]/50 rounded-lg flex flex-col overflow-hidden"
                style={{ maxWidth: 'min(94vw, 520px)' }}>

                {/* 탭 */}
                <div className="flex border-b border-[#0d2233] shrink-0">
                  {([['notice', '공지사항'], ['inquiry', '문의']] as const).map(([id, label]) => (
                    <button key={id} onClick={() => switchTab(id)}
                      className={`flex-1 py-3 text-[10px] font-mono tracking-widest uppercase transition-colors ${
                        tab === id ? 'text-[#7eb8d4] border-b border-[#4a9abb]' : 'text-[#1a3a50] hover:text-[#2a5a74]'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'none' }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={tab}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}>
                      {tab === 'notice'
                        ? <NoticeTab expandedId={expandedId} setExpandedId={setExpandedId} />
                        : <InquiryTab />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              <button onClick={handleBackdrop}
                className="mt-6 px-8 py-2 border border-[#1a4a64]/60 rounded text-[11px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 tracking-widest uppercase transition-colors cursor-pointer shrink-0">
                {expandedId !== null ? '목록으로' : '닫기'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// ─── 공지사항 탭 (최신순 + 아코디언) ───
function NoticeTab({ expandedId, setExpandedId }: {
  expandedId: number | null
  setExpandedId: (id: number | null) => void
}) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getNotices()
      .then(n => {
        const sorted = [...n].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setNotices(sorted)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const toggle = (id: number) => setExpandedId(expandedId === id ? null : id)

  return (
    <div className="flex flex-col gap-2">
      {!loaded && <p className="text-[11px] font-mono text-[#2a5a74] animate-pulse">불러오는 중...</p>}
      {loaded && notices.length === 0 && (
        <p className="text-[10px] font-mono text-[#1a3a50] italic">— 등록된 공지가 없습니다</p>
      )}

      {notices.map((n, i) => {
        const isOpen = expandedId === n.noticeId
        return (
          <motion.div key={n.noticeId}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className={`border rounded overflow-hidden transition-colors ${
              isOpen ? 'border-[#4a9abb]/60 bg-[#0a2233]/40' : 'border-[#1a4a64]/40 bg-[#071826]/50'
            }`}>
            <button onClick={() => toggle(n.noticeId)}
              className="w-full text-left px-4 py-3 flex justify-between items-center gap-3 hover:bg-[#0a2233]/30 transition-colors">
              <span className="text-[13px] font-serif text-[#cce8f5] truncate">{n.title}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] font-mono text-[#2a5a74]">{fmtDate(n.createdAt)}</span>
                <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}
                  className="text-[10px] font-mono text-[#3a6880]">›</motion.span>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden">
                  <div className="px-4 pb-4 pt-1 flex flex-col gap-2 border-t border-[#1a4a64]/30">
                    <p className="text-[9px] font-mono text-[#2a5a74] tracking-[0.2em] uppercase">{n.authorName}</p>
                    <p className="text-[13px] text-[#7eb8d4] font-light leading-relaxed whitespace-pre-line">{n.content}</p>
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

// ─── 문의 탭 (내 문의 목록 + 작성 + 수정/삭제) ───
function InquiryTab() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [composing, setComposing] = useState(false)        // 작성 폼 열림
  const [editing, setEditing] = useState<Inquiry | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = () =>
    getMyInquiries()
      .then(list => {
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setInquiries(sorted)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  useEffect(() => { load() }, [])

  const handleDelete = async (n: Inquiry) => {
    if (busyId) return
    if (!window.confirm('이 문의를 삭제할까요?')) return
    setBusyId(n.inquiryId)
    try {
      await deleteInquiry(n.inquiryId)
      setInquiries(prev => prev.filter(x => x.inquiryId !== n.inquiryId))
    } catch {
      alert('삭제에 실패했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  // 작성/수정 폼
  if (composing || editing) {
    return (
      <InquiryForm
        inquiry={editing}
        onClose={() => { setComposing(false); setEditing(null) }}
        onSaved={() => { setComposing(false); setEditing(null); load() }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setComposing(true)}
        className="w-full py-2.5 border border-[#4a9abb]/50 rounded text-[11px] font-mono text-[#4a9abb] hover:text-[#cce8f5] hover:border-[#4a9abb]/80 tracking-widest uppercase transition-colors">
        + 문의 작성
      </button>

      {!loaded && <p className="text-[11px] font-mono text-[#2a5a74] animate-pulse">불러오는 중...</p>}
      {loaded && inquiries.length === 0 && (
        <p className="text-[10px] font-mono text-[#1a3a50] italic">— 작성한 문의가 없습니다</p>
      )}

      {inquiries.map((n, i) => {
        const isOpen = expandedId === n.inquiryId
        const answered = n.inquiryStatus === 'ANSWERED'
        return (
          <motion.div key={n.inquiryId}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className={`border rounded overflow-hidden transition-colors ${
              isOpen ? 'border-[#4a9abb]/60 bg-[#0a2233]/40' : 'border-[#1a4a64]/40 bg-[#071826]/50'
            }`}>
            <button onClick={() => setExpandedId(isOpen ? null : n.inquiryId)}
              className="w-full text-left px-4 py-3 flex justify-between items-center gap-3 hover:bg-[#0a2233]/30 transition-colors">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded shrink-0 tracking-widest ${
                  answered ? 'bg-[#1a4a3a]/60 text-[#5abb8a]' : 'bg-[#3a3a1a]/60 text-[#bbaa5a]'
                }`}>{answered ? '답변완료' : '대기중'}</span>
                <span className="text-[13px] font-serif text-[#cce8f5] truncate">{n.title}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] font-mono text-[#2a5a74]">{fmtDate(n.createdAt)}</span>
                <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}
                  className="text-[10px] font-mono text-[#3a6880]">›</motion.span>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                  <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-[#1a4a64]/30">
                    {/* 내 질문 */}
                    <p className="text-[13px] text-[#7eb8d4] font-light leading-relaxed whitespace-pre-line">{n.content}</p>

                    {/* 답변 */}
                    {n.answerContent ? (
                      <div className="rounded border border-[#1a4a64]/40 bg-[#050e18]/60 p-3 flex flex-col gap-1.5">
                        <p className="text-[9px] font-mono text-[#4a9abb] tracking-[0.2em] uppercase">↳ 관리자 답변</p>
                        <p className="text-[12px] text-[#a8d4e8] font-light leading-relaxed whitespace-pre-line">{n.answerContent}</p>
                      </div>
                    ) : (
                      <p className="text-[10px] font-mono text-[#1a3a50] italic">아직 답변이 등록되지 않았습니다</p>
                    )}

                    {/* 수정/삭제 — 답변 전에만 */}
                    {!answered && (
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setEditing(n)}
                          className="px-3 py-1 rounded text-[9px] font-mono tracking-widest border border-[#1a4a64]/60 text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 transition-colors">
                          수정
                        </button>
                        <button onClick={() => handleDelete(n)} disabled={busyId === n.inquiryId}
                          className="px-3 py-1 rounded text-[9px] font-mono tracking-widest border border-red-900/50 text-red-400/70 hover:text-red-300 hover:border-red-500/60 transition-colors disabled:opacity-40">
                          삭제
                        </button>
                      </div>
                    )}
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

// ─── 문의 작성/수정 폼 ───
function InquiryForm({ inquiry, onClose, onSaved }: {
  inquiry: Inquiry | null; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!inquiry
  const [title, setTitle] = useState(inquiry?.title ?? '')
  const [content, setContent] = useState(inquiry?.content ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim() || !content.trim() || saving) return
    setSaving(true)
    try {
      if (isEdit) await updateInquiry(inquiry!.inquiryId, { title: title.trim(), content: content.trim() })
      else await writeInquiry({ title: title.trim(), content: content.trim() })
      onSaved()
    } catch {
      alert('저장에 실패했습니다.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onClose}
        className="self-start text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors">‹ 목록</button>

      <p className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase">{isEdit ? '문의 수정' : '새 문의'}</p>

      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-mono text-[#2a5a74] tracking-widest uppercase">제목</span>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
          placeholder="문의 제목"
          className="w-full bg-[#040d16] border border-[#1a3a50] rounded px-3 py-2.5 text-[13px] text-[#cce8f5] outline-none focus:border-[#4a9abb]/60 placeholder-[#1a3a50]" />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-mono text-[#2a5a74] tracking-widest uppercase">내용</span>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
          placeholder="문의 내용을 입력하세요"
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
    </div>
  )
}