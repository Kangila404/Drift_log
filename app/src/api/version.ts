import { apiClient } from "./client";

// ─── 버전 조회 ───
export const getVersion = async (): Promise<{ version: string }> => {
  const res = await apiClient.get("/version");
  return res.data;
};