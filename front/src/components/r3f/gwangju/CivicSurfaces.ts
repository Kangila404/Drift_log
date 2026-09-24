import type { CityGeometryBatch } from '../city/CityGeometry'

export function prepareCivicSurfaces(batches: CityGeometryBatch[]) {
  for (const { finish, material } of batches) {
    if (!['rust', 'concrete', 'faded'].includes(finish)) continue
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec3 g = vCityPosition;
        vec3 axis = abs(normalize(cross(dFdx(g), dFdy(g))));
        float facade = 1.0 - smoothstep(.5, .85, axis.y);
        vec2 course = vec2((axis.z > axis.x ? g.x : g.z) / .42, g.y / .18);
        course.x += mod(floor(course.y), 2.0) * .5;
        vec2 uv = fract(course), aa = max(fwidth(course), vec2(.001));
        vec2 joint = 1.0 - smoothstep(vec2(.045), vec2(.045) + aa, min(uv, 1.0 - uv));
        float readable = 1.0 - smoothstep(.4, 1.2, max(aa.x, aa.y));
        float brick = step(1.5, vCitySurface) * (1.0 - step(2.5, vCitySurface)) * facade;
        diffuseColor.rgb *= mix(vec3(1.0), vec3(.71, .72, .77), brick);
        diffuseColor.rgb *= 1.0 + brick * readable * ((cityHash(vec3(floor(course), 7.0)) - .5) * .16 - max(joint.x, joint.y) * .13);
        float plaster = step(.5, vCitySurface) * (1.0 - step(1.5, vCitySurface)) * facade;
        float civicRunoff = cityNoise(g * vec3(1.9, .095, 1.9));
        float civicWear = smoothstep(.51, .72, cityNoise(g * .8) + civicRunoff * .12);
        diffuseColor.rgb *= 1.0 - plaster * civicWear * .16;
      `)
    }
    material.customProgramCacheKey = () => `${key}:civic-surfaces-v2:${finish}`
  }
}
