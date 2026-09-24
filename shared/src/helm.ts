export const HELM_MAX_ANGLE = 70;

export function wheelPointerAngle(x: number, y: number, cx: number, cy: number) {
  return Math.atan2(y - cy, x - cx);
}

export function advanceHelmAngle(currentDegrees: number, previousPointerRad: number, nextPointerRad: number) {
  if (![currentDegrees, previousPointerRad, nextPointerRad].every(Number.isFinite)) return 0;
  const delta = Math.atan2(Math.sin(nextPointerRad - previousPointerRad), Math.cos(nextPointerRad - previousPointerRad));
  return Math.max(-HELM_MAX_ANGLE, Math.min(HELM_MAX_ANGLE, currentDegrees + delta * 180 / Math.PI));
}

export function helmSteering(angleDegrees: number) {
  if (!Number.isFinite(angleDegrees)) return 0;
  const magnitude = Math.max(0, Math.min(1, (Math.abs(angleDegrees) - 4) / (HELM_MAX_ANGLE - 4)));
  return Math.sign(angleDegrees) * magnitude;
}
