import type { WeatherId, AbnormalType } from "./weather";
import type { TimeOfDay } from "../hooks/useTimeOfDay";

export type CelestialBody = "sun" | "moon" | "eclipse";
export type WeatherEffect = "rain" | "fog" | "dustFog" | "horizonBlur" | "wind";

export interface ScenePreset {
  waterNear: [number, number, number];
  waterFar: [number, number, number];
  waveScale: number;
  waveSpeed: number;   // 파도 속도 (1.0 = 기본)
  fogColor: string;
  fogDensity: number;
  moonColor: string;
  showMoon: boolean;
  celestialBody: CelestialBody;
  ambientIntensity: number;
  skyTop: string;
  skyBottom: string;
  effects: WeatherEffect[];
}

// ── 시간대 베이스 ──
const TIME_BASE: Record<TimeOfDay, ScenePreset> = {
  dawn: {
    waterNear: [0.08, 0.09, 0.14], waterFar: [0.05, 0.05, 0.09],
    waveScale: 0.9, waveSpeed: 1.0, fogColor: "#1a1622", fogDensity: 0.025,
    moonColor: "#d8c8e8", showMoon: true, celestialBody: "moon",
    ambientIntensity: 0.5, skyTop: "#120e1e", skyBottom: "#4a3450",
    effects: [],
  },
day: {
    waterNear: [0.07, 0.34, 0.5], waterFar: [0.04, 0.16, 0.28],
    waveScale: 1.0, waveSpeed: 1.0, fogColor: "#0e2236", fogDensity: 0.012,
    moonColor: "#fffde8", showMoon: true, celestialBody: "sun",
    ambientIntensity: 1.1, skyTop: "#0e2236", skyBottom: "#1c4a70",
    effects: [],
  },
 night: {
    waterNear: [0.04, 0.2, 0.3], waterFar: [0.02, 0.09, 0.16],
    waveScale: 1.0, waveSpeed: 1.0, fogColor: "#07111d", fogDensity: 0.012,
    moonColor: "#fffde8", showMoon: true, celestialBody: "moon",
    ambientIntensity: 0.7, skyTop: "#07111d", skyBottom: "#0e2a44",
    effects: [],
  },
};

// ── 날씨 오버라이드 ──
type WeatherOverride = Partial<ScenePreset>;

const WEATHER_OVERRIDE: Record<WeatherId, WeatherOverride> = {
  1: {},
  2: { effects: ["horizonBlur"] },
  3: { effects: ["fog"] },
  4: { waveScale: 1.2, effects: ["rain"] },
    5: { waveScale: 1.3, waveSpeed: 1.6 },                              // 거친 파도
  6: { waveScale: 1.6, waveSpeed: 2.0, effects: ["rain", "wind"] }, 
  7: { effects: ["dustFog"] },
  8: {},
  9: {},
};

// ── 비정상 ──
const ABNORMAL_PRESET: Record<Exclude<AbnormalType, null>, ScenePreset> = {
  ECLIPSE: {
    waterNear: [0.02, 0.04, 0.07], waterFar: [0.005, 0.015, 0.03],
    waveScale: 0.8, waveSpeed: 1.0, fogColor: "#020306", fogDensity: 0.025,
    moonColor: "#8898d0", showMoon: true, celestialBody: "eclipse",
    ambientIntensity: 0.18, skyTop: "#010204", skyBottom: "#0a1020",
    effects: [],
  },
  BLOOD_MOON: {
    waterNear: [0.12, 0.05, 0.07], waterFar: [0.05, 0.02, 0.028],
    waveScale: 1.2, waveSpeed: 1.0, fogColor: "#1c0a10", fogDensity: 0.03,
    moonColor: "#dc5870", showMoon: true, celestialBody: "moon",
    ambientIntensity: 0.4, skyTop: "#140509", skyBottom: "#300e18",
    effects: [],
  },
};

export interface SceneInput {
  weatherId: WeatherId | null;
  abnormalType: AbnormalType;
  timeOfDay: TimeOfDay;
}

export function resolveScene(input: SceneInput): ScenePreset {
  const { weatherId, abnormalType, timeOfDay } = input;

  // ECLIPSE는 낮에만 (밤엔 일반 밤하늘). BLOOD_MOON은 밤에 의미 있음.
  if (abnormalType === "ECLIPSE") {
    if (timeOfDay === "day") {
      return ABNORMAL_PRESET.ECLIPSE;
    }
    // 밤/새벽엔 일식 무시하고 일반 시간대 preset
    return TIME_BASE[timeOfDay];
  }

  if (abnormalType && timeOfDay !== "dawn") {
    return ABNORMAL_PRESET[abnormalType];
  }

  const base = TIME_BASE[timeOfDay];

  if (timeOfDay === "day" && weatherId !== null) {
    return { ...base, ...WEATHER_OVERRIDE[weatherId] };
  }

  return base;
}