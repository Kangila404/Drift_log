import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ScenePreset } from '../../constants/scenePreset'

interface OceanSkyProps {
  preset?: ScenePreset
  eclipsePhase?: number
  eclipseCoverage?: number
}

const DEFAULT_MOON_COLOR = '#fffde8'

export default function OceanSky({ preset, eclipsePhase = -1.3, eclipseCoverage = 0 }: OceanSkyProps) {
  const moonColor = preset?.moonColor ?? DEFAULT_MOON_COLOR
  const showMoon = preset?.showMoon ?? true
  const body = preset?.celestialBody ?? 'moon'

  const isSun = body === 'sun'
  const isEclipse = body === 'eclipse'

  const radius = isSun || isEclipse ? 2.0 : 1.2
  const glowRadius = isSun || isEclipse ? 4.5 : 2.35
  const emissiveIntensity = isSun ? 1.8 : 1.0
  const baseLightIntensity = isSun || isEclipse ? 6.0 : 3.7
  const glowOpacity = isSun || isEclipse ? 0.18 : 0.11

  const sunRef = useRef<THREE.Mesh>(null)
  const sunGlowRef = useRef<THREE.Mesh>(null)
  const eclipseMoonRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)
  const shootingStarRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

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

    if (sunRef.current) {
      sunRef.current.position.y = 8.4 + Math.sin(t * 0.25) * 0.12
      const mat = sunRef.current.material as THREE.MeshStandardMaterial
      mat.color.set(moonColor)
      mat.emissive.set(moonColor)
    }
    if (sunGlowRef.current) {
      sunGlowRef.current.position.y = 8.4 + Math.sin(t * 0.25) * 0.12
      const mat = sunGlowRef.current.material as THREE.MeshBasicMaterial
      mat.color.set(moonColor)
      mat.opacity = glowOpacity * (1 - eclipseCoverage * 0.9)
    }

    if (isEclipse) {
      const moonX = eclipsePhase * radius * 1.2
      if (eclipseMoonRef.current) {
        // 가림이 시작될 때만 보이고, 멀어지면 숨김
        eclipseMoonRef.current.visible = eclipseCoverage > 0.001
        eclipseMoonRef.current.position.set(moonX, 8.4 + Math.sin(t * 0.25) * 0.12, -19.9)
        // 달 = 배경 하늘색과 동일 (먹히는 느낌)
               const mat = eclipseMoonRef.current.material as THREE.MeshBasicMaterial
        mat.color.set(preset?.fogColor ?? '#3a7398')
      }
      if (coronaRef.current) {
        coronaRef.current.visible = eclipseCoverage > 0.8
        const mat = coronaRef.current.material as THREE.MeshBasicMaterial
        mat.opacity = eclipseCoverage > 0.8 ? (eclipseCoverage - 0.8) / 0.2 * (0.6 + Math.sin(t * 1.2) * 0.15) : 0
      }
      if (lightRef.current) {
        lightRef.current.intensity = baseLightIntensity * (1 - eclipseCoverage * 0.92)
        lightRef.current.color.set(eclipseCoverage > 0.8 ? '#4a5a90' : moonColor)
      }
    } else {
      if (eclipseMoonRef.current) eclipseMoonRef.current.visible = false
      if (coronaRef.current) coronaRef.current.visible = false
      if (lightRef.current) {
        lightRef.current.intensity = baseLightIntensity
        lightRef.current.color.set(moonColor)
      }
    }

    if (shootingStarRef.current) {
      const cycle = (t * 0.045) % 1
      shootingStarRef.current.position.x = -70 + cycle * 140
      shootingStarRef.current.position.y = 24 - cycle * 8
      const mat = shootingStarRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = isSun ? 0 : Math.sin(cycle * Math.PI) * 0.65
    }
  })

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.145} transparent opacity={isSun ? 0.12 : 0.9} sizeAttenuation />
      </points>

      <mesh ref={shootingStarRef} position={[-70, 24, -45]} rotation={[0, 0, -0.32]}>
        <boxGeometry args={[3.2, 0.025, 0.025]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>

      {showMoon && (
        <>
          <mesh ref={sunGlowRef} position={[0, 8.4, -20]}>
            <sphereGeometry args={[glowRadius, 48, 48]} />
            <meshBasicMaterial color={moonColor} transparent opacity={glowOpacity} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>

          <mesh ref={sunRef} position={[0, 8.4, -20]}>
            <sphereGeometry args={[radius, 48, 48]} />
            <meshStandardMaterial color={moonColor} emissive={moonColor} emissiveIntensity={emissiveIntensity} roughness={0.72} />
          </mesh>

                    {/* 해를 가리는 달 — 해와 동일 크기, 하늘색(구멍처럼) */}
          <mesh ref={eclipseMoonRef} position={[-radius * 1.2, 8.4, -19.9]} visible={false} renderOrder={2}>
            <circleGeometry args={[radius, 96]} />
            <meshBasicMaterial color="#0a1020" depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
          </mesh>

          {/* 코로나 링 */}
          <mesh ref={coronaRef} position={[0, 8.4, -19.95]} visible={false} renderOrder={1}>
            <ringGeometry args={[radius * 0.98, radius * 1.5, 96]} />
            <meshBasicMaterial color={moonColor} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>

          <pointLight ref={lightRef} position={[0, 8.4, -20]} color={moonColor} intensity={baseLightIntensity} distance={300} />
        </>
      )}
    </>
  )
}