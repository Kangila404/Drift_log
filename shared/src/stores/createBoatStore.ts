import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import type { AxiosInstance } from "axios";

export interface BoatColors {
  sail: string;
  hull: string;
  lamp: string;
}

export const DEFAULT_BOAT_COLORS: BoatColors = {
  sail: "#e7e0cf",
  hull: "#142334",
  lamp: "#f4c57b",
};

export interface BoatPreset extends BoatColors {
  label: string;
}

export const BOAT_PRESETS: Record<string, BoatPreset> = {
  default: { label: "기본", sail: "#e7e0cf", hull: "#142334", lamp: "#f4c57b" },
  baekja: { label: "백자", sail: "#f1ece1", hull: "#1c2c3a", lamp: "#ffe3b0" },
  cheongja: { label: "청자", sail: "#cfe0d8", hull: "#10242a", lamp: "#bfe0c9" },
  noeul: { label: "노을", sail: "#e9cdb0", hull: "#241826", lamp: "#ff9d6b" },
  meok: { label: "먹", sail: "#b9bcc0", hull: "#0a1016", lamp: "#7fa6c0" },
};

export const SAIL_SWATCHES = [
  "#e7e0cf", "#f1ece1", "#cfe0d8", "#e9cdb0", "#b9bcc0",
  "#c8b6d0", "#d8c4a8", "#a9c4c0", "#d6b8b2", "#9aa6b2",
];
export const HULL_SWATCHES = [
  "#142334", "#1c2c3a", "#10242a", "#241826", "#0a1016",
  "#1a1410", "#233140", "#2a2118", "#16302e", "#2c2530",
];
export const LAMP_SWATCHES = [
  "#f4c57b", "#ffe3b0", "#bfe0c9", "#ff9d6b", "#7fa6c0",
  "#e8eef2", "#ffd089", "#d8b4e0", "#9fd4c4", "#c4d8ff",
];

const colorToIndex = (arr: string[], hex: string) => {
  const i = arr.indexOf(hex);
  return i < 0 ? 0 : i;
};
const indexToColor = (arr: string[], i: number) => arr[i] ?? arr[0];

export interface BoatStore {
  colors: BoatColors;
  rust: number;
  setColor: (key: keyof BoatColors, value: string) => void;
  applyPreset: (key: string) => void;
  reset: () => void;
  addRust: (amt: number) => void;
  cleanBoat: () => void;
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

interface BoatStoreDeps {
  apiClient: AxiosInstance;
  // 플랫폼별 영속 저장소 (웹: localStorage 어댑터, 앱: AsyncStorage 어댑터)
  storage: PersistStorage<{ colors: BoatColors; rust: number }>;
}

export function createBoatStore(deps: BoatStoreDeps) {
  const { apiClient, storage } = deps;

  // 여러 마운트(페이지/정비 모달 프리뷰)에서 중복 fetch 방지
  let serverSynced = false;

  return create<BoatStore>()(
      persist(
          (set, get) => ({
            colors: DEFAULT_BOAT_COLORS,
            rust: 0,

            setColor: (key, value) =>
                set((s) => ({ colors: { ...s.colors, [key]: value } })),

            applyPreset: (key) => {
              const p = BOAT_PRESETS[key];
              if (!p) return;
              set({ colors: { sail: p.sail, hull: p.hull, lamp: p.lamp } });
            },

            reset: () => set({ colors: DEFAULT_BOAT_COLORS }),

            addRust: (amt) =>
                set((s) => ({ rust: Math.min(1, Math.max(0, s.rust + amt)) })),

            cleanBoat: () => set({ rust: 0 }),

            loadFromServer: async () => {
              if (serverSynced) return;
              try {
                const { data } = await apiClient.get("/custom-boat");
                set({
                  colors: {
                    sail: indexToColor(SAIL_SWATCHES, data.sail),
                    hull: indexToColor(HULL_SWATCHES, data.body),
                    lamp: indexToColor(LAMP_SWATCHES, data.lantern),
                  },
                });
                serverSynced = true;
              } catch {
                /* 미로그인 등 → 로컬 유지, 다음 마운트에서 재시도 */
              }
            },

            saveToServer: async () => {
              const c = get().colors;
              try {
                await apiClient.patch("/custom-boat", {
                  sail: colorToIndex(SAIL_SWATCHES, c.sail),
                  body: colorToIndex(HULL_SWATCHES, c.hull),
                  lantern: colorToIndex(LAMP_SWATCHES, c.lamp),
                });
              } catch (e) {
                console.error("보트 색 저장 실패:", e);
              }
            },
          }),
          {
            name: "driftlog-boat",
            storage,
            partialize: (s) => ({ colors: s.colors, rust: s.rust }),
          },
      ),
  );
}