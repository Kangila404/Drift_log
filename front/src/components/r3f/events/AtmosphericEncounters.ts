import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface AtmosphericEncounter {
  group: THREE.Group
  materials: THREE.Material[]
  update?: (time: number, opacity: number) => void
}

type Point = [number, number]
type Position = [number, number, number]

function surface(color: string, roughness = .86, metalness = 0, fill = 0) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness, transparent: true, emissive: color, emissiveIntensity: fill,
  })
}

function batches(materials: THREE.Material[]) {
  const pieces = materials.map(() => [] as THREE.BufferGeometry[])
  function add(index: number, geometry: THREE.BufferGeometry, position: Position = [0, 0, 0], rotation: Position = [0, 0, 0]) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    ))
    const expanded = geometry.index ? geometry.toNonIndexed() : geometry
    if (expanded !== geometry) geometry.dispose()
    expanded.deleteAttribute('uv')
    pieces[index].push(expanded)
  }
  function box(index: number, size: Position, position: Position, rotation: Position = [0, 0, 0]) {
    add(index, new THREE.BoxGeometry(...size), position, rotation)
  }
  function finish(name: string) {
    const group = new THREE.Group()
    group.name = name
    pieces.forEach((parts, index) => {
      if (!parts.length) return
      const geometry = mergeGeometries(parts)
      parts.forEach(part => part.dispose())
      if (!geometry) throw new Error(`Cannot merge ${name} material ${index}`)
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      const mesh = new THREE.Mesh(geometry, materials[index])
      mesh.name = `${name}: ${materials[index].name || index}`
      group.add(mesh)
    })
    return group
  }
  return { add, box, finish }
}

function panel(points: Point[], depth: number, bevel = .012) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  return new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: 1, curveSegments: 1,
  })
}

/** Front is +Z; the caller owns water contact, drift and overall tilt. */
export function createFloatingSign(): AtmosphericEncounter {
  const materials = [
    surface('#756f62', .86, 0, .16), surface('#3e4442', .92, 0, .06), surface('#46716e', .48, .17, .065),
    surface('#aeb9ad', .68, 0, .025), surface('#68605a', .65, .48, .06), surface('#304843', .94, 0, .015),
  ]
  ;['exposed timber', 'wet timber', 'enamel', 'worn paint', 'iron fittings', 'paint loss'].forEach((name, i) => { materials[i].name = name })
  const model = batches(materials)
  // Individual backing planks stop short of the broken upper-right corner.
  const ends = [1.74, 1.84, 1.60]
  for (let i = 0; i < 3; i++) {
    const y = -.52 + i * .31
    model.add(i === 0 ? 1 : 0, panel([
      [-1.86, y], [ends[i] - .06, y + .04], [ends[i], y + .12],
      [ends[i] - .12, y + .18], [ends[i] - .04, y + .28], [-1.8, y + .30],
    ], .19), [0, 0, -.16])
  }
  model.add(0, panel([[-1.88, -.56], [-1.64, -.53], [-1.69, .57], [-1.86, .54]], .28), [0, 0, -.20])
  model.add(0, panel([[1.59, -.48], [1.81, -.45], [1.71, .59], [1.51, .56]], .27), [0, 0, -.20])
  model.add(0, panel([[-1.86, .39], [1.68, .45], [1.70, .61], [-1.8, .56]], .25), [0, 0, -.20])
  model.add(1, panel([[-1.84, -.57], [1.81, -.49], [1.77, -.32], [-1.82, -.39]], .26), [0, 0, -.20])
  model.add(2, panel([
    [-1.66, -.38], [1.61, -.31], [1.57, .27], [1.32, .25], [1.22, .35],
    [.94, .32], [.83, .45], [.58, .40], [.49, .30], [-1.61, .33],
  ], .032, .006), [0, 0, .092])
  // The torn enamel folds out of the timber frame; its back has real thickness.
  model.add(2, panel([[.46, .30], [.83, .44], [.72, .25], [.57, .18]], .028, .004), [0, .07, .12], [.30, -.16, 0])
  model.add(3, panel([[-1.60, -.21], [1.58, -.15], [1.59, -.04], [-1.59, -.09]], .004, 0), [0, 0, .134])
  const blemishes: [number, number, number][] = [[-1.51, .19, .14], [-1.26, -.30, .09], [-.54, .27, .12], [.28, -.26, .08], [1.41, .13, .13]]
  blemishes.forEach(([x, y, s], i) => {
    model.add(i % 2 ? 3 : 5, panel([[0, 0], [s, -.04], [s * .81, s * .28], [s * .42, s * .59], [-s * .16, s * .21]], .003, 0), [x, y, .14])
  })
  // Bent mounting strap terminates at a snapped edge, rather than a letter-like glyph.
  model.box(4, [.13, .43, .045], [-1.42, .17, .17], [0, 0, -.07])
  model.box(4, [.13, .16, .045], [-1.40, .45, .22], [.65, 0, -.07])
  model.add(4, panel([[1.49, -.37], [1.74, -.34], [1.69, -.06], [1.60, -.12]], .025, .004), [0, 0, .15])
  for (const [x, y] of [[-1.42, .03], [-1.44, .29], [1.63, -.26], [-1.74, -.42]]) {
    model.add(4, new THREE.CylinderGeometry(.034, .038, .026, 8), [x, y, .20], [Math.PI / 2, 0, 0])
  }
  const group = model.finish('Timber-backed enamel fascia')
  return { group, materials }
}

