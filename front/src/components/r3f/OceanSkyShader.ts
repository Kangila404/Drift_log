import type { ScenePreset } from '../../constants/scenePreset'
import { getWeatherAtmosphere } from '../../constants/weatherAtmosphere'

export function getSkyWeather(preset?: Pick<ScenePreset, 'effects'>) {
  const { cloudiness, haze } = getWeatherAtmosphere(preset?.effects)
  return { cloudiness, haze }
}

const noise = /* glsl */ `
  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * .1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
      mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float cloudField(vec2 p) {
    return noise(p) * .57 + noise(p * 2.07 + 17.3) * .29
      + noise(p * 4.13 + 5.1) * .14;
  }
`

export const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    // Translation-free dome: host skyOffset still applies to the celestial objects.
    vDirection = mat3(modelMatrix) * position;
    vec4 clip = projectionMatrix * viewMatrix * vec4(cameraPosition + vDirection, 1.0);
    gl_Position = clip.xyww;
  }
`

export const skyFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uCoverage;
  uniform float uCloudiness;
  uniform float uHaze;
  uniform float uWind;
  uniform float uLightning;
  uniform vec3 uLightningDirection;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uFog;
  varying vec3 vDirection;
  #include <common>
  #include <dithering_pars_fragment>
  ${noise}
  void main() {
    vec3 d = normalize(vDirection);
    float h = max(d.y, 0.0);
    vec3 color = mix(uBottom, uTop, smoothstep(0.0, .72, h));
    // Clear weather has no cloud deck, including residual noise at zero coverage.
    if (uCloudiness > 0.0) {
      vec2 p = d.xz / (.38 + h);
      vec2 drift = vec2(uTime * (.002 + uWind * .004), uTime * .001);
      vec2 q = p * vec2(4.8, 6.5) + drift;
      float broad = noise(q * .27 + 3.4);
      q += vec2(broad * .85, broad * .32);
      float low = (cloudField(q) + noise(q * 8.31 + 2.7) * .035 + noise(q * 16.7) * .015) / 1.05;
      low = mix(low, broad, .42);
      float detail = noise(q * 6.3 + 17.0) * .7 + noise(q * 13.1 + 4.2) * .3;
      float threshold = mix(.64, .28, uCloudiness);
      float diffusion = smoothstep(.7, 1.0, uHaze);
      float body = low + (detail - .5) * .04 * (1.0 - diffusion);
      float deck = smoothstep(threshold - .06, threshold + .18, body);
      float edge = smoothstep(threshold - .07, threshold + .035, body) * (1.0 - deck);
      float under = smoothstep(.4, .78, low + broad * .12);
      float clouds = deck * smoothstep(.0, .09, h) * uCloudiness * (1.0 - diffusion * .65);
      vec3 silver = mix(uBottom, uFog, .65) * 1.7 + vec3(.008, .011, .016);
      vec3 cloudColor = mix(silver, uTop * .5, under * .85 * (1.0 - diffusion * .8));
      cloudColor += edge * vec3(.04, .052, .063);
      cloudColor *= .95 + detail * .1;
      color = mix(color, cloudColor, clouds);
      if (uLightning > .001) {
        float illumination = pow(max(0.0, dot(d, uLightningDirection)), 48.0);
        color += vec3(.015, .018, .023) * illumination * (.25 + deck * .75) * uLightning;
        // A small partially obscured discharge, not a screen-space flash overlay.
        vec2 angular = d.xy / max(.15, -d.z);
        vec2 source = uLightningDirection.xy / -uLightningDirection.z;
        float along = (source.y - angular.y) / .11;
        float segment = along * 9.0;
        float channel = floor(segment);
        float bend = (mix(hash(vec2(channel, source.x * 37.0)),
          hash(vec2(channel + 1.0, source.x * 37.0)), fract(segment)) - .5) * .014;
        float bolt = 1.0 - smoothstep(.00035, .0013 + fwidth(angular.x), abs(angular.x - source.x - bend));
        bolt *= smoothstep(0.0, .12, along) * (1.0 - smoothstep(.72, 1.0, along));
        color += vec3(.09, .105, .13) * bolt * uLightning * step(.15, -d.z) * (.25 + detail * .5);
      }
    }
    color *= 1.0 - uCoverage * .3 * smoothstep(0.0, .22, h);
    float haze = (1.0 - smoothstep(0.0, .24, h)) * uHaze;
    color = mix(color, uFog, haze);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <dithering_fragment>
  }
`

export const celestialVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Keep the world anchor (and water lighting), but face the disc toward the view.
    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 worldScale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
    mvPosition.xy += position.xy * worldScale;
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const celestialFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uSun;
  uniform float uEclipse;
  uniform float uTransmission;
  uniform float uPhase;
  uniform float uCoverage;
  uniform float uTime;
  varying vec2 vUv;
  ${noise}
  void main() {
    vec2 p = (vUv - .5) * 2.7;
    float r = length(p);
    float aa = max(fwidth(r), .001);
    float disc = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
    float occultation = (1.0 - smoothstep(1.0 - aa, 1.0 + aa,
      length(p - vec2(uPhase * 1.2, 0.0)))) * uEclipse * step(.001, uCoverage);
    vec3 normal = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
    float maria = smoothstep(.30, .70, cloudField(p * 3.7 + 11.0));
    float grain = noise(p * 46.0) - .5;
    vec2 cell = floor(p * 8.0), local = fract(p * 8.0) - .5;
    vec2 center = vec2(hash(cell), hash(cell + 31.0)) * .42 - .21;
    float crater = length(local - center);
    float basin = (1.0 - smoothstep(.10, .27, crater)) * .09;
    float rim = (smoothstep(.19, .24, crater) - smoothstep(.24, .30, crater)) * .045;
    float relief = .66 + .24 * maria + grain * .055 - basin + rim;
    float lighting = .55 + .45 * max(0.0, dot(normal, normalize(vec3(-.4, .3, 1.0))));
    vec3 surface = uColor * mix(relief * lighting, 1.15 - r * r * .18, uSun);
    float halo = exp(-max(r - 1.0, 0.0) * 19.0) * .075
      * smoothstep(1.0 - aa, 1.0 + aa, r) * (1.0 - smoothstep(1.15, 1.34, r));
    float angle = atan(p.y, p.x);
    float corona = smoothstep(.8, 1.0, uCoverage) * uEclipse;
    halo *= (1.0 - uCoverage * .8) + corona * (1.5 + .3 * sin(angle * 7.0 + uTime * .2));
    // The eclipsing disc removes the source and its halo without painting a flat fog-colored circle.
    float alpha = (disc + halo) * (1.0 - occultation) * uTransmission;
    if (alpha < .001) discard;
    gl_FragColor = vec4(mix(uColor, surface, disc), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
