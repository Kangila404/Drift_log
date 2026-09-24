import * as THREE from "three";
import type { ScenePreset } from "../../../constants/scenePreset";

/**
 * Displays alpha-cut hand-painted night albedo with a relighting grade.
 * This cannot remove baked shading or provide true dynamic relighting.
 * The caller owns the shared texture, including its sRGB configuration, and
 * disposes each material separately; this helper never modifies the texture.
 */
export function createSeoulPlateMaterial(
  texture: THREE.Texture,
  preset: ScenePreset,
  eclipseCoverage?: number,
): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
    transparent: true,
    alphaTest: 0.012,
    depthWrite: true,
    opacity: 1,
    toneMapped: false,
    fog: true,
  });

  // Generated RGB assets use a pure-magenta compositing matte, never painted sky
  // or sea. Key before grading so even total eclipse keeps the background empty.
  material.onBeforeCompile = shader => {
    shader.vertexShader = `varying float vPaintedWorldY;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      'vPaintedWorldY = (modelMatrix * vec4(transformed, 1.0)).y;\n#include <project_vertex>',
    );
    shader.fragmentShader = `varying float vPaintedWorldY;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
        vec4 painted = texture2D(map, vMapUv);
        float matte = min(painted.r, painted.b) - painted.g;
        painted.a *= 1.0 - smoothstep(0.01, 0.045, matte);
        painted.a *= smoothstep(-2.9, -2.35, vPaintedWorldY);
        diffuseColor *= painted;
      #endif`,
    );
  };
  material.customProgramCacheKey = () => 'seoul-painted-chroma-shore-v2';

  updateSeoulPlateMaterial(material, preset, eclipseCoverage);
  return material;
}

/**
 * Updates only the material's linear color multiplier without allocations.
 * Omitted coverage uses full coverage for an eclipse preset and zero otherwise.
 * Normal night remains neutral; totality deliberately dims the baked albedo.
 * Scene fog can further attenuate the result.
 */
export function updateSeoulPlateMaterial(
  material: THREE.MeshBasicMaterial,
  preset: ScenePreset,
  eclipseCoverage?: number,
): void {
  const defaultCoverage = preset.celestialBody === "eclipse" ? 1 : 0;
  const coverage = eclipseCoverage ?? defaultCoverage;
  const eclipse = Number.isFinite(coverage)
    ? THREE.MathUtils.clamp(coverage, 0, 1)
    : defaultCoverage;
  const ambient = THREE.MathUtils.clamp(preset.ambientIntensity, 0, 1);
  const rain = preset.effects.includes("rain") ? 0.13 : 0;
  const wind = preset.effects.includes("wind") ? 0.015 : 0;
  const brightness = 1 + (ambient - 0.7) * 0.1 - rain - wind;
  const totality = eclipse * eclipse;

  // Water chroma carries the dawn and blood-moon palette without applying
  // the dark water's absolute intensity to the already shaded artwork.
  const red = preset.waterNear[0];
  const green = preset.waterNear[1];
  const blue = preset.waterNear[2];
  const warmth = THREE.MathUtils.clamp(red / Math.max(blue, 0.001) - 0.2, 0, 1);
  const rose = THREE.MathUtils.clamp(red / Math.max(green, 0.001) - 0.5, 0, 1);

  material.color.setRGB(
    THREE.MathUtils.lerp(THREE.MathUtils.clamp(brightness + warmth * 0.06, 0.86, 1.06), 0.24, totality),
    THREE.MathUtils.lerp(THREE.MathUtils.clamp(brightness - rose * 0.025, 0.86, 1.06), 0.25, totality),
    THREE.MathUtils.lerp(THREE.MathUtils.clamp(brightness - warmth * 0.03, 0.86, 1.06), 0.28, totality),
  );
}