/** About 20 x 6 x 12; water is y=0, and occupied upper floors face +Z. */
export function createDistantLights(): AtmosphericEncounter {
  const lamps = new THREE.MeshBasicMaterial({ color: '#f1bf78', transparent: true, fog: false, toneMapped: false })
  lamps.color.multiplyScalar(.78)
  const materials = [
    surface('#68767a', .86, 0, .12), surface('#766968', .9, 0, .10), surface('#7b837f', .86, 0, .10), surface('#3f5859', .76, .15, .12),
    surface('#4f5662', .85, 0, .10), surface('#89918a', .86, 0, .05), surface('#29393e', .6), surface('#566368', .58, .4, .02), lamps,
  ]
  ;['plaster', 'brick', 'concrete', 'metal roof', 'tile roof', 'coping', 'window recess', 'railings', 'warm windows'].forEach((name, i) => { materials[i].name = name })
  const model = batches(materials)

  function window(x: number, y: number, z: number, w: number, h: number, lit: boolean) {
    model.box(6, [w, h, .035], [x, y, z - .11])
    if (lit) model.box(8, [w - .13, h - .12, .018], [x, y, z - .083])
    model.box(5, [w + .12, .065, .23], [x, y - h / 2, z])
    for (const dx of [-w / 2, w / 2]) model.box(7, [.048, h, .16], [x + dx, y, z - .02])
    model.box(7, [.04, h, .035], [x, y, z + .007])
    model.box(7, [w, .045, .13], [x, y + h / 2, z - .02])
  }

  function house(x: number, z: number, w: number, d: number, top: number, wall: number, light: boolean, openingOffset = 0) {
    const base = -3.2, front = z + d / 2, back = z - d / 2
    const wy = Math.max(.52, top - 1.0), wh = Math.min(1.12, top * .46), ww = Math.min(.85, w * .28)
    const wx = x + openingOffset
    model.box(wall, [.22, top - base, d], [x - w / 2 + .11, (top + base) / 2, z])
    model.box(wall, [.22, top - base, d], [x + w / 2 - .11, (top + base) / 2, z])
    model.box(wall, [w, top - base, .22], [x, (top + base) / 2, back + .11])
    // Four facade pieces leave a real recess, including the wall below the flood.
    const left = wx - ww / 2 - (x - w / 2), right = x + w / 2 - (wx + ww / 2)
    model.box(wall, [left, top - base, .22], [x - w / 2 + left / 2, (top + base) / 2, front - .11])
    model.box(wall, [right, top - base, .22], [x + w / 2 - right / 2, (top + base) / 2, front - .11])
    const sill = wy - wh / 2, lintel = wy + wh / 2
    model.box(wall, [ww, sill - base, .22], [wx, (sill + base) / 2, front - .11])
    model.box(wall, [ww, top - lintel, .22], [wx, (top + lintel) / 2, front - .11])
    window(wx, wy, front, ww, wh, light)
    model.box(2, [w, .18, d], [x, top - .07, z])
  }

  function terrace(x: number, z: number, w: number, d: number, y: number) {
    model.box(5, [w + .14, .13, d + .14], [x, y, z])
    model.box(2, [w, .38, .15], [x, y + .23, z - d / 2])
    for (const side of [-1, 1]) model.box(2, [.15, .38, d], [x + side * w / 2, y + .23, z])
    model.box(7, [w - .18, .055, .055], [x, y + .49, z + d / 2])
    const count = Math.ceil(w / .65)
    for (let i = 0; i <= count; i++) model.box(7, [.04, .49, .04], [x - w / 2 + .09 + (w - .18) * i / count, y + .245, z + d / 2])
  }

  function pitched(x: number, z: number, w: number, d: number, y: number, rise: number, roof: number) {
    const slope = Math.atan2(rise, w / 2), length = Math.hypot(w / 2, rise) + .18
    model.add(2, panel([[-w / 2, 0], [w / 2, 0], [0, rise]], d, 0), [x, y, z - d / 2])
    for (const side of [-1, 1]) {
      model.box(roof, [length, .10, d + .36], [x + side * w / 4, y + rise / 2 + .07, z], [0, 0, -side * slope])
    }
    model.box(roof, [.16, .13, d + .40], [x, y + rise + .08, z])
  }

  // Two interlocking banks leave a bent, continuous water alley through the cluster.
  house(-6.95, 3.7, 4.9, 3.6, 1.9, 1, true, .5)
  terrace(-6.95, 3.7, 4.9, 3.6, 1.94)
  house(-7.7, -.35, 3.6, 3.8, 2.85, 0, false, -.35)
  pitched(-7.7, -.35, 3.6, 3.8, 2.85, .62, 4)
  house(-3.55, .45, 3.5, 3.4, 3.45, 2, true, -.38)
  terrace(-3.55, .45, 3.5, 3.4, 3.49)
  house(-3.8, -.25, 1.55, 1.7, 5.05, 0, false)
  pitched(-3.8, -.25, 1.55, 1.7, 5.05, .38, 3)
  house(-5.5, -4.05, 5.3, 2.7, 2.2, 0, false, .85)
  pitched(-5.5, -4.05, 5.3, 2.7, 2.2, .8, 3)

  house(6.2, 3.2, 5.0, 3.9, 1.38, 0, true, -.8)
  pitched(6.2, 3.2, 5.0, 3.9, 1.38, .68, 3)
  house(4.8, -.85, 3.4, 3.5, 3.0, 1, false)
  terrace(4.8, -.85, 3.4, 3.5, 3.04)
  house(8.25, -1.5, 2.6, 3.8, 2.05, 2, false)
  pitched(8.25, -1.5, 2.6, 3.8, 2.05, .63, 4)
  house(1.8, -4.05, 3.9, 3.1, 4.25, 0, true, -.7)
  terrace(1.8, -4.05, 3.9, 3.1, 4.29)
  house(2.75, -4.55, 1.5, 1.7, 5.65, 2, false)
  model.box(5, [1.68, .16, 1.88], [2.75, 5.71, -4.55])
  house(6.45, -4.6, 3.7, 2.3, 2.5, 1, true, .45)
  pitched(6.45, -4.6, 3.7, 2.3, 2.5, .52, 4)

  // Short drowned boundary walls connect the parcels without a solid island base.
  model.box(2, [.22, 3.38, 2.2], [-4.47, -1.51, 3.8])
  model.box(1, [.24, 3.52, 2.25], [3.42, -1.44, 3.6])
  const group = model.finish('Flooded neighborhood lights')
  return {
    group, materials,
    // The integration supplies fade * weather transmission here; wall fade is external.
    update: (_time, opacity) => { lamps.opacity = THREE.MathUtils.clamp(opacity, 0, 1) },
  }
}

