import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useVoyageStore } from '../../stores/voyageStore'
import { useBoatStore, type BoatColors } from '../../stores/boatStore'
import type { ScenePreset } from '../../constants/scenePreset'

/** hex 색을 factor만큼 어둡게 (factor < 1) */
function shade(hex: string, factor: number) {
  return '#' + new THREE.Color(hex).multiplyScalar(factor).getHexString()
}
/** hex 색을 흰색 쪽으로 amt만큼 밝게 (0~1) */
function tint(hex: string, amt: number) {
  return '#' + new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amt).getHexString()
}

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

  // base(펼친 상태) / fold(접힌 상태) 정점을 미리 만들어두고 매 프레임 보간
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

        // 접힌 천: 활대(아래)로 끌어내려 압축 + 가로 아코디언 주름
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
    const target = paused ? 0.88 : 0 // 거의 다 접힘
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
  const LEN = 32   // 길이 방향 단면 수 (z: 뒤 0 → 앞 1)
  const RIB = 20   // 단면 둘레 점 수 (우현 → 바닥 → 좌현)

  const positions: number[] = []
  const indices: number[] = []

  const taper = (t: number) => Math.pow(Math.sin(t * Math.PI), 0.62)
  const widthAt = (t: number) => 0.16 + 1.20 * taper(t)
  const depthAt = (t: number) => 0.20 + 0.66 * taper(t)
  const sheerAt = (t: number) => 0.20 + Math.pow(t, 1.7) * 0.40

  // 통통한 목선 단면: 옆구리 둥글게 부풀리고 바닥은 평평
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

  // 옆면 링 정점
  for (let i = 0; i <= LEN; i++) {
    const t = i / LEN
    const halfW = widthAt(t), depth = depthAt(t), top = sheerAt(t), z = zAt(t)
    for (let j = 0; j <= RIB; j++) {
      const [x, y] = sectionPoint(j / RIB, halfW, depth, top)
      positions.push(x, y, z)
    }
  }

  // 옆면 삼각형
  for (let i = 0; i < LEN; i++)
    for (let j = 0; j < RIB; j++) {
      const a = i * cols + j, b = a + cols
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }

  // 앞뒤 뚜껑(cap): 끝 링 + 중심점으로 부채꼴 → 구멍 메움
  const addCap = (ring: number, t: number, flip: boolean) => {
    const center = positions.length / 3
    positions.push(0, sheerAt(t) - depthAt(t) * 0.5, zAt(t)) // 중심 정점
    const base = ring * cols
    for (let j = 0; j < RIB; j++) {
      const p0 = base + j, p1 = base + j + 1
      if (flip) indices.push(center, p1, p0)
      else indices.push(center, p0, p1)
    }
  }
  addCap(0, 0, false)        // 고물(뒤)
  addCap(LEN, 1, true)       // 뱃머리(앞)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

// 작은 앞돛(지브) — 돛대 앞쪽, 뱃머리 스테이에 매달린 삼각돛. 정지 시 같이 접힘.
function Jib({ color }: { color: string }) {
  const rows = 16, cols = 6
  const fold = useRef(0)

  const { geometry, basePos, foldPos } = useMemo(() => {
    const base: number[] = []
    const folded: number[] = []
    const indices: number[] = []
    // 삼각형: 위 꼭짓점(돛대 상단)에서 앞아래(뱃머리)로 펼쳐짐
    for (let y = 0; y <= rows; y++) {
      const v = y / rows
      const height = -0.6 + v * 1.7        // 아래(-0.6) ~ 위(1.1)
      const fwd = (1 - v) * 0.95           // 위는 돛대(앞으로 0), 아래는 앞으로 길게
      const luff = v * 0.05                // 살짝 곡선
      for (let x = 0; x <= cols; x++) {
        const u = x / cols
        const zFront = -0.1 - fwd * u       // 앞(-Z)으로 뻗음
        base.push(luff * 0.2, height, zFront)
        // 접힘: 스테이(앞)로 끌어모음
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

  // 돛대 위쪽에 매달림 (메인 돛대는 z -0.42, 상단 ~y 2.6 부근)
  return (
    <group position={[0, 1.5, -0.42]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.84} transparent opacity={0.94} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// 돛대 꼭대기 망대(크로우즈 네스트) — 망보는 동그란 통
function CrowsNest() {
  const wood = '#6b4f33'
  return (
    <group position={[0, 3.05, -0.42]}>
      {/* 통 바닥 */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.05, 16]} />
        <meshStandardMaterial color={wood} roughness={0.85} />
      </mesh>
      {/* 통 벽 (열린 원통) */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.17, 0.16, 0.22, 16, 1, true]} />
        <meshStandardMaterial color={wood} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* 테두리 링 */}
      <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.012, 8, 20]} />
        <meshStandardMaterial color="#4a3724" roughness={0.8} />
      </mesh>
    </group>
  )
}

// 뱃머리 망원경 (삼각대 위에 얹힌 통)
function Telescope() {
  const brass = '#9a8458'
  const metal = '#3a2f22'
  return (
    <group position={[0, 0.70, -1.0]} rotation={[0, 0, 0]}>
      {/* 삼각대 다리 3개 */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.07, -0.1, Math.sin(a) * 0.07]} rotation={[0.32 * Math.cos(a + Math.PI), 0, 0.32 * Math.sin(a + Math.PI)]}>
            <cylinderGeometry args={[0.01, 0.01, 0.3, 6]} />
            <meshStandardMaterial color={metal} roughness={0.7} metalness={0.4} />
          </mesh>
        )
      })}
      {/* 망원경 경통 (앞 -Z로 비스듬히) */}
      <mesh position={[0, 0.06, -0.04]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.04, 0.34, 12]} />
        <meshStandardMaterial color={brass} roughness={0.45} metalness={0.6} />
      </mesh>
      {/* 대물렌즈 링 */}
      <mesh position={[0, 0.18, -0.16]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 12]} />
        <meshStandardMaterial color="#c8b88a" roughness={0.4} metalness={0.7} />
      </mesh>
    </group>
  )
}

