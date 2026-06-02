import { useEffect, useRef, useState } from 'react'
import { getRandomEvent } from '../api/event'
import { useVoyageStore } from '../stores/voyageStore'
import type { RandomEvent } from '../constants/event'

const MIN_DELAY = 25 * 60_000   // 25분
const MAX_DELAY = 35 * 60_000   // 35분 (평균 30분)
const SHOW_DURATION = 12_000    // 12초 표시

export function useRandomEvent() {
  const voyageState = useVoyageStore((s) => s.voyageState)
  const addOccurredEvent = useVoyageStore((s) => s.addOccurredEvent)
  const [event, setEvent] = useState<RandomEvent | null>(null)
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (voyageState !== 'SAILING') {
      setEvent(null)
      return
    }

    const schedule = () => {
      const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY)
      scheduleRef.current = setTimeout(async () => {
        try {
          const e = await getRandomEvent()
          if (e) {
            setEvent(e)
            addOccurredEvent(e.eventId)   // ← 정박 시 저장용 누적
            hideRef.current = setTimeout(() => setEvent(null), SHOW_DURATION)
          }
        } catch {
          /* 무시하고 다음 주기 */
        }
        schedule()
      }, delay)
    }
    schedule()

    return () => {
      if (scheduleRef.current) clearTimeout(scheduleRef.current)
      if (hideRef.current) clearTimeout(hideRef.current)
    }
  }, [voyageState, addOccurredEvent])

  return event
}