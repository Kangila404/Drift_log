export function boatFraming(width: number, height: number, mobile: boolean) {
  const fov = mobile ? 64 : 52
  const targetY = mobile ? (height < 680 ? 3 : 1.2) : .7
  // Preserve the deployed phone's boat size, but center its former rail allowance.
  const sideMargin = mobile ? 41 : 0
  const horizontalTangent = Math.tan(fov * Math.PI / 360)
    * Math.max(1, width - sideMargin * 2) / Math.max(1, height) * .9
  const distance = Math.max(14.2, 5.5 * Math.sqrt(1 + 1 / horizontalTangent ** 2)) * 1.04
  const target: [number, number, number] = [0, targetY, -4]
  const position: [number, number, number] = [0, targetY + .5, -4 + Math.sqrt(distance ** 2 - .25)]
  return { fov, targetY, distance, target, position, polar: Math.acos(.5 / distance) }
}
