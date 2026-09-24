import { useEffect } from 'react'
import { useAnimate } from 'framer-motion'
import { EVENT_DURATION_MS, getEventCaption } from '../../constants/event'
import type { RandomEvent } from '../../constants/event'
import './EventOverlay.css'

export default function EventOverlay({ event }: { event: RandomEvent | null }) {
  const [scope, animate] = useAnimate<HTMLParagraphElement>()

  useEffect(() => {
    if (!event || !scope.current) return
    const animation = animate(scope.current, { opacity: [0, 1, 1, 0] }, {
      duration: EVENT_DURATION_MS / 1000,
      times: [0, 0.12, 0.84, 1],
      ease: 'easeInOut',
    })
    return () => animation.stop()
  }, [event, scope, animate])

  if (!event) return null

  return (
    <p
      ref={scope}
      role="status"
      className="voyage-event-caption"
      style={{
        opacity: 0,
        position: 'absolute',
        left: 'max(16px, env(safe-area-inset-left, 0px))',
        right: 'max(16px, env(safe-area-inset-right, 0px))',
        margin: 0,
        pointerEvents: 'none',
        zIndex: 9,
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 1.6,
        letterSpacing: 0,
        color: '#d9e3e5',
        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        overflowWrap: 'anywhere',
      }}
    >
      {getEventCaption(event)}
    </p>
  )
}
