import { apiClient } from "./client";

export type Inquiry = {
  inquiryId: number;
  title: string;
  content: string;
  inquiryStatus: string;
  answerContent?: string;
  createdAt: string;
};

export async function getMyInquiries(): Promise<Inquiry[]> {
  const res = await apiClient.get("/inquiry/me");
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