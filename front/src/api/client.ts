import { createApiClient } from "@driftlog/shared";

// localStorage(동기)를 팩토리가 기대하는 async 인터페이스로 감싼 어댑터
export const apiClient = createApiClient({
  baseURL: "/api",
  getItem: async (k) => localStorage.getItem(k),
  setItem: async (k, v) => {
    localStorage.setItem(k, v);
  },
  removeItem: async (k) => {
    localStorage.removeItem(k);
  },
  onLogout: () => {
    window.location.href = "/login";
  },
});