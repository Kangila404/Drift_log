import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { advanceHelmAngle, HELM_MAX_ANGLE, helmSteering, wheelPointerAngle } from '@driftlog/shared'
import type { VoyageNavigationRef } from '../r3f/voyage/VoyageNavigation'
import { VOYAGE_VIEWING_EVENT } from '../r3f/voyage/VoyageView'
import './VoyageControls.css'

export interface VoyageControlsProps {
  navigation: VoyageNavigationRef
  enabled: boolean
  className?: string
}

function isEditable(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
  ))
}

export default function VoyageControls({ navigation: navigationRef, enabled, className = '' }: VoyageControlsProps) {
  const wheel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; previous: number; angle: number; cx: number; cy: number } | null>(null)
  const keys = useRef(new Map<string, number>())

  const publish = useCallback((angle: number, held: boolean) => {
    navigationRef.current.input = helmSteering(angle)
    wheel.current?.style.setProperty('--helm-angle', `${angle}deg`)
    wheel.current?.setAttribute('data-held', String(held))
    wheel.current?.setAttribute('aria-valuenow', String(Math.round(angle)))
  }, [navigationRef])

  const clear = useCallback(() => {
    drag.current = null
    keys.current.clear()
    publish(0, false)
  }, [publish])

  useEffect(() => {
    clear()
    if (!enabled) return clear
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || isEditable(event.target)) return
      if (event.target !== wheel.current && event.target instanceof Element && event.target.closest('button, a, [role="dialog"], dialog, [role="slider"]')) return
      const key = event.key.toLowerCase()
      const direction = key === 'arrowleft' || key === 'a' ? -1 : key === 'arrowright' || key === 'd' ? 1 : 0
      if (!direction || document.hidden || drag.current || document.documentElement.dataset.voyageViewing === 'true') return
      event.preventDefault()
      keys.current.set(key, direction)
      const values = [...keys.current.values()]
      publish((Number(values.includes(1)) - Number(values.includes(-1))) * HELM_MAX_ANGLE, true)
    }
    const keyUp = (event: KeyboardEvent) => {
      if (!keys.current.delete(event.key.toLowerCase()) || drag.current) return
      const values = [...keys.current.values()]
      publish((Number(values.includes(1)) - Number(values.includes(-1))) * HELM_MAX_ANGLE, values.length > 0)
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    document.addEventListener('focusin', clear)
    window.addEventListener(VOYAGE_VIEWING_EVENT, clear)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
      document.removeEventListener('focusin', clear)
      window.removeEventListener(VOYAGE_VIEWING_EVENT, clear)
      clear()
    }
  }, [clear, enabled, publish])

  const begin = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!enabled || event.button !== 0 || drag.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2
    if (Math.hypot(event.clientX - cx, event.clientY - cy) < 14) return
    const glyph = event.currentTarget.querySelector('.voyage-helm-rotor')
    const transform = glyph ? getComputedStyle(glyph).transform : 'none'
    const matrix = transform === 'none' ? null : new DOMMatrixReadOnly(transform)
    const angle = matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : 0
    keys.current.clear()
    drag.current = { id: event.pointerId, previous: wheelPointerAngle(event.clientX, event.clientY, cx, cy), angle, cx, cy }
    event.currentTarget.setPointerCapture(event.pointerId)
    publish(angle, true)
  }
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    // Crossing the hub has no reliable angle. Re-anchor on the next rim sample.
    if (Math.hypot(event.clientX - current.cx, event.clientY - current.cy) < 14) {
      current.previous = NaN
      return
    }
    const next = wheelPointerAngle(event.clientX, event.clientY, current.cx, current.cy)
    if (Number.isFinite(current.previous)) current.angle = advanceHelmAngle(current.angle, current.previous, next)
    current.previous = next
    publish(current.angle, true)
  }
  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== drag.current?.id) return
    clear()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className={`voyage-controls ${className}`} role="group" aria-label="항해 조종">
    <div ref={wheel} className="voyage-helm" role="slider" tabIndex={enabled ? 0 : -1}
      aria-label="조타륜" aria-valuemin={-HELM_MAX_ANGLE} aria-valuemax={HELM_MAX_ANGLE} aria-valuenow={0}
      aria-disabled={!enabled} title="조타륜" onPointerDown={begin} onPointerMove={move}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
      onContextMenu={event => event.preventDefault()}>
      <span className="voyage-helm-index" aria-hidden="true" />
      <span className="voyage-helm-rotor" aria-hidden="true">
        <span className="voyage-helm-rim" />
        {[0, 120, 240].map(angle => <span key={angle} className="voyage-helm-spoke" style={{ transform: `rotate(${angle}deg)` }} />)}
        <span className="voyage-helm-hub" />
        <span className="voyage-helm-marker" />
      </span>
    </div>
  </div>
}
