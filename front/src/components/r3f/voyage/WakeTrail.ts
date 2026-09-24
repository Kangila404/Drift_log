export interface WakePoint { x: number; z: number; heading: number; age: number; strength: number; seed: number }
export interface WakePose { x: number; heading: number; speed: number }
export const WAKE_LIFETIME = 2.2
export const WAKE_CAPACITY = 26
export const WAKE_STERN_Z = 3.96

export function createWakeTrail() {
  return { points: [] as WakePoint[], accumulator: 0, serial: 0, speed: 0 }
}
export type WakeTrail = ReturnType<typeof createWakeTrail>

// Coordinates are in the shared sea, not parented to the boat's steering group.
export function advanceWakeTrail(trail: WakeTrail, pose: WakePose, delta: number) {
  const dt = Math.min(.05, Math.max(0, Number.isFinite(delta) ? delta : 0))
  if (dt === 0) return
  trail.speed = Math.max(0, Math.min(1, pose.speed))
  for (const point of trail.points) {
    point.age += dt
    point.z += (trail.speed * 2.6 + .18) * dt
  }
  while (trail.points.length && trail.points[trail.points.length - 1].age > WAKE_LIFETIME) trail.points.pop()
  trail.accumulator += dt
  if (trail.accumulator >= .1) {
    trail.accumulator %= .1
    if (trail.speed > .025) {
      trail.points.unshift({ x: pose.x + Math.sin(pose.heading) * WAKE_STERN_Z,
        z: -4 + Math.cos(pose.heading) * WAKE_STERN_Z, heading: pose.heading,
        age: 0, strength: trail.speed, seed: trail.serial++ })
      if (trail.points.length > WAKE_CAPACITY) trail.points.pop()
    }
  }
}

export function wakeEnvelope(age: number) {
  const t = Math.max(0, Math.min(1, age / WAKE_LIFETIME))
  return (1 - t) ** 1.7
}
