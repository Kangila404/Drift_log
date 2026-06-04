export const WEATHER_MAP = {
  1: "잔잔한 수면",
  2: "흐린 수평선",
  3: "안개 낀 바다",
  4: "잔잔한 비",
  5: "거친 파도",
  6: "폭풍우",
  7: "탁한 안개",
  8: "일식",
  9: "붉은 달",
} as const;

export type WeatherId = keyof typeof WEATHER_MAP;

export const ABNORMAL_WEATHER_IDS: readonly WeatherId[] = [8, 9];

// ── API 응답 / 판별 ──
export interface TodayWeatherResponse {
  todayWeatherId: number;
  isAbnormal: boolean;
}

export type AbnormalType = "ECLIPSE" | "BLOOD_MOON" | null;

export function resolveAbnormal(res: TodayWeatherResponse): AbnormalType {
  if (!res.isAbnormal) return null;
  if (res.todayWeatherId === 8) return "ECLIPSE";
  if (res.todayWeatherId === 9) return "BLOOD_MOON";
  return null;
}