import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useVoyageStore } from '../../stores/voyageStore'
import { useBoatStore, type BoatColors } from '../../stores/boatStore'
import type { ScenePreset } from '../../constants/scenePreset'
import Campfire from './Campfire'

/** hex 색을 factor만큼 어둡게 (factor < 1) */
function shade(hex: string, factor: number) {
  return '#' + new THREE.Color(hex).multiplyScalar(factor).getHexString()
}
/** hex 색을 흰색 쪽으로 amt만큼 밝게 (0~1) */
function tint(hex: string, amt: number) {
  return '#' + new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amt).getHexString()
}

// ── 녹(rust) ──
const RUST_COLOR = '#357f6e'      // 녹청 (구리 부식 톤)
const RUST_FULL_SEC = 1200        // 항해 누적 ~20분이면 최대 녹
const RUST_FLUSH_SEC = 4          // 4초마다 store 반영 (localStorage 쓰기 빈도 제한)
/** hex를 녹색 쪽으로 amt만큼 섞기 (0~1) */
function rustMix(hex: string, amt: number) {
  if (amt <= 0) return hex
  return '#' + new THREE.Color(hex).lerp(new THREE.Color(RUST_COLOR), Math.min(1, amt)).getHexString()
}

// ── 따개비 색 (칙칙한 회백색) ──
const BARNACLE_COLOR = '#b8b3a2'

function Line({ points, opacity = 0.55 }: { points: [number, number, number][]; opacity?: number }) {
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setFromPoints(points.map((p) => new THREE.Vector3(...p)))
    const m = new THREE.LineBasicMaterial({ color: '#b8c4c8', transparent: true, opacity })
    return new THREE.Line(g, m)
  }, [points, opacity])
  return <primitive object={obj} />
}

