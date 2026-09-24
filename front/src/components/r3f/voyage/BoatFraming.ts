export function boatFraming(_width: number, _height: number, mobile: boolean) {
  const fov = mobile ? 60 : 46
  const position: [number, number, number] = [0, 1.45, 10.8]
  // Keep the former study camera's origin-facing ray, with the orbit pivot at the boat.
  const targetY = -4 * position[1] / position[2]
  const target: [number, number, number] = [0, targetY, -4]
  const rise = position[1] - targetY
  const distance = Math.hypot(rise, position[2] - target[2])
  return { fov, targetY, distance, target, position, polar: Math.acos(rise / distance) }
}
