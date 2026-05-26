import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 150

export default function WakeParticles() {
  const pointsRef = useRef<THREE.Points>(null)

  // 파티클 초기 데이터
  const particles = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      const row = Math.floor(i / 2)
      const rowRatio = row / (COUNT / 2)
      return {
        side,
        baseX: side * (1.4 + rowRatio * 3.5),
        baseZ: rowRatio * 7.0,
        offset: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.5,
      }
    })
  }, [])

  const positions = useMemo(() => new Float32Array(COUNT * 3), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    particles.forEach((p, i) => {
      // Z를 시간에 따라 뒤로 흘림 - 실제로 위치가 바뀜
      const zFlow = ((p.baseZ + t * p.speed * 2) % 8.0)

      positions[i * 3]     = p.baseX + Math.sin(t * 3 + p.offset) * 0.15
      positions[i * 3 + 1] = Math.abs(Math.sin(t * 4 + p.offset)) * 0.1
      positions[i * 3 + 2] = zFlow
    })

    if (pointsRef.current) {
      const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
      attr.array.set(positions)
      attr.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef} position={[0, -0.45, -4]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.12}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}