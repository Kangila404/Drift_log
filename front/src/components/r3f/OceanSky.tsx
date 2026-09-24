import { useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ScenePreset } from '../../constants/scenePreset'
import { skyVertexShader, skyFragmentShader, celestialVertexShader, celestialFragmentShader, getSkyWeather } from './OceanSkyShader'
import { getWeatherAtmosphere } from '../../constants/weatherAtmosphere'
import { sampleStormLightning } from './StormLightning'
import OceanConstellations from './OceanConstellations'
import { constellationVisibility } from './ConstellationField'

interface OceanSkyProps {
  preset?: ScenePreset
  eclipsePhase?: number
  eclipseCoverage?: number
  playing?: boolean
  starOpacityScale?: number
}

const DEFAULT_MOON_COLOR = '#fffde8'
const starRandom = (seed: number) => THREE.MathUtils.euclideanModulo(Math.sin(seed * 127.1 + 311.7) * 43758.5453, 1)

export default function OceanSky({ preset, eclipsePhase = -1.3, eclipseCoverage = 0, playing = true, starOpacityScale = 1 }: OceanSkyProps) {
  const { gl, invalidate } = useThree()
  const animationTime = useRef(0)
  const lightningTime = useRef(0)
  const lightning = useRef({ strength: 0, x: 0, y: .3 })
  const reducedMotion = useRef(false)
  const lightningLight = useRef<THREE.DirectionalLight>(null)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reducedMotion.current = media.matches; invalidate() }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [invalidate])
  const moonColor = preset?.moonColor ?? DEFAULT_MOON_COLOR
  const showMoon = preset?.showMoon ?? true
  const body = preset?.celestialBody ?? 'moon'

  const isSun = body === 'sun'
  const isEclipse = body === 'eclipse'
  const isMoon = body === 'moon'   // 밤/새벽 → 별자리·유성우

  const radius = isSun || isEclipse ? 2.0 : 1.2
  const baseLightIntensity = isSun || isEclipse ? 6.0 : 3.7
  const lightRef = useRef<THREE.PointLight>(null)
  const skyMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const celestialMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const starMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const coverage = isEclipse ? THREE.MathUtils.clamp(eclipseCoverage, 0, 1) : 0
  const atmosphere = getWeatherAtmosphere(preset?.effects)
  const skyUniforms = useMemo(() => ({
    uTime: { value: 0 }, uCoverage: { value: 0 }, uCloudiness: { value: 0 }, uHaze: { value: 0 }, uWind: { value: 0 },
    uTop: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() },
    uFog: { value: new THREE.Color() },
    uLightning: { value: 0 }, uLightningDirection: { value: new THREE.Vector3(0, .3, -1).normalize() },
  }), [])
  const celestialUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color() }, uSun: { value: 0 },
    uEclipse: { value: 0 }, uPhase: { value: -1.3 },
    uCoverage: { value: 0 }, uTime: { value: 0 }, uTransmission: { value: 1 },
  }), [])
  const starUniforms = useMemo(() => ({
    uTime: { value: 0 }, uOpacity: { value: .65 },
  }), [])

  useLayoutEffect(() => {
    const skyUniforms = skyMaterialRef.current?.uniforms
    const celestialUniforms = celestialMaterialRef.current?.uniforms
    const starUniforms = starMaterialRef.current?.uniforms
    if (!skyUniforms || !starUniforms) return
    skyUniforms.uTop.value.set(preset?.skyTop ?? '#07111d')
    skyUniforms.uBottom.value.set(preset?.skyBottom ?? '#0e2a44')
    skyUniforms.uFog.value.set(preset?.fogColor ?? '#07111d')
    skyUniforms.uCoverage.value = coverage
    const atmosphere = getSkyWeather(preset)
    skyUniforms.uCloudiness.value = atmosphere.cloudiness
    skyUniforms.uHaze.value = atmosphere.haze
    const optics = getWeatherAtmosphere(preset?.effects)
    skyUniforms.uWind.value = optics.wind
    if (import.meta.env.DEV) {
      gl.domElement.setAttribute('data-sky-cloudiness', String(atmosphere.cloudiness))
      gl.domElement.setAttribute('data-sky-haze', String(atmosphere.haze))
    }
    if (celestialUniforms) {
      celestialUniforms.uColor.value.set(moonColor)
      celestialUniforms.uSun.value = isSun || isEclipse ? 1 : 0
      celestialUniforms.uEclipse.value = isEclipse ? 1 : 0
      celestialUniforms.uPhase.value = eclipsePhase
      celestialUniforms.uCoverage.value = coverage
      celestialUniforms.uTransmission.value = optics.transmission
    }
    starUniforms.uOpacity.value = (isSun ? .045 : isEclipse ? .15 + coverage * .5 : .65) * THREE.MathUtils.clamp(starOpacityScale, 0, 1) * optics.stars
  }, [preset, moonColor, showMoon, isSun, isEclipse, eclipsePhase, coverage, starOpacityScale, gl])

  const starPositions = useMemo(() => {
    const positions = []
    for (let i = 0; i < 1000; i++) {
      positions.push(
        (starRandom(i * 3) - 0.5) * 400,
        starRandom(i * 3 + 1) * 62 + 5,
        (starRandom(i * 3 + 2) - 0.5) * 400,
      )
    }
    return new Float32Array(positions)
  }, [])

  // 별마다 랜덤 반짝임 위상
  const starPhases = useMemo(() => {
    const phases = new Float32Array(1000)
    for (let i = 0; i < 1000; i++) phases[i] = starRandom(i + 3000) * Math.PI * 2
    return phases
  }, [])

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

  useFrame((_, delta) => {
    if (playing) animationTime.current += THREE.MathUtils.clamp(delta, 0, .05)
    const t = animationTime.current
    const storm = atmosphere.rain === 1 && atmosphere.wind === 1
    if (!storm) lightningTime.current = 0
    else if (playing && !reducedMotion.current) lightningTime.current += THREE.MathUtils.clamp(delta, 0, .05)
    const flash = sampleStormLightning(lightningTime.current, storm && !reducedMotion.current, lightning.current)
    if (skyMaterialRef.current) {
      skyMaterialRef.current.uniforms.uLightning.value = flash.strength
      skyMaterialRef.current.uniforms.uLightningDirection.value.set(flash.x, flash.y, -1).normalize()
    }
    if (lightningLight.current) lightningLight.current.intensity = flash.strength * .12
    if (import.meta.env.DEV) gl.domElement.setAttribute('data-lightning', flash.strength.toFixed(4))

    if (starMaterialRef.current) starMaterialRef.current.uniforms.uTime.value = t
    if (skyMaterialRef.current) skyMaterialRef.current.uniforms.uTime.value = t
    if (celestialMaterialRef.current) celestialMaterialRef.current.uniforms.uTime.value = t
    if (lightRef.current) {
      lightRef.current.intensity = baseLightIntensity * (1 - coverage * .92) * atmosphere.transmission
      lightRef.current.color.set(coverage > .8 ? '#4a5a90' : moonColor)
    }

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
        mat.opacity = Math.sin(p * Math.PI) * cfg.maxOp * atmosphere.stars
      } else {
        mat.opacity = 0
        m.visible = false
      }
    })
  })

  return (
    <>
      <directionalLight ref={lightningLight} name="Distant storm lightning" position={[-12, 18, -35]} color="#b5c4d7" intensity={0} />
      <mesh name="Shared sky dome" renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial
          side={THREE.BackSide}
          ref={skyMaterialRef}
          depthWrite={false}
          depthTest={false}
          fog={false}
          dithering
          uniforms={skyUniforms}
          vertexShader={skyVertexShader}
          fragmentShader={skyFragmentShader}
        />
      </mesh>
      <points renderOrder={-900}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          <bufferAttribute attach="attributes-phase" args={[starPhases, 1]} />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          fog={false}
          uniforms={starUniforms}
          ref={starMaterialRef}
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

      <OceanConstellations visibility={constellationVisibility(isMoon, atmosphere.stars, starOpacityScale)} playing={playing} />

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
          {/* Celestial light sits beyond atmospheric distance fog; geometry still occludes it. */}
          <mesh name="Shared celestial disc" position={[0, 8.4, -20]} renderOrder={-800} frustumCulled={false}>
            <planeGeometry args={[radius * 2.7, radius * 2.7]} />
            <shaderMaterial
              transparent
              depthWrite={false}
              fog={false}
              uniforms={celestialUniforms}
              ref={celestialMaterialRef}
              vertexShader={celestialVertexShader}
              fragmentShader={celestialFragmentShader}
            />
          </mesh>

          <pointLight ref={lightRef} position={[0, 8.4, -20]} color={moonColor} intensity={baseLightIntensity} distance={300} />
        </>
      )}
    </>
  )
}
