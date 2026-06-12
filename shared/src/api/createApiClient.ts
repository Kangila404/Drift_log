import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from "axios";

export interface ApiClientDeps {
  baseURL: string;
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
  removeItem: (k: string) => Promise<void>;
  onLogout: () => void;
}

export function createApiClient(deps: ApiClientDeps): AxiosInstance {
  const { baseURL, getItem, setItem, removeItem, onLogout } = deps;

  const apiClient = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
  });

  // ── 요청: 매 요청마다 토큰 주입 (AsyncStorage 대비 async) ──
  apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const accessToken = await getItem("accessToken");
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  });

  // ── 동시 401/403 대비: reissue는 한 번만, 나머지는 대기 ──
  let isRefreshing = false;
  let waitQueue: ((token: string) => void)[] = [];

  const onRefreshed = (token: string) => {
    waitQueue.forEach((cb) => cb(token));
    waitQueue = [];
  };

  const forceLogout = (err: unknown) => {
    void removeItem("accessToken");
    void removeItem("refreshToken");
    onLogout();
    return Promise.reject(err);
  };

  // WebView(앱) 안에서 토큰 갱신 시 → 네이티브에 새 토큰 동기화
  const syncTokenToNative = (accessToken: string, refreshToken: string | null) => {
    try {
      const w = window as any;
      if (typeof window !== "undefined" && w.ReactNativeWebView) {
        w.ReactNativeWebView.postMessage(
          JSON.stringify({ type: "token-refresh", accessToken, refreshToken })
        );
      }
    } catch {
      /* 웹 일반 브라우저면 무시 */
    }
  };

  apiClient.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as
            | (InternalAxiosRequestConfig & { _retry?: boolean })
            | undefined;
        const status = error.response?.status;

        if (originalRequest && (status === 401 || status === 403) && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshToken = await getItem("refreshToken");
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
            // baseURL 기준으로 reissue 호출 (별도 인스턴스 — 인터셉터 재귀 방지)
            const response = await axios.post(
                `${baseURL}/auth/reissue`,
                { refreshToken },
                { headers: { "Content-Type": "application/json" } },
            );
            const newAccessToken = response.data.accessToken;
            const newRefreshToken = response.data.refreshToken;

            if (!newAccessToken) throw new Error("no accessToken in reissue response");

            await setItem("accessToken", newAccessToken);
            if (newRefreshToken) await setItem("refreshToken", newRefreshToken);

            // ▼ WebView면 네이티브 AsyncStorage도 동기화 (영구 로그인)
            syncTokenToNative(newAccessToken, newRefreshToken ?? null);

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
      },
  );

  return apiClient;
}