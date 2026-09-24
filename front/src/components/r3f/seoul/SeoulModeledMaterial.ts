import * as THREE from 'three';
import type { ScenePreset } from '../../../constants/scenePreset';

type SurfaceKind = 'architecture' | 'terrain' | 'metal';

const SURFACES = {
  architecture: { roughness: 0.88, metalness: 0.02, grain: 0.024, weather: 0.1, scale: [0.55, 0.14, 0.55], grainScale: 1.6, damp: 1 },
  terrain: { roughness: 0.98, metalness: 0, grain: 0.03, weather: 0.12, scale: [0.24, 0.4, 0.24], grainScale: 1.1, damp: 0.7 },
  metal: { roughness: 0.63, metalness: 0.28, grain: 0.01, weather: 0.045, scale: [1.4, 0.16, 1.4], grainScale: 1.5, damp: 0.2 },
} as const;

const surfaceKinds = new WeakMap<THREE.MeshStandardMaterial, SurfaceKind>();
const moonTint = new THREE.Color();

const SURFACE_SHADER = /* glsl */ `
varying vec3 vSeoulSurfacePosition;
varying float vSeoulOcclusion;
uniform vec3 seoulWeatherScale;
uniform float seoulGrainScale;
uniform float seoulGrainStrength;
uniform float seoulWeatherStrength;
uniform float seoulDampStrength;

float seoulHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float seoulNoise(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(seoulHash(cell), seoulHash(cell + vec3(1, 0, 0)), f.x),
        mix(seoulHash(cell + vec3(0, 1, 0)), seoulHash(cell + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(seoulHash(cell + vec3(0, 0, 1)), seoulHash(cell + vec3(1, 0, 1)), f.x),
        mix(seoulHash(cell + vec3(0, 1, 1)), seoulHash(cell + vec3(1, 1, 1)), f.x), f.y), f.z);
}

// Both noise layers describe broad mottling and fade to their mean below pixel resolution.
float seoulFilteredNoise(vec3 p) {
  float footprint = max(length(dFdx(p)), length(dFdy(p)));
  float visibility = 1.0 - smoothstep(0.25, 0.9, footprint);
  return (seoulNoise(p) - 0.5) * 2.0 * visibility;
}
`;

