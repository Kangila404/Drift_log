import type { CityGeometryBatch } from '../city/CityGeometry'

// Geological surface relief is procedural, with no concept image or painted sky.
export function prepareTuffSurface(batches: CityGeometryBatch[]) {
  for (const { material } of batches) {
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.customProgramCacheKey = () => `${key}-jeju-eroded-tuff-v1`
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec3 tuffP = vCityPosition;
        vec3 tuffAxis = normalize(abs(cross(dFdx(tuffP), dFdy(tuffP))) + vec3(.00001));
        float cliffRole = smoothstep(.16, .58, 1.0 - tuffAxis.y) * smoothstep(4.0, 8.0, tuffP.y);
        float broadTuff = cityNoise(tuffP * vec3(.42, .32, .42));
        float erosion = cityNoise(tuffP * vec3(1.8, .14, 1.8) + broadTuff * .9);
        float beds = cityNoise(tuffP * vec3(.7, 2.3, .7) + broadTuff * 2.4);
        float chips = cityNoise(tuffP * vec3(2.2, 2.4, 2.1));
        float fineAA = 1.0 - smoothstep(.4, 1.6, length(fwidth(tuffP * 4.5)));
        float grit = (cityNoise(tuffP * 4.5) - .5) * fineAA;
        float tuffTone = 1.0 + (broadTuff - .5) * .18 + (erosion - .5) * .45 + (beds - .5) * .12 + (chips - .5) * .24 + grit * .12;
        diffuseColor.rgb *= mix(1.0, tuffTone, cliffRole);
        float tuffRelief = cliffRole * ((erosion - .5) * .16 + (beds - .5) * .035 + (chips - .5) * .07 + grit * .012);
      `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 tuffDx = normalize(dFdx(-vViewPosition)), tuffDy = normalize(dFdy(-vViewPosition));
        vec3 tuffR1 = cross(tuffDy, normal), tuffR2 = cross(normal, tuffDx);
        float tuffDet = dot(tuffDx, tuffR1) * faceDirection;
        vec3 tuffGradient = sign(tuffDet) * (dFdx(tuffRelief) * tuffR1 + dFdy(tuffRelief) * tuffR2);
        normal = normalize(max(abs(tuffDet), .00001) * normal - tuffGradient);
      `)
    }
  }
}
