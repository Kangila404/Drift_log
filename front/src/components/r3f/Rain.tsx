import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 900
const AREA = { x: 26, y: 16, z: 22 }
const STREAK = 0.6
const SPEED_MIN = 16
const SPEED_MAX = 26

export default function Rain({
  active = true,
  color = '#cfe8f5',
  maxOpacity = 0.5,
}: { active?: boolean; color?: string; maxOpacity?: number }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null)
  const opacity = useRef(0)

  const { geometry, speeds, tops } = useMemo(() => {
    const positions = new Float32Array(COUNT * 2 * 3)
    const speeds = new Float32Array(COUNT)
    const tops = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * AREA.x
      const z = (Math.random() - 0.5) * AREA.z + 2
      const y = Math.random() * AREA.y
      tops[i] = y
      speeds[i] = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)
      const o = i * 6
      positions[o] = x;     positions[o + 1] = y;          positions[o + 2] = z
      positions[o + 3] = x; positions[o + 4] = y - STREAK; positions[o + 5] = z
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry, speeds, tops }
  }, [])

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05)
    const target = active ? maxOpacity : 0
    opacity.current += (target - opacity.current) * Math.min(1, d * 4)
    if (matRef.current) matRef.current.opacity = opacity.current
    if (opacity.current < 0.002) return

    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      let y = tops[i] - speeds[i] * d
      if (y < -2) y = AREA.y + Math.random() * 4
      tops[i] = y
      const o = i * 6
      arr[o + 1] = y
      arr[o + 4] = y - STREAK
    }
    pos.needsUpdate = true
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={999}>
      <lineBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </lineSegments>
  )
}