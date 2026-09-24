export const MAX_SKY_PITCH = Math.PI * .29
export const VOYAGE_VIEWING_EVENT = 'voyage-viewing'

export function followSteeringView(yaw: number, heading: number, delta: number) {
  const target = heading * .35
  return yaw + (target - yaw) * -Math.expm1(-1.8 * Math.max(0, Math.min(delta, .1)))
}

export function setVoyageViewing(viewing: boolean) {
  if ((document.documentElement.dataset.voyageViewing === 'true') === viewing) return
  if (viewing) document.documentElement.dataset.voyageViewing = 'true'
  else delete document.documentElement.dataset.voyageViewing
  window.dispatchEvent(new CustomEvent(VOYAGE_VIEWING_EVENT, { detail: viewing }))
}

export function dragSkyPitch(pitch: number, deltaY: number, height: number) {
  if (![pitch, deltaY, height].every(Number.isFinite) || height <= 0) return 0
  return Math.max(0, Math.min(MAX_SKY_PITCH, pitch + deltaY / height * Math.PI * .8))
}

export function returnViewAngle(angle: number, delta: number) {
  if (!Number.isFinite(angle)) return 0
  if (!Number.isFinite(delta) || delta <= 0) return angle
  const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle))
  const next = wrapped * Math.exp(-4.2 * Math.min(delta, .1))
  return Math.abs(next) < .0001 ? 0 : next
}
