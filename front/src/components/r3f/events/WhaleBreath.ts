import * as THREE from 'three'

/** One short exhalation attached to the anatomical blowholes, not ambient fog. */
export function createWhaleBreath() {
  const count = 48, position = new Float32Array(count * 3), velocity = new Float32Array(count * 3)
  const birth = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996, radius = .12 + (i % 7) * .018
    velocity.set([Math.cos(a) * radius + .08, .65 + (i % 11) * .07, Math.sin(a) * radius], i * 3)
    birth[i] = 2.55 + i / count * .65
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocity, 3))
  geometry.setAttribute('birth', new THREE.BufferAttribute(birth, 1))
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `attribute vec3 velocity; attribute float birth;
      uniform float uTime; uniform float uScale; varying float vAge;
      void main() {
        vAge = uTime - birth;
        float age = max(0.0, vAge);
        vec3 p = position + velocity * age * uScale;
        p.x += age * age * .13 * uScale;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((4.0 + age * 13.0) * uScale * 26.0 / max(1.0, -mv.z), 1.0, 38.0);
      }`,
    fragmentShader: `uniform float uOpacity; varying float vAge;
      void main() {
        if (vAge < 0.0 || vAge > 2.0) discard;
        vec2 p = (gl_PointCoord - .5) * 2.0;
        float density = exp(-dot(p,p) * 3.5) * (1.0-smoothstep(.5,1.0,length(p)));
        float fade = smoothstep(0.0,.12,vAge) * (1.0-smoothstep(.6,2.0,vAge));
        gl_FragColor = vec4(.60,.72,.75,density*fade*uOpacity*.15);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const points = new THREE.Points(geometry, material)
  points.name = 'Brief whale exhalation'
  points.frustumCulled = false
  return {
    points,
    update(anchor: THREE.Vector3, time: number, opacity: number, scale: number) {
      points.position.copy(anchor)
      material.uniforms.uTime.value = time
      material.uniforms.uOpacity.value = opacity
      material.uniforms.uScale.value = scale
      points.visible = time >= 2.55 && time < 5.2 && opacity > .001
    },
  }
}
