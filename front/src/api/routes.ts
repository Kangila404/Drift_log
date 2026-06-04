import { apiClient } from "../api/client";

export interface DurationTimeResponse {
  durationTime: number;
}

export async function getRouteDuration(
  toCityId: string | number
): Promise<DurationTimeResponse> {
  const res = await apiClient.get<DurationTimeResponse>(`/map/routes/${toCityId}`);
  return res.data;
}