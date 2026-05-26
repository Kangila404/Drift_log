import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Line
// ─────────────────────────────────────────────────────────────────────────────

function Line({ points, opacity = 0.55 }: { points: [number, number, number][]; opacity?: number }) {
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setFromPoints(points.map((p) => new THREE.Vector3(...p)))
    const m = new THREE.LineBasicMaterial({ color: '#b8c4c8', transparent: true, opacity })
    return new THREE.Line(g, m)
  }, [points, opacity])
  return <primitive object={obj} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Sail
// ─────────────────────────────────────────────────────────────────────────────

function Sail({ side }: { side: -1 | 1 }) {
  const geometry = useMemo(() => {
    const rows = 20, cols = 10
    const vertices: number[] = [], indices: number[] = []
    for (let y = 0; y <= rows; y++) {
      const v = y / rows
      const height = -0.95 + v * 2.25
      const width = 0.72 * (1 - v * 0.76)
      for (let x = 0; x <= cols; x++) {
        const u = x / cols
        vertices.push(side * width * u, height, -0.32 + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.1)
      }
    }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const a = y * (cols + 1) + x, b = a + cols + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [side])

  return (
    <group position={[0, 1.72, -0.3]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={side === 1 ? '#e7e0cf' : '#d8d1c1'} roughness={0.84} transparent opacity={0.96} side={THREE.DoubleSide} />
      </mesh>
      <Line points={[[0,-0.95,-0.28],[side*0.72,-0.7,-0.28],[side*0.18,1.3,-0.28],[0,-0.95,-0.28]]} opacity={0.34} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hull
// ─────────────────────────────────────────────────────────────────────────────

function Hull() {
  const hullShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-1.35, 0.18)
    s.bezierCurveTo(-1.08, -0.42, -0.58, -0.88, 0, -1.02)
    s.bezierCurveTo(0.58, -0.88, 1.08, -0.42, 1.35, 0.18)
    s.bezierCurveTo(0.78, 0.48, 0.3, 0.56, 0, 0.56)
    s.bezierCurveTo(-0.3, 0.56, -0.78, 0.48, -1.35, 0.18)
    return s
  }, [])

  return (
    <group>
      <mesh position={[0,-0.12,-0.28]} scale={[1.07,1.08,1]}>
        <primitive object={new THREE.ShapeGeometry(hullShape)} attach="geometry" />
        <meshStandardMaterial color="#07101a" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0,-0.08,-0.25]}>
        <primitive object={new THREE.ShapeGeometry(hullShape)} attach="geometry" />
        <meshStandardMaterial color="#142334" roughness={0.86} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0,0.28,-0.38]}>
        <boxGeometry args={[2.05,0.08,0.12]} />
        <meshStandardMaterial color="#d7d4ca" roughness={0.72} />
      </mesh>
      <mesh position={[0,0.42,-0.42]}>
        <boxGeometry args={[1.55,0.1,0.5]} />
        <meshStandardMaterial color="#755234" roughness={0.9} />
      </mesh>
      {[-0.55,-0.3,0,0.3,0.55].map((x) => (
        <mesh key={x} position={[x,0.48,-0.68]}>
          <boxGeometry args={[0.018,0.014,0.38]} />
          <meshBasicMaterial color="#3d2819" transparent opacity={0.55} />
        </mesh>
      ))}
      <mesh position={[0,0.78,-0.45]}>
        <boxGeometry args={[0.78,0.42,0.42]} />
        <meshStandardMaterial color="#ded6c7" roughness={0.78} />
      </mesh>
      <mesh position={[0,0.8,-0.7]}>
        <boxGeometry args={[0.46,0.16,0.035]} />
        <meshStandardMaterial color="#f4c57b" emissive="#f4c57b" emissiveIntensity={0.75} />
      </mesh>
      <pointLight position={[0,0.8,-0.9]} color="#f4c57b" intensity={0.52} distance={2.8} />
      {[-0.9,-0.55,-0.22,0.22,0.55,0.9].map((x) => (
        <mesh key={x} position={[x,0.7,-0.48]}>
          <cylinderGeometry args={[0.018,0.018,0.34,8]} />
          <meshStandardMaterial color="#c5cbc8" roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[0,0.88,-0.48]}>
        <boxGeometry args={[1.95,0.035,0.035]} />
        <meshStandardMaterial color="#c5cbc8" roughness={0.65} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WakeLine
//
// 항법등 로컬 좌표: [±1.08, 0.38, -0.56]
// 배 group: position=[0,-0.55,-4], scale=1.12
// 항법등 world 좌표:
//   x = ±1.08 * 1.12 = ±1.21
//   y = -0.55 + 0.38 * 1.12 = -0.124  → 수면 y=-1.0으로 내림
//   z = -4 + (-0.56) * 1.12 = -4.627
// ─────────────────────────────────────────────────────────────────────────────

function WakeLine({ side, phase = 0 }: { side: 1 | -1; phase?: number }) {
  const X       = side * 1.21   // 항법등 world x
  const START_Z = -4.63          // 항법등 world z
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
    const t = clock.elapsedTime

    // 등장: 0.8초 만에 연한 줄 → 점점 진해짐
    const elapsed = t - startTime.current
    material.uniforms.uAppear.value = Math.min(1.0, elapsed / 0.8) ** 2

    // 강도 변화
    const w1 = Math.sin(t * 1.4 + phase)
    const w2 = Math.sin(t * 2.6 + phase + 1.3)
    const w3 = Math.sin(t * 4.8 + phase + 2.7)
    material.uniforms.uPulse.value = Math.max(0.55, Math.min(1.0, 0.72 + 0.15*w1 + 0.08*w2 + 0.05*w3))
  })

  return <primitive object={lineObj} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Wake
// ─────────────────────────────────────────────────────────────────────────────

export function Wake() {
  return (
    <>
      <WakeLine side={-1} phase={0.0} />
      <WakeLine side={ 1} phase={0.5} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BoatModel
// ─────────────────────────────────────────────────────────────────────────────

function BoatModel() {
  return (
    <group>
      <Hull />
      <mesh position={[0,2.05,-0.42]}>
        <cylinderGeometry args={[0.035,0.055,3.25,18]} />
        <meshStandardMaterial color="#24180f" roughness={0.78} />
      </mesh>
      <mesh position={[0,1.14,-0.42]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[0.026,0.032,1.72,12]} />
        <meshStandardMaterial color="#24180f" roughness={0.78} />
      </mesh>
      <Sail side={-1} />
      <Sail side={1} />
      <Line points={[[0,3.68,-0.42],[-1.25,0.26,-0.4]]} opacity={0.58} />
      <Line points={[[0,3.68,-0.42],[1.25,0.26,-0.4]]} opacity={0.58} />
      <Line points={[[0,3.68,-0.42],[0,0.3,-0.4]]}     opacity={0.42} />
      <Line points={[[-1.08,0.9,-0.45],[1.08,0.9,-0.45]]} opacity={0.38} />
      <mesh position={[-1.08,0.38,-0.56]}>
        <sphereGeometry args={[0.045,12,12]} />
        <meshBasicMaterial color="#d84d45" />
      </mesh>
      <mesh position={[1.08,0.38,-0.56]}>
        <sphereGeometry args={[0.045,12,12]} />
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

// ─────────────────────────────────────────────────────────────────────────────
// Boat
// ─────────────────────────────────────────────────────────────────────────────

export default function Boat() {
  const boatRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!boatRef.current) return
    boatRef.current.position.y = Math.sin(t * 1.0) * 0.05
    boatRef.current.rotation.z = Math.sin(t * 0.72) * 0.009
    boatRef.current.rotation.x = Math.sin(t * 0.55) * 0.006
  })

  return (
    <group position={[0, -0.55, -4]} scale={1.12}>
      <group ref={boatRef}>
        <BoatModel />
      </group>
    </group>
  )
}