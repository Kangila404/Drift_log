export const SHARED_OK = "shared connected";

export { createApiClient } from "./api/createApiClient";
export type { ApiClientDeps } from "./api/createApiClient";

export { useVoyageStore } from "./stores/voyageStore";
export type { City, Trace, VoyageState, CityArrival } from "./stores/voyageStore";

export {
  WEATHER_MAP,
  ABNORMAL_WEATHER_IDS,
  resolveAbnormal,
} from "./constants/weather";
export type {
  WeatherId,
  AbnormalType,
  TodayWeatherResponse,
} from "./constants/weather";

export {
  createBoatStore,
  DEFAULT_BOAT_COLORS,
  BOAT_PRESETS,
  SAIL_SWATCHES,
  HULL_SWATCHES,
  LAMP_SWATCHES,
} from "./stores/createBoatStore";
export type { BoatColors, BoatPreset, BoatStore } from "./stores/createBoatStore";