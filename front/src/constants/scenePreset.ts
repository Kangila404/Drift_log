import type { WeatherId, AbnormalType } from "./weather";
import type { TimeOfDay } from "../hooks/useTimeOfDay";

export type CelestialBody = "sun" | "moon" | "eclipse";
// front/src/constants/scenePreset.ts
export type WeatherEffect = 'rain' | 'fog' | 'dustFog' | 'horizonBlur' | 'wind' | 'birds';

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
    waterNear: [0.075, 0.095, 0.135], waterFar: [0.035, 0.045, 0.075],
    waveScale: 0.3, waveSpeed: 0.85, fogColor: "#26313d", fogDensity: 0.0015,
    moonColor: "#d8c8e8", showMoon: true, celestialBody: "moon",
    ambientIntensity: 0.65, skyTop: "#121b29", skyBottom: "#303b49",
    effects: [],
  },
day: {
  waterNear: [0.075, 0.125, 0.16], waterFar: [0.033, 0.065, 0.09],
  waveScale: 0.32, waveSpeed: 0.85, fogColor: "#233344", fogDensity: 0.0015,
  moonColor: "#fff4dc", showMoon: true, celestialBody: "sun",
  ambientIntensity: 0.8, skyTop: "#111f30", skyBottom: "#293b4c",
  effects: [],
},
 night: {
    waterNear: [0.055, 0.095, 0.135], waterFar: [0.025, 0.05, 0.075],
    waveScale: 0.3, waveSpeed: 0.85, fogColor: "#172737", fogDensity: 0.0015,
    moonColor: "#fffde8", showMoon: true, celestialBody: "moon",
    ambientIntensity: 0.7, skyTop: "#07111d", skyBottom: "#1c2d3e",
    effects: [],
  },
};

// ── 날씨 오버라이드 ──
interface WeatherOverride {
  fogColor: Record<TimeOfDay, string>;
  fogDensity: number;
  ambientScale: number;
  waterScale: [number, number, number];
  waveScale: number;
  waveSpeed: number;
  effects: WeatherEffect[];
}

const WEATHER_OVERRIDE: Partial<Record<WeatherId, WeatherOverride>> = {
  2: {
    fogColor: { dawn: "#303443", day: "#34495f", night: "#1c2e42" },
    fogDensity: 0.016, ambientScale: 0.94, waterScale: [1.12, 0.9, 0.88],
    waveScale: 0.95, waveSpeed: 0.95, effects: ["horizonBlur"],
  },
  3: {
    fogColor: { dawn: "#46505c", day: "#526577", night: "#354b5e" },
    fogDensity: 0.028, ambientScale: 0.9, waterScale: [1.45, 0.88, 0.8],
    waveScale: 0.72, waveSpeed: 0.82, effects: ["fog"],
  },
  4: {
    fogColor: { dawn: "#30394a", day: "#344b60", night: "#20374c" },
    fogDensity: 0.021, ambientScale: 0.84, waterScale: [1.1, 0.78, 0.79],
    waveScale: 1.05, waveSpeed: 1.05, effects: ["rain"],
  },
  5: {
    fogColor: { dawn: "#242c3d", day: "#263d56", night: "#14273c" },
    fogDensity: 0.014, ambientScale: 0.92, waterScale: [0.95, 0.85, 0.9],
    waveScale: 1.2, waveSpeed: 1.25, effects: ["wind"],
  },
  6: {
    fogColor: { dawn: "#252f40", day: "#293c50", night: "#1a2b3e" },
    fogDensity: 0.024, ambientScale: 0.76, waterScale: [0.9, 0.65, 0.7],
    waveScale: 1.3, waveSpeed: 1.4, effects: ["rain", "wind"],
  },
  7: {
    fogColor: { dawn: "#494952", day: "#58616b", night: "#3d434f" },
    fogDensity: 0.026, ambientScale: 0.86, waterScale: [1.55, 0.75, 0.67],
    waveScale: 0.85, waveSpeed: 0.9, effects: ["dustFog"],
  },
};

// ── 비정상 ──
const ABNORMAL_PRESET: Record<Exclude<AbnormalType, null>, ScenePreset> = {
  ECLIPSE: {
    waterNear: [0.02, 0.04, 0.07], waterFar: [0.005, 0.015, 0.03],
    waveScale: 0.8, waveSpeed: 1.0, fogColor: "#101c2b", fogDensity: 0.025,
    moonColor: "#8898d0", showMoon: true, celestialBody: "eclipse",
    ambientIntensity: 0.42, skyTop: "#050b16", skyBottom: "#203348",
    effects: [],
  },
  BLOOD_MOON: {
    waterNear: [0.04, 0.05, 0.085], waterFar: [0.019, 0.028, 0.052],
    waveScale: 1.2, waveSpeed: 1.0, fogColor: "#19202e", fogDensity: 0.022,
    moonColor: "#b9785d", showMoon: true, celestialBody: "moon",
    ambientIntensity: 0.48, skyTop: "#09121f", skyBottom: "#202a3c",
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

  if (abnormalType === "BLOOD_MOON") {
    return timeOfDay === "night" ? ABNORMAL_PRESET.BLOOD_MOON : TIME_BASE[timeOfDay];
  }

  const base = TIME_BASE[timeOfDay];

  const weather = weatherId === null ? undefined : WEATHER_OVERRIDE[weatherId];
  if (!weather) return base;

  // Keep the time-of-day palette and clear boat lighting; weather tints only its own state.
  const tintWater = (color: ScenePreset["waterNear"]): ScenePreset["waterNear"] =>
    color.map((value, i) => value * weather.waterScale[i]) as ScenePreset["waterNear"];
  return {
    ...base,
    fogColor: weather.fogColor[timeOfDay],
    fogDensity: weather.fogDensity,
    skyBottom: weather.fogColor[timeOfDay],
    ambientIntensity: base.ambientIntensity * weather.ambientScale,
    waterNear: tintWater(base.waterNear),
    waterFar: tintWater(base.waterFar),
    waveScale: weather.waveScale,
    waveSpeed: weather.waveSpeed,
    effects: [...weather.effects],
  };
}
