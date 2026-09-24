import * as THREE from 'three'
import type { CityGeometryBatch } from './CityGeometry'

export const CITY_AO_MAGIC = 0x4f414843
const imul = Math.imul

// Detect stale bakes after geometry/order edits instead of shading a different model silently.
export function cityGeometryFingerprint(batches: CityGeometryBatch[]) {
  let hash = 2166136261
  for (const { finish, geometry } of batches) {
    for (const char of finish) hash = imul(hash ^ char.charCodeAt(0), 16777619)
    for (const name of ['position', 'normal']) {
      const attribute = geometry.getAttribute(name).array
      const bytes = new Uint8Array(attribute.buffer, attribute.byteOffset, attribute.byteLength)
      for (let i = 0; i < bytes.length; i++) hash = imul(hash ^ bytes[i], 16777619)
    }
  }
  return hash >>> 0
}

export function createCityOcclusion(buffer: ArrayBuffer, strength = .46) {
  if (buffer.byteLength < 12) throw new Error('Incomplete city AO data')
  const header = new DataView(buffer), data = new Uint8Array(buffer, 12)
  if (header.getUint32(0, true) !== CITY_AO_MAGIC || header.getUint32(8, true) !== data.length) {
    throw new Error('Invalid city AO data')
  }
  return (batches: CityGeometryBatch[]) => {
    const count = batches.reduce((sum, { geometry }) => sum + geometry.getAttribute('position').count, 0)
    if (count !== data.length || cityGeometryFingerprint(batches) !== header.getUint32(4, true)) {
      throw new Error('City geometry changed: regenerate its offline AO data')
    }
    const enabled = typeof window === 'undefined' || new URLSearchParams(window.location.search).get('occlusion') !== 'off'
    let offset = 0
    for (const { geometry, material } of batches) {
      const length = geometry.getAttribute('position').count
      geometry.setAttribute('cityOpenness', new THREE.Uint8BufferAttribute(data.slice(offset, offset + length), 1, true))
      offset += length
      const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey()
      material.onBeforeCompile = (shader, renderer) => {
        previous.call(material, shader, renderer)
        shader.uniforms.cityAO = { value: enabled ? strength : 0 }
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float cityOpenness;\nvarying float vCityOpenness;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCityOpenness = cityOpenness;')
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vCityOpenness;\nuniform float cityAO;')
          .replace('#include <aomap_fragment>', `#include <aomap_fragment>
            float visibility = mix(1.0, clamp(vCityOpenness, 0.0, 1.0), cityAO);
            reflectedLight.indirectDiffuse *= visibility;
            reflectedLight.indirectSpecular *= visibility;
          `)
      }
      material.customProgramCacheKey = () => `${previousKey}:city-contact-v3`
      material.userData.contactEnabled = enabled
    }
  }
}
