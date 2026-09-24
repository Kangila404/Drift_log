export interface OceanSample { height: number; slopeX: number; slopeZ: number }
export interface OceanSurfaceState { time: number; scale: number; speed: number; wind: number }

// Short wave groups have independent phase warps and envelopes, not endless rows.
const SWELLS = [[.043, -.017, .31, .13, .4], [-.026, -.061, .27, .1, 2.3], [.081, -.035, .42, .07, 4.1]] as const
const WIND_WAVES = [
  [.27, -.49, 1.14, .3, .73], [-.41, -.29, .93, .25, 2.19],
  [.51, -.17, 1.37, .195, 4.81], [-.18, -.73, 1.63, .15, 1.37],
  [.67, -.58, 1.81, .11, 3.46], [-.79, -.34, 2.07, .075, 5.91],
] as const
const glsl = (n: number) => Number.isInteger(n) ? `${n}.0` : String(n)
const terms = (rows: readonly (readonly number[])[], packet: boolean) => rows.map(([x,z,rate,amp,phase]) =>
  `${packet ? 'chop' : 'swell'} += ${packet ? 'waveGroup' : 'wave'}(p, vec2(${glsl(x)},${glsl(z)}), t * ${glsl(rate)} + ${glsl(phase)}, ${glsl(amp)}${packet ? ' * wind' : ''}${packet ? `, t, ${glsl(phase)}` : ''});`).join('\n')

export const oceanWaveShader = /* glsl */ `
  vec3 wave(vec2 p, vec2 k, float phase, float amplitude) {
    float a = dot(p, k) + phase;
    return amplitude * vec3(sin(a), cos(a) * k);
  }
  vec3 waveGroup(vec2 p, vec2 k, float phase, float amplitude, float t, float seed) {
    vec2 e = vec2(k.y, -k.x) * .29;
    vec2 b = k * .17 + vec2(.017, -.011);
    float q = dot(p, e) + t * .13 + seed * 2.31;
    float r = dot(p, b) - t * .09 + seed * 3.17;
    float s = sin(q), c = cos(r);
    float envelope = .1 + .225 * (1.0 + s) * (1.0 + c);
    vec2 envelopeSlope = .225 * (cos(q) * e * (1.0 + c) - sin(r) * b * (1.0 + s));
    float a = dot(p, k) + phase + 1.7 * s + .85 * c;
    vec2 phaseSlope = k + 1.7 * cos(q) * e - .85 * sin(r) * b;
    return amplitude * vec3(envelope * sin(a), envelopeSlope * sin(a) + envelope * cos(a) * phaseSlope);
  }
  vec3 oceanSwell(vec2 p, float t, float wind) {
    vec3 swell = vec3(0.0);
    ${terms(SWELLS, false)}
    vec3 chop = vec3(0.0);
    ${terms(WIND_WAVES, true)}
    float farT = clamp((-p.y - 50.0) / 100.0, 0.0, 1.0);
    float resolved = 1.0 - farT * farT * (3.0 - 2.0 * farT);
    swell += chop * resolved;
    swell.z += chop.x * 6.0 * farT * (1.0 - farT) / 100.0;
    return swell;
  }
`

export function sampleOceanSurface(x: number, z: number, time: number, scale: number, speed: number, wind: number,
  out: OceanSample = { height: 0, slopeX: 0, slopeZ: 0 }): OceanSample {
  const t = time * speed
  let height = 0, dx = 0, dz = 0
  for (const [kx,kz,rate,amp,phase] of SWELLS) {
    const a = x*kx + z*kz + t*rate + phase
    height += amp * Math.sin(a)
    dx += amp * Math.cos(a) * kx
    dz += amp * Math.cos(a) * kz
  }
  let chopHeight = 0, chopX = 0, chopZ = 0
  for (const [kx,kz,rate,amplitude,seed] of WIND_WAVES) {
    const ex = kz*.29, ez = -kx*.29, bx = kx*.17+.017, bz = kz*.17-.011
    const q = x*ex + z*ez + t*.13 + seed*2.31, r = x*bx + z*bz - t*.09 + seed*3.17
    const s = Math.sin(q), c = Math.cos(r), cq = Math.cos(q), sr = Math.sin(r)
    const envelope = .1 + .225*(1+s)*(1+c)
    const a = x*kx + z*kz + t*rate + seed + 1.7*s + .85*c
    const sin = Math.sin(a), cos = Math.cos(a), amp = amplitude*wind
    chopHeight += amp*envelope*sin
    chopX += amp*(.225*(cq*ex*(1+c)-sr*bx*(1+s))*sin + envelope*cos*(kx+1.7*cq*ex-.85*sr*bx))
    chopZ += amp*(.225*(cq*ez*(1+c)-sr*bz*(1+s))*sin + envelope*cos*(kz+1.7*cq*ez-.85*sr*bz))
  }
  // The stretched far mesh cannot resolve short crests; retain only long swell there.
  const farT = Math.max(0, Math.min(1, (-z - 50) / 100))
  const resolved = 1 - farT*farT*(3-2*farT)
  height += chopHeight * resolved
  dx += chopX * resolved
  dz += chopZ * resolved + chopHeight * 6*farT*(1-farT)/100
  const f = Math.max(0, Math.min(1, (z+200)/180))
  const smooth = f*f*(3-2*f), fade = Math.max(.3, smooth)
  const derivative = smooth > .3 ? 6*f*(1-f)/180 : 0
  out.height = height*scale*fade
  out.slopeX = dx*scale*fade
  out.slopeZ = (dz*fade+height*derivative)*scale
  return out
}