function Sail({ side, color }: { side: -1 | 1; color: string }) {
  const rows = 20, cols = 10
  const fold = useRef(0)

  const { geometry, basePos, foldPos } = useMemo(() => {
    const base: number[] = []
    const folded: number[] = []
    const indices: number[] = []
    for (let y = 0; y <= rows; y++) {
      const v = y / rows
      const height = -0.95 + v * 2.25
      const width = 0.72 * (1 - v * 0.76)
      for (let x = 0; x <= cols; x++) {
        const u = x / cols
        const z = -0.32 + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.1
        base.push(side * width * u, height, z)

        const fHeight = -0.95 + (height + 0.95) * 0.12
        const bunch = Math.sin(v * Math.PI * 5) * 0.05 * (1 - u)
        const fWidth = 0.72 * 0.5 * (1 - v * 0.3)
        folded.push(side * fWidth * u + side * bunch, fHeight, z * 0.6)
      }
    }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const a = y * (cols + 1) + x, b = a + cols + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return { geometry: g, basePos: Float32Array.from(base), foldPos: Float32Array.from(folded) }
  }, [side])

  useFrame(() => {
    const paused = useVoyageStore.getState().voyageState === 'PAUSED'
    const target = paused ? 0.88 : 0
    fold.current += (target - fold.current) * 0.05
    const f = fold.current
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < arr.length; i++) arr[i] = basePos[i] + (foldPos[i] - basePos[i]) * f
    pos.needsUpdate = true
    if (f > 0.002 && f < 0.998) geometry.computeVertexNormals()
  })

  return (
    <group position={[0, 1.86, -0.42]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.84} transparent opacity={0.96} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function buildHullGeometry() {
  const LEN = 32
  const RIB = 20

  const positions: number[] = []
  const indices: number[] = []

  const taper = (t: number) => Math.pow(Math.sin(t * Math.PI), 0.62)
  const widthAt = (t: number) => 0.16 + 1.20 * taper(t)
  const depthAt = (t: number) => 0.20 + 0.66 * taper(t)
  const sheerAt = (t: number) => 0.20 + Math.pow(t, 1.7) * 0.40

  const sectionPoint = (a: number, halfW: number, depth: number, top: number): [number, number] => {
    const ang = a * Math.PI
    const round = Math.cos(ang)
    const x = Math.sign(round) * Math.pow(Math.abs(round), 0.82) * halfW
    const floor = Math.pow(Math.sin(ang), 1.7)
    const y = top - depth * floor
    return [x, y]
  }

  const zAt = (t: number) => -1.55 + t * 3.0
  const cols = RIB + 1

  for (let i = 0; i <= LEN; i++) {
    const t = i / LEN
    const halfW = widthAt(t), depth = depthAt(t), top = sheerAt(t), z = zAt(t)
    for (let j = 0; j <= RIB; j++) {
      const [x, y] = sectionPoint(j / RIB, halfW, depth, top)
      positions.push(x, y, z)
    }
  }

  for (let i = 0; i < LEN; i++)
    for (let j = 0; j < RIB; j++) {
      const a = i * cols + j, b = a + cols
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }

  const addCap = (ring: number, t: number, flip: boolean) => {
    const center = positions.length / 3
    positions.push(0, sheerAt(t) - depthAt(t) * 0.5, zAt(t))
    const base = ring * cols
    for (let j = 0; j < RIB; j++) {
      const p0 = base + j, p1 = base + j + 1
      if (flip) indices.push(center, p1, p0)
      else indices.push(center, p0, p1)
    }
  }
  addCap(0, 0, false)
  addCap(LEN, 1, true)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function Jib({ color }: { color: string }) {
  const rows = 16, cols = 6
  const fold = useRef(0)

  const { geometry, basePos, foldPos } = useMemo(() => {
    const base: number[] = []
    const folded: number[] = []
    const indices: number[] = []
    for (let y = 0; y <= rows; y++) {
      const v = y / rows
      const height = -0.6 + v * 1.7
      const fwd = (1 - v) * 0.95
      const luff = v * 0.05
      for (let x = 0; x <= cols; x++) {
        const u = x / cols
        const zFront = -0.1 - fwd * u
        base.push(luff * 0.2, height, zFront)
        const fHeight = -0.6 + (height + 0.6) * 0.15
        const fZ = -0.1 - fwd * u * 0.18
        folded.push(0, fHeight, fZ)
      }
    }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const a = y * (cols + 1) + x, b = a + cols + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return { geometry: g, basePos: Float32Array.from(base), foldPos: Float32Array.from(folded) }
  }, [])

  useFrame(() => {
    const paused = useVoyageStore.getState().voyageState === 'PAUSED'
    const target = paused ? 0.88 : 0
    fold.current += (target - fold.current) * 0.05
    const f = fold.current
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < arr.length; i++) arr[i] = basePos[i] + (foldPos[i] - basePos[i]) * f
    pos.needsUpdate = true
    if (f > 0.002 && f < 0.998) geometry.computeVertexNormals()
  })

  return (
    <group position={[0, 1.5, -0.42]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.84} transparent opacity={0.94} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function CrowsNest() {
  const wood = '#6b4f33'
  return (
    <group position={[0, 3.05, -0.42]}>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.05, 16]} />
        <meshStandardMaterial color={wood} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.17, 0.16, 0.22, 16, 1, true]} />
        <meshStandardMaterial color={wood} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.012, 8, 20]} />
        <meshStandardMaterial color="#4a3724" roughness={0.8} />
      </mesh>
    </group>
  )
}

function Telescope() {
  const brass = '#9a8458'
  const metal = '#3a2f22'
  return (
    <group position={[0, 0.70, -1.0]} rotation={[0, 0, 0]}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.07, -0.1, Math.sin(a) * 0.07]} rotation={[0.32 * Math.cos(a + Math.PI), 0, 0.32 * Math.sin(a + Math.PI)]}>
            <cylinderGeometry args={[0.01, 0.01, 0.3, 6]} />
            <meshStandardMaterial color={metal} roughness={0.7} metalness={0.4} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.06, -0.04]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.04, 0.34, 12]} />
        <meshStandardMaterial color={brass} roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.18, -0.16]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 12]} />
        <meshStandardMaterial color="#c8b88a" roughness={0.4} metalness={0.7} />
      </mesh>
    </group>
  )
}

