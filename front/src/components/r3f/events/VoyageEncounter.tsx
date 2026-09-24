import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { RandomEvent } from '../../../constants/event'
import type { ScenePreset } from '../../../constants/scenePreset'
import { getWeatherAtmosphere } from '../../../constants/weatherAtmosphere'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import { sampleOceanSurface, type OceanSurfaceState } from '../OceanWaves'
import { createMarineModel } from './MarineEncounterModels'
import { createDistantLights, createFloatingSign, createRainbow } from './AtmosphericEncounters'
import { createWaterContact } from './EncounterWaterContact'
import { createWhaleBreath } from './WhaleBreath'
import { breach, encounterOpacity, ENCOUNTER_DURATION, smooth } from './EncounterMotion'

interface Props { event: RandomEvent | null; preset: ScenePreset; playing?: boolean; time?: number }

interface EncounterObject {
  group: THREE.Group
  materials: THREE.Material[]
  update?: (time: number, opacity: number) => void
  animals?: THREE.Group[]
  contacts?: ReturnType<typeof createWaterContact>[]
  breath?: ReturnType<typeof createWhaleBreath>
}

function disposeEncounter(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
  })
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
}

function createAnimal(kind: 'whale' | 'dolphin'): EncounterObject {
  const group = new THREE.Group()
  const materials = new Set<THREE.Material>()
  const animals: THREE.Group[] = [], contacts: ReturnType<typeof createWaterContact>[] = []
  const count = kind === 'whale' ? 1 : 2
  for (let i = 0; i < count; i++) {
    const animal = createMarineModel(kind)
    animal.name = `${kind} ${i + 1}`
    animal.traverse(object => {
      if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
    })
    animals.push(animal)
    const contact = createWaterContact(kind === 'whale' ? 11 : 3.4, kind === 'whale' ? 1.36 : .32)
    contacts.push(contact)
    group.add(animal)
    group.add(contact.group)
  }
  group.name = kind === 'whale' ? 'Passing whale' : 'Passing dolphins'
  const breath = kind === 'whale' ? createWhaleBreath() : undefined
  if (breath) group.add(breath.points)
  return { group, materials: [...materials], animals, contacts, breath }
}

