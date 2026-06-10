import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const EMBER_COUNT = 40

export default function Campfire({
  position = [0, 0.18, 0.6],
  scale = 1.3,
  active = true,
}: { position?: [number, number, number]; scale?: number; active?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const flameOuter = useRef<THREE.Mesh>(null)
  const flameInner = useRef<THREE.Mesh>(null)
  const embers = useRef<THREE.Points>(null)
  const fade = useRef(0)

  const { emberGeo, emberData } = useMemo(() => {
    const positions = new Float32Array(EMBER_COUNT * 3)
    const data = Array.from({ length: EMBER_COUNT }, () => ({
      x: (Math.random() - 0.5) * 0.18,
      z: (Math.random() - 0.5) * 0.18,
      y: Math.random() * 0.6,
      speed: 0.25 + Math.random() * 0.4,
      sway: Math.random() * Math.PI * 2,
    }))
    data.forEach((e, i) => { positions[i*3] = e.x; positions[i*3+1] = e.y; positions[i*3+2] = e.z })
    const emberGeo = new THREE.BufferGeometry()
    emberGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { emberGeo, emberData: data }
  }, [])

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime

    // 페이드 인/아웃
    fade.current += ((active ? 1 : 0) - fade.current) * Math.min(1, d * 5)
    const f = fade.current
    if (group.current) group.current.visible = f > 0.01
    if (f < 0.01) return

    // 불꽃 흔들림
    const flick = 0.72 + Math.sin(t * 13) * 0.12 + Math.sin(t * 27) * 0.06 + Math.random() * 0.08

    if (light.current) light.current.intensity = 3.2 * flick * f
    if (flameOuter.current) {
      flameOuter.current.scale.set(1 + Math.sin(t*9)*0.05, 1 + flick*0.25, 1 + Math.cos(t*11)*0.05)
      ;(flameOuter.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * f
    }
    if (flameInner.current) {
      flameInner.current.scale.set(1, 1 + flick*0.2, 1)
      ;(flameInner.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * f
    }

    // 불씨
    const arr = emberGeo.attributes.position.array as Float32Array
    emberData.forEach((e, i) => {
      e.y += e.speed * d
      if (e.y > 0.7) { e.y = 0; e.x = (Math.random()-0.5)*0.18; e.z = (Math.random()-0.5)*0.18 }
      arr[i*3]   = e.x + Math.sin(t*2 + e.sway) * 0.03 * (e.y / 0.7)
      arr[i*3+1] = e.y
      arr[i*3+2] = e.z
    })
    emberGeo.attributes.position.needsUpdate = true
    if (embers.current) (embers.current.material as THREE.PointsMaterial).opacity = 0.8 * f
  })

  return (
    <group ref={group} position={position} scale={scale} visible={false}>
      {/* 차가운 씬에 대비되는 포근한 불빛 */}
      <pointLight ref={light} color="#ff9d4d" distance={6} decay={2} position={[0, 0.25, 0]} />

      {/* 장작 두 개 */}
      <mesh rotation={[0, 0.4, Math.PI/2 - 0.25]} position={[-0.02, 0.02, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.32, 6]} />
        <meshStandardMaterial color="#1a120c" roughness={1} />
      </mesh>
      <mesh rotation={[0, -0.5, Math.PI/2 + 0.2]} position={[0.03, 0.02, 0.02]}>
        <cylinderGeometry args={[0.025, 0.025, 0.32, 6]} />
        <meshStandardMaterial color="#221710" roughness={1} />
      </mesh>

      {/* 불꽃 (가산 혼합) */}
      <mesh ref={flameOuter} position={[0, 0.18, 0]}>
        <coneGeometry args={[0.12, 0.4, 12]} />
        <meshBasicMaterial color="#ff7a1a" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={flameInner} position={[0, 0.14, 0]}>
        <coneGeometry args={[0.07, 0.26, 10]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* 불씨 */}
      <points ref={embers} geometry={emberGeo} frustumCulled={false}>
        <pointsMaterial color="#ffb35c" size={0.05} sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  )
}