function buildDeckGeometry() {
  const LEN = 32, WSEG = 6
  const positions: number[] = []
  const indices: number[] = []
  const taper = (t: number) => Math.pow(Math.sin(t * Math.PI), 0.62)
  const widthAt = (t: number) => 0.16 + 1.20 * taper(t)
  const sheerAt = (t: number) => 0.20 + Math.pow(t, 1.7) * 0.40
  const zAt = (t: number) => -1.55 + t * 3.0
  const cols = WSEG + 1
  for (let i = 0; i <= LEN; i++) {
    const t = i / LEN
    const hw = widthAt(t) * 0.9
    const y = sheerAt(t)
    const z = zAt(t)
    for (let j = 0; j <= WSEG; j++) {
      const a = j / WSEG
      positions.push((-1 + 2 * a) * hw, y, z)
    }
  }
  for (let i = 0; i < LEN; i++)
    for (let j = 0; j < WSEG; j++) {
      const a = i * cols + j, b = a + cols
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

// ── 따개비 ─────────────────────────────────────────────────
// 환공포증 방지: 군집/구멍 패턴 없이 드문드문 "각진 저폴리 덩어리 + 작은 동반 1개".
// rust(시각용 추적값) 비례로 개수/크기/투명도 증가. 청소 시 부드럽게 사라짐.
const BARNACLE_SLOTS = 10

function Barnacles({ rust }: { rust: number }) {
  const slots = useMemo(() => {
    return Array.from({ length: BARNACLE_SLOTS }, (_, i) => {
      const n = (k: number) => (((i * 13 + k * 37) % 100) / 100)  // 0~1 deterministic
      const side = i % 2 === 0 ? 1 : -1
      const t = 0.18 + n(1) * 0.64
      const z = -1.55 + t * 3.0 - 0.42
      const halfW = 0.16 + 1.20 * Math.pow(Math.sin(t * Math.PI), 0.62)
      const x = side * halfW * (0.62 + n(2) * 0.3)
      const y = -0.18 - n(3) * 0.16
      const baseR = 0.05 + n(4) * 0.055
      const appearAt = 0.15 + (i / BARNACLE_SLOTS) * 0.7
      const tilt = (n(5) - 0.5) * 0.6
      const spin = n(8) * Math.PI
      return { x, y, z, side, baseR, appearAt, tilt, spin, hasBuddy: n(6) > 0.45, buddyAng: n(7) * Math.PI * 2 }
    })
  }, [])

  if (rust <= 0.02) return null

  return (
    <group>
      {slots.map((s, i) => {
        if (rust < s.appearAt) return null
        const grow = Math.min(1, (rust - s.appearAt) / 0.25)
        if (grow <= 0.001) return null
        const r = s.baseR * (0.5 + grow * 0.5)
        const op = (0.55 + grow * 0.4) * Math.min(1, grow * 2)
        return (
          <group
            key={i}
            position={[s.x, s.y, s.z]}
            rotation={[s.spin, s.spin * 0.7, s.side * (0.4 + s.tilt)]}
          >
            {/* 각진 저폴리 덩어리 (납작하게 눌러 더께 느낌, 윤곽은 둥글어 안 징그러움) */}
            <mesh scale={[1, 0.55, 1]}>
              <dodecahedronGeometry args={[r, 0]} />
              <meshStandardMaterial color={BARNACLE_COLOR} roughness={0.95} flatShading transparent opacity={op} />
            </mesh>
            {/* 작은 동반 1개 (군집 아님) */}
            {s.hasBuddy && grow > 0.45 && (
              <mesh
                position={[Math.cos(s.buddyAng) * r * 1.6, 0, Math.sin(s.buddyAng) * r * 1.6]}
                rotation={[s.spin * 1.3, 0, 0]}
                scale={[1, 0.5, 1]}
              >
                <dodecahedronGeometry args={[r * 0.55, 0]} />
                <meshStandardMaterial color={shade(BARNACLE_COLOR, 0.9)} roughness={0.96} flatShading transparent opacity={op * 0.9} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

function Hull({ hull, hullShadow, lamp, rust }: { hull: string; hullShadow: string; lamp: string; rust: number }) {
  const hullGeo = useMemo(() => buildHullGeometry(), [])
  const deckGeo = useMemo(() => buildDeckGeometry(), [])

  return (
    <group>
      <mesh geometry={hullGeo} position={[0, -0.02, -0.42]}>
        <meshStandardMaterial color={hull} roughness={0.86} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={hullGeo} position={[0, -0.12, -0.42]} scale={[0.94, 0.82, 0.99]}>
        <meshStandardMaterial color={hullShadow} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 따개비 — 선체 하단에 rust 비례로 */}
      <Barnacles rust={rust} />

      <mesh geometry={deckGeo} position={[0, -0.015, -0.42]}>
        <meshStandardMaterial color="#6e4d31" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.47, -0.42]}>
        <boxGeometry args={[1.5, 0.36, 2.4]} />
        <meshStandardMaterial color="#6e4d31" roughness={0.9} />
      </mesh>
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.65, -0.42]}>
          <boxGeometry args={[0.016, 0.012, 2.3]} />
          <meshBasicMaterial color="#3d2819" transparent opacity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.80, -0.55]}>
        <boxGeometry args={[0.62, 0.3, 0.55]} />
        <meshStandardMaterial color="#7d6a52" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.97, -0.55]}>
        <boxGeometry args={[0.68, 0.04, 0.6]} />
        <meshStandardMaterial color="#5f5040" roughness={0.85} />
      </mesh>
      {([[-0.272, -0.008], [-0.828, 0.008]] as [number, number][]).map(([z, frameOff], i) => (
        <group key={i}>
          <mesh position={[0, 0.80, z]}>
            <boxGeometry args={[0.34, 0.12, 0.012]} />
            <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.80, z + frameOff]}>
            <boxGeometry args={[0.4, 0.18, 0.01]} />
            <meshStandardMaterial color="#5f5040" roughness={0.85} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0.81, -0.55]} color={lamp} intensity={0.4} distance={2.0} />

      {[-0.66, -0.33, 0.33, 0.66].map((x) => (
        <mesh key={x} position={[x, 0.59, -0.95]}>
          <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
          <meshStandardMaterial color="#c5cbc8" roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[0, 0.70, -0.95]}>
        <boxGeometry args={[1.2, 0.03, 0.03]} />
        <meshStandardMaterial color="#c5cbc8" roughness={0.65} />
      </mesh>

      <mesh position={[0, 0.6, -1.5]} rotation={[Math.PI / 2 + 0.16, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.03, 0.8, 10]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.66, -1.32]}>
        <cylinderGeometry args={[0.03, 0.04, 0.26, 8]} />
        <meshStandardMaterial color={shade(hull, 1.3)} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.56, -1.72]}>
        <boxGeometry args={[0.08, 0.12, 0.08]} />
        <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={1.0} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.64, -1.72]}>
        <boxGeometry args={[0.1, 0.04, 0.1]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
      </mesh>
      <pointLight position={[0, 0.56, -1.77]} color={lamp} intensity={0.6} distance={2.0} />
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.50, -1.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.022, 8, 20]} />
          <meshStandardMaterial color="#8a7253" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ─── 물결(파도) ─────────────────────────────────────────────
