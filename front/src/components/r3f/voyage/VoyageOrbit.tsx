import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { VoyageNavigationRef } from './VoyageNavigation'

export interface VoyageOrbitProps {
  navigation: VoyageNavigationRef
  mobile: boolean
  reservedLeft?: number
}

export default function VoyageOrbit({ navigation: navigationRef, mobile, reservedLeft = 0 }: VoyageOrbitProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera: activeCamera, get, size, invalidate } = useThree()
  const previousDistance = useRef(0)
  const lastReset = useRef(0)
  const fov = mobile ? 64 : 52
  const targetY = mobile ? (size.height < 680 ? 3 : 1.2) : .7
  const tangent = Math.tan(fov * Math.PI / 360)
  const horizontalTangent = tangent * Math.max(1, size.width - reservedLeft) / Math.max(1, size.height) * .9
  // The horizontal envelope includes the full hull from every orbit azimuth.
  const distance = Math.max(14.2, 5.5 * Math.sqrt(1 + 1 / (horizontalTangent * horizontalTangent)))

  useLayoutEffect(() => {
    const orbit = controls.current
    const camera = get().camera
    if (!orbit || !(camera instanceof PerspectiveCamera)) return
    camera.fov = fov
    // Native app owns a left-edge control rail. Shift the optical center into
    // the remaining scene while retaining a full-bleed sky and ocean.
    if (reservedLeft > 0) camera.setViewOffset(size.width, size.height, -reservedLeft / 2, 0, size.width, size.height)
    else camera.clearViewOffset()
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
  }, [activeCamera, distance, fov, get, invalidate, navigationRef, targetY, reservedLeft, size.width, size.height])

  useFrame(({ camera }) => {
    const orbit = controls.current
    if (!orbit) return
    const state = navigationRef.current
    if (state.resetView !== lastReset.current) {
      // Consume residual drag damping before placing the default stern view.
      const damping = orbit.enableDamping
      orbit.enableDamping = false
      orbit.update()
      orbit.target.set(state.x, targetY, -4)
      camera.position.set(state.x, targetY + .5, -4 + Math.sqrt(distance * distance - .25))
      orbit.update()
      orbit.enableDamping = damping
      lastReset.current = state.resetView
      invalidate()
    } else {
      const dx = state.x - orbit.target.x
      if (dx !== 0) {
        camera.position.x += dx
        orbit.target.x = state.x
        camera.updateMatrixWorld()
        invalidate()
      }
    }
  }, 0)

  return <OrbitControls ref={controls} makeDefault enablePan={false}
    enableDamping dampingFactor={.08} rotateSpeed={.55} zoomSpeed={.6}
    minDistance={distance} maxDistance={distance * 1.6}
    minPolarAngle={80 * Math.PI / 180} maxPolarAngle={89 * Math.PI / 180}
    keyEvents={false} />
}
