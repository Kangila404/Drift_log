import { sampleOceanSurface, type OceanSample, type OceanSurfaceState } from './OceanWaves'

export interface BoatMotionPose { height: number; pitch: number; roll: number }
export interface BoatMotionState extends BoatMotionPose { initialized: boolean; settled: boolean }

export const BOAT_MAX_TILT = 1.75 * Math.PI / 180
const HEIGHT_EPSILON = .0001
const ANGLE_EPSILON = .00001
const WEIGHTS = [1, 2, 1] as const

export function createBoatMotion(): BoatMotionState {
  return { height: 0, pitch: 0, roll: 0, initialized: false, settled: true }
}

export function sampleBoatMotionTarget(x: number, z: number, modelScale: number, surface: OceanSurfaceState,
  out: BoatMotionPose = { height: 0, pitch: 0, roll: 0 },
  sample: OceanSample = { height: 0, slopeX: 0, slopeZ: 0 }, heading = 0): BoatMotionPose {
  let height = 0, slopeX = 0, slopeZ = 0
  const c = Math.cos(heading), s = Math.sin(heading)
  // A weighted hull footprint filters short chop before the temporal response.
  for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 3; iz++) {
    const weight = WEIGHTS[ix] * WEIGHTS[iz] / 16
    const lateral = (ix - 1) * .8 * modelScale, along = (iz - 1) * 1.65 * modelScale
    sampleOceanSurface(x + lateral * c + along * s, z + along * c - lateral * s,
      surface.time, surface.scale, surface.speed, surface.wind, sample)
    height += sample.height * weight
    slopeX += (sample.slopeX * c - sample.slopeZ * s) * weight
    slopeZ += (sample.slopeX * s + sample.slopeZ * c) * weight
  }
  const pitch = -Math.atan(slopeZ) * .35
  const roll = Math.atan(slopeX) * .35
  const tilt = Math.hypot(pitch, roll)
  const restraint = tilt > 0 ? BOAT_MAX_TILT * Math.tanh(tilt / BOAT_MAX_TILT) / tilt : 1
  out.height = height
  out.pitch = pitch * restraint
  out.roll = roll * restraint
  return out
}

function damp(current: number, target: number, rate: number, delta: number, epsilon: number) {
  const next = current + (target - current) * -Math.expm1(-rate * delta)
  return Math.abs(next - target) <= epsilon ? target : next
}

// Heights stay in world units; callers convert only the final model translation.
export function advanceBoatMotion(state: BoatMotionState, target: BoatMotionPose, delta: number): boolean {
  const elapsed = Number.isFinite(delta) ? Math.max(0, delta) : 0
  if (!state.initialized) {
    state.height = target.height
    state.pitch = target.pitch
    state.roll = target.roll
    state.initialized = true
  } else {
    state.height = damp(state.height, target.height, 6, elapsed, HEIGHT_EPSILON)
    state.pitch = damp(state.pitch, target.pitch, 3, elapsed, ANGLE_EPSILON)
    state.roll = damp(state.roll, target.roll, 3, elapsed, ANGLE_EPSILON)
  }
  state.settled = state.height === target.height && state.pitch === target.pitch && state.roll === target.roll
  return !state.settled
}