const WAKE_Y = -0.30

function WakeFX({ forceSailing = false }: { forceSailing?: boolean }) {
  const NUM_WAVES = 7
  const SEGS = 48

  const waves = useMemo(() => {
    return Array.from({ length: NUM_WAVES }, (_, i) => {
      const positions = new Float32Array((SEGS + 1) * 3)
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.LineBasicMaterial({
        color: '#9fd4ec', transparent: true, opacity: 0, depthWrite: false,
      })
      return { line: new THREE.Line(g, mat), mat, positions, offset: i / NUM_WAVES }
    })
  }, [])

  const rings = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const geo = new THREE.RingGeometry(0.92, 1.0, 80)
      const mat = new THREE.MeshBasicMaterial({
        color: '#9ad6f0', transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.scale.setScalar(0.0001)
      return { mesh, mat, start: -999 - i }
    })
  }, [])

  const lastRing = useRef(0)
  const sailFade = useRef(0)

  useFrame(({ clock }) => {
    const state = useVoyageStore.getState().voyageState
    const sailing = forceSailing || state === 'SAILING'
    const paused = !forceSailing && state === 'PAUSED'
    const t = clock.elapsedTime

    sailFade.current += ((sailing ? 1 : 0) - sailFade.current) * 0.05
    const fade = sailFade.current

    const SPEED = 0.12
    const Z_START = 0.0
    const Z_LEN = 6.0
    const WIDTH = 2.2

    waves.forEach((w) => {
      const p = (t * SPEED + w.offset) % 1
      const baseZ = Z_START + p * Z_LEN
      const spread = 0.25 + p * WIDTH
      const sink = Math.sin(p * Math.PI) * 0.06

      const arr = w.positions
      for (let s = 0; s <= SEGS; s++) {
        const u = (s / SEGS) * 2 - 1
        const x = u * spread
        const z = baseZ + Math.abs(u) * spread * 0.5
        const y = sink + Math.sin(u * Math.PI * 2 + t * 2) * 0.015
        arr[s * 3] = x
        arr[s * 3 + 1] = y
        arr[s * 3 + 2] = z
      }
      w.line.geometry.attributes.position.needsUpdate = true
      w.mat.opacity = Math.sin(p * Math.PI) * 0.5 * fade
    })

    const INTERVAL = 1.0, DUR = 3.4, MAX_R = 3.4
    if (paused && t - lastRing.current > INTERVAL) {
      const oldest = rings.reduce((a, b) => (a.start < b.start ? a : b))
      oldest.start = t
      lastRing.current = t
    }
    rings.forEach((r) => {
      const age = t - r.start
      if (age < 0 || age > DUR) { r.mat.opacity = 0; r.mesh.scale.setScalar(0.0001); return }
      const pr = age / DUR
      r.mesh.scale.setScalar(0.6 + pr * MAX_R)
      r.mat.opacity = (1 - pr) * 0.4
    })
  })

  return (
    <group position={[0, WAKE_Y, 0]}>
      {waves.map((w, i) => <primitive key={`wv${i}`} object={w.line} />)}
      {rings.map((r, i) => <primitive key={`rg${i}`} object={r.mesh} />)}
    </group>
  )
}

