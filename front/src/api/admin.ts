import { apiClient } from "./client";

// 대시보드 조회
export const getDashboard = async () => {
  const response = await apiClient.get("/admin/dashboard");
  return response.data;
};

// 유저 목록 조회
export const getUserList = async () => {
  const response = await apiClient.get("/admin/user");
  return response.data;
};

// 유저 상세 조회
export const getUserDetail = async (userId: string) => {
  const response = await apiClient.get(`/admin/user/${userId}`);
  return response.data;
};

// 유저 정지
export const banUser = async (userId: string) => {
  const response = await apiClient.patch(`/admin/user/${userId}/ban`);
  return response.data;
};

// 유저 활성화
export const activateUser = async (userId: string) => {
  const response = await apiClient.patch(`/admin/user/${userId}/activation`);
  return response.data;
};

// 버전 조회
export const getVersion = async () => {
  const response = await apiClient.get("/admin/version");
  return response.data;
};

// 버전 수정
export const updateVersion = async (version: string) => {
  const response = await apiClient.patch("/admin/version", { version });
  return response.data;
};