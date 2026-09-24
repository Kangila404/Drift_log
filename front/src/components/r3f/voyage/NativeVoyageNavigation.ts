import type { VoyageNavigationRef } from './VoyageNavigation'

export const NATIVE_STEERING_LEASE_MS = 500

export interface NavigationAvailability {
  available: boolean
  canSteer: boolean
}

// Native holds refresh a short lease. Lost release/background messages must
// never leave the vessel turning indefinitely.
export function createNativeNavigationReceiver(
  navigation: VoyageNavigationRef,
  availability: NavigationAvailability,
  publish: () => void,
  hidden: () => boolean,
) {
  let lease: ReturnType<typeof setTimeout> | undefined
  const clear = () => {
    clearTimeout(lease)
    lease = undefined
    navigation.current.input = 0
  }
  const receive = (data: unknown) => {
    if (typeof data !== 'string') return
    let message: { type?: unknown; action?: unknown; direction?: unknown }
    try {
      const value: unknown = JSON.parse(data)
      if (!value || typeof value !== 'object' || Array.isArray(value)) return
      message = value
    } catch { return }
    if (message.type !== 'voyage-control') return
    if (message.action === 'navigation-state-request') { publish(); return }
    if (message.action === 'steer') {
      const direction = message.direction
      if (direction !== -1 && direction !== 0 && direction !== 1) return
      clear()
      if (!availability.available || !availability.canSteer || hidden()) return
      navigation.current.input = direction
      if (direction !== 0) lease = setTimeout(clear, NATIVE_STEERING_LEASE_MS)
    } else if (message.action === 'reset-view' && availability.available && !hidden()) {
      navigation.current.resetView++
    }
  }
  return { receive, clear }
}
