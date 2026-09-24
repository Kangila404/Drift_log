type Pattern = {
  azimuth: number
  elevation: number
  points: [number, number][]
  edges: [number, number][]
}

// Small asterisms, separated around the horizon rather than one frontal sky chart.
export const CONSTELLATION_PATTERNS: readonly Pattern[] = [
  { azimuth: -24, elevation: 16, points: [[-4, 1], [-3.5, -1], [-1.4, -.8], [-1.6, .9], [.2, 1.5], [2, 1.8], [3.7, 1.1]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
  { azimuth: 33, elevation: 15, points: [[-3, 1.2], [-1.5, -1], [0, .7], [1.7, -.9], [3, 1.5]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  { azimuth: 110, elevation: 22, points: [[-2, 2], [-.6, .6], [1.5, .9], [2.2, -1.2], [0, -1.4]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]] },
  { azimuth: 157, elevation: 17, points: [[-.8, 2.4], [0, .7], [1, -1.9], [-2.7, -.4], [2.8, 1.1]], edges: [[0, 1], [1, 2], [3, 1], [1, 4]] },
  { azimuth: 237, elevation: 21, points: [[-2, 2], [1.6, 1.5], [-.5, .2], [0, 0], [.5, -.2], [-1.7, -2], [2, -1.7]], edges: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
  { azimuth: 288, elevation: 16, points: [[-3, 1.1], [-2.1, -.5], [-.7, -1.2], [.9, -.9], [2.3, -.2], [3, 1.3]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
]

export const CONSTELLATION_LINE_OPACITY = .035
export const CONSTELLATION_STAR_OPACITY = .34

export function constellationVisibility(isMoon: boolean, weatherStars: number, starOpacityScale: number) {
  return isMoon ? Math.max(0, Math.min(1, weatherStars)) * Math.max(0, Math.min(1, starOpacityScale)) : 0
}

export function createConstellationField() {
  const points: number[] = [], lines: number[] = []
  const pointPhases: number[] = [], linePhases: number[] = []
  CONSTELLATION_PATTERNS.forEach((pattern, i) => {
    const az = pattern.azimuth * Math.PI / 180, el = pattern.elevation * Math.PI / 180
    const center = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]
    const right = [Math.cos(az), 0, Math.sin(az)]
    const up = [-Math.sin(az) * Math.sin(el), Math.cos(el), Math.cos(az) * Math.sin(el)]
    const vertices = pattern.points.map(([x, y]) => {
      const v = center.map((c, axis) => c + (right[axis] * x + up[axis] * y) * .016)
      const length = Math.hypot(...v)
      return v.map(c => c * 180 / length)
    })
    vertices.forEach(v => { points.push(...v); pointPhases.push(i * 1.73) })
    pattern.edges.forEach(([a, b]) => {
      lines.push(...vertices[a], ...vertices[b])
      linePhases.push(i * 1.73, i * 1.73)
    })
  })
  return {
    points: new Float32Array(points), lines: new Float32Array(lines),
    pointPhases: new Float32Array(pointPhases), linePhases: new Float32Array(linePhases),
  }
}
