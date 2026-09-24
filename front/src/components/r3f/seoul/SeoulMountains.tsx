import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

const COLUMNS = 240
const ROWS = 16
const CREST = 11 / ROWS

type RidgeSpec = {
  seed: number
  front: number
  depth: number
  height: number
  rock: string
  vegetation: string
  profile: number[]
}

const RIDGES: RidgeSpec[] = [
  {
    seed: 19, front: -164, depth: 36, height: 42,
    rock: '#34485f', vegetation: '#213449',
    profile: [.43, .68, .53, .84, .61, .94, .72, .49, .76, 1, .64, .51, .83, .69, .97, .56, .73, .91, .58, .79, .46],
  },
  {
    seed: 47, front: -132, depth: 37, height: 35,
    rock: '#30445d', vegetation: '#1a2e44',
    profile: [.56, .82, .64, .96, .54, .73, .91, .61, .44, .71, .56, .89, .67, 1, .73, .48, .85, .62, .94, .67, .49],
  },
  {
    seed: 83, front: -100, depth: 39, height: 28,
    rock: '#2e425c', vegetation: '#15293e',
    profile: [.49, .71, .97, .64, .83, .57, .94, .76, .52, .39, .56, .45, .72, .91, .61, .81, 1, .68, .84, .57, .44],
  },
]

function hash(x: number, z: number, seed: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function noise(x: number, z: number, seed: number) {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = x - ix, fz = z - iz
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iz, seed), hash(ix + 1, iz, seed), u),
    THREE.MathUtils.lerp(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), u),
    v,
  )
}

function makeRidge(spec: RidgeSpec) {
  const count = (COLUMNS + 1) * (ROWS + 1)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const gullies = new Float32Array(count)
  const indices: number[] = []

  for (let row = 0; row <= ROWS; row++) {
    const t = row / ROWS
    const crossSection = t <= CREST
      ? Math.pow(t / CREST, .86)
      : Math.pow((1 - t) / (1 - CREST), .7)

    for (let col = 0; col <= COLUMNS; col++) {
      const i = row * (COLUMNS + 1) + col
      const x = -200 + col * 400 / COLUMNS
      // The crest branches into offset spurs as it descends toward the city.
      const drift = (noise(x * .038, t * 2, spec.seed) - .5) * 14 * (1 - crossSection)
      const sampleX = THREE.MathUtils.clamp((x + drift + 200) / 400, 0, 1)
      const segment = sampleX * (spec.profile.length - 1)
      const anchor = Math.min(Math.floor(segment), spec.profile.length - 2)
      const fraction = segment - anchor
      const rounded = fraction * fraction * (3 - 2 * fraction)
      const peak = THREE.MathUtils.lerp(spec.profile[anchor], spec.profile[anchor + 1], fraction * .45 + rounded * .55)
      const crags = (noise(x * .23, t * 3, spec.seed + 9) - .5) * 2.7
        + (hash(col, row, spec.seed + 3) - .5) * .65

      // Narrow, wandering channels remove actual surface relief, including at saddles.
      const channelX = x + drift * .7
      const channelCell = Math.floor(channelX / 22)
      let gully = 0
      for (let cell = channelCell - 1; cell <= channelCell + 1; cell++) {
        const center = (cell + .2 + hash(cell, 0, spec.seed) * .6) * 22
          + (noise(cell * .7, t * 3, spec.seed + 5) - .5) * 9
        const width = 2.2 + (1 - crossSection) * 2.3
        gully = Math.max(gully, Math.max(0, 1 - Math.abs(channelX - center) / width))
      }
      const carving = gully * (2.1 + (1 - crossSection) * 3.2)
      const height = THREE.MathUtils.clamp(peak * (spec.height - 2) + crags - carving, 1, spec.height - 2)
      positions[i * 3] = x
      positions[i * 3 + 1] = 2 + crossSection * height
      positions[i * 3 + 2] = spec.front - t * spec.depth
      gullies[i] = gully
    }
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const a = row * (COLUMNS + 1) + col
      const b = a + 1, c = a + COLUMNS + 1, d = c + 1
      // Alternate diagonals so the slopes do not show a repeated triangulation grain.
      if ((row + col) % 2) indices.push(a, b, c, b, d, c)
      else indices.push(a, b, d, a, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const normals = geometry.getAttribute('normal')
  const rock = new THREE.Color(spec.rock)
  const vegetation = new THREE.Color(spec.vegetation)
  const color = new THREE.Color()
  const light = new THREE.Vector3(-.45, .7, .55).normalize()
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2]
    const patch = noise(x * .12, z * .17, spec.seed + 21)
    const grain = noise(x * .59, z * .43, spec.seed + 31) - .5
    const steepness = 1 - Math.abs(normals.getY(i))
    const exposure = normals.getX(i) * light.x + normals.getY(i) * light.y + normals.getZ(i) * light.z
    const rocky = THREE.MathUtils.clamp(.12 + steepness * .8 + y / spec.height * .45 - patch * .45, 0, 1)
    color.copy(vegetation).lerp(rock, rocky)
    color.multiplyScalar(.8 + exposure * .3 + grain * .14 - gullies[i] * .24)
    color.toArray(colors, i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeBoundingSphere()
  return geometry
}

/** City-local terrain: parent supplies the -6.95 Y offset; flood level is 4.25. */
export default function SeoulMountains() {
  const geometries = useMemo(() => RIDGES.map(makeRidge), [])
  const material = useMemo(() => {
    const result = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })
    // City fog is tuned to nearby architecture; distant terrain needs a longer falloff.
    result.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTerrainPosition;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTerrainPosition = position;')
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vTerrainPosition;
        float terrainHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float terrainNoise(vec2 p) {
          vec2 cell = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
          return mix(mix(terrainHash(cell), terrainHash(cell + vec2(1., 0.)), u.x),
            mix(terrainHash(cell + vec2(0., 1.)), terrainHash(cell + vec2(1., 1.)), u.x), u.y);
        }
      `).replace('#include <color_fragment>', `#include <color_fragment>
        vec2 ground = vTerrainPosition.xy + vec2(vTerrainPosition.z * .18, 0.);
        float rockPatch = terrainNoise(ground * .42) * .55
          + terrainNoise(ground * .93 + 17.3) * .3
          + terrainNoise(ground * 1.87 + 31.7) * .15;
        float stone = smoothstep(.32, .68, rockPatch) * smoothstep(5., 23., vTerrainPosition.y);
        vec2 grainPoint = ground * 2.8;
        float grainVisibility = 1.0 - smoothstep(.3, 1.3, length(fwidth(grainPoint)));
        float grain = (terrainNoise(grainPoint) - .5) * grainVisibility;
        diffuseColor.rgb *= .87 + stone * .2 + grain * .09;
      `)
      shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', THREE.ShaderChunk.fog_fragment.replace(
        '- fogDensity * fogDensity * vFogDepth * vFogDepth',
        '- fogDensity * fogDensity * vFogDepth * vFogDepth * 0.27',
      ))
    }
    result.customProgramCacheKey = () => 'seoul-terrain-atmosphere-v2'
    return result
  }, [])
  useEffect(() => () => geometries.forEach(geometry => geometry.dispose()), [geometries])
  useEffect(() => () => material.dispose(), [material])

  return <group name="Seoul mountain ridges">
    {geometries.map((geometry, index) => <mesh key={index} geometry={geometry} material={material} />)}
  </group>
}