// VoyagePage의 <Wake /> 가 깨지지 않도록 남겨둔 빈 컴포넌트
export function Wake() {
  return null
}

function AnchorMesh() {
  const metal = '#9aa1a6'
  return (
    <group scale={0.5}>
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.018, 8, 16]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.62, 10]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.33, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.34, 8]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 0.46, 8]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
      </mesh>
      {[1, -1].map((d) => (
        <mesh key={d} position={[d * 0.23, -0.12, 0]} rotation={[0, 0, d * 0.7]}>
          <coneGeometry args={[0.05, 0.13, 6]} />
          <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Anchor() {
  const groupRef = useRef<THREE.Group>(null)
  const progress = useRef(0)

  const ANCHOR_X = 1.0
  const ANCHOR_Z = 0.45
  const STOW_Y = 0.46
  const DOWN_Y = -1.7
  const HAWSE: [number, number, number] = [ANCHOR_X, 0.52, ANCHOR_Z]

  const chain = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(6).fill(0), 3))
    const m = new THREE.LineBasicMaterial({ color: '#8a9196', transparent: true, opacity: 0.85 })
    return new THREE.Line(g, m)
  }, [])

  useFrame(() => {
    const paused = useVoyageStore.getState().voyageState === 'PAUSED'
    const target = paused ? 1 : 0
    progress.current += (target - progress.current) * 0.04
    const p = progress.current
    const y = STOW_Y + (DOWN_Y - STOW_Y) * p

    if (groupRef.current) groupRef.current.position.set(ANCHOR_X, y, ANCHOR_Z)

    const pos = chain.geometry.attributes.position as THREE.BufferAttribute
    pos.setXYZ(0, HAWSE[0], HAWSE[1], HAWSE[2])
    pos.setXYZ(1, ANCHOR_X, y + 0.22, ANCHOR_Z)
    pos.needsUpdate = true
  })

  return (
    <group>
      <primitive object={chain} />
      <group ref={groupRef} position={[ANCHOR_X, STOW_Y, ANCHOR_Z]}>
        <AnchorMesh />
      </group>
    </group>
  )
}

function BoatModel({ colors, rust }: { colors: BoatColors; rust: number }) {
  const hullShadow = shade(colors.hull, 0.5)
  const sailMain = colors.sail
  const sailSub = shade(colors.sail, 0.93)

  return (
    <group>
      <Hull hull={colors.hull} hullShadow={hullShadow} lamp={colors.lamp} rust={rust} />
      <Anchor />
      <Telescope />
      <mesh position={[0,2.05,-0.42]}>
        <cylinderGeometry args={[0.035,0.055,3.25,18]} />
        <meshStandardMaterial color="#24180f" roughness={0.78} />
      </mesh>
      <mesh position={[0,1.14,-0.42]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[0.026,0.032,1.72,12]} />
        <meshStandardMaterial color="#24180f" roughness={0.78} />
      </mesh>
      <Sail side={-1} color={sailSub} />
      <Sail side={1} color={sailMain} />
      <Jib color={tint(sailMain, 0.06)} />
      <CrowsNest />
      <Line points={[[0,3.68,-0.42],[-1.25,0.26,-0.4]]} opacity={0.58} />
      <Line points={[[0,3.68,-0.42],[1.25,0.26,-0.4]]} opacity={0.58} />
      <Line points={[[0,3.68,-0.42],[0,0.3,-0.4]]}     opacity={0.42} />
      <Line points={[[-1.08,0.9,-0.45],[1.08,0.9,-0.45]]} opacity={0.38} />
      <mesh position={[-0.92, 0.52, 0.45]}>
        <sphereGeometry args={[0.04,12,12]} />
        <meshBasicMaterial color="#d84d45" />
      </mesh>
      <mesh position={[0.92, 0.52, 0.45]}>
        <sphereGeometry args={[0.04,12,12]} />
        <meshBasicMaterial color="#65d074" />
      </mesh>
      <mesh position={[0,3.72,-0.42]}>
        <sphereGeometry args={[0.055,14,14]} />
        <meshBasicMaterial color="#f8e3a4" />
      </mesh>
      <pointLight position={[0,3.72,-0.42]} color="#f8e3a4" intensity={0.5} distance={4.4} />
    </group>
  )
}

