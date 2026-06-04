import { useState, useEffect, useRef } from 'react'

const ECLIPSE_DURATION = 120_000

export interface EclipseState {
  phase: number
  coverage: number
  running: boolean
}

export function useEclipse(active: boolean): EclipseState {
  const [state, setState] = useState<EclipseState>({ phase: -2.5, coverage: 0, running: false })
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const completedRef = useRef(false)  // 한 번 끝나면 다시 안 돌게

  useEffect(() => {
    if (!active) {
      // 일식 조건이 풀리면(밤이 되거나 날씨 바뀜) 초기화 + 완료 플래그 해제
      startRef.current = null
      completedRef.current = false
      setState({ phase: -2.5, coverage: 0, running: false })
      return
    }

    // 이미 오늘 일식 다 진행됐으면 재실행 안 함 (걷힌 상태 유지)
    if (completedRef.current) {
      setState({ phase: 2.5, coverage: 0, running: false })
      return
    }

    startRef.current = performance.now()

    const tick = () => {
      const elapsed = performance.now() - (startRef.current ?? 0)
      const p = Math.min(elapsed / ECLIPSE_DURATION, 1)
      const phase = -2.5 + p * 5.0
      const coverage = Math.max(0, 1 - Math.abs(phase))
      setState({ phase, coverage, running: p < 1 })
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        completedRef.current = true  // 완료 → 다음 effect 재실행 때 안 돎
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active])

  return state
}