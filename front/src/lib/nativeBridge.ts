declare global {
  interface Window {
    isNativeApp?: boolean;
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

export const isNativeApp = (): boolean =>
  typeof window !== "undefined" && window.isNativeApp === true;

const post = (payload: object) => {
  window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
};

export function goModeSelect(webFallback: () => void) {
  if (isNativeApp()) post({ type: "navigate", to: "mode-select" });
  else webFallback();
}

export function notifyNativeLogout(): boolean {
  if (isNativeApp()) {
    post({ type: "logout" });
    return true;
  }
  return false;
}

export function haptic(style: "light" | "medium" | "heavy" = "light") {
  if (isNativeApp()) {
    post({ type: "haptic", style });
  } else {
    navigator.vibrate?.(10);
  }
}

// 웹 모달/오버레이 열림·닫힘을 네이티브에 알림 (네이티브 HUD 버튼 숨김용)
export function notifyOverlay(visible: boolean) {
  if (isNativeApp()) post({ type: "overlay", visible });
}

// 앱이면 음악을 네이티브에 위임. 웹이면 false 반환 (호출부가 Howler로 처리)
export function sendBgmToNative(
  track: "voyage" | "city" | "ending" | "stop",
  url?: string
): boolean {
  if (isNativeApp()) {
    post({ type: "bgm", track, url });
    return true;
  }
  return false;
}

// 항해 상태를 네이티브 HUD로 전송 (진행바/카운트다운/일시정지용)
export function sendVoyageState(state: {
  voyageState: "ANCHORED" | "SAILING" | "PAUSED";
  progress: number;
  fromName: string;
  toName: string;
  remainingSeconds: number;
  initReady: boolean;
}) {
  if (isNativeApp()) post({ type: "voyage", ...state });
}

// 앱이면 <html>에 클래스 부여 (CSS에서 모바일 대응 분기용)
if (typeof document !== "undefined" && isNativeApp()) {
  document.documentElement.classList.add("is-native-app");
}