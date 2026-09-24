import { Component, useEffect, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { OCEAN_SURFACE_Y } from './OceanWater'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'
import OceanEnvironment from './OceanEnvironment'
import { resolveScene, type ScenePreset } from '../../constants/scenePreset'

const WATER_OFFSET = OCEAN_SURFACE_Y - 4.25

export type CityCameraAction = { id: number; kind: 'reset' | 'in' | 'out' }
export type CityFraming = { desktopDistance: number; portraitDistance: number; portraitAspect?: number; portraitMinDistance?: number; portraitTargetX?: number; cameraHeight?: number; targetHeight?: number; targetZ?: number; minPolarAngle?: number; orbitLimit?: number; zoomMin?: number; zoomMax?: number }
const DEFAULT_FRAMING: CityFraming = { desktopDistance: 72, portraitDistance: 128 }

function cameraDistance(framing: CityFraming, aspect: number) {
  if (aspect >= .9) return framing.desktopDistance
  // Optional width-fit keeps the same architecture readable below short mobile toolbars.
  return Math.max(framing.portraitMinDistance ?? 0,
    framing.portraitDistance * (framing.portraitAspect ? Math.min(1, framing.portraitAspect / aspect) : 1))
}

export interface FloodedCitySceneProps {
  sceneId: string
  light?: TimeOfDay
  playing?: boolean
  interactive?: boolean
  cameraAction?: CityCameraAction
  onReady?: () => void
  children: ReactNode
  framing?: CityFraming
  skyOffset?: [number, number, number]
}

export function CityCameraRig({ interactive = false, cameraAction, framing = DEFAULT_FRAMING }: Pick<FloodedCitySceneProps, 'interactive' | 'cameraAction' | 'framing'>) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, size, invalidate } = useThree()
  const mobile = size.width / size.height < .9
  const distance = cameraDistance(framing, size.width / size.height)
  const height = framing.cameraHeight ?? 8.2
  const targetHeight = framing.targetHeight ?? 8.1
  const targetZ = framing.targetZ ?? 0
  const targetX = mobile ? framing.portraitTargetX ?? 0 : 0
  const userMoved = useRef(false)
  useEffect(() => {
    camera.position.set(targetX + distance * .045, height + WATER_OFFSET, targetZ + distance)
    camera.lookAt(targetX, targetHeight + WATER_OFFSET, targetZ)
    controls.current?.target.set(targetX, targetHeight + WATER_OFFSET, targetZ)
    controls.current?.update()
    userMoved.current = false
    invalidate()
  }, [camera, distance, height, targetHeight, targetX, targetZ, mobile, invalidate])
  useEffect(() => {
    if (!cameraAction || !controls.current) return
    const c = controls.current
    if (cameraAction.kind === 'reset') {
      camera.position.set(targetX + distance * .045, height + WATER_OFFSET, targetZ + distance)
      c.target.set(targetX, targetHeight + WATER_OFFSET, targetZ)
      userMoved.current = false
    } else {
      const offset = camera.position.clone().sub(c.target)
      offset.multiplyScalar(cameraAction.kind === 'in' ? .85 : 1.18)
      offset.clampLength(distance * Math.min(framing.zoomMin ?? .8, .8), distance * Math.max(framing.zoomMax ?? 1.3, 1.3))
      camera.position.copy(c.target).add(offset)
      userMoved.current = true
    }
    c.update()
  }, [cameraAction, camera, distance, height, targetHeight, targetX, targetZ, mobile, framing.zoomMin, framing.zoomMax])
  return <OrbitControls ref={controls} makeDefault enabled={interactive} enablePan={false} enableDamping={interactive} dampingFactor={.075}
    target={[targetX, targetHeight + WATER_OFFSET, targetZ]} minDistance={distance * Math.min(framing.zoomMin ?? .8, .8)} maxDistance={distance * Math.max(framing.zoomMax ?? 1.3, 1.3)}
    minPolarAngle={framing.minPolarAngle ?? Math.PI * .475} maxPolarAngle={Math.PI * .499}
    minAzimuthAngle={-(framing.orbitLimit ?? .12)} maxAzimuthAngle={framing.orbitLimit ?? .12}
    onStart={() => { userMoved.current = true }} />
}

