import * as THREE from 'three';

export type SeoulSurface =
  | 'plaster'
  | 'stone'
  | 'tile'
  | 'timber'
  | 'metal'
  | 'glass'
  | 'foliage'
  | 'distant';

type SurfaceProfile = {
  color: number;
  roughness: number;
  metalness: number;
  contact: number;
  texture: boolean;
};

// Moderately reflective albedos leave the night exposure to Seoul's lighting.
const profiles: Record<SeoulSurface, SurfaceProfile> = {
  plaster: { color: 0x9aaab7, roughness: 0.92, metalness: 0, contact: 0.07, texture: true },
  stone: { color: 0x87979f, roughness: 0.86, metalness: 0, contact: 0.08, texture: true },
  tile: { color: 0x738f9a, roughness: 0.48, metalness: 0, contact: 0.06, texture: true },
  timber: { color: 0x657775, roughness: 0.83, metalness: 0, contact: 0.075, texture: true },
  metal: { color: 0x94a6b4, roughness: 0.57, metalness: 0.35, contact: 0.04, texture: false },
  glass: { color: 0x334c5b, roughness: 0.25, metalness: 0, contact: 0.025, texture: false },
  foliage: { color: 0x708c87, roughness: 0.96, metalness: 0, contact: 0.04, texture: true },
  distant: { color: 0x536b83, roughness: 1, metalness: 0, contact: 0.015, texture: false },
};

const TAU = Math.PI * 2;
const TEXTURE_SIZE = 128;

function smoothstep(low: number, high: number, value: number): number {
  const t = THREE.MathUtils.clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
}

function fraction(value: number): number {
  return value - Math.floor(value);
}

function seedValue(seed: number): number {
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function joint(coordinate: number, width: number): number {
  const t = fraction(coordinate);
  return 1 - smoothstep(width, width * 2, Math.min(t, 1 - t));
}

// All fields repeat at UV boundaries. Courses follow V; timber follows V grain.
// UVs belong to the builder: one UV unit is one pattern repeat, not one metre.
function textureValue(surface: SeoulSurface, u: number, v: number): number {
  const cloud = Math.sin(TAU * u) * Math.cos(TAU * v)
    + 0.35 * Math.cos(TAU * (3 * u + 2 * v));

  switch (surface) {
    case 'plaster':
      return 0.974 + cloud * 0.012;
    case 'stone': {
      const row = Math.floor(v * 4);
      const joints = Math.max(joint(v * 4, 0.012), joint(u * 3 + (row % 2) * 0.5, 0.012));
      return 0.977 + cloud * 0.01 - joints * 0.045;
    }
    case 'tile': {
      const row = Math.floor(v * 8);
      const joints = Math.max(joint(v * 8, 0.025), joint(u * 4 + (row % 2) * 0.5, 0.018));
      return 0.984 + cloud * 0.006 - joints * 0.075;
    }
    case 'timber': {
      const grain = Math.sin(TAU * (u * 15) + 0.4 * Math.sin(TAU * v));
      return 0.971 + grain * 0.009 + cloud * 0.006 - joint(u * 5, 0.012) * 0.035;
    }
    case 'foliage':
      return 0.974 + cloud * 0.013;
    default:
      return 1;
  }
}

function createSurfaceMap(surface: SeoulSurface): THREE.CanvasTexture | null {
  // Server-side callers still receive a usable, untextured standard material.
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const pixels = context.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const value = Math.round(255 * THREE.MathUtils.clamp(
        textureValue(surface, (x + 0.5) / TEXTURE_SIZE, (y + 0.5) / TEXTURE_SIZE), 0, 1,
      ));
      const offset = (y * TEXTURE_SIZE + x) * 4;
      pixels.data[offset] = value;
      pixels.data[offset + 1] = value;
      pixels.data[offset + 2] = value;
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `seoul-${surface}-albedo`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 1;
  return texture;
}

/** Create once per surface per scene and reuse across meshes; dispose at teardown.
 * Maps are private to this material. Clones must not outlive or share its maps.
 * Glass is intentionally opaque to keep distant windows in the opaque pass.
 */
export function createSeoulMaterial(surface: SeoulSurface): THREE.MeshStandardMaterial {
  const profile = profiles[surface];
  const map = profile.texture ? createSurfaceMap(surface) : null;
  const bumpMap = map && surface !== 'foliage' ? map.clone() : null;
  if (bumpMap) { bumpMap.colorSpace = THREE.NoColorSpace; bumpMap.needsUpdate = true; }
  const material = new THREE.MeshStandardMaterial({
    name: `seoul-${surface}`,
    color: profile.color,
    roughness: profile.roughness,
    metalness: profile.metalness,
    vertexColors: true,
    map,
    bumpMap,
    bumpScale: surface === 'tile' ? .16 : surface === 'stone' ? .06 : .025,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  let disposed = false;
  material.addEventListener('dispose', () => {
    if (disposed) return;
    disposed = true;
    map?.dispose();
    bumpMap?.dispose();
    // Release the canvas backing store as well as the GPU texture allocation.
    if (map) {
      map.image.width = 1;
      map.image.height = 1;
    }
    material.map = null;
    material.bumpMap = null;
  });
  return material;
}

/** Bake mild linear vertex-color modulation before applying world transforms.
 * Local +Y is construction-up. Shade individual parts before merging geometry.
 * UV, position, normal, index and groups are preserved; previous color is replaced.
 * This is a contact cue, not scene occlusion: neighboring objects are not sampled.
 */
export function shadeSeoulGeometry(
  geometry: THREE.BufferGeometry,
  surface: SeoulSurface,
  seed = 0,
): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position || !normal || position.itemSize < 3 || normal.itemSize < 3
    || position.count !== normal.count) {
    throw new TypeError('Seoul shading requires matching position and normal attributes.');
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const spanZ = maxZ - minZ;
  const objectValue = seedValue(seed);
  const phase = objectValue * TAU;
  const brightness = 0.985 + objectValue * 0.03;
  const tint = (seedValue(seed ^ 0x51ed270b) - 0.5) * 0.012;
  const contact = profiles[surface].contact;
  const colors = new Float32Array(position.count * 3);

  for (let i = 0; i < position.count; i += 1) {
    const x = spanX > 1e-8 ? (position.getX(i) - minX) / spanX : 0.5;
    const y = spanY > 1e-8 ? (position.getY(i) - minY) / spanY : 0.5;
    const z = spanZ > 1e-8 ? (position.getZ(i) - minZ) / spanZ : 0.5;
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);
    const normalLength = Math.hypot(nx, ny, nz);
    const up = normalLength > 1e-8 ? ny / normalLength : 0;

    // Local base contact fades on upright faces. Undersides only shade near
    // the base; there is no directional-light or flat per-face darkening.
    const base = spanY > 1e-8 ? 1 - smoothstep(0, 0.22, y) : 0;
    const upright = 1 - Math.abs(up);
    const underside = Math.max(0, -up) * 0.45;
    const contactWeight = 0.85 + 0.15 * Math.cos((x + z) * Math.PI + phase);
    const ao = 1 - contact * base * (upright + underside) * contactWeight;
    const softness = surface === 'distant' || surface === 'glass' ? 0.002 : 0.007;
    const variation = softness * Math.sin(x * 2.1 + y * 1.7 + phase)
      * Math.cos(z * 2.3 - y * 0.8 + phase);
    const value = THREE.MathUtils.clamp(brightness * ao + variation, 0.89, 1.025);
    colors[i * 3] = value * (1 - tint);
    colors[i * 3 + 1] = value;
    colors[i * 3 + 2] = value * (1 + tint);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}
