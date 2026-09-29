import type { VoyageNavigationRef } from './VoyageNavigation'

export const NATIVE_STEERING_LEASE_MS = 500
export const NATIVE_LOOK_LEASE_MS = 250

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
  let lookLease: ReturnType<typeof setTimeout> | undefined
  const clearSteer = () => {
    clearTimeout(lease)
    lease = undefined
    navigation.current.input = 0
  }
  const clearLook = () => {
    clearTimeout(lookLease)
    lookLease = undefined
    navigation.current.lookX = 0
    navigation.current.lookY = 0
  }
  const clear = () => { clearSteer(); clearLook() }
  const receive = (data: unknown) => {
    if (typeof data !== 'string') return
    let message: { type?: unknown; action?: unknown; direction?: unknown; x?: unknown; y?: unknown }
    try {
      const value: unknown = JSON.parse(data)
      if (!value || typeof value !== 'object' || Array.isArray(value)) return
      message = value
    } catch { return }
    if (message.type !== 'voyage-control') return
    if (message.action === 'navigation-state-request') { publish(); return }
    if (message.action === 'steer') {
      const direction = message.direction
      if (typeof direction !== 'number' || !Number.isFinite(direction) || Math.abs(direction) > 1) return
      clearSteer()
      if (!availability.available || !availability.canSteer || hidden()) return
      navigation.current.input = direction
      if (direction !== 0) lease = setTimeout(clearSteer, NATIVE_STEERING_LEASE_MS)
    } else if (message.action === 'look') {
      const { x, y } = message
      if (typeof x !== 'number' || !Number.isFinite(x) || Math.abs(x) > 1
        || typeof y !== 'number' || !Number.isFinite(y) || Math.abs(y) > 1) return
      clearLook()
      if (!availability.available || hidden()) return
      navigation.current.lookX = x
      navigation.current.lookY = y
      if (x !== 0 || y !== 0) {
        lookLease = setTimeout(() => {
          lookLease = undefined
          navigation.current.lookX = 0
          navigation.current.lookY = 0
        }, NATIVE_LOOK_LEASE_MS)
      }
    } else if (message.action === 'reset-view' && availability.available && !hidden()) {
      navigation.current.resetView++
    }
  }
  return { receive, clear }
}
