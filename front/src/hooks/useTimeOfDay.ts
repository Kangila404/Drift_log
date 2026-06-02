import { useState, useEffect } from "react";

export type TimeOfDay = "dawn" | "day" | "night";

// 정책: 새벽 00~07 / 낮 07~18 / 밤 18~24
export function getTimeOfDay(d: Date = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h >= 7 && h < 18) return "day";
  if (h >= 18) return "night";
  return "dawn"; // 0~7
}

export function useTimeOfDay(): TimeOfDay {
  const [time, setTime] = useState<TimeOfDay>(() => getTimeOfDay());

  useEffect(() => {
    const id = setInterval(() => {
      setTime((prev) => {
        const next = getTimeOfDay();
        return next !== prev ? next : prev; // 바뀔 때만 리렌더
      });
    }, 60_000); // 1분마다 체크

    return () => clearInterval(id);
  }, []);

  return time;
}