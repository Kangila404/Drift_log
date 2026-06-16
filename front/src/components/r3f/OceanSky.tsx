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

// ── 별자리(북두칠성) ──
const CONSTELLATION_COLOR = '#e3ecff'
const CYCLE = 180                // 별자리 1주기(초) = 3분에 1번
const SHOW_END = 15              // 그리기+글로우+페이드 모두 끝나는 시점(초). 이후 주기 끝까지 소등
const DIPPER_RAW: [number, number][] = [
  [0.0, 2.8], // 0 Dubhe
  [0.4, 0.0], // 1 Merak
  [3.0, 0.3], // 2 Phecda
  [2.9, 2.6], // 3 Megrez
  [4.6, 3.4], // 4 Alioth
  [6.4, 3.8], // 5 Mizar
  [8.4, 3.0], // 6 Alkaid
]
const DIPPER_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // 바가지
  [3, 4], [4, 5], [5, 6],         // 손잡이
]

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export default function OceanSky({ preset, eclipsePhase = -1.3, eclipseCoverage = 0 }: OceanSkyProps) {
  const moonColor = preset?.moonColor ?? DEFAULT_MOON_COLOR
  const showMoon = preset?.showMoon ?? true
  const body = preset?.celestialBody ?? 'moon'

  const isSun = body === 'sun'
  const isEclipse = body === 'eclipse'
  const isMoon = body === 'moon'   // 밤/새벽 → 별자리·유성우

  const radius = isSun || isEclipse ? 2.0 : 1.2
  const glowRadius = isSun || isEclipse ? 4.5 : 2.35
  const emissiveIntensity = isSun ? 1.8 : 1.0
  const baseLightIntensity = isSun || isEclipse ? 6.0 : 3.7
  const glowOpacity = isSun || isEclipse ? 0.18 : 0.11

  const sunRef = useRef<THREE.Mesh>(null)
  const sunGlowRef = useRef<THREE.Mesh>(null)
  const eclipseMoonRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)
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

  const starsRef = useRef<THREE.Points>(null)

  // 별마다 랜덤 반짝임 위상
  const starPhases = useMemo(() => {
    const phases = new Float32Array(1000)
    for (let i = 0; i < 1000; i++) phases[i] = Math.random() * Math.PI * 2
    return phases
  }, [])

  // ── 별자리 데이터 (중심정렬 + 스케일) ──
  const constellation = useMemo(() => {
    const cx = 3.74, cy = 2.27, scale = 0.85   // 배경 별 수준으로 작게
    const pts = DIPPER_RAW.map(([x, y]) => new THREE.Vector3((x - cx) * scale, (y - cy) * scale, 0))
    const edges = DIPPER_EDGES.map(([a, b]) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
      const m = new THREE.LineBasicMaterial({
        color: CONSTELLATION_COLOR, transparent: true, opacity: 0,
        depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      })
      return { line: new THREE.Line(g, m), mat: m, geo: g, a, b }
    })
    return { pts, edges }
  }, [])
  const dipperStarRefs = useRef<THREE.Mesh[]>([])

  // ── 유성우 풀 (드문드문) ──
  const meteorCfg = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => {
      const r = (k: number) => (((i * 17 + k * 31) % 100) / 100)
      const fromLeft = r(1) > 0.5
      const dir = fromLeft ? 1 : -1
      const x0 = -dir * (28 + r(2) * 34)
      const y0 = 24 + r(3) * 12
      const x1 = x0 + dir * (40 + r(4) * 26)
      const y1 = y0 - (28 + r(5) * 18)
      const angle = Math.atan2(y1 - y0, x1 - x0)
      return {
  x0, y0, x1, y1, angle,
  z: -58 - r(9) * 22,
  period: 22 + r(6) * 20,
  dur: 1.8 + r(7) * 0.8,     // ← 느리게
  offset: r(8) * 30,
  maxOp: 0.4 + r(0) * 0.25,
}
    })
  }, [])
  const meteorRefs = useRef<THREE.Mesh[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (starsRef.current) {
      const mat = starsRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = t
    }

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
        eclipseMoonRef.current.visible = eclipseCoverage > 0.001
        eclipseMoonRef.current.position.set(moonX, 8.4 + Math.sin(t * 0.25) * 0.12, -19.9)
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

    // ── 별자리 (밤/새벽만, 3분에 1회 그렸다 사라짐) ──
    const tc = t % CYCLE
    const active = isMoon && tc < SHOW_END           // 그리는 윈도우 밖이면 완전 소등
    const fade = 1 - smoothstep(SHOW_END - 3, SHOW_END, tc)   // 12~15초 페이드아웃
    const EDGE_START = 2.0
    const EDGE_GAP = 0.5
    const EDGE_DUR = 0.6
    const drawEnd = EDGE_START + DIPPER_EDGES.length * EDGE_GAP + EDGE_DUR

    constellation.pts.forEach((_, i) => {
      const m = dipperStarRefs.current[i]
      if (!m) return
      const mat = m.material as THREE.MeshBasicMaterial
      if (!active) { mat.opacity = 0; return }
      const local = tc - i * 0.26
      let on = 0
      if (local > 0) {
        on = Math.min(1, local / 0.4)
        const blink = Math.max(0, 1 - local / 0.6)   // 켜질 때 오버슈트
        on = Math.min(1.5, on + blink * 0.5)
      }
      mat.opacity = on * fade
      m.scale.setScalar(0.85 + Math.min(1, on) * 0.35 + Math.sin(t * 2 + i) * 0.05)
    })

    constellation.edges.forEach((e, k) => {
      if (!active) { e.mat.opacity = 0; return }
      const A = constellation.pts[e.a], B = constellation.pts[e.b]
      const ep = Math.max(0, Math.min(1, (tc - (EDGE_START + k * EDGE_GAP)) / EDGE_DUR))
      const cur = A.clone().lerp(B, ep)
      const pos = e.geo.attributes.position as THREE.BufferAttribute
      pos.setXYZ(0, A.x, A.y, A.z)
      pos.setXYZ(1, cur.x, cur.y, cur.z)
      pos.needsUpdate = true
      const done = tc > drawEnd
      const glow = done ? 0.28 + Math.sin(t * 1.5) * 0.07 : ep * 0.24   // 선 은은하게
      e.mat.opacity = (ep > 0 ? Math.max(glow, ep * 0.22) : 0) * fade
    })

    // ── 유성우 (밤/새벽만) ──
    meteorRefs.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as THREE.MeshBasicMaterial
      if (!isMoon) { mat.opacity = 0; m.visible = false; return }
      const cfg = meteorCfg[i]
      const localT = (t + cfg.offset) % cfg.period
      if (localT < cfg.dur) {
        const p = localT / cfg.dur
        m.visible = true
        m.position.set(
          cfg.x0 + (cfg.x1 - cfg.x0) * p,
          cfg.y0 + (cfg.y1 - cfg.y0) * p,
          cfg.z,
        )
        mat.opacity = Math.sin(p * Math.PI) * cfg.maxOp
      } else {
        mat.opacity = 0
        m.visible = false
      }
    })
  })

  return (
    <>
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          <bufferAttribute attach="attributes-phase" args={[starPhases, 1]} />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          fog={false}
          uniforms={{
            uTime: { value: 0 },
            uOpacity: { value: isSun ? 0.12 : 0.9 },
          }}
          vertexShader={`
            attribute float phase;
            varying float vTwinkle;
            uniform float uTime;
            void main() {
              vTwinkle = 0.65 + 0.35 * sin(uTime * 1.8 + phase);
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = clamp(1.2 * (200.0 / -mvPosition.z), 0.5, 2.5);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying float vTwinkle;
            uniform float uOpacity;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              if (dot(c, c) > 0.25) discard;
              gl_FragColor = vec4(vec3(1.0), uOpacity * vTwinkle);
            }
          `}
        />
      </points>

      {/* 별자리 — 북두칠성 (밤/새벽), 우상단, 배경 별 크기 수준 */}
      <group position={[34, 26, -62]}>
        {constellation.pts.map((p, i) => (
          <mesh
            key={`ds${i}`}
            position={[p.x, p.y, p.z]}
            ref={(el) => { if (el) dipperStarRefs.current[i] = el }}
          >
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial
              color={CONSTELLATION_COLOR}
              transparent
              opacity={0}
              depthWrite={false}
              fog={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
        {constellation.edges.map((e, i) => (
          <primitive key={`de${i}`} object={e.line} />
        ))}
      </group>

      {/* 유성우 (밤/새벽) */}
      {meteorCfg.map((cfg, i) => (
        <mesh
          key={`mt${i}`}
          ref={(el) => { if (el) meteorRefs.current[i] = el }}
          position={[cfg.x0, cfg.y0, cfg.z]}
          rotation={[0, 0, cfg.angle]}
          visible={false}
        >
          <boxGeometry args={[4.5, 0.02, 0.02]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            fog={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

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