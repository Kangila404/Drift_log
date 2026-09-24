import * as THREE from 'three'
import { sampleOceanSurface, type OceanSurfaceState } from '../OceanWaves'
import { OCEAN_SURFACE_Y } from '../OceanWater'

/** A thin, broken bow wash follows the shared ocean, never a second water plane. */
export function createWaterContact(length: number, breadth: number) {
  const group = new THREE.Group()
  group.name = 'Encounter bow wash'
  const segments = 36
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uOpacity; uniform float uTime;
      void main() {
        float edge = pow(max(0.0, sin(vUv.y * 3.14159)), 1.8);
        float ends = smoothstep(0.0, .12, vUv.x) * (1.0 - smoothstep(.52, 1.0, vUv.x));
        float strands = .45 + .3 * sin(vUv.x * 71.0 - uTime * 2.0 + sin(vUv.x * 23.0) * 3.0);
        float a = edge * ends * strands * uOpacity;
        gl_FragColor = vec4(.38, .53, .58, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const strips = [-1, 1].map(side => {
    const positions = new Float32Array((segments + 1) * 2 * 3)
    const uv = new Float32Array((segments + 1) * 2 * 2), indices: number[] = []
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j < 2; j++) uv.set([i / segments, j], (i * 2 + j) * 2)
      if (i < segments) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    geometry.setIndex(indices)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    group.add(mesh)
    return { side, geometry, positions }
  })
  const sample = { height: 0, slopeX: 0, slopeZ: 0 }
  const shoulders = [[0, .12], [.06, .88], [.16, 1.02], [.30, 1.16], [.45, .99], [.60, .65], [.78, .35], [1, 1.4]]
  return {
    group,
    update(x: number, z: number, yaw: number, scale: number, time: number, opacity: number, water?: OceanSurfaceState) {
      material.uniforms.uTime.value = time
      material.uniforms.uOpacity.value = opacity * .80
      group.visible = opacity > .001
      for (const { side, geometry, positions } of strips) {
        for (let i = 0; i <= segments; i++) {
          const t = i / segments
          const along = length * (.49 - t * 1.22)
          let station = 0
          while (station < shoulders.length - 2 && t > shoulders[station + 1][0]) station++
          const a = shoulders[station], b = shoulders[station + 1]
          const shoulder = breadth * THREE.MathUtils.lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0]))
          const width = breadth * (.10 + t * .22)
          for (let j = 0; j < 2; j++) {
            const lateral = side * (shoulder + j * width)
            const wx = x + (lateral * Math.cos(yaw) + along * Math.sin(yaw)) * scale
            const wz = z + (along * Math.cos(yaw) - lateral * Math.sin(yaw)) * scale
            const y = OCEAN_SURFACE_Y + (water ? sampleOceanSurface(wx, wz, water.time, water.scale, water.speed, water.wind, sample).height : 0)
            positions.set([wx, y + .025, wz], (i * 2 + j) * 3)
          }
        }
        geometry.attributes.position.needsUpdate = true
      }
    },
  }
}
