import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Camera } from 'lucide-react'
import type { VoyageNavigationRef, VoyageSteeringInput } from '../r3f/voyage/VoyageNavigation'
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
  const left = useRef<HTMLButtonElement>(null)
  const right = useRef<HTMLButtonElement>(null)
  const pointers = useRef(new Map<number, VoyageSteeringInput>())
  const keys = useRef(new Map<string, VoyageSteeringInput>())

  const publish = useCallback(() => {
    const directions = new Set([...pointers.current.values(), ...keys.current.values()])
    const input = (Number(directions.has(1)) - Number(directions.has(-1))) as VoyageSteeringInput
    navigationRef.current.input = input
    left.current?.setAttribute('data-held', String(input === -1))
    right.current?.setAttribute('data-held', String(input === 1))
  }, [navigationRef])

  const clear = useCallback(() => {
    pointers.current.clear()
    keys.current.clear()
    publish()
  }, [publish])

  useEffect(() => {
    clear()
    if (!enabled) return clear
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || isEditable(event.target)) return
      const key = event.key.toLowerCase()
      const ownButton = event.target === left.current ? -1 : event.target === right.current ? 1 : 0
      // Leave arrows to other focused controls, menus and dialogs.
      if (!ownButton && event.target instanceof Element && event.target.closest('button, a, [role="dialog"], dialog')) return
      const input = key === 'arrowleft' || key === 'a' ? -1
        : key === 'arrowright' || key === 'd' ? 1
          : (key === ' ' || key === 'enter') ? ownButton : 0
      if (!input || document.hidden) return
      event.preventDefault()
      keys.current.set(key, input)
      publish()
    }
    const keyUp = (event: KeyboardEvent) => {
      if (keys.current.delete(event.key.toLowerCase())) {
        if (!isEditable(event.target)) event.preventDefault()
        publish()
      }
    }
    const focusIn = () => clear()
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    document.addEventListener('focusin', focusIn)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
      document.removeEventListener('focusin', focusIn)
      clear()
    }
  }, [clear, enabled, publish])

  const hold = (event: ReactPointerEvent<HTMLButtonElement>, input: VoyageSteeringInput) => {
    if (!enabled || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, input)
    publish()
  }
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointers.current.delete(event.pointerId)
    publish()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className={`voyage-controls ${className}`} role="group" aria-label={'\uD56D\uD574 \uC870\uC885'}>
    <button ref={left} type="button" disabled={!enabled}
      aria-label={'\uC88C\uD604\uC73C\uB85C \uC870\uC885'} title={'\uC88C\uD604\uC73C\uB85C \uC870\uC885'}
      onPointerDown={event => hold(event, -1)} onPointerUp={release} onPointerCancel={clear} onLostPointerCapture={clear}
      onContextMenu={event => event.preventDefault()}>
      <ArrowLeft size={20} aria-hidden="true" />
    </button>
    <button type="button" aria-label={'\uC2DC\uC810 \uCD08\uAE30\uD654'} title={'\uC2DC\uC810 \uCD08\uAE30\uD654'}
      onClick={() => { navigationRef.current.resetView++ }}>
      <Camera size={18} aria-hidden="true" />
    </button>
    <button ref={right} type="button" disabled={!enabled}
      aria-label={'\uC6B0\uD604\uC73C\uB85C \uC870\uC885'} title={'\uC6B0\uD604\uC73C\uB85C \uC870\uC885'}
      onPointerDown={event => hold(event, 1)} onPointerUp={release} onPointerCancel={clear} onLostPointerCapture={clear}
      onContextMenu={event => event.preventDefault()}>
      <ArrowRight size={20} aria-hidden="true" />
    </button>
  </div>
}
