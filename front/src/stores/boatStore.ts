import { createJSONStorage } from "zustand/middleware";
import { createBoatStore } from "@driftlog/shared";
import { apiClient } from "../api/client";

export const useBoatStore = createBoatStore({
  apiClient,
  storage: createJSONStorage(() => localStorage),
});

// 기존 import 호환 (BoatColors 등 타입 재export)
export type { BoatColors } from "@driftlog/shared";
export {
  DEFAULT_BOAT_COLORS,
  BOAT_PRESETS,
  SAIL_SWATCHES,
  HULL_SWATCHES,
  LAMP_SWATCHES,
} from "@driftlog/shared";