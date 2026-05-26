import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const oceanVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform float uTime;

  void main() {
    vUv = uv;

    vec3 pos = position;

    float waveA = sin(pos.x * 0.055 + uTime * 0.45) * 0.045;
    float waveB = sin(pos.y * 0.075 + uTime * 0.32) * 0.035;
    float waveC = sin((pos.x + pos.y) * 0.035 + uTime * 0.25) * 0.03;
    float small = sin(pos.x * 0.22 + pos.y * 0.18 + uTime * 0.85) * 0.012;

    pos.z += waveA + waveB + waveC + small;

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = world.xyz;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const oceanFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  uniform float uTime;

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

    vec3 nearColor = vec3(0.025, 0.15, 0.235);
    vec3 farColor = vec3(0.012, 0.055, 0.105);
    vec3 color = mix(nearColor, farColor, depth);

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
    color += vec3(0.42, 0.62, 0.72) * moonPath * broken * 0.22;

    gl_FragColor = vec4(color, 1.0);
  }
`

export default function OceanWater() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[300, 300, 220, 220]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={oceanVertexShader}
        fragmentShader={oceanFragmentShader}
        uniforms={{
          uTime: { value: 0 },
        }}
      />
    </mesh>
  )
}