interface BoatProps {
  preset?: ScenePreset
  forceSailing?: boolean
  fireActive?: boolean
}

export default function Boat({ preset, forceSailing, fireActive = false }: BoatProps) {
  const boatRef = useRef<THREE.Group>(null)
  const colors = useBoatStore((s) => s.colors)
  const rust = useBoatStore((s) => s.rust)

  // 로그인 후 1회: 서버에 저장된 보트 색 불러오기
  useEffect(() => {
    useBoatStore.getState().loadFromServer()
  }, [])

  // 시각용 rust — store rust를 lerp로 부드럽게 추적 (청소 시 스르륵 빠짐)
  const displayRustRef = useRef(rust)
  const [displayRust, setDisplayRust] = useState(rust)

  useFrame(() => {
    const target = rust
    const cur = displayRustRef.current
    if (Math.abs(target - cur) > 0.001) {
      displayRustRef.current = cur + (target - cur) * 0.12
      setDisplayRust(displayRustRef.current)
    } else if (cur !== target) {
      displayRustRef.current = target
      setDisplayRust(target)
    }
  })

  // 녹 적용 — displayRust(추적값) 기준
  const displayColors = useMemo<BoatColors>(() => ({
    sail: rustMix(colors.sail, displayRust * 0.45),
    hull: rustMix(colors.hull, displayRust * 0.9),
    lamp: colors.lamp,
  }), [colors, displayRust])

  const isDark = preset?.celestialBody === 'moon'
  const isStorm = preset?.effects?.includes('wind') ?? false
  const lampOn = isDark || isStorm

  // 항해 중 녹 누적 (4초마다 store 반영)
  const rustAccum = useRef(0)
  const rustFlush = useRef(0)

  useFrame((state, delta) => {
    const vs = useVoyageStore.getState().voyageState
    const sailing = forceSailing || vs === 'SAILING'

    // 녹은 항해 중일 때만 누적
    if (sailing) {
      rustAccum.current += delta
      rustFlush.current += delta
      if (rustFlush.current >= RUST_FLUSH_SEC) {
        useBoatStore.getState().addRust(rustAccum.current / RUST_FULL_SEC)
        rustAccum.current = 0
        rustFlush.current = 0
      }
    }

    const isPaused = !forceSailing && vs === 'PAUSED'
    if (!boatRef.current) return

    if (isPaused) {
      boatRef.current.position.y = 0
      boatRef.current.rotation.z = 0
      boatRef.current.rotation.x = 0
      return
    }

    const intensity = Math.min(preset?.waveScale ?? 1.0, 1.3)
    const speed = preset?.waveSpeed ?? 1.0
    const t = state.clock.elapsedTime * speed

    const amp = 0.04 * intensity
    boatRef.current.position.y = amp + Math.sin(t * 1.0) * amp
    boatRef.current.rotation.z = Math.sin(t * 0.72) * 0.012 * intensity
    boatRef.current.rotation.x = Math.sin(t * 0.55) * 0.008 * intensity
  })

  return (
    <group position={[0, -2.0, -4]} scale={1.8}>
      <WakeFX forceSailing={forceSailing} />

      <group ref={boatRef}>
        <BoatModel colors={displayColors} rust={displayRust} />

        {/* 모닥불 — 갑판 위, 배 출렁임 따라 흔들림 */}
        <Campfire active={fireActive} position={[0, 0.66, 0.2]} scale={0.6} />

        {lampOn && (
          <>
            <pointLight position={[0, 1.5, -0.2]} color={colors.lamp} intensity={2.4} distance={10} decay={1.4} />
            <pointLight position={[0, 0.6, 0.4]} color={tint(colors.lamp, 0.1)} intensity={1.2} distance={6} decay={1.6} />
            <mesh position={[0, 1.5, -0.2]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshBasicMaterial color={tint(colors.lamp, 0.35)} />
            </mesh>
          </>
        )}
      </group>
    </group>
  )
}