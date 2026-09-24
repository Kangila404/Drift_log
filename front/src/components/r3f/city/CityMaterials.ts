import type { MeshStandardMaterial } from 'three'

export function addCityWeathering(material: MeshStandardMaterial, strength = 1) {
  material.customProgramCacheKey = () => 'flooded-city-physical-surfaces-v6'
  material.onBeforeCompile = shader => {
    shader.uniforms.cityWeatheringStrength = { value: strength }
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float citySurface;\nvarying float vCitySurface;\nvarying vec3 vCityPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCityPosition = position;\nvCitySurface = citySurface;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vCityPosition;
      varying float vCitySurface;
      uniform float cityWeatheringStrength;
      float cityHash(vec3 p) {
        p = fract(p * .1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float cityNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(cityHash(i), cityHash(i + vec3(1,0,0)), f.x),
          mix(cityHash(i + vec3(0,1,0)), cityHash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(cityHash(i + vec3(0,0,1)), cityHash(i + vec3(1,0,1)), f.x),
          mix(cityHash(i + vec3(0,1,1)), cityHash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
    `).replace('#include <map_fragment>', `#include <map_fragment>
      vec3 p = vCityPosition;
      float detail = smoothstep(-60.0, 8.0, p.z);
      float runoff = cityNoise(p * vec3(1.8, .075, 1.8));
      float wear = cityNoise(p * .62) * .65 + cityNoise(p * 1.37) * .35;
      float massTone = cityNoise(p * vec3(.14, .035, .14));
      float spall = smoothstep(.51, .66, wear + (runoff - .5) * .16) * detail;
      float mineral = step(.5, vCitySurface) * (1.0 - step(2.5, vCitySurface));
      float sheet = step(3.5, vCitySurface) * (1.0 - step(4.5, vCitySurface));
      float timber = step(4.5, vCitySurface) * (1.0 - step(5.5, vCitySurface));
      float foliage = step(5.5, vCitySurface);
      vec3 grainPoint = p * 12.;
      float grainAA = 1.0 - smoothstep(.3, 1.15, length(fwidth(grainPoint)));
      float grain = (cityNoise(grainPoint) - .5) * grainAA;
      float damp = 1.0 - smoothstep(4.24 + runoff * .1, 4.65 + runoff * .15, p.y);
      float salt = (1.0 - smoothstep(.05, .22, abs(p.y - 4.61 - runoff * .13))) * .085;
      vec3 cityBase = diffuseColor.rgb;
      diffuseColor.rgb *= 1.02 + (wear - .5) * .55 + (massTone - .5) * .22 - runoff * .13 + grain * .12;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.6, .68, .73), spall * (.12 + mineral * .5 + sheet * .25));
      diffuseColor.rgb += vec3(.025, .035, .041) * smoothstep(.59, .65, wear) * detail * .25;
      float woodGrain = cityNoise(p * vec3(5.0, .12, 3.0));
      diffuseColor.rgb *= 1.0 + timber * (woodGrain - .5) * .28;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.7, .86, .81), foliage * .5);
      diffuseColor.rgb = mix(cityBase, diffuseColor.rgb, cityWeatheringStrength);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.35, .48, .64), damp * .8);
      diffuseColor.rgb += vec3(.1, .13, .16) * salt;
      float cityRelief = cityWeatheringStrength * detail * (mineral * ((wear - .5) * .065 + spall * .028) + timber * (woodGrain - .5) * .025);
    `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      // Screen-space surface gradients, as used by Three's unparameterized bump mapping.
      vec3 cityDx = normalize(dFdx(-vViewPosition));
      vec3 cityDy = normalize(dFdy(-vViewPosition));
      vec3 cityR1 = cross(cityDy, normal), cityR2 = cross(normal, cityDx);
      float cityDet = dot(cityDx, cityR1) * faceDirection;
      vec3 cityGradient = sign(cityDet) * (dFdx(cityRelief) * cityR1 + dFdy(cityRelief) * cityR2);
      normal = normalize(max(abs(cityDet), .00001) * normal - cityGradient);
    `)
  }
}
