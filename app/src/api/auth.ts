import { apiClient } from "./client";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export type SignupRequest = {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
};

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post("/auth/login", data);
  return response.data;
};

// 회원가입 — 성공 시 바로 로그인 상태가 되도록 토큰 반환
// 백엔드: POST /api/auth/signup
export const signup = async (data: SignupRequest): Promise<LoginResponse> => {
  const response = await apiClient.post("/auth/signup", data);
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

// 애플 로그인 — expo-apple-authentication이 준 identityToken을 백엔드로
// 백엔드: POST /api/auth/apple (웹과 동일 엔드포인트, aud로 앱/웹 구분)
export const appleLogin = async (
  identityToken: string,
  name?: string,
): Promise<LoginResponse> => {
  const response = await apiClient.post("/auth/apple", {
    identityToken,
    name,
  });
  return response.data;
};