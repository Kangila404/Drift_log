import { createApiClient } from "@driftlog/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";

// TODO: 배포 시 환경변수로. 지금은 운영 백엔드 직접 지정.
//  - Android 에뮬레이터에서 PC localhost = http://10.0.2.2:8080/api
//  - 실기기(Expo Go)에서 로컬 백엔드 = http://<PC LAN IP>:8080/api (예: http://192.168.0.8:8080/api)
//  - 운영: https://driftlog.kro.kr/api
// const BASE_URL = "https://driftlog.kro.kr/api";
const BASE_URL = "http://10.0.2.2:8080/api";





export const apiClient = createApiClient({
  baseURL: BASE_URL,
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
  onLogout: () => {
    // TODO: Expo Router 연결 후 router.replace("/login")로 교체
    console.warn("[auth] 세션 만료 — 로그인으로 이동 필요");
  },
});
