import * as THREE from 'three'

/** Object-space grain stays attached when a reusable roof is moved or tilted. */
export function addPalaceSurface(material: THREE.MeshStandardMaterial, kind: 'stone' | 'wood') {
  material.customProgramCacheKey = () => `palace-surface-v3-${kind}`
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPalacePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPalacePosition = position;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec3 vPalacePosition;
      float palaceHash(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float palaceNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(palaceHash(i), palaceHash(i + vec3(1,0,0)), f.x),
                       mix(palaceHash(i + vec3(0,1,0)), palaceHash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(palaceHash(i + vec3(0,0,1)), palaceHash(i + vec3(1,0,1)), f.x),
                       mix(palaceHash(i + vec3(0,1,1)), palaceHash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
    `).replace('#include <map_fragment>', `
      #include <map_fragment>
      vec3 grainPosition = vPalacePosition * ${kind === 'stone' ? 'vec3(5.0)' : 'vec3(8.0, 0.45, 8.0)'};
      float broadGrain = palaceNoise(vPalacePosition * 1.35);
      float grainAA = 1.0 - smoothstep(0.35, 1.3, length(fwidth(grainPosition)));
      float fineGrain = mix(0.5, palaceNoise(grainPosition), grainAA);
      float streaks = palaceNoise(vPalacePosition * vec3(2.8, 0.23, 2.8));
      // Gate geometry is baked in local coordinates; 4.25 is the scene's flood level.
      float tideHeight = 4.25 + (streaks - 0.5) * 0.24;
      float damp = 1.0 - smoothstep(tideHeight - 0.12, tideHeight + 0.65, vPalacePosition.y);
      float tideRing = 1.0 - smoothstep(0.06, 0.28, abs(vPalacePosition.y - tideHeight - 0.16));
      float peeling = smoothstep(0.48, 0.73, broadGrain * 0.72 + fineGrain * 0.28);
      vec3 exposedSurface = ${kind === 'stone' ? 'vec3(0.21, 0.26, 0.34)' : 'vec3(0.12, 0.17, 0.27)'};
      diffuseColor.rgb = mix(diffuseColor.rgb, exposedSurface, peeling * ${kind === 'stone' ? '0.18' : '0.48'});
      diffuseColor.rgb *= 0.93 + 0.08 * broadGrain + 0.025 * (fineGrain - 0.5);
      diffuseColor.rgb *= 1.0 - damp * (0.19 + streaks * 0.10) - tideRing * 0.12;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.10, 0.16), damp * 0.10);
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + broadGrain * 0.035, 0.94, 1.0);
    `)
  }
}

export function createPalaceSign() {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 384
  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = '#26364f'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#8396b0'
  context.lineWidth = 5
  context.strokeRect(18, 18, 988, 348)
  context.font = '600 244px "Batang", "Noto Serif KR", "AppleMyungjo", "Malgun Gothic", serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#c4cfdf'
  context.fillText('\u666f\u798f\u5bae', 512, 202, 838)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, envMapIntensity: 0.12 })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.06, 0.77), material)
  mesh.position.set(0, 10.96, 2.34)
  mesh.name = 'Gyeongbokgung Hanja nameboard'
  return mesh
}
