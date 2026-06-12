import { apiClient } from "./client";
import type { Inquiry, Notice } from "./support";

// ─── 대시보드 ───
export type Feedback = { userName: string; content: string; createdAt: string };
export type Dashboard = { totalUser: number; todayUser: number; clearUser: number; feedbackList: Feedback[] };

export const getDashboard = async (): Promise<Dashboard> => {
  const res = await apiClient.get("/admin/dashboard");
  return res.data;
};

// ─── 유저 ───
export type UserRow = { userId: string; email: string; name: string; userRole: string; userStatus: string };
export type VoyageLogInfo = { fromCity: string; toCity: string; autoText: string; userText: string | null; weatherTheme: string };
export type UserDetail = {
  userId: string; email: string; name: string; authType: string;
  userRole: string; userStatus: string; lastLoginAt: string | null;
  isStoryClear: boolean; endingFeedback: string | null; voyageLogInfo: VoyageLogInfo[];
};

export const getUserList = async (): Promise<UserRow[]> => {
  const res = await apiClient.get("/admin/user");
  return res.data ?? [];
};

export const getUserDetail = async (userId: string): Promise<UserDetail> => {
  const res = await apiClient.get(`/admin/user/${userId}`);
  return res.data;
};

export const banUser = async (userId: string) => {
  const res = await apiClient.patch(`/admin/user/${userId}/ban`);
  return res.data;
};

export const activateUser = async (userId: string) => {
  const res = await apiClient.patch(`/admin/user/${userId}/activation`);
  return res.data;
};

// ─── 버전 ───
export const getVersion = async (): Promise<{ version: string }> => {
  const res = await apiClient.get("/version");
  return res.data;
};

export const updateVersion = async (version: string) => {
  const res = await apiClient.patch("/admin/version", { version });
  return res.data;
};

// ─── 문의 (관리자) ───
export const getAdminInquiries = async (): Promise<Inquiry[]> => {
  const res = await apiClient.get("/admin/inquiry");
  return res.data ?? [];
};

export const writeAnswer = async (inquiryId: number, content: string) => {
  const res = await apiClient.post(`/admin/inquiry/${inquiryId}/answer`, { content });
  return res.data;
};

export const updateAnswer = async (inquiryId: number, content: string) => {
  const res = await apiClient.patch(`/admin/inquiry/${inquiryId}/answer`, { content });
  return res.data;
};

export const deleteAnswer = async (inquiryId: number) => {
  const res = await apiClient.delete(`/admin/inquiry/${inquiryId}/answer`);
  return res.data;
};

// ─── 공지 (관리자) ───
// ⚠️ 경로는 웹 ../api/notice 기준 추측. 틀리면 여기만 수정.
export const getAdminNotices = async (): Promise<Notice[]> => {
  const res = await apiClient.get("/admin/notice");
  return res.data ?? [];
};

export const writeNotice = async (body: { title: string; content: string }) => {
  const res = await apiClient.post("/admin/notice", body);
  return res.data;
};

export const updateNotice = async (noticeId: number, body: { title: string; content: string }) => {
  const res = await apiClient.patch(`/admin/notice/${noticeId}`, body);
  return res.data;
};

export const deleteNotice = async (noticeId: number) => {
  const res = await apiClient.delete(`/admin/notice/${noticeId}`);
  return res.data;
};

export type { Inquiry, Notice };