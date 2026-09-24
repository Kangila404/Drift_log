import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import SeoulBuildings from './SeoulBuildings'
import SeoulMountains from './SeoulMountains'

export type { TimeOfDay as SeoulLight } from '../../../hooks/useTimeOfDay'

function transformed(geometry: THREE.BufferGeometry, position: number[], rotation = 0) {
  geometry.rotateZ(rotation)
  geometry.translate(...position as [number, number, number])
  return geometry
}

export function SeoulLandscape() {
  const batches = useMemo(() => {
    const groups: Record<string, THREE.BufferGeometry[]> = {}
    const add = (color: string, geometry: THREE.BufferGeometry) => (groups[color] ??= []).push(geometry)
    const box = (color: string, size: [number, number, number], at: number[], tilt = 0) => add(color, transformed(new THREE.BoxGeometry(...size), at, tilt))
    for (let i = 0; i < 8; i++) {
      const x = (i % 2 ? 1 : -1) * (18 + i * 4), z = -4 - (i * 11 % 29)
      const h = 6.5 + i % 3, lean = i % 2 ? .2 : -.13
      box('#2e3b51', [.19, h, .19], [x, h / 2, z], lean)
      for (let b = 0; b < 3; b++) {
        box('#2e3b51', [.09, 1.9 - b * .28, .1], [x - lean * h * .45 + (b % 2 ? -.5 : .55), h - 1.5 - b * .65, z], b % 2 ? -.65 : .75)
      }
    }
    // A bent, unlit traffic signal makes the old street's depth legible.
    box('#364760', [.12, 5.4, .12], [-11, 2.4, 18], -.13)
    box('#364760', [2.4, .1, .1], [-9.2, 5.25, 18])
    box('#202e44', [1.4, .38, .28], [-8.8, 5.1, 18])
    for (let i = 0; i < 3; i++) add('#111f32', transformed(new THREE.CircleGeometry(.11, 12), [-9.24 + i * .42, 5.1, 18.16]))
    box('#364760', [.1, 5.1, .1], [10.5, 2.5, 20], -.17)
    return Object.entries(groups).map(([color, geometries]) => {
      const geometry = mergeGeometries(geometries)
      geometries.forEach(g => g.dispose())
      return { color, geometry }
    })
  }, [])
  useEffect(() => () => batches.forEach(({ geometry }) => geometry.dispose()), [batches])
  return <group><SeoulMountains /><SeoulBuildings />{batches.map(({ color, geometry }) => <mesh key={color} geometry={geometry}>
    <meshLambertMaterial color={color} />
  </mesh>)}<StreetSign /></group>
}

function StreetSign() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 160
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#293d57'; ctx.fillRect(0, 0, 512, 160)
    ctx.strokeStyle = '#7488a4'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 496, 144)
    ctx.fillStyle = '#a9bad0'; ctx.font = '500 68px "Malgun Gothic", sans-serif'
    ctx.textAlign = 'center'; ctx.fillText('\uC138\uC885\uB300\uB85C', 256, 103)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    return map
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[11, 4.7, 20]} rotation={[0, -.12, -.17]}>
    <planeGeometry args={[3.5, 1.09]} /><meshLambertMaterial map={texture} side={THREE.DoubleSide} />
  </mesh>
}

export function DriftingTimber({ playing }: { playing: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const time = useRef(0)
  useFrame((_, delta) => {
    if (playing) time.current += Math.min(delta, .05)
    if (!ref.current) return
    ref.current.position.y = 4.28 + Math.sin(time.current * .35) * .025
    ref.current.rotation.z = Math.sin(time.current * .3) * .016
  })
  return <group ref={ref} position={[-7, 4.28, 18]} rotation={[0, -.5, 0]}>
    {[-.36, .3].map((x, i) => <mesh key={x} position={[x, i * .06, i * .35]} rotation={[0, i * .3, 0]}>
      <boxGeometry args={[.3, .12, 2.7 - i * .25]} /><meshLambertMaterial color="#414e63" />
    </mesh>)}
  </group>
}
