// src/components/NoticeCenter.tsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getNotices, type Notice } from '../api/notice'

const fmtDate = (s: string) => {
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function NoticeCenter({ buttonClassName }: { buttonClassName?: string }) {
  const [open, setOpen] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<Notice | null>(null)

  useEffect(() => {
    if (!open || loaded) return
    getNotices().then(n => { setNotices(n); setLoaded(true) }).catch(() => setLoaded(true))
  }, [open, loaded])

  const close = () => { setOpen(false); setSelected(null) }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={buttonClassName ?? 'w-full py-2.5 border border-[#1a4a64]/40 rounded text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] hover:border-[#4a9abb]/60 tracking-widest transition-colors'}>
        ✉ 공지사항
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              onClick={close}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer py-10 px-6"
              style={{ background: 'rgba(2,6,14,0.9)', backdropFilter: 'blur(8px)' }}>
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-[0.4em] uppercase mb-6 pointer-events-none shrink-0">공지사항</p>

              <motion.div onClick={e => e.stopPropagation()}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                className="cursor-default w-full max-h-[70vh] overflow-y-auto bg-[#050e18] border border-[#1a4a64]/50 rounded-lg p-6 flex flex-col gap-3"
                style={{ maxWidth: 'min(94vw, 520px)', scrollbarWidth: 'none' }}>

                {!selected ? (
                  <>
                    {!loaded && <p className="text-[11px] font-mono text-[#2a5a74] animate-pulse">불러오는 중...</p>}
                    {loaded && notices.length === 0 && (
                      <p className="text-[10px] font-mono text-[#1a3a50] italic">— 등록된 공지가 없습니다</p>
                    )}
                    {notices.map((n, i) => (
                      <motion.button key={n.noticeId}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        onClick={() => setSelected(n)}
                        className="text-left border border-[#1a4a64]/40 rounded p-4 bg-[#071826]/50 hover:border-[#4a9abb]/60 transition-colors">
                        <div className="flex justify-between items-baseline mb-1.5 gap-3">
                          <span className="text-[13px] font-serif text-[#cce8f5] truncate">{n.title}</span>
                          <span className="text-[9px] font-mono text-[#2a5a74] shrink-0">{fmtDate(n.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-[#4a7a94] font-light leading-relaxed line-clamp-2">{n.content}</p>
                      </motion.button>
                    ))}
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                    <button onClick={() => setSelected(null)}
                      className="self-start text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors">‹ 목록</button>
                    <div>
                      <p className="text-[9px] font-mono text-[#2a5a74] tracking-[0.3em] uppercase">{fmtDate(selected.createdAt)} · {selected.authorName}</p>
                      <h3 className="mt-1.5 text-[17px] font-serif text-[#a8d4e8] tracking-wide">{selected.title}</h3>
                    </div>
                    <p className="text-[13px] text-[#7eb8d4] font-light leading-relaxed whitespace-pre-line">{selected.content}</p>
                  </motion.div>
                )}
              </motion.div>

              <button onClick={close}
                className="mt-6 px-8 py-2 border border-[#1a4a64]/60 rounded text-[11px] font-mono text-[#7eb8d4] hover:text-[#cce8f5] hover:border-[#7eb8d4]/70 tracking-widest uppercase transition-colors cursor-pointer shrink-0">
                닫기
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}