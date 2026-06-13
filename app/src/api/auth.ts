import { apiClient } from "./client";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post("/auth/login", data);
  return response.data;
};

// 구글 소셜 로그인 — 구글 SDK가 준 idToken을 백엔드로 보내 우리 JWT를 받음
// 백엔드: POST /api/auth/google (apiClient baseURL이 /api 포함)
export const socialLogin = async (idToken: string): Promise<LoginResponse> => {
  const response = await apiClient.post("/auth/google", {
    idToken,
    authType: "GOOGLE",
  });
  return response.data;
};

// 카카오 소셜 로그인 (웹/리다이렉트용) — 인가코드(code)를 백엔드로
export const kakaoLogin = async (code: string): Promise<LoginResponse> => {
  const response = await apiClient.post("/auth/kakao", { code });
  return response.data;
};

// 카카오 네이티브 로그인 — 카카오 SDK가 준 accessToken을 백엔드로 보내 우리 JWT를 받음
// 백엔드: POST /api/auth/kakao/native
export const kakaoNativeLogin = async (
  accessToken: string,
): Promise<LoginResponse> => {
  const response = await apiClient.post("/auth/kakao/native", { accessToken });
  return response.data;
};