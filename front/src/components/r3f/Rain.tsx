import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 1800
const random = (n: number) => THREE.MathUtils.euclideanModulo(Math.sin(n * 127.1 + 311.7) * 43758.5453, 1)

export default function Rain({ active = true, intensity = .45, wind = .12, playing = true,
  color = '#b5cbd5', maxOpacity = .3 }: {
  active?: boolean; intensity?: number; wind?: number; playing?: boolean; color?: string; maxOpacity?: number
}) {
  const { gl, invalidate } = useThree()
  const material = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const seeds = new Float32Array(COUNT * 6), ends = new Float32Array(COUNT * 2)
    for (let i = 0; i < COUNT; i++) {
      const seed = [random(i * 3), random(i * 3 + 1), random(i * 3 + 2)]
      seeds.set(seed, i * 6); seeds.set(seed, i * 6 + 3)
      ends[i * 2 + 1] = 1
    }
    g.setAttribute('position', new THREE.BufferAttribute(seeds, 3))
    g.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1))
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uIntensity: { value: 0 }, uWind: { value: 0 },
    uOpacity: { value: .3 }, uColor: { value: new THREE.Color() },
  }), [])
  useLayoutEffect(() => {
    const u = material.current?.uniforms
    if (!u) return
    u.uIntensity.value = active ? intensity : 0
    u.uWind.value = wind
    u.uOpacity.value = maxOpacity
    u.uColor.value.set(color)
    if (import.meta.env.DEV) gl.domElement.setAttribute('data-rain-intensity', String(u.uIntensity.value))
    invalidate()
  }, [active, intensity, wind, maxOpacity, color, gl, invalidate])
  useFrame((_, delta) => {
    const mat = material.current
    if (!mat) return
    mat.uniforms.uIntensity.value = active ? intensity : 0
    mat.uniforms.uWind.value = wind
    mat.uniforms.uOpacity.value = maxOpacity
    mat.uniforms.uColor.value.set(color)
    if (playing) mat.uniforms.uTime.value += THREE.MathUtils.clamp(delta, 0, .05)
  })
  return <lineSegments name="Shared weather rain" geometry={geometry} frustumCulled={false} visible={active} renderOrder={10}>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} depthTest
      vertexShader={`
        attribute float aEnd;
        uniform float uTime, uIntensity, uWind;
        varying float vAlpha;
        void main() {
          vec3 seed = position;
          float height = max(cameraPosition.y + 15.0, 22.0) + 2.7;
          float phase = fract(seed.y - uTime * (.43 + seed.z * .2) * (1.0 + uWind * .35));
          vec3 world = vec3(cameraPosition.x + (seed.x - .5) * 74.0,
            -2.7 + phase * height, cameraPosition.z + (seed.z - .5) * 74.0);
          float streak = .10 + seed.z * .18 + uWind * .13;
          world += vec3(uWind * (phase - .5) * 12.0, 0.0, 0.0);
          world += vec3(uWind * streak * .4, streak, 0.0) * aEnd;
          vec4 view = viewMatrix * vec4(world, 1.0);
          float distanceFade = smoothstep(2.5, 8.0, -view.z) * (1.0 - smoothstep(24.0, 48.0, -view.z));
          vAlpha = distanceFade * mix(.15, 1.0, aEnd) * step(seed.x, .32 + uIntensity * .68) * uIntensity;
          gl_Position = projectionMatrix * view;
        }
      `}
      fragmentShader={`
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          if (vAlpha < .001) discard;
          gl_FragColor = vec4(uColor, vAlpha * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `} />
  </lineSegments>
}
