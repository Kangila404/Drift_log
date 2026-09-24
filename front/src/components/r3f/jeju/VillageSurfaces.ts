import type { CityGeometryBatch } from '../city/CityGeometry'

export function prepareVillageSurfaces(batches: CityGeometryBatch[]) {
  for (const { finish, material } of batches) {
    if (['dark', 'glass', 'glazing', 'cable'].includes(finish)) continue
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey()
    material.customProgramCacheKey = () => `${key}-jeju-basalt-thatch-v1`
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec3 jejuAxis = normalize(abs(cross(dFdx(vCityPosition), dFdy(vCityPosition))) + vec3(.00001));
        float basaltRole = step(1.5, vCitySurface) * (1.0 - step(2.5, vCitySurface));
        float stoneU = jejuAxis.x > jejuAxis.z ? vCityPosition.z : vCityPosition.x;
        vec2 stoneUV = vec2(stoneU / .76, vCityPosition.y / .48);
        if (jejuAxis.y > .75) stoneUV = vCityPosition.xz / vec2(.76, .48);
        stoneUV += .22 * vec2(cityNoise(vCityPosition * .9), cityNoise(vCityPosition * 1.1 + 4.0));
        vec2 stoneCell = floor(stoneUV), stoneLocal = fract(stoneUV);
        float nearestStone = 8.0, nextStone = 8.0, stoneTone = 0.5;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 offset = vec2(float(i), float(j));
          vec2 id = stoneCell + offset;
          vec2 center = offset + .5 + .55 * (vec2(cityHash(vec3(id, 1.3)), cityHash(vec3(id, 4.7))) - .5);
          vec2 delta = center - stoneLocal;
          float distanceToStone = dot(delta, delta);
          if (distanceToStone < nearestStone) {
            nextStone = nearestStone;
            nearestStone = distanceToStone;
            stoneTone = cityHash(vec3(id, 7.2));
          } else nextStone = min(nextStone, distanceToStone);
        }
        float stoneAA = max(fwidth(stoneUV.x), fwidth(stoneUV.y));
        float stoneDetail = 1.0 - smoothstep(.22, .8, stoneAA);
        float joint = 1.0 - smoothstep(.018, .055 + stoneAA * .6, nextStone - nearestStone);
        float stoneFace = pow(max(0.0, 1.0 - nearestStone * 1.8), .7);
        diffuseColor.rgb *= 1.0 + basaltRole * (-.18 + stoneDetail * ((stoneTone - .5) * .23 + (stoneFace - .5) * .15 - joint * .08));
        float stoneRelief = basaltRole * stoneDetail * stoneFace * (.12 + stoneTone * .08);
        float timberRole = step(4.5, vCitySurface) * (1.0 - step(5.5, vCitySurface));
        diffuseColor.rgb *= 1.0 - timberRole * (1.0 - smoothstep(.35, .7, jejuAxis.y)) * .31;
        float fiberRole = step(4.5, vCitySurface) * (1.0 - step(5.5, vCitySurface)) * smoothstep(.4, .8, jejuAxis.y);
        float fibers = cityNoise(vCityPosition * vec3(7.0, .45, 1.2)) - .5;
        float fiberAA = 1.0 - smoothstep(.35, 1.4, length(fwidth(vCityPosition.xz * 7.0)));
        diffuseColor.rgb *= 1.0 + fiberRole * fibers * .22 * fiberAA;
      `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 basaltDx = normalize(dFdx(-vViewPosition)), basaltDy = normalize(dFdy(-vViewPosition));
        vec3 basaltR1 = cross(basaltDy, normal), basaltR2 = cross(normal, basaltDx);
        float basaltDet = dot(basaltDx, basaltR1) * faceDirection;
        vec3 basaltGradient = sign(basaltDet) * (dFdx(stoneRelief) * basaltR1 + dFdy(stoneRelief) * basaltR2);
        normal = normalize(max(abs(basaltDet), .00001) * normal - basaltGradient);
      `)
    }
  }
}