// 선체 테두리(림)를 따라 덮는 갑판 — 선체 위 빈 공간을 메움
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
    const hw = widthAt(t) * 0.9   // 림에서 살짝 안쪽 (가장자리 선체 노출 = 뱃전)
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

function Hull({ hull, hullShadow, lamp }: { hull: string; hullShadow: string; lamp: string }) {
  const hullGeo = useMemo(() => buildHullGeometry(), [])
  const deckGeo = useMemo(() => buildDeckGeometry(), [])

  return (
    <group>
      {/* 입체 선체 (외피) */}
      <mesh geometry={hullGeo} position={[0, -0.02, -0.42]}>
        <meshStandardMaterial color={hull} roughness={0.86} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      {/* 흘수선 아래 어두운 톤 */}
      <mesh geometry={hullGeo} position={[0, -0.12, -0.42]} scale={[0.94, 0.82, 0.99]}>
        <meshStandardMaterial color={hullShadow} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 갑판 — 선체 림을 따라 덮어 빈 공간 메움 */}
      <mesh geometry={deckGeo} position={[0, -0.015, -0.42]}>
        <meshStandardMaterial color="#6e4d31" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 네모 갑판(중앙 평상) — 윗면 높이 유지하고 아래로 늘려 림 갑판까지 닿게 */}
      <mesh position={[0, 0.47, -0.42]}>
        <boxGeometry args={[1.5, 0.36, 2.4]} />
        <meshStandardMaterial color="#6e4d31" roughness={0.9} />
      </mesh>
      {/* 평상 널빤지 결 */}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.65, -0.42]}>
          <boxGeometry args={[0.016, 0.012, 2.3]} />
          <meshBasicMaterial color="#3d2819" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* 선실 (림 위에 앉힘) */}
      <mesh position={[0, 0.80, -0.55]}>
        <boxGeometry args={[0.62, 0.3, 0.55]} />
        <meshStandardMaterial color="#7d6a52" roughness={0.82} />
      </mesh>
      {/* 선실 지붕 */}
      <mesh position={[0, 0.97, -0.55]}>
        <boxGeometry args={[0.68, 0.04, 0.6]} />
        <meshStandardMaterial color="#5f5040" roughness={0.85} />
      </mesh>
      {/* 선실 창 불빛 — 뒷면(+Z, 카메라쪽 -0.272) / 앞면(-Z, 뱃머리쪽 -0.828) 양쪽 */}
      {([[-0.272, -0.008], [-0.828, 0.008]] as [number, number][]).map(([z, frameOff], i) => (
        <group key={i}>
          <mesh position={[0, 0.80, z]}>
            <boxGeometry args={[0.34, 0.12, 0.012]} />
            <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          {/* 창틀(불투명, 안쪽) */}
          <mesh position={[0, 0.80, z + frameOff]}>
            <boxGeometry args={[0.4, 0.18, 0.01]} />
            <meshStandardMaterial color="#5f5040" roughness={0.85} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0.81, -0.55]} color={lamp} intensity={0.4} distance={2.0} />

      {/* 난간 (뱃머리 쪽 뱃전, 앞 -Z) */}
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

      {/* ===== 뱃머리 장식 (앞쪽 -Z = 화면 앞) ===== */}
      {/* 바우스프릿 (뱃머리에서 앞으로 뻗은 활대) */}
      <mesh position={[0, 0.6, -1.5]} rotation={[Math.PI / 2 + 0.16, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.03, 0.8, 10]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.8} />
      </mesh>
      {/* 뱃머리 기둥(스템헤드) */}
      <mesh position={[0, 0.66, -1.32]}>
        <cylinderGeometry args={[0.03, 0.04, 0.26, 8]} />
        <meshStandardMaterial color={shade(hull, 1.3)} roughness={0.8} />
      </mesh>
      {/* 뱃머리 랜턴 */}
      <mesh position={[0, 0.56, -1.72]}>
        <boxGeometry args={[0.08, 0.12, 0.08]} />
        <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={1.0} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.64, -1.72]}>
        <boxGeometry args={[0.1, 0.04, 0.1]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
      </mesh>
      <pointLight position={[0, 0.56, -1.77]} color={lamp} intensity={0.6} distance={2.0} />
      {/* 갑판 위 감긴 밧줄 (양쪽) */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.50, -1.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.022, 8, 20]} />
          <meshStandardMaterial color="#8a7253" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function WakeLine({ side, phase = 0 }: { side: 1 | -1; phase?: number }) {
  const X       = side * 1.21
  const START_Z = -4.63
  const END_Z   = 8.0
  const SEGS    = 80

  const startTime = useRef(performance.now() / 1000)

  const { lineObj, material } = useMemo(() => {
    const positions: number[] = []
    const alphas: number[] = []

    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS
      const z = START_Z + t * (END_Z - START_Z)
      positions.push(X, -1.0, z)
      alphas.push(Math.pow(1.0 - t, 0.55))
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('alpha',    new THREE.Float32BufferAttribute(alphas, 1))

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uPulse:  { value: 0.72 },
        uAppear: { value: 0.0 },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uPulse;
        uniform float uAppear;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(0.85, 0.95, 1.0, vAlpha * uPulse * uAppear);
        }
      `,
    })

    return { lineObj: new THREE.Line(g, mat), material: mat }
  }, [])

  useFrame(({ clock }) => {
    const isPaused = useVoyageStore.getState().voyageState === 'PAUSED'

    if (isPaused) {
      material.uniforms.uAppear.value = Math.max(0, material.uniforms.uAppear.value - 0.02)
      return
    }

    const t = clock.elapsedTime
    const elapsed = t - startTime.current
    material.uniforms.uAppear.value = Math.min(1.0, elapsed / 0.8) ** 2

    const w1 = Math.sin(t * 0.25 + phase)
    const w2 = Math.sin(t * 0.45 + phase + 1.3)
    const w3 = Math.sin(t * 0.8 + phase + 2.7)
    material.uniforms.uPulse.value = Math.max(0.55, Math.min(1.0, 0.72 + 0.15*w1 + 0.08*w2 + 0.05*w3))
  })

  return <primitive object={lineObj} />
}

function RippleWave() {
  const lastSpawnRef = useRef(0)
  const NUM_RINGS = 4
  const INTERVAL = 0.8

  const rings = useMemo(() => {
    return Array.from({ length: NUM_RINGS }, () => {
      const geo = new THREE.RingGeometry(1, 1.05, 64)
      const mat = new THREE.MeshBasicMaterial({
        color: '#7eb8d4',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.y = -1.0
      return { mesh, material: mat, startTime: -999 }
    })
  }, [])

  useFrame(({ clock }) => {
    const isPaused = useVoyageStore.getState().voyageState === 'PAUSED'
    const t = clock.elapsedTime

    if (isPaused && t - lastSpawnRef.current > INTERVAL) {
      const oldest = rings.reduce((a, b) => a.startTime < b.startTime ? a : b)
      oldest.startTime = t
      lastSpawnRef.current = t
    }

    rings.forEach((ring) => {
      const { mesh, material, startTime } = ring
      const age = t - startTime
      const duration = 3.0
      const maxRadius = 4.5

      if (age < 0 || age > duration) {
        material.opacity = 0
        mesh.scale.setScalar(0)
        return
      }

      const progress = age / duration
      const radius = 0.3 + progress * maxRadius
      mesh.scale.setScalar(radius)
      material.opacity = isPaused ? (1 - progress) * 0.5 : 0
    })
  })

  return (
    <group position={[0, 0, -4]}>
      {rings.map(({ mesh }, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  )
}

export function Wake() {
  return (
    <>
      <WakeLine side={-1} phase={0.0} />
      <WakeLine side={ 1} phase={0.5} />
      <RippleWave />
    </>
  )
}

function AnchorMesh() {
  const metal = '#9aa1a6'
  return (
    <group scale={0.5}>
      {/* 고리 */}
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.018, 8, 16]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
      </mesh>
      {/* 샹크(기둥) */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.62, 10]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
      </mesh>
      {/* 스톡(상단 가로대) */}
      <mesh position={[0, 0.33, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.34, 8]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
      </mesh>
      {/* 하단 양팔 */}
      <mesh position={[0, -0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 0.46, 8]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.5} />
      </mesh>
      {/* 양 끝 갈고리(플루크) */}
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

  const ANCHOR_X = 1.0      // 우현
  const ANCHOR_Z = 0.45     // 뱃머리 쪽
  const STOW_Y = 0.46       // 평소: 뱃전에 걸려 있음
  const DOWN_Y = -1.7       // 정지: 수면 아래로
  // 닻줄 구멍(hawse) — 뱃전 고정점
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
    progress.current += (target - progress.current) * 0.04 // 스르륵
    const p = progress.current
    const y = STOW_Y + (DOWN_Y - STOW_Y) * p

    if (groupRef.current) groupRef.current.position.set(ANCHOR_X, y, ANCHOR_Z)

    // 닻줄: 뱃전 hawse → 닻 고리(상단)
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

function BoatModel({ colors }: { colors: BoatColors }) {
  const hullShadow = shade(colors.hull, 0.5)
  const sailMain = colors.sail
  const sailSub = shade(colors.sail, 0.93)

  return (
    <group>
      <Hull hull={colors.hull} hullShadow={hullShadow} lamp={colors.lamp} />
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
      {/* 항해등(좌현 빨강 / 우현 초록)은 커스터마이징 제외 */}
      <mesh position={[-0.92, 0.52, 0.45]}>
        <sphereGeometry args={[0.04,12,12]} />
        <meshBasicMaterial color="#d84d45" />
      </mesh>
      <mesh position={[0.92, 0.52, 0.45]}>
        <sphereGeometry args={[0.04,12,12]} />
        <meshBasicMaterial color="#65d074" />
      </mesh>
      {/* 마스트 정상등(흰색)도 고정 */}
      <mesh position={[0,3.72,-0.42]}>
        <sphereGeometry args={[0.055,14,14]} />
        <meshBasicMaterial color="#f8e3a4" />
      </mesh>
      <pointLight position={[0,3.72,-0.42]} color="#f8e3a4" intensity={0.5} distance={4.4} />
    </group>
  )
}

export default function Boat({ preset }: { preset?: ScenePreset }) {
  const boatRef = useRef<THREE.Group>(null)
  const colors = useBoatStore((s) => s.colors)

  // 새벽/밤(달) 또는 폭풍우(wind)면 갑판등 켜기
  const isDark = preset?.celestialBody === 'moon'
  const isStorm = preset?.effects?.includes('wind') ?? false
  const lampOn = isDark || isStorm

  useFrame(({ clock }) => {
    const isPaused = useVoyageStore.getState().voyageState === 'PAUSED'
    if (!boatRef.current) return

    if (isPaused) {
      boatRef.current.position.y = 0
      boatRef.current.rotation.z = 0
      boatRef.current.rotation.x = 0
      return
    }

    // 날씨 거칠수록 흔들림 강하게 (waveScale 1.0 = 잔잔 기준)
    // 폭풍에도 과하게 안 내려가도록 강도 상한
    const intensity = Math.min(preset?.waveScale ?? 1.0, 1.3)
    const speed = preset?.waveSpeed ?? 1.0
    const t = clock.elapsedTime * speed

    // bob을 [0, 2*amp]로 띄워 "쉬는 높이"보다 절대 아래로 안 내려가게 (잠김 방지)
    const amp = 0.04 * intensity
    boatRef.current.position.y = amp + Math.sin(t * 1.0) * amp
    boatRef.current.rotation.z = Math.sin(t * 0.72) * 0.012 * intensity
    boatRef.current.rotation.x = Math.sin(t * 0.55) * 0.008 * intensity
  })

  return (
    <group position={[0, -0.55, -4]} scale={1.12}>
      <group ref={boatRef}>
        <BoatModel colors={colors} />

        {/* 갑판등 — 새벽/밤/폭풍우일 때 주변 비춤 (lamp 색 반영) */}
        {lampOn && (
          <>
            {/* 주변 수면·배를 비추는 따뜻한 등불 */}
            <pointLight position={[0, 1.5, -0.2]} color={colors.lamp} intensity={2.4} distance={10} decay={1.4} />
            {/* 아래쪽(수면) 비추는 보조광 */}
            <pointLight position={[0, 0.6, 0.4]} color={tint(colors.lamp, 0.1)} intensity={1.2} distance={6} decay={1.6} />
            {/* 등불 발광체 (광원 자체가 보이게) */}
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