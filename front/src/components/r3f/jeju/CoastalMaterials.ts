import * as THREE from 'three'
import type { CityFinish, CityGeometryBatch } from '../city/CityGeometry'

const PALETTE: Record<CityFinish, string> = {
  concrete: '#b9c5c9', edge: '#536370', faded: '#60737d',
  rust: '#778991', trim: '#8a989d', paint: '#698c8e',
  dark: '#111c24', glass: '#263c49', glazing: '#827b69',
  steel: '#667c86', cable: '#364858',
}

export function prepareCoastalMaterials(batches: CityGeometryBatch[]) {
  for (const { finish, material } of batches) {
    material.color.set(PALETTE[finish])
    material.side = THREE.FrontSide
    material.roughness = finish === 'glass' ? .3 : finish === 'steel' ? .63 : .94
    material.metalness = finish === 'steel' ? .35 : .015
    if (finish === 'cable') {
      // Only distant terrain uses this batch. Separate overlapping slopes, not the sky.
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vRidgeDepth;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRidgeDepth = -position.z;')
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vRidgeDepth;')
          .replace('#include <map_fragment>', `#include <map_fragment>
            diffuseColor.rgb *= mix(.78, 1.45, smoothstep(148.0, 190.0, vRidgeDepth));
          `)
          // Compress optical distance with the backdrop scale; weather still owns fog density/color.
          .replace('#include <fog_fragment>', THREE.ShaderChunk.fog_fragment.replaceAll('vFogDepth', '(vFogDepth * .4)'))
      }
      material.customProgramCacheKey = () => 'jeju-distant-ridge-tones-v3'
    }
    if (finish === 'glazing') {
      material.emissive.set('#b78b56')
      material.emissiveIntensity = .16
    }
    if (!['concrete', 'edge', 'faded', 'rust', 'trim', 'paint'].includes(finish)) continue
    const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('float cityRelief =', `
        float pores = cityNoise(p * 21.0);
        float poreAA = 1.0 - smoothstep(.5, 1.5, length(fwidth(p * 21.0)));
        float plaster = 1.0 - step(1.5, vCitySurface);
        float stone = step(1.5, vCitySurface) * (1.0 - step(2.5, vCitySurface));
        float crust = smoothstep(.46, .69, cityNoise(p * 2.4));
        float mineralTone = cityNoise(p * 3.7) * .65 + cityNoise(p * 9.1) * .35;
        diffuseColor.rgb *= 1.0 - stone * (.18 * crust + .18 * pores * poreAA);
        diffuseColor.rgb *= 1.0 + stone * (mineralTone - .5) * .4;
        diffuseColor.rgb *= 1.0 - plaster * smoothstep(.61, .72, wear) * .17;
        float cityRelief =`)
    }
    material.customProgramCacheKey = () => `${previousKey}:jeju-coastal-fabric-v1`
    material.needsUpdate = true
  }
}
