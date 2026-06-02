import { motion, AnimatePresence } from 'framer-motion'

interface Trace {
  familyMember: string
  content: string
  imgUrl?: string
}

interface TraceModalProps {
  open: boolean
  onClose: () => void
  trace?: Trace | null
}

export default function TraceModal({ open, onClose, trace }: TraceModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 딤 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(2, 8, 18, 0.75)',
              zIndex: 50,
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* 위치 wrapper */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 51,
              width: '90%',
              maxWidth: '420px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                backgroundColor: '#050e18',
                border: '1px solid rgba(100, 160, 200, 0.15)',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(100, 160, 200, 0.5)', marginBottom: '0.4rem' }}>
                    TRACE FOUND
                  </p>
                  <p style={{ fontFamily: '"Noto Serif KR", serif', fontSize: '0.85rem', color: 'rgba(180, 210, 230, 0.8)', letterSpacing: '0.15em' }}>
                    {trace?.familyMember ?? '—'}의 흔적
                  </p>
                </div>
                <button
                  onClick={onClose}
                  style={{ background: 'none', border: 'none', color: 'rgba(100, 160, 200, 0.4)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0.2rem' }}
                >
                  ✕
                </button>
              </div>

              {/* 구분선 */}
              <div style={{ height: '1px', backgroundColor: 'rgba(100, 160, 200, 0.1)' }} />

              {/* 이미지 */}
              {trace?.imgUrl && (
                <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                  <img
                    src={trace.imgUrl}
                    alt="흔적 이미지"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  />
                </div>
              )}

              {/* 내용 */}
              <p
                style={{
                  fontFamily: '"Noto Serif KR", serif',
                  fontSize: '0.9rem',
                  lineHeight: 2,
                  color: 'rgba(160, 200, 220, 0.75)',
                  letterSpacing: '0.05em',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {trace?.content ?? '흔적이 없습니다.'}
              </p>

              {/* 닫기 */}
              <button
                onClick={onClose}
                style={{
                  marginTop: '0.5rem',
                  background: 'transparent',
                  border: '1px solid rgba(100, 160, 200, 0.2)',
                  color: 'rgba(160, 200, 220, 0.6)',
                  fontFamily: 'monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.3em',
                  padding: '0.6rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(100, 160, 200, 0.5)'
                  ;(e.target as HTMLButtonElement).style.color = 'rgba(200, 230, 245, 0.9)'
                }}
                onMouseLeave={e => {
                  ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(100, 160, 200, 0.2)'
                  ;(e.target as HTMLButtonElement).style.color = 'rgba(160, 200, 220, 0.6)'
                }}
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}