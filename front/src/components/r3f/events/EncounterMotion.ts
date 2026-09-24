export const ENCOUNTER_DURATION = 12
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export function encounterOpacity(time: number) {
  return smooth(0, 1.8, time) * (1 - smooth(9, ENCOUNTER_DURATION, time))
}
export function breach(time: number, offset: number) {
  const t = Math.max(0, Math.min(1, (time - offset) / 4.2))
  return { height: Math.sin(t * Math.PI), pitch: (1 - 2 * t) * .3 }
}
