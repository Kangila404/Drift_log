import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { VoyageNavigationRef } from './VoyageNavigation'
import { dragSkyPitch, followSteeringView, returnViewAngle, setVoyageViewing } from './VoyageView'
import { boatFraming } from './BoatFraming'

export interface VoyageOrbitProps {
  navigation: VoyageNavigationRef
  mobile: boolean
}

export default function VoyageOrbit({ navigation: navigationRef, mobile }: VoyageOrbitProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera: activeCamera, get, size, invalidate } = useThree()
  const previousDistance = useRef(0)
  const lastReset = useRef(0)
  const view = useRef({ pitch: 0, interacting: false, returning: false, resetZoom: false, previousInput: 0 })
  const lookTarget = useRef(new Vector3())
  const { fov, targetY, distance, polar } = boatFraming(size.width, size.height, mobile)

  useEffect(() => {
    const canvas = get().gl.domElement
    const pointers = new Map<number, number>()
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      pointers.set(event.pointerId, event.clientY)
      view.current.interacting = true
      view.current.returning = false
      setVoyageViewing(true)
    }
    const move = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId)
      if (previous === undefined) return
      pointers.set(event.pointerId, event.clientY)
      if (pointers.size !== 1) return
      view.current.pitch = dragSkyPitch(view.current.pitch, event.clientY - previous, canvas.clientHeight)
      invalidate()
    }
    const end = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return
      if (!pointers.size) { view.current.interacting = false; view.current.returning = true; invalidate() }
    }
    const cancel = () => { pointers.clear(); view.current.interacting = false; view.current.returning = true; invalidate() }
    canvas.addEventListener('pointerdown', down)
    canvas.ownerDocument.addEventListener('pointermove', move)
    canvas.ownerDocument.addEventListener('pointerup', end)
    canvas.ownerDocument.addEventListener('pointercancel', end)
    canvas.addEventListener('lostpointercapture', end)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', cancel)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.ownerDocument.removeEventListener('pointermove', move)
      canvas.ownerDocument.removeEventListener('pointerup', end)
      canvas.ownerDocument.removeEventListener('pointercancel', end)
      canvas.removeEventListener('lostpointercapture', end)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', cancel)
      setVoyageViewing(false)
    }
  }, [get, invalidate])

  useLayoutEffect(() => {
    const orbit = controls.current
    const camera = get().camera
    if (!orbit || !(camera instanceof PerspectiveCamera)) return
    camera.fov = fov
    camera.clearViewOffset()
    camera.updateProjectionMatrix()
    camera.up.set(0, 1, 0)
    const x = navigationRef.current.x
    if (previousDistance.current === 0) {
      orbit.target.set(x, targetY, -4)
      camera.position.set(x, targetY + .5, -4 + Math.sqrt(distance * distance - .25))
    } else {
      // Resize preserves the chosen view and relative zoom, including portrait rotation.
      camera.position.sub(orbit.target).multiplyScalar(distance / previousDistance.current)
      orbit.target.set(x, targetY, -4)
      camera.position.add(orbit.target)
    }
    previousDistance.current = distance
    lastReset.current = navigationRef.current.resetView
    orbit.update()
    invalidate()
  }, [activeCamera, distance, fov, get, invalidate, navigationRef, targetY, size.width, size.height])

  useFrame(({ camera }, delta) => {
    const orbit = controls.current
    if (!orbit) return
    const state = navigationRef.current
    const sight = view.current
    if (state.resetView !== lastReset.current) {
      sight.returning = true
      sight.resetZoom = true
      lastReset.current = state.resetView
    }
    if (!sight.interacting && sight.previousInput !== 0 && state.input === 0) sight.returning = true
    sight.previousInput = state.input
    const dx = state.x - orbit.target.x
    camera.position.x += dx
    orbit.target.x = state.x
    if (!sight.interacting && state.input !== 0 && !sight.resetZoom) {
      sight.returning = false
      orbit.setAzimuthalAngle(followSteeringView(orbit.getAzimuthalAngle(), state.heading, delta))
    }
    if (sight.returning) {
      const yaw = returnViewAngle(orbit.getAzimuthalAngle(), delta)
      sight.pitch = returnViewAngle(sight.pitch, delta)
      orbit.setAzimuthalAngle(yaw)
      if (sight.resetZoom) {
        const length = camera.position.distanceTo(orbit.target)
        const next = distance + (length - distance) * Math.exp(-4.2 * Math.min(delta, .1))
        camera.position.sub(orbit.target).multiplyScalar(next / length).add(orbit.target)
        if (Math.abs(next - distance) < .001) sight.resetZoom = false
      }
      if (yaw === 0 && sight.pitch === 0 && !sight.resetZoom) {
        sight.returning = false
        setVoyageViewing(false)
      }
      invalidate()
    }
    // Orbit owns horizontal position/zoom. Pitch changes only the viewing ray,
    // never camera height, so looking at the sky cannot submerge the camera.
    const reach = Math.hypot(camera.position.x - orbit.target.x, camera.position.z - orbit.target.z)
    lookTarget.current.copy(orbit.target)
    lookTarget.current.y += reach * Math.tan(sight.pitch)
    camera.lookAt(lookTarget.current)
    camera.updateMatrixWorld()
  }, 0)

  return <OrbitControls ref={controls} makeDefault enablePan={false}
    enableDamping={false} rotateSpeed={.55} zoomSpeed={.6}
    minDistance={distance} maxDistance={distance * 1.6}
    minPolarAngle={polar} maxPolarAngle={polar}
    keyEvents={false} />
}
