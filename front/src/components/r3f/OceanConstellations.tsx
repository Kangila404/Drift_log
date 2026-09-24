import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CONSTELLATION_LINE_OPACITY, CONSTELLATION_STAR_OPACITY, createConstellationField } from './ConstellationField'

const vertexShader = /* glsl */ `
  attribute float phase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vPresence;
  void main() {
    vPresence = .92 + .08 * sin(uTime * .055 + phase);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.65 * uPixelRatio;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying float vPresence;
  void main() {
    float alpha = uOpacity * vPresence;
    #ifdef STAR_POINT
      float r = length(gl_PointCoord - .5);
      alpha *= 1.0 - smoothstep(.16, .5, r);
    #endif
    gl_FragColor = vec4(vec3(.78, .84, .9), alpha);
  }
`

export default function OceanConstellations({ visibility, playing }: { visibility: number; playing: boolean }) {
  const field = useMemo(() => createConstellationField(), [])
  const lines = useRef<THREE.ShaderMaterial>(null), stars = useRef<THREE.ShaderMaterial>(null)
  const time = useRef(0)
  const reducedMotion = useRef(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reducedMotion.current = media.matches }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const uniforms = useMemo(() => ({
    lines: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
    stars: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
  }), [])
  useLayoutEffect(() => {
    if (lines.current) lines.current.uniforms.uOpacity.value = visibility * CONSTELLATION_LINE_OPACITY
    if (stars.current) stars.current.uniforms.uOpacity.value = visibility * CONSTELLATION_STAR_OPACITY
  }, [visibility])
  useFrame(({ gl }, delta) => {
    if (playing && !reducedMotion.current) time.current += Math.max(0, Math.min(delta, .05))
    for (const material of [lines.current, stars.current]) {
      if (!material) continue
      material.uniforms.uTime.value = time.current
      material.uniforms.uPixelRatio.value = gl.getPixelRatio()
    }
  })
  return <group name="Quiet constellation field" visible={visibility > 0}>
    <lineSegments name="Constellation threads" renderOrder={-900}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.lines, 3]} />
        <bufferAttribute attach="attributes-phase" args={[field.linePhases, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={lines} transparent depthWrite={false} fog={false} uniforms={uniforms.lines} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </lineSegments>
    <points name="Constellation stars" renderOrder={-900}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.points, 3]} />
        <bufferAttribute attach="attributes-phase" args={[field.pointPhases, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={stars} defines={{ STAR_POINT: 1 }} transparent depthWrite={false} fog={false} uniforms={uniforms.stars} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </points>
  </group>
}
