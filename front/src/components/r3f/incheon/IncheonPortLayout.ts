import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'
import { buildCustomsWarehouse, buildPortOffice, buildNorthlightShed, buildQuay } from './IncheonPortBuildings'

export const INCHEON_FRAMING = { desktopDistance: 90, portraitDistance: 106, orbitLimit: .12, zoomMin: .85, zoomMax: 1.15 }

function place(kit: CityBuilder, x: number, y: number, z: number, yaw: number, build: (local: CityBuilder) => void) {
  const matrix = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z)
  const at = (point: [number, number, number]): [number, number, number] => new THREE.Vector3(...point).applyMatrix4(matrix).toArray()
  const local: CityBuilder = {
    add: (finish, geometry, surface) => kit.add(finish, geometry.applyMatrix4(matrix), surface),
    box: (finish, size, position, rotation = [0, 0, 0], surface) => {
      const geometry = new THREE.BoxGeometry(...size)
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation))).translate(...position)
      kit.add(finish, geometry.applyMatrix4(matrix), surface)
    },
    beam: (finish, a, b, width, depth, surface) => kit.beam(finish, at(a), at(b), width, depth, surface),
  }
  build(local)
}

// Authored from the new waterway concept, not any previous city artwork.
export function buildIncheonPort(kit: CityBuilder, portrait = false) {
  place(kit, portrait ? -7.5 : -18, 0, portrait ? -7 : -6, -.24,
    local => buildCustomsWarehouse(local, portrait ? 8.5 : 20, portrait ? 6.5 : 12, portrait ? 11.5 : 15))
  place(kit, portrait ? 8.2 : 19.5, -.5, portrait ? -24 : -25, .21,
    local => buildPortOffice(local, portrait ? 5.5 : 10, portrait ? 5 : 9, 4, portrait ? 4.6 : 5.2))
  place(kit, portrait ? 8.8 : 28, -.5, portrait ? -7 : -8, .19,
    local => buildNorthlightShed(local, portrait ? 4.3 : 16, portrait ? 5 : 9, portrait ? 9 : 11))
  place(kit, portrait ? -10.7 : -22.5, -.9, portrait ? -36 : -41, .07,
    local => buildPortOffice(local, portrait ? 4.6 : 6.5, portrait ? 4 : 6, 2, portrait ? 3.5 : 4.2))
  place(kit, portrait ? -8.3 : -18.5, 0, portrait ? 7 : 11, -.1,
    local => buildQuay(local, portrait ? 4.2 : 7, portrait ? 3.1 : 4.5))
}

export function buildIncheonCrossing(kit: CityBuilder, portrait = false) {
  const separation = portrait ? 10 : 27, deckY = portrait ? 9.8 : 11.4
  const summit = portrait ? 24 : 28.5, halfWidth = portrait ? 2.3 : 3
  const bridgeLength = portrait ? 48 : 100
  place(kit, portrait ? -1.8 : 1, 0, portrait ? -82 : -87, -.31, local => {
    // The inverted-Y legs straddle the roadway, with a solid upper anchorage.
    for (let segment = 0; segment < 24; segment++) {
      const a = (segment / 24 - .5) * bridgeLength, b = ((segment + 1) / 24 - .5) * bridgeLength
      const elevation = (x: number) => deckY - Math.pow(x / bridgeLength, 2) * 1.5
      local.beam('edge', [a, elevation(a), 0], [b, elevation(b), 0], .43, halfWidth * 2, 'masonry')
      for (const side of [-1, 1]) local.beam('faded', [a, elevation(a) + .27, side * halfWidth], [b, elevation(b) + .27, side * halfWidth], .09, .08)
    }
    for (const x of [-separation / 2, separation / 2]) {
      const junction = summit * .63
      for (const side of [-1, 1]) {
        local.beam('concrete', [x, -1, side * (halfWidth + .5)], [x, junction, side * .27], .7, .82, 'masonry')
        local.box('edge', [1.5, 2.2, 1.7], [x, 1, side * (halfWidth + .5)], undefined, 'masonry')
      }
      local.box('concrete', [.82, summit - junction, .86], [x, (summit + junction) / 2, 0], undefined, 'masonry')
      local.box('trim', [.88, .12, .92], [x, summit + .06, 0])
      local.box('faded', [.85, .46, halfWidth * 2 + .1], [x, deckY - .65, 0], undefined, 'masonry')
      const stays = portrait ? 5 : 8
      for (const direction of [-1, 1]) for (let stay = 1; stay <= stays; stay++) {
        const target = x + direction * separation * .46 * stay / stays
        for (const side of [-1, 1]) local.beam('cable',
          [x, summit - 1 - (stays - stay) * .45, side * .33],
          [target, deckY + .18 - Math.pow(target / bridgeLength, 2) * 1.5, side * halfWidth],
          portrait ? .033 : .04)
      }
    }
    for (const fraction of [-.43, -.32, .32, .43]) {
      const x = fraction * bridgeLength
      local.box('edge', [.7, deckY + 1, halfWidth * 1.6], [x, (deckY - 1) / 2, 0], undefined, 'masonry')
    }
  })
}
