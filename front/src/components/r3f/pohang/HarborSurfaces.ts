import type { CityGeometryBatch } from '../city/CityGeometry'

export function prepareHarborSurfaces(batches: CityGeometryBatch[]) {
  for (const { finish, material } of batches) {
    if (['dark', 'glass', 'glazing', 'cable'].includes(finish)) continue
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.customProgramCacheKey = () => `${key}-pohang-masonry-v1`
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec3 harborAxis = abs(cross(dFdx(vCityPosition), dFdy(vCityPosition)));
        float harborU = harborAxis.x > harborAxis.z ? vCityPosition.z : vCityPosition.x;
        vec2 blockUV = vec2(harborU / .85, vCityPosition.y / .38);
        blockUV.x += mod(floor(blockUV.y), 2.0) * .5;
        vec2 blockAA = max(fwidth(blockUV), vec2(.01));
        vec2 mortar = 1.0 - smoothstep(vec2(.023), vec2(.023) + blockAA, abs(fract(blockUV) - .5));
        float blockRole = step(1.5, vCitySurface) * (1.0 - step(2.5, vCitySurface));
        float blockDetail = 1.0 - smoothstep(.3, 1.0, max(blockAA.x, blockAA.y));
        diffuseColor.rgb *= 1.0 - max(mortar.x, mortar.y) * blockRole * blockDetail * .16;
      `)
    }
  }
}
