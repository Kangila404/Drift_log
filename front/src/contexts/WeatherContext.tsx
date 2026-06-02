import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getTodayWeather } from "../api/weather";
import type { WeatherId, AbnormalType } from "../constants/weather";

interface WeatherContextValue {
  weatherId: WeatherId | null;
  abnormalType: AbnormalType;
  loading: boolean;
  error: boolean;
}

const WeatherContext = createContext<WeatherContextValue>({
  weatherId: null,
  abnormalType: null,
  loading: true,
  error: false,
});

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weatherId, setWeatherId] = useState<WeatherId | null>(null);
  const [abnormalType, setAbnormalType] = useState<AbnormalType>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 비로그인 → 호출 스킵 (배경은 weatherId null → 기본 바다로 폴백)
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const today = await getTodayWeather();
        if (mounted) {
          setWeatherId(today.weatherId);
          setAbnormalType(today.abnormalType);
        }
      } catch (e) {
        console.error("weather fetch failed", e);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []); // 세션 진입 시 1회. 폴링 없음 → 세션 내내 고정

  return (
    <WeatherContext.Provider value={{ weatherId, abnormalType, loading, error }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  return useContext(WeatherContext);
}