function Encounter({ event, preset, playing = true, time }: Props & { event: RandomEvent }) {
  const { invalidate } = useThree()
  const clock = useRef(0), reduced = useRef(false)
  const sample = useRef({ height: 0, slopeX: 0, slopeZ: 0 })
  const anchor = useRef(new THREE.Vector3())
  const object = useMemo<EncounterObject>(() => {
    switch (event.eventId) {
      case 1: return createAnimal('whale')
      case 2: return createRainbow()
      case 3: return createAnimal('dolphin')
      case 4: return createFloatingSign()
      default: return createDistantLights()
    }
  }, [event.eventId])
  const activeObject = useRef<EncounterObject | null>(null)
  useLayoutEffect(() => { activeObject.current = object }, [object])
  useEffect(() => () => disposeEncounter(object.group), [object])
  useLayoutEffect(() => { clock.current = 0; invalidate() }, [event, invalidate])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = media.matches; invalidate() }
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [invalidate])
  useEffect(() => { invalidate() }, [time, playing, preset, invalidate])

  useFrame(({ scene, camera, size, gl }, delta) => {
    const object = activeObject.current
    if (!object) return
    if (playing && time === undefined) clock.current = Math.min(ENCOUNTER_DURATION, clock.current + delta)
    const age = Math.max(0, Math.min(ENCOUNTER_DURATION, time ?? clock.current))
    const t = reduced.current ? 5 : age
    const alpha = encounterOpacity(age), group = object.group
    group.visible = alpha > .001
    const water = scene.userData.oceanSurface as OceanSurfaceState | undefined
    const surface = (x: number, z: number) => {
      if (!water) return OCEAN_SURFACE_Y
      return OCEAN_SURFACE_Y + sampleOceanSurface(x, z, water.time, water.scale, water.speed, water.wind, sample.current).height
    }
    const halfWidth = Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * 37 * size.width / size.height
    const fit = Math.min(1, Math.max(.58, halfWidth / 14))
    const lane = Math.min(9, halfWidth * .6)
    group.scale.setScalar(1)
    group.rotation.set(0, 0, 0)
    group.position.set(0, 0, 0)
    if (event.eventId === 1) {
      const animal = object.animals![0]
      const x = -lane + (t - 6) * .21, z = -26 + t * .095
      const emergence = Math.sin(Math.PI * Math.min(1, t / 12))
      animal.scale.setScalar(fit)
      animal.position.set(x, surface(x, z) + (.32 - (1 - emergence) * .88) * fit, z)
      animal.rotation.set(-.035 * Math.sin(t * .3), 1.15, -.035)
      object.contacts![0].update(x, z, 1.15, fit, t, alpha * emergence, water)
      animal.updateMatrixWorld(true)
      anchor.current.fromArray(animal.userData.blowholeLocalPosition)
      animal.localToWorld(anchor.current)
      object.breath?.update(anchor.current, t, alpha, fit)
    } else if (event.eventId === 3) {
      const animalScale = fit * 1.4
      object.animals!.forEach((animal, i) => {
        const x = lane * (i ? -.87 : .98) + (t - 6) * .27
        const z = -23 - i * 7 + t * .155
        const arc = breach(t, 1.5 + i * 1.4)
        const scale = animalScale * (i ? .84 : 1)
        animal.position.set(x, surface(x, z) + (-.17 + arc.height * .46) * scale, z)
        animal.rotation.set(-arc.pitch * .5, 1.05, -.06)
        animal.scale.setScalar(scale)
        object.contacts![i].update(x, z, 1.05, scale, t, alpha * (.45 + .55 * arc.height), water)
      })
    } else if (event.eventId === 4) {
      const x = -Math.min(6, lane * .75) + t * .08, z = -12 + t * .12
      group.position.set(x, surface(x, z) + .25 * fit, z)
      group.rotation.set(-.75 + Math.sin(t * .6) * .025, -.22, .08 + Math.sin(t * .4) * .025)
      group.scale.setScalar(fit * 1.15)
    } else if (event.eventId === 2) {
      group.position.set(-Math.min(24, halfWidth * 1.3), 8, -95)
      const material = object.materials[0] as THREE.ShaderMaterial
      material.uniforms.uWeather.value = .55 + getWeatherAtmosphere(preset.effects).transmission * .45
    } else {
      group.position.set(-lane * 1.7, OCEAN_SURFACE_Y - .2, -92)
      group.scale.setScalar(Math.min(1.3, fit * 1.5))
    }
    // Three materials are engine-owned mutable resources, not React state.
    // eslint-disable-next-line react-hooks/immutability
    for (const material of object.materials) material.opacity = alpha
    const lightTransmission = event.eventId === 5 ? .42 + .58 * getWeatherAtmosphere(preset.effects).transmission : 1
    object.update?.(t, alpha * lightTransmission)
    if (import.meta.env.DEV) {
      Object.assign(gl.domElement.dataset, { encounter: String(event.eventId), encounterTime: age.toFixed(3), encounterOpacity: alpha.toFixed(3) })
    }
    group.userData.elapsed = age
    group.userData.opacity = alpha
    group.userData.eventId = event.eventId
    // A brief approach then retreat, not an indefinite loop after the server event ends.
    group.userData.arrival = smooth(0, 2, age)
  }, -0.5)
  return <primitive object={object.group} dispose={null} />
}

export default function VoyageEncounter(props: Props) {
  return props.event && props.event.eventId >= 1 && props.event.eventId <= 5
    ? <Encounter {...props} event={props.event} /> : null
}
