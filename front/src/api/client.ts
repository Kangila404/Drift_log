import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ── 동시 401/403 대비: reissue는 한 번만, 나머지는 대기 ──
let isRefreshing = false;
let waitQueue: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  waitQueue.forEach((cb) => cb(token));
  waitQueue = [];
}

function forceLogout(err: any) {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/login";
  return Promise.reject(err);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // 401(만료) 또는 403(인증 실패)일 때 토큰 재발급 시도
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return forceLogout(error);

      // 이미 다른 요청이 reissue 중이면 대기
      if (isRefreshing) {
        return new Promise((resolve) => {
          waitQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const response = await axios.post("/api/auth/reissue", { refreshToken });
        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;

        if (!newAccessToken) throw new Error("no accessToken in reissue response");

        localStorage.setItem("accessToken", newAccessToken);
        if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);

        onRefreshed(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (reissueError) {
        waitQueue = [];
        return forceLogout(reissueError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);