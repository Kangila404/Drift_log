import type { CityGeometryBatch } from '../city/CityGeometry'

export function prepareMarketSurfaces(batches: CityGeometryBatch[]) {
  for (const { finish, material } of batches) {
    if (['dark', 'glass', 'glazing', 'cable'].includes(finish)) continue
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.customProgramCacheKey = () => `${key}-daegu-masonry-v1`
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float masonryFace = step(1.5, vCitySurface) * (1.0 - step(2.5, vCitySurface));
        vec3 faceAxis = abs(cross(dFdx(vCityPosition), dFdy(vCityPosition)));
        float across = faceAxis.x > faceAxis.z ? vCityPosition.z : vCityPosition.x;
        vec2 brickUV = vec2(across / .67, vCityPosition.y / .28);
        brickUV.x += mod(floor(brickUV.y), 2.0) * .5;
        vec2 aa = max(fwidth(brickUV), vec2(.015));
        vec2 joint = 1.0 - smoothstep(vec2(.025), vec2(.025) + aa, abs(fract(brickUV) - .5));
        float jointVisibility = 1.0 - smoothstep(.35, 1.1, max(aa.x, aa.y));
        diffuseColor.rgb *= 1.0 - max(joint.x, joint.y) * masonryFace * jointVisibility * .19;
      `)
    }
  }
}
