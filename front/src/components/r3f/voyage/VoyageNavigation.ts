/** Normalized rudder input, from full port (-1) to full starboard (1). */
export type VoyageSteeringInput = number

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
export const VOYAGE_MAX_HEADING = Math.PI / 9

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
  state.input = Number.isFinite(state.input) ? Math.max(-1, Math.min(1, state.input)) : 0
  if (!Number.isFinite(delta) || delta <= 0) return state

  // Bound tab-resume jumps and substep the coupled heading/position response.
  const elapsed = Math.min(delta, .25)
  const steps = Math.ceil(elapsed * 120)
  const dt = elapsed / steps
  for (let step = 0; step < steps; step++) {
    state.speed = damp(state.speed, sailing ? 1 : 0, sailing ? 1.8 : 3, dt)
    const targetX = state.input * VOYAGE_MAX_X
    // A held rudder keeps the bow turned, even at the local presentation boundary.
    const held = state.input !== 0
    const targetHeading = !sailing ? 0 : held
      ? -state.input * VOYAGE_MAX_HEADING
      : state.x * .025
    state.heading = damp(state.heading, targetHeading, held ? 2.8 : 2, dt)
    if (sailing) {
      state.x = damp(state.x, targetX, (held ? .65 : .35) * state.speed, dt)
    }
  }
  return state
}
