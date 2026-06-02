import { apiClient } from "./client";

import {
    resolveAbnormal,
    type TodayWeatherResponse,
    type WeatherId,
    type AbnormalType,
} from "../constants/weather";

export interface TodayWeather {
    weatherId: WeatherId;
    abnormalType: AbnormalType;
}

export async function getTodayWeather(): Promise<TodayWeather> {
  const { data } = await apiClient.get<TodayWeatherResponse>("/weather/today");
  return {
    weatherId: data.todayWeatherId as WeatherId,
    abnormalType: resolveAbnormal(data),
  };
}