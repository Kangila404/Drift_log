export interface LightningSample { strength: number; x: number; y: number }
const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n) }
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t) }

// One subdued flash per uneven 20-44 second interval; no rapid repeated strobe.
export function sampleStormLightning(time: number, enabled: boolean,
  out: LightningSample = { strength: 0, x: 0, y: .3 }): LightningSample {
  const t = Math.max(0, time), event = Math.floor(t / 32)
  const start = 8 + random(event + 4) * 12
  const age = t - event * 32 - start
  out.strength = enabled ? smooth(0, .1, age) * (1-smooth(.14, 1.05, age)) * (.65 + random(event+19)*.35) : 0
  out.x = (random(event+31)-.5) * 1.1
  out.y = .2 + random(event+53)*.16
  return out
}
