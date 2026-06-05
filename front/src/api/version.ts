import { apiClient } from "./client";


export const getVersion = async () => {
  const response = await apiClient.get("/version");
  return response.data;
};