function CityLighting({ preset, celestialPosition, eclipseCoverage = 0, dream = false }: { preset: ScenePreset; celestialPosition: [number, number, number]; eclipseCoverage?: number; dream?: boolean }) {
  const attenuation = 1 - eclipseCoverage * .9
  const moonVisible = preset.showMoon && preset.celestialBody === 'moon'
  return <>
    <hemisphereLight args={[dream ? '#b0c0d6' : '#8fa9cc', dream ? '#62788e' : '#465a7e', preset.ambientIntensity * (dream ? .8 : .85) * attenuation]} />
    <directionalLight position={[-25, 28, 26]} color="#a9bfde" intensity={preset.ambientIntensity * (dream ? .6 : .12) * attenuation} />
    {moonVisible && <directionalLight position={celestialPosition} color={preset.moonColor} intensity={preset.ambientIntensity * .28 * attenuation} />}
  </>
}

export function FloodedCityWorld({ sceneId, children, playing = true, interactive = false, cameraAction, framing = DEFAULT_FRAMING, skyOffset: skyPosition, onReady, preset: basePreset, eclipsePhase, eclipseCoverage = 0 }: Omit<FloodedCitySceneProps, 'light'> & { preset: ScenePreset; eclipsePhase?: number; eclipseCoverage?: number }) {
  const { size, invalidate } = useThree()
  const dream = sceneId === 'seoul' || sceneId === 'incheon' || sceneId === 'daejeon' || sceneId === 'gangneung' || sceneId === 'busan' || sceneId === 'suwon' || sceneId === 'gwangju' || sceneId === 'daegu' || sceneId === 'pohang' || sceneId === 'jeju'
  // Portrait framing backs the camera away; keep atmospheric visibility consistent.
  const mobile = size.width / size.height < .9
  const distance = cameraDistance(framing, size.width / size.height)
  const skyOffset: [number, number, number] = skyPosition ?? [mobile ? -17 : -31, 18, -90]
  const celestialPosition: [number, number, number] = [skyOffset[0], skyOffset[1] + 8.4, skyOffset[2] - 20]
  const mute = (color: string, amount: number) => new THREE.Color(color).lerp(new THREE.Color('#172843'), amount).getStyle()
  // Dense dawn fog must retain nearby construction; clear night/day densities stay unchanged.
  const cityFog = Math.min(basePreset.fogDensity, .016) + Math.max(0, basePreset.fogDensity - .016) * .3
  const preset = { ...basePreset, fogDensity: cityFog * 42 / distance,
    skyTop: mute(basePreset.skyTop, .55), skyBottom: mute(basePreset.skyBottom, .7), fogColor: mute(basePreset.fogColor, .5),
    waterNear: basePreset.waterNear.map((value, i) => (value * .35 + [.013, .024, .065][i]) * 1.06) as [number, number, number],
    waterFar: basePreset.waterFar.map((value, i) => (value * .35 + [.01, .02, .048][i]) * 1.06) as [number, number, number],
  }
  const ready = useRef(false)
  const frames = useRef(0)
  useFrame(({ gl, scene, camera }) => {
    if (!ready.current) {
      let cityVisible = false
      scene.traverse(object => { if (object.name.endsWith(' city geometry')) cityVisible = true })
      if (!cityVisible) return
      ready.current = true
      onReady?.()
      invalidate()
      if (import.meta.env.DEV) {
        gl.domElement.dataset.scene = sceneId
        let seas = 0
        let landmarks = 0
        let parcels = 0, terrainGroups = 0
        let artSource: unknown = null
        scene.traverse(object => {
          if (object.name === 'Shared ocean surface') seas++
          if (object.name === 'N Seoul Tower landmark' || object.name === 'Incheon Chinatown gateway landmark' || object.name === 'Daejeon Hanbit Tower landmark' || object.name === 'Gangneung Sun Cruise landmark' || object.name === 'Busan Yongdusan Tower landmark' || object.name === 'Suwon Hwaseomun landmark' || object.name === 'Gwangju Provincial Office landmark' || object.name === 'Daegu 83 Tower landmark' || object.name === 'Pohang Homigot Lighthouse landmark' || object.name === 'Jeju drowned coastal village landmark') landmarks++
          if (object.name.endsWith(' city geometry')) {
            artSource = object.userData.artSource ?? null
            parcels = object.userData.architecturalParcels ?? 0
          }
          if (object.name === 'Daejeon distant inland ridges' || object.name === 'Suwon inland foothills' || object.name === 'Gwangju Mudeung foothills' || object.name === 'Daegu Duryu foothills' || object.name === 'Pohang low coastal shoulder' || object.name === 'Jeju drowned coastal village landmark') terrainGroups++
        })
        gl.domElement.dataset.oceanCount = String(seas)
        gl.domElement.dataset.landmarkCount = String(landmarks)
        gl.domElement.dataset.artSource = JSON.stringify(artSource)
        gl.domElement.dataset.architecturalParcels = String(parcels)
        gl.domElement.dataset.terrainGroups = String(terrainGroups)
      }
    }
    if (import.meta.env.DEV && (++frames.current <= 3 || frames.current % 30 === 0)) {
      // useFrame runs before the main pass and can observe the ocean reflection pass.
      queueMicrotask(() => {
        if (!gl.domElement.isConnected) return
        gl.domElement.dataset.triangles = String(gl.info.render.triangles)
        gl.domElement.dataset.drawCalls = String(gl.info.render.calls)
        gl.domElement.dataset.geometries = String(gl.info.memory.geometries)
        gl.domElement.dataset.textures = String(gl.info.memory.textures)
        gl.domElement.dataset.cameraPose = [camera.position.x, camera.position.y, camera.position.z, camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w]
          .map(value => value.toFixed(6)).join(',')
      })
    }
  })
  return <>
    <color attach="background" args={[preset.fogColor]} />
    <fogExp2 attach="fog" args={[preset.fogColor, preset.fogDensity]} />
    <ambientLight intensity={preset.ambientIntensity * (dream ? 1.65 : 1.78) * (1 - eclipseCoverage * .9)} color="#a1b8de" />
    <OceanEnvironment preset={preset} playing={playing} sheltered skyOffset={skyOffset} moonlightStrength={dream ? .035 : .026} reflectArchitecture={dream} starOpacityScale={dream ? .28 : 1} eclipsePhase={eclipsePhase} eclipseCoverage={eclipseCoverage} />
    <CityLighting preset={preset} celestialPosition={celestialPosition} eclipseCoverage={eclipseCoverage} dream={dream} />
    {children}
    <CityCameraRig interactive={interactive} cameraAction={cameraAction} framing={framing} />
  </>
}

function World({ light = 'night', interactive = true, ...props }: FloodedCitySceneProps) {
  const preset = resolveScene({ weatherId: 1, abnormalType: null, timeOfDay: light })
  return <FloodedCityWorld {...props} preset={preset} interactive={interactive} />
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="seoul-fallback" role="alert">{'3D \uD654\uBA74\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.'}</div>
    return this.props.children
  }
}

export default function FloodedCityScene(props: FloodedCitySceneProps) {
  return <SceneBoundary>
    <Canvas frameloop={props.playing === false ? 'demand' : 'always'} dpr={[1, 1.25]} camera={{ position: [3.24, 1.25, 72], fov: 28, near: .2, far: 650 }}
      gl={{ antialias: true, powerPreference: 'default', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: .94 }}
      fallback={<div className="seoul-fallback">{'WebGL\uC744 \uC9C0\uC6D0\uD558\uB294 \uBE0C\uB77C\uC6B0\uC800\uAC00 \uD544\uC694\uD574\uC694.'}</div>}>
      <World {...props} />
    </Canvas>
  </SceneBoundary>
}
