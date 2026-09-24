import { useEffect, useState } from 'react'
import { getRandomEvent } from '../api/event'
import { useVoyageStore } from '../stores/voyageStore'
import { EVENT_DURATION_MS, type RandomEvent } from '../constants/event'

const MIN_DELAY = 25 * 60_000   // 25분
const MAX_DELAY = 35 * 60_000   // 35분 (평균 30분)


export function useRandomEvent() {
  const voyageState = useVoyageStore((s) => s.voyageState)
  const addOccurredEvent = useVoyageStore((s) => s.addOccurredEvent)
  const [event, setEvent] = useState<RandomEvent | null>(null)

  useEffect(() => {
    if (voyageState !== 'SAILING') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the stopped occurrence so resuming cannot reveal it again.
      setEvent(null)
      return
    }

    // Each sailing run owns its timers and pending response, including StrictMode replay.
    let cancelled = false
    let scheduleTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    const isActive = () => !cancelled && useVoyageStore.getState().voyageState === 'SAILING'

    const schedule = () => {
      if (!isActive()) return
      const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY)
      scheduleTimer = setTimeout(async () => {
        if (!isActive()) return
        try {
          const e = await getRandomEvent()
          if (!isActive()) return
          if (e) {
            setEvent(e)
            addOccurredEvent(e.eventId)   // ← 정박 시 저장용 누적
            hideTimer = setTimeout(() => setEvent(null), EVENT_DURATION_MS)
          }
        } catch {
          /* 무시하고 다음 주기 */
        }
        schedule()
      }, delay)
    }
    schedule()

    return () => {
      cancelled = true
      clearTimeout(scheduleTimer)
      clearTimeout(hideTimer)
    }
  }, [voyageState, addOccurredEvent])

  return voyageState === 'SAILING' ? event : null
}
