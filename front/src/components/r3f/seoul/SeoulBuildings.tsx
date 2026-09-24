import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addPalaceSurface } from './PalaceMaterials'

const finishes = {
  concrete: '#465b79', pale: '#536783', edge: '#405574',
  recess: '#14233b', glass: '#293e5a', steel: '#526780', roof: '#2c3d58', stain: '#273750',
}
type Finish = keyof typeof finishes
const random = (n: number) => THREE.MathUtils.euclideanModulo(Math.sin(n * 127.1 + 17.4) * 43758.54, 1)

export default function SeoulBuildings() {
  const batches = useMemo(() => {
    const groups = new Map<Finish, THREE.BufferGeometry[]>()
    const sites = [
      ...[-53, -38, -26, -10, 3, 14, 30, 41, 58].map((x, i) => ({ x, z: -88 - i % 3 * 10, w: 4 + i % 4, h: 10 + i * 7 % 10, far: true })),
      ...[-44, -28, -19, 19, 27, 39, 53].map((x, i) => ({ x, z: -35 - i * 13 % 29, w: 5 + i % 3, h: 8 + i * 7 % 8, far: false })),
    ]
    sites.forEach((site, index) => {
      const { w, h, far } = site, depth = far ? 3 : 4.2
      const facade = index % 3 === 0 ? 'pale' : 'concrete'
      const transform = new THREE.Matrix4().compose(new THREE.Vector3(site.x, 0, site.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (random(index) - .5) * .3, index === 13 ? -.025 : 0)), new THREE.Vector3(1, 1, 1))
      const add = (finish: Finish, source: THREE.BufferGeometry) => {
        source.applyMatrix4(transform)
        const geometry = source.index ? source.toNonIndexed() : source
        if (geometry !== source) source.dispose()
        geometry.deleteAttribute('uv')
        const values = new Float32Array(geometry.attributes.position.count * 3)
        for (let i = 0; i < values.length; i++) values[i] = far ? .7 : 1
        geometry.setAttribute('color', new THREE.BufferAttribute(values, 3))
        if (!groups.has(finish)) groups.set(finish, [])
        groups.get(finish)!.push(geometry)
      }
      const box = (finish: Finish, size: [number, number, number], at: [number, number, number], tilt = 0) => {
        const geometry = new THREE.BoxGeometry(...size)
        geometry.rotateZ(tilt)
        geometry.translate(...at)
        add(finish, geometry)
      }
      const front = depth / 2
      // The facade has actual recessed bays between concrete piers and floor slabs.
      box('recess', [w - .4, h, depth - .8], [0, h / 2, -.2])
      for (const side of [-1, 1]) box(facade, [.25, h, depth], [side * (w / 2 - .125), h / 2, 0])
      box(facade, [w, h, .23], [0, h / 2, -depth / 2])
      const columns = far ? 3 : index % 3 === 0 ? 4 : 3
      const bay = (w - .4) / columns
      const floors = Math.max(2, Math.floor((h - 4) / 2.2))
      const story = (h - 4) / floors
      for (let col = 0; col <= columns; col++) {
        box(facade, [.17, h, .6], [-w / 2 + .2 + col * bay, h / 2, front - .12])
      }
      for (let row = 0; row <= floors; row++) {
        const y = 4 + row * story
        box(facade, [w, .24, depth + .08], [0, y, 0])
        if (row === floors) continue
        for (let col = 0; col < columns; col++) {
          const x = -w / 2 + .2 + (col + .5) * bay
          const broken = !far && (index * 5 + row * 3 + col) % 8 === 0
          const center = y + story * .53
          box('edge', [bay - .15, .22, .7], [x, y + .3, front])
          box(facade, [bay - .14, .34, .4], [x, y + story - .22, front - .05])
          if (!broken) {
            box('glass', [bay - .3, story - .74, .05], [x, center, front - .3])
            box('steel', [.045, story - .68, .05], [x, center, front - .25])
            box('steel', [bay - .28, .045, .05], [x, center - story * .16, front - .25])
          } else {
            // A surviving shard and hanging mullion leave the dark room open.
            const shard = new THREE.Shape()
            shard.moveTo(-bay * .35, -.5); shard.lineTo(-bay * .1, -.5)
            shard.lineTo(-bay * .26, .12); shard.lineTo(-bay * .35, .52); shard.closePath()
            add('glass', new THREE.ShapeGeometry(shard).translate(x, center, front - .28))
            box('steel', [.045, story * .65, .06], [x + bay * .17, center, front - .14], .19)
          }
          if (!far && index % 3 !== 0) {
            const damaged = broken && row === floors - 1
            box('edge', [bay - .08, .15, damaged ? .45 : .9], [x, y + .22, front + .3])
            if (!damaged) {
              box('steel', [bay - .18, .055, .055], [x, y + .93, front + .73])
              for (const post of [-.33, 0, .33]) box('steel', [.04, .67, .04], [x + bay * post, y + .57, front + .73])
            }
          }
          if (!far && col === 0 && row % 2 === 0) {
            box('edge', [.55, .35, .27], [x + .15, y + .63, front + .22])
            for (let vent = 0; vent < 3; vent++) box('recess', [.39, .025, .02], [x + .15, y + .53 + vent * .08, front + .37])
          }
        }
      }
      // Uneven parapets, stairwell doors and equipment replace identical roof caps.
      box('roof', [w - .25, .14, depth - .15], [0, h + .18, 0])
      for (const side of [-1, 1]) box('edge', [.16, .54, depth], [side * (w / 2 - .08), h + .36, 0])
      box('edge', [w, .54, .15], [0, h + .36, -depth / 2])
      box('edge', [w * .58, .42, .16], [-w * .2, h + .3, front])
      box(facade, [w * .34, 1.15 + index % 2 * .35, depth * .45], [-w * .19, h + .76, -depth * .17])
      box('recess', [.5, .8, .04], [-w * .19, h + .65, depth * .055 + .03])
      if (!far) {
        if (index % 2) {
          add('steel', new THREE.CylinderGeometry(.45, .45, .9, 10).translate(w * .27, h + .7, -.3))
          box('roof', [1.05, .12, 1.05], [w * .27, h + .23, -.3])
        } else {
          box('edge', [1.05, .5, .85], [w * .24, h + .45, -.4])
          for (let slot = 0; slot < 4; slot++) box('recess', [.77, .035, .025], [w * .24, h + .28 + slot * .1, .04])
        }
        box('steel', [.045, 1.7, .045], [-w * .28, h + 1.8, -.7], .12)
        for (let arm = 0; arm < 3; arm++) box('steel', [.75 - arm * .1, .035, .035], [-w * .28 - .12, h + 1.65 + arm * .2, -.7])
        for (let crack = 0; crack < 3; crack++) {
          box('stain', [.035, .4 + crack * .12, .02], [w / 2 - .13 - crack * .035, h - .65 - crack * .38, front + .2], crack % 2 ? -.22 : .12)
        }
      }
    })
    return [...groups].map(([finish, pieces]) => {
      const geometry = mergeGeometries(pieces)!
      pieces.forEach(g => g.dispose())
      const material = new THREE.MeshStandardMaterial({ color: finishes[finish], vertexColors: true, roughness: 1, metalness: 0 })
      if (['concrete', 'pale', 'edge'].includes(finish)) addPalaceSurface(material, 'stone')
      return { finish, geometry, material }
    })
  }, [])
  useEffect(() => () => batches.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose() }), [batches])
  return <group name="Seoul flooded building district">{batches.map(({ finish, geometry, material }) =>
    <mesh key={finish} geometry={geometry} material={material} />
  )}</group>
}