/** A procedural optical fragment on a centered XY plane, never a sky image. */
export function createRainbow(): AtmosphericEncounter {
  const material = new THREE.ShaderMaterial({
    name: 'Diffuse rainbow fragment', transparent: true, depthWrite: false,
    depthTest: true, side: THREE.DoubleSide, toneMapped: true,
    uniforms: { uOpacity: { value: 1 }, uWeather: { value: 1 } },
    vertexShader: `
      varying vec2 vPosition;
      varying float vAltitude;
      void main() {
        vPosition = position.xy;
        vAltitude = (modelMatrix * vec4(position, 1.0)).y - cameraPosition.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uWeather;
      varying vec2 vPosition;
      varying float vAltitude;
      void main() {
        vec2 p = vPosition;
        float radial = length(p - vec2(25.0, -39.0)) - 54.0;
        float t = clamp(radial / 4.4 + .5, 0.0, 1.0);
        vec3 color = mix(vec3(.32,.20,.55), vec3(.16,.37,.66), smoothstep(.05,.23,t));
        color = mix(color, vec3(.17,.55,.58), smoothstep(.21,.39,t));
        color = mix(color, vec3(.28,.61,.33), smoothstep(.37,.54,t));
        color = mix(color, vec3(.75,.64,.24), smoothstep(.52,.70,t));
        color = mix(color, vec3(.78,.44,.20), smoothstep(.68,.85,t));
        color = mix(color, vec3(.68,.25,.24), smoothstep(.83,.98,t));
        float band = 1.0 - smoothstep(.95,2.8,abs(radial));
        float along = smoothstep(-29.0,-13.0,p.x) * (1.0-smoothstep(6.0,29.0,p.x));
        float edge = smoothstep(-17.0,-11.0,p.y) * (1.0-smoothstep(12.0,17.0,p.y));
        float alpha = band * along * edge * smoothstep(0.0,6.0,vAltitude) * .28 * uOpacity * uWeather;
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const group = new THREE.Group()
  group.name = 'Fading atmospheric rainbow'
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(64, 34), material)
  mesh.name = 'Broad optical fragment'
  group.add(mesh)
  return {
    group, materials: [material],
    update: (_time, opacity) => { material.uniforms.uOpacity.value = THREE.MathUtils.clamp(opacity, 0, 1) },
  }
}
