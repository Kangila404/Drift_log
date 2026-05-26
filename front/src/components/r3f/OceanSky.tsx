import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function OceanSky() {
  const moonRef = useRef<THREE.Mesh>(null)
  const moonGlowRef = useRef<THREE.Mesh>(null)
  const shootingStarRef = useRef<THREE.Mesh>(null)

  const starPositions = useMemo(() => {
    const positions = []
    for (let i = 0; i < 1000; i++) {
      positions.push(
        (Math.random() - 0.5) * 400,
        Math.random() * 62 + 5,
        (Math.random() - 0.5) * 400,
      )
    }
    return new Float32Array(positions)
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (moonRef.current) {
      moonRef.current.position.y = 8.4 + Math.sin(t * 0.25) * 0.12
    }
    if (moonGlowRef.current) {
      moonGlowRef.current.position.y = 8.4 + Math.sin(t * 0.25) * 0.12
      const mat = moonGlowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.105 + Math.sin(t * 0.7) * 0.015
    }
    if (shootingStarRef.current) {
      const cycle = (t * 0.045) % 1
      shootingStarRef.current.position.x = -70 + cycle * 140
      shootingStarRef.current.position.y = 24 - cycle * 8
      const mat = shootingStarRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.sin(cycle * Math.PI) * 0.65
    }
  })

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.145} transparent opacity={0.9} sizeAttenuation />
      </points>

      <mesh ref={shootingStarRef} position={[-70, 24, -45]} rotation={[0, 0, -0.32]}>
        <boxGeometry args={[3.2, 0.025, 0.025]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={moonGlowRef} position={[0, 8.4, -20]}>
        <sphereGeometry args={[2.35, 32, 32]} />
        <meshBasicMaterial color="#b8dcff" transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={moonRef} position={[0, 8.4, -20]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color="#fffde8" emissive="#fffde8" emissiveIntensity={1.0} roughness={0.72} />
      </mesh>

      <pointLight position={[0, 8.4, -20]} color="#fffde8" intensity={3.7} distance={300} />
    </>
  )
}