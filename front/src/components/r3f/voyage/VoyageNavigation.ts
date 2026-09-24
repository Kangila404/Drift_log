export type VoyageSteeringInput = -1 | 0 | 1

export interface VoyageNavigationState {
  x: number
  /** Three.js Y rotation: positive turns the -Z bow toward -X. */
  heading: number
  input: VoyageSteeringInput
  speed: number
  resetView: number
}

export type VoyageNavigationRef = { current: VoyageNavigationState }

export const VOYAGE_MAX_X = 3
export const VOYAGE_MAX_HEADING = Math.PI / 15

export function createVoyageNavigation(): VoyageNavigationState {
  return { x: 0, heading: 0, input: 0, speed: 0, resetView: 0 }
}

function damp(value: number, target: number, rate: number, delta: number) {
  const next = value + (target - value) * -Math.expm1(-rate * delta)
  return Math.abs(next - target) < .00001 ? target : next
}

/** Presentation only; delta is seconds. Mutates and returns the same state. */
export function advanceVoyageNavigation(state: VoyageNavigationState, delta: number, sailing: boolean): VoyageNavigationState {
  if (!sailing) state.input = 0
  if (!Number.isFinite(delta) || delta <= 0) return state

  // Bound tab-resume jumps and substep the coupled heading/position response.
  const elapsed = Math.min(delta, .25)
  const steps = Math.ceil(elapsed * 120)
  const dt = elapsed / steps
  for (let step = 0; step < steps; step++) {
    state.speed = damp(state.speed, sailing ? 1 : 0, sailing ? 1.8 : 3, dt)
    const targetX = state.input * VOYAGE_MAX_X
    const targetHeading = sailing
      ? Math.max(-VOYAGE_MAX_HEADING, Math.min(VOYAGE_MAX_HEADING, Math.atan((state.x - targetX) * .45 / 2.8)))
      : 0
    state.heading = damp(state.heading, targetHeading, 3, dt)
    if (sailing) {
      state.x = Math.max(-VOYAGE_MAX_X, Math.min(VOYAGE_MAX_X,
        state.x - Math.sin(state.heading) * 2.8 * state.speed * dt))
      if (Math.abs(state.x - targetX) < .0001 && Math.abs(state.heading) < .0001) {
        state.x = targetX
        state.heading = 0
      }
    }
  }
  return state
}
