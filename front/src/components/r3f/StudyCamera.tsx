import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import { boatFraming } from './voyage/BoatFraming'

export default function StudyCamera({ mobile }: { mobile: boolean }) {
  const { camera: activeCamera, get, size, invalidate } = useThree()

  useLayoutEffect(() => {
    const camera = get().camera
    if (!(camera instanceof PerspectiveCamera)) return
    const frame = boatFraming(size.width, size.height, mobile)
    camera.fov = frame.fov
    camera.clearViewOffset()
    camera.position.set(...frame.position)
    camera.up.set(0, 1, 0)
    camera.lookAt(...frame.target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    invalidate()
  }, [activeCamera, get, size.width, size.height, mobile, invalidate])

  return null
}
