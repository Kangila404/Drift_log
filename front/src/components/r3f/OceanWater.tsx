import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ScenePreset } from '../../constants/scenePreset'

const oceanVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform float uTime;
  uniform float uWaveScale;
  uniform float uWaveSpeed;

  void main() {
    vUv = uv;

    vec3 pos = position;

    float t = uTime * uWaveSpeed;

    float waveA = sin(pos.x * 0.05 + t * 0.45) * 0.6;
    float waveB = sin(pos.y * 0.06 + t * 0.32) * 0.45;
    float waveC = sin((pos.x + pos.y) * 0.03 + t * 0.25) * 0.35;
    float small = sin(pos.x * 0.12 + pos.y * 0.1 + t * 0.85) * 0.1;

    vec4 world = modelMatrix * vec4(pos, 1.0);

    float distanceFade = smoothstep(-200.0, -20.0, world.z);
    distanceFade = max(distanceFade, 0.3);

    world.y += (waveA + waveB + waveC + small) * uWaveScale * distanceFade;

    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const oceanFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform float uTime;
  uniform vec3 uNearColor;
  uniform vec3 uFarColor;
  uniform vec3 uMoonColor;
  uniform float uMoonStrength;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    float depth = smoothstep(-90.0, 55.0, vWorldPosition.z);

    vec3 color = mix(uNearColor, uFarColor, depth);

    float horizonGlow = smoothstep(32.0, 95.0, vWorldPosition.z);
    color += vec3(0.025, 0.075, 0.12) * horizonGlow;

    float n = noise(vWorldPosition.xz * 0.08 + vec2(uTime * 0.035, uTime * 0.02));
    float wave1 = sin(vWorldPosition.z * 0.45 + uTime * 0.48);
    float wave2 = sin(vWorldPosition.z * 0.18 + vWorldPosition.x * 0.09 + uTime * 0.3);
    float wave3 = sin(vWorldPosition.x * 0.38 + vWorldPosition.z * 0.1 + uTime * 0.6);

    float waveLight = (wave1 * 0.5 + 0.5) * 0.024;
    waveLight += (wave2 * 0.5 + 0.5) * 0.018;
    waveLight += (wave3 * 0.5 + 0.5) * 0.01;
    waveLight *= 0.75 + n * 0.55;

    color += vec3(0.08, 0.18, 0.24) * waveLight;

    float moonColumn = 1.0 - smoothstep(0.0, 4.2, abs(vWorldPosition.x));
    float moonDepth = smoothstep(-12.0, 58.0, vWorldPosition.z);
    float moonFadeNear = 1.0 - smoothstep(-27.0, -3.0, vWorldPosition.z);

    float brokenA = sin(vWorldPosition.z * 1.65 + uTime * 0.78) * 0.5 + 0.5;
    float brokenB = sin(vWorldPosition.z * 3.2 + vWorldPosition.x * 0.55 + uTime * 1.15) * 0.5 + 0.5;
    float broken = brokenA * 0.65 + brokenB * 0.35;

    float moonPath = moonColumn * moonDepth * moonFadeNear;
    color += uMoonColor * moonPath * broken * uMoonStrength;

    gl_FragColor = vec4(color, 1.0);
  }
`

const DEFAULT = {
  waterNear: [0.025, 0.15, 0.235] as [number, number, number],
  waterFar: [0.012, 0.055, 0.105] as [number, number, number],
  waveScale: 1.0,
  waveSpeed: 1.0,
  moonColor: '#fffde8',
  showMoon: true,
}

interface OceanWaterProps {
  preset?: ScenePreset
}

export default function OceanWater({ preset }: OceanWaterProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useRef({
    uTime: { value: 0 },
    uWaveScale: { value: DEFAULT.waveScale },
    uWaveSpeed: { value: DEFAULT.waveSpeed },
    uNearColor: { value: new THREE.Color(...DEFAULT.waterNear) },
    uFarColor: { value: new THREE.Color(...DEFAULT.waterFar) },
    uMoonColor: { value: new THREE.Color(DEFAULT.moonColor) },
    uMoonStrength: { value: 0.22 },
  }).current

  useFrame(({ clock }) => {
    const mat = materialRef.current
    if (!mat) return

    const waterNear = preset?.waterNear ?? DEFAULT.waterNear
    const waterFar = preset?.waterFar ?? DEFAULT.waterFar
    const waveScale = preset?.waveScale ?? DEFAULT.waveScale
    const waveSpeed = preset?.waveSpeed ?? DEFAULT.waveSpeed
    const moonColor = preset?.moonColor ?? DEFAULT.moonColor
    const showMoon = preset?.showMoon ?? DEFAULT.showMoon

    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uWaveScale.value = waveScale
    mat.uniforms.uWaveSpeed.value = waveSpeed
    mat.uniforms.uNearColor.value.setRGB(...waterNear)
    mat.uniforms.uFarColor.value.setRGB(...waterFar)
    mat.uniforms.uMoonColor.value.set(moonColor)
    mat.uniforms.uMoonStrength.value = showMoon ? 0.22 : 0.0
  })

  return (
   <mesh position={[0, -2.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[300, 300, 400, 400]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={oceanVertexShader}
        fragmentShader={oceanFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}