// 날씨 ID → DriftLog 라벨 (API 명세 7-1 기준)
export type WeatherId = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 9;

export const WEATHER_MAP: Record<number, string> = {
  1: "잔잔한 수면",
  2: "흐린 수평선",
  3: "안개 낀 바다",
  4: "잔잔한 비",
  5: "거친 파도",
  6: "폭풍우",
  8: "일식",
  9: "붉은 달",
};

// 이상 날씨(일식·붉은 달) 여부
export const isAbnormalWeather = (id: number): boolean => id === 8 || id === 9;

// id → 라벨 (모르는 id는 기본값)
export const weatherLabel = (id: number): string => WEATHER_MAP[id] ?? "잔잔한 수면";

export type TodayWeatherResponse = {
  todayWeatherId: number;
};