export type SteeringDirection = -1 | 0 | 1;
export type VoyageNavigationCommand =
  | { type: "voyage-control"; action: "steer"; direction: SteeringDirection }
  | { type: "voyage-control"; action: "reset-view" }
  | { type: "voyage-control"; action: "navigation-state-request" };

export const STEERING_HEARTBEAT_MS = 150;
export const PRODUCTION_VOYAGE_URL = "https://driftlog.kro.kr/voyage";

export function resolveVoyageWebUrl(override: string | undefined, development: boolean) {
  if (!development || !override?.trim()) return PRODUCTION_VOYAGE_URL;
  try {
    const url = new URL(override.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return PRODUCTION_VOYAGE_URL;
    }
    if (url.pathname === "/") url.pathname = "/voyage";
    return url.href;
  } catch {
    return PRODUCTION_VOYAGE_URL;
  }
}

export function readNavigationCapability(message: unknown): { available: boolean; canSteer: boolean } | null {
  if (!message || typeof message !== "object") return null;
  const msg = message as Record<string, unknown>;
  if (msg.type !== "voyage-navigation") return null;
  const available = msg.version === 1 && msg.available === true && typeof msg.canSteer === "boolean";
  return { available, canSteer: available && msg.canSteer === true };
}

export function navigationScript(command: VoyageNavigationCommand) {
  return `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(JSON.stringify(command))} })); true;`;
}

/** Holds are leased by the web receiver; cancellation never resumes an old hold. */
export function createVoyageNavigationController(send: (command: VoyageNavigationCommand) => void) {
  let ready = false;
  let webCanSteer = false;
  let enabled = false;
  let sailing = false;
  let direction: SteeringDirection = 0;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const sendSteering = (value: SteeringDirection) =>
    send({ type: "voyage-control", action: "steer", direction: value });

  const stop = () => {
    if (heartbeat !== undefined) clearInterval(heartbeat);
    heartbeat = undefined;
    direction = 0;
    if (ready) sendSteering(0);
  };

  return {
    stop,
    setCapability(available: boolean, canSteer: boolean) {
      if (ready === available && webCanSteer === canSteer) return;
      stop();
      ready = available;
      webCanSteer = available && canSteer;
      if (ready) sendSteering(0);
    },
    setEnabled(value: boolean, isSailing: boolean) {
      enabled = value;
      sailing = isSailing;
      if (!enabled || !sailing) stop();
    },
    hold(value: -1 | 1) {
      if (!ready || !webCanSteer || !enabled || !sailing) return;
      if (heartbeat !== undefined) clearInterval(heartbeat);
      direction = value;
      sendSteering(value);
      heartbeat = setInterval(() => sendSteering(direction), STEERING_HEARTBEAT_MS);
    },
    release(value: -1 | 1) {
      // A second finger can take control; releasing the first must not stop it.
      if (direction === value) stop();
    },
    resetCamera() {
      if (!ready || !enabled) return;
      stop();
      send({ type: "voyage-control", action: "reset-view" });
    },
    requestState() {
      send({ type: "voyage-control", action: "navigation-state-request" });
    },
  };
}
