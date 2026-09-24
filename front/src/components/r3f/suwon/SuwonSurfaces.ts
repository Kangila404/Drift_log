import type { CityGeometryBatch } from '../city/CityGeometry'

// Analytic surface detail, not image textures. Preserve the shared weathering/AO hooks.
export function prepareSuwonArchitecture(batches: CityGeometryBatch[]) {
  for (const { finish, material } of batches) {
    if (!['rust', 'faded', 'concrete'].includes(finish)) continue
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec3 suwonP = vCityPosition;
        vec3 face = abs(normalize(cross(dFdx(suwonP), dFdy(suwonP))));
        float wallFace = 1.0 - smoothstep(.45, .8, face.y);
        float wallRun = face.z > face.x ? suwonP.x : suwonP.z;
        vec2 bond = vec2(wallRun / .55, suwonP.y / .23);
        bond.x += mod(floor(bond.y), 2.0) * .5;
        vec2 cell = fract(bond);
        vec2 aa = max(fwidth(bond), vec2(.001));
        vec2 joints = 1.0 - smoothstep(vec2(.045), vec2(.045) + aa, min(cell, 1.0 - cell));
        float resolved = 1.0 - smoothstep(.4, 1.2, max(aa.x, aa.y));
        float brick = ${finish === 'rust' ? '1.0' : '0.0'} * step(1.5, vCitySurface) * (1.0 - step(2.5, vCitySurface)) * wallFace;
        float variation = cityHash(vec3(floor(bond), 13.0));
        diffuseColor.rgb *= 1.0 + brick * ((variation - .5) * .24 - max(joints.x, joints.y) * .28) * resolved;
        float plaster = step(.5, vCitySurface) * (1.0 - step(1.5, vCitySurface)) * wallFace;
        float streak = cityNoise(suwonP * vec3(2.2, .08, 2.2));
        float aged = smoothstep(.49, .68, cityNoise(suwonP * .85) + streak * .17);
        diffuseColor.rgb *= 1.0 - plaster * aged * .22;
      `)
    }
    material.customProgramCacheKey = () => `${key}:suwon-wall-v1:${finish}`
  }
}

export function addSuwonTerrainSurface(batches: CityGeometryBatch[]) {
  for (const { material } of batches) {
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec3 hill = vCityPosition;
        float canopy = cityNoise(hill * .65) * .55 + cityNoise(hill * 1.7) * .3 + cityNoise(hill * 3.5) * .15;
        float folds = cityNoise(hill * vec3(.18, .12, .3));
        diffuseColor.rgb *= .83 + canopy * .34 + (folds - .5) * .2;
      `)
    }
    material.customProgramCacheKey = () => `${key}:suwon-ground-v1`
  }
}
