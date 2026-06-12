import { useEffect, useState } from "react";
import type { VoyageInfo } from "../components/hud/VoyageNativeHud";

// 앱 전용 초경량 항해 상태 store (zustand 없이)
// VoyageScreen이 웹에서 받은 voyageInfo를 여기 저장 → MapPanel 등이 구독

let current: VoyageInfo | null = null;
const listeners = new Set<(v: VoyageInfo | null) => void>();

export function setVoyageInfo(info: VoyageInfo | null) {
  current = info;
  listeners.forEach((fn) => fn(current));
}

export function getVoyageInfo(): VoyageInfo | null {
  return current;
}

// 컴포넌트에서 구독
export function useVoyageInfo(): VoyageInfo | null {
  const [info, setInfo] = useState<VoyageInfo | null>(current);
  useEffect(() => {
    const fn = (v: VoyageInfo | null) => setInfo(v);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return info;
}