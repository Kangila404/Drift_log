import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'

function ring(kit: CityBuilder, finish: CityFinish, top: number, bottom: number, height: number, y: number, sides = 64) {
  kit.add(finish, new THREE.CylinderGeometry(top, bottom, height, sides, Math.max(1, Math.ceil(height / .8)))
    .rotateY(Math.PI / 8).translate(0, y, 0), 'masonry')
}

export function buildBusanTower(kit: CityBuilder) {
  // Flooded civic entrance remains physically attached to the tower shaft.
  const base = new THREE.Shape([
    [-1.84, 4.43], [-4.43, 1.84], [-4.43, -1.84], [-1.84, -4.43],
    [1.84, -4.43], [4.43, -1.84], [4.43, 1.84], [1.84, 4.43],
    [.8, 4.43], [.8, 3], [-.8, 3], [-.8, 4.43],
  ].map(([x, z]) => new THREE.Vector2(x, -z)))
  kit.add('edge', new THREE.ExtrudeGeometry(base, { depth: 5.1, bevelEnabled: false })
    .rotateX(-Math.PI / 2), 'masonry')
  ring(kit, 'concrete', 4.7, 4.7, .3, 5.23, 8)
  ring(kit, 'concrete', 1.18, 1.8, 1.5, 4.9)
  ring(kit, 'concrete', .82, 1.18, 18.25, 14.75)
  ring(kit, 'edge', 1.13, .86, .42, 23.98)
  ring(kit, 'trim', 1.48, 1.13, .46, 24.42, 16)
  ring(kit, 'edge', 1.58, 1.58, .15, 24.71, 16)
  ring(kit, 'glass', 2, 1.52, 1.75, 25.66, 16)
  // The actual compact, widening observation head, not a broad saucer.
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + Math.PI / 8
    kit.beam('trim', [Math.sin(a) * 1.56, 24.78, Math.cos(a) * 1.56],
      [Math.sin(a) * 2.05, 26.58, Math.cos(a) * 2.05], .075, .09)
  }
  ring(kit, 'edge', 1.79, 1.75, .12, 25.68, 16)
  ring(kit, 'trim', 2.16, 2.11, .17, 26.62, 8)
  const profile = [[2.16, 26.72], [2.38, 26.79], [2.29, 26.94], [1.62, 27.02], [.53, 27.36]]
  kit.add('faded', new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 8).rotateY(Math.PI / 8), 'sheet')
  ring(kit, 'faded', .53, .53, .08, 27.37, 16)
  ring(kit, 'trim', .19, .35, .43, 27.62, 16)
  ring(kit, 'edge', .08, .15, .49, 27.95, 16)
  kit.box('dark', [1.45, 1.95, .05], [0, 3.94, 3.02])
  for (let i = 0; i < 5; i++) {
    const top = 4.02 + i * .31
    kit.box('concrete', [2.8, top - 1.4, .56], [0, (top + 1.4) / 2, 7.1 - i * .55])
  }
  // Only localized panels and a drain interrupt the shaft's long calm surface.
  kit.box('edge', [.16, .65, .045], [.18, 9.1, 1.08])
  kit.box('edge', [.16, .65, .045], [.18, 14.9, .96])
}
