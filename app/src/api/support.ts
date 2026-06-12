import { apiClient } from "./client";

// ─── 공지 ───
export type Notice = {
  noticeId: number;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export async function getNotices(): Promise<Notice[]> {
  const res = await apiClient.get("/notice");
  return res.data ?? [];
}

// ─── 문의 ───
export type Inquiry = {
  inquiryId: number;
  title: string;
  content: string;
  inquiryStatus: string;
  answerContent?: string;
  createdAt: string;
};

export async function getMyInquiries(): Promise<Inquiry[]> {
  const res = await apiClient.get("/inquiry");
  return res.data ?? [];
}

export async function writeInquiry(body: { title: string; content: string }): Promise<void> {
  await apiClient.post("/inquiry", body);
}

export async function updateInquiry(id: number, body: { title: string; content: string }): Promise<void> {
  await apiClient.patch(`/inquiry/${id}`, body);
}

export async function deleteInquiry(id: number): Promise<void> {
  await apiClient.delete(`/inquiry/${id}`);
}