import { AnimatePresence, motion } from 'framer-motion'
import EventIllustration from './EventIllustration'
import { EVENT_LAYOUT, DEFAULT_LAYOUT } from '../../constants/event'
import type { RandomEvent } from '../../constants/event'

export default function EventOverlay({ event }: { event: RandomEvent | null }) {
  return (
    <AnimatePresence>
      {event && (() => {
        const layout = EVENT_LAYOUT[event.eventId] ?? DEFAULT_LAYOUT
        const isFullscreen = event.eventId === 2 || event.eventId === 3 // 무지개, 돌고래

        return (
          <motion.div
            key={event.eventId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}
          >
            {/* 일러스트 — 무지개는 전체화면, 나머지는 EVENT_LAYOUT 컨테이너 배치 */}
            {isFullscreen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2.0, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <EventIllustration eventId={event.eventId} />
              </motion.div>
            ) : (
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 2.0, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: layout.top,
                  left: layout.left,
                  transform: 'translateX(-50%)',
                  width: layout.width,
                  height: layout.height,
                }}
              >
                <EventIllustration eventId={event.eventId} />
              </motion.div>
            )}

            {/* 텍스트 — 하단 고정 */}
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.8, delay: 0.4, ease: 'easeOut' }}
              style={{
                position: 'absolute', left: 0, right: 0, bottom: '16%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: 'clamp(15px, 1.6vw, 20px)', letterSpacing: '0.18em',
                color: '#cfe0d8', marginBottom: 12, fontWeight: 500,
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              }}>
                {event.type}
              </div>
              <div style={{
                maxWidth: 'min(80vw, 560px)', padding: '0 24px',
                fontSize: 'clamp(13px, 1.3vw, 16px)', lineHeight: 1.9,
                letterSpacing: '0.04em', color: '#9fb4bc',
                textShadow: '0 2px 10px rgba(0,0,0,0.6)',
              }}>
                {event.textContent}
              </div>
            </motion.div>
          </motion.div>
        )
      })()}
    </AnimatePresence>
  )
}