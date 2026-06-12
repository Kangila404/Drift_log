import { apiClient } from "./client";

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