/** Geometry supplies positions, normals, colors and scalar seoulOcclusion (0 blocked, 1 open). */
export function createSeoulModeledMaterial(kind: SurfaceKind): THREE.MeshStandardMaterial {
  const surface = SURFACES[kind];
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    color: new THREE.Color().setRGB(0.88, 0.94, 1),
    roughness: surface.roughness,
    metalness: surface.metalness,
    emissive: new THREE.Color().setRGB(0.68, 0.8, 1),
    emissiveIntensity: 0.085,
    envMapIntensity: 0.35,
  });
  material.name = `SeoulModeled:${kind}`;
  surfaceKinds.set(material, kind);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.seoulWeatherScale = { value: new THREE.Vector3(...surface.scale) };
    shader.uniforms.seoulGrainScale = { value: surface.grainScale };
    shader.uniforms.seoulGrainStrength = { value: surface.grain };
    shader.uniforms.seoulWeatherStrength = { value: surface.weather };
    shader.uniforms.seoulDampStrength = { value: surface.damp };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', /* glsl */ `
        #include <common>
        attribute float seoulOcclusion;
        varying float vSeoulOcclusion;
        varying vec3 vSeoulSurfacePosition;
      `)
      .replace('#include <worldpos_vertex>', /* glsl */ `
        #include <worldpos_vertex>
        // Three only declares worldPosition for certain lighting features.
        vec4 seoulPosition = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          seoulPosition = batchingMatrix * seoulPosition;
        #endif
        #ifdef USE_INSTANCING
          seoulPosition = instanceMatrix * seoulPosition;
        #endif
        vSeoulSurfacePosition = (modelMatrix * seoulPosition).xyz;
        vSeoulOcclusion = clamp(seoulOcclusion, 0.0, 1.0);
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SURFACE_SHADER}`)
      .replace('#include <color_fragment>', /* glsl */ `
        #include <color_fragment>
        float seoulWeather = seoulFilteredNoise(vSeoulSurfacePosition * seoulWeatherScale);
        float seoulGrain = seoulFilteredNoise(vSeoulSurfacePosition * seoulGrainScale + vec3(17.0));
        diffuseColor.rgb *= 1.0 + seoulWeather * seoulWeatherStrength + seoulGrain * seoulGrainStrength;

        // A soft capillary stain rises above the world-space waterline; no thin sparkling rim.
        float seoulTidalHeight = vSeoulSurfacePosition.y + 2.7 - seoulWeather * 0.16;
        float seoulTidalFilter = fwidth(seoulTidalHeight);
        float seoulDamp = seoulDampStrength * (1.0 - smoothstep(
          -0.15 - seoulTidalFilter, 0.85 + seoulTidalFilter, seoulTidalHeight));
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.78, 0.84, 0.9), seoulDamp);

        float seoulOpenness = clamp(vSeoulOcclusion, 0.0, 1.0);
        diffuseColor.rgb *= mix(0.9, 1.0, seoulOpenness);
      `)
      .replace('#include <roughnessmap_fragment>', /* glsl */ `
        #include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + seoulWeather * 0.035 - seoulDamp * 0.11, 0.5, 1.0);
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */ `
        #include <emissivemap_fragment>
        // A restrained bounce-light floor follows the authored color, including instance colors.
        totalEmissiveRadiance *= diffuseColor.rgb * mix(0.72, 1.0, seoulOpenness);
      `)
      .replace('#include <aomap_fragment>', /* glsl */ `
        #include <aomap_fragment>
        // Match Three's AO stage without requiring an AO texture or changing direct highlights.
        float seoulAmbientOcclusion = mix(0.3, 1.0, seoulOpenness);
        reflectedLight.indirectDiffuse *= seoulAmbientOcclusion;
        #if defined(USE_ENVMAP) && defined(STANDARD)
          float seoulDotNV = saturate(dot(geometryNormal, geometryViewDir));
          reflectedLight.indirectSpecular *= computeSpecularOcclusion(
            seoulDotNV, seoulAmbientOcclusion, material.roughness);
        #endif
      `);
  };
  material.customProgramCacheKey = () => 'seoul-modeled-surface-v2';
  return material;
}

/** Update standard uniforms without recompiling the procedural shader. Coverage is normalized 0..1. */
export function updateSeoulModeledMaterial(
  material: THREE.MeshStandardMaterial,
  preset: ScenePreset,
  eclipseCoverage: number,
): void {
  const kind = surfaceKinds.get(material);
  if (!kind) return;

  const coverage = Number.isFinite(eclipseCoverage) ? THREE.MathUtils.clamp(eclipseCoverage, 0, 1) : 0;
  const ambient = Number.isFinite(preset.ambientIntensity)
    ? THREE.MathUtils.clamp(preset.ambientIntensity, 0, 1)
    : 0.7;
  const night = preset.celestialBody === 'sun' ? 0 : 1;
  moonTint.set(preset.moonColor);
  material.color.setRGB(0.96 - night * 0.08, 0.98 - night * 0.04, 1);
  material.color.lerp(moonTint, preset.showMoon ? 0.035 : 0);
  material.emissive.setRGB(0.68, 0.8, 1).lerp(moonTint, preset.showMoon ? 0.12 : 0);
  material.emissiveIntensity = 0.045 + (1 - ambient) * 0.08 + coverage * 0.025;

  const surface = SURFACES[kind];
  const wet = preset.effects.includes('rain') ? 1 : 0;
  material.roughness = surface.roughness - wet * (kind === 'metal' ? 0.08 : 0.045);
}
