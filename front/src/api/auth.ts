import { apiClient } from "./client";


export type SignUpRequest = {
    email: string;
    name: string;
    password: string;
    passwordConfirm: string;
}

export type LoginRequest = {
    email: string;
    password: string;
}

export type LogoutRequest = {
    refreshToken: string;
}

export type TokenRefreshRequest = {
    refreshToken: string;
}

export const signup = async (data: SignUpRequest) =>{
    const response = await apiClient.post("/auth/signup", data);
    return response.data;
};

export const login = async (data: LoginRequest) => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
}

export async function socialLogin(idToken:string) {
    const {data} = await apiClient.post("/auth/google", {
        idToken,
        authType: "GOOGLE",
    });
    return data;
}

export async function kakaoLogin(code: string) {
    const { data } = await apiClient.post("/auth/kakao", {
        code,
    });
    return data;
}

export const logout = async (data: LogoutRequest) => {
    const response = await apiClient.post("/auth/logout", data);
    return response.data;
}

export const reissueToken = async (data: TokenRefreshRequest) => {
  const response = await apiClient.post("/auth/reissue", data);
  return response.data;
};