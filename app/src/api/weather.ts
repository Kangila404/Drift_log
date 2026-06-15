import { apiClient } from "./client";
import { weatherLabel, isAbnormalWeather, type TodayWeatherResponse } from "../constants/weather";

export type TodayWeather = {
  weatherId: number;
  label: string;
  isAbnormal: boolean;
};

// 오늘의 날씨 조회 — GET /api/weather/today → { todayWeatherId }
export async function getTodayWeather(): Promise<TodayWeather> {
  const { data } = await apiClient.get<TodayWeatherResponse>("/weather/today");
  const id = data.todayWeatherId;
  return {
    weatherId: id,
    label: weatherLabel(id),
    isAbnormal: isAbnormalWeather(id),
  };
}