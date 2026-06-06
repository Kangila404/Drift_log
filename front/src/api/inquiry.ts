
import { apiClient } from './client'

export type Inquiry = {
  inquiryId: number
  title: string
  content: string
  authorName: string
  inquiryStatus: 'OPEN' | 'ANSWERED' | 'CLOSED'
  answerContent: string | null
  createdAt: string
  updatedAt: string
}

// ── 유저 ──
export const getMyInquiries = () =>
  apiClient.get<Inquiry[]>('/inquiry').then(r => r.data)

export const writeInquiry = (body: { title: string; content: string }) =>
  apiClient.post('/inquiry', body).then(r => r.data)

export const updateInquiry = (inquiryId: number, body: { title: string; content: string }) =>
  apiClient.patch(`/inquiry/${inquiryId}`, body).then(r => r.data)

export const deleteInquiry = (inquiryId: number) =>
  apiClient.delete(`/inquiry/${inquiryId}`).then(r => r.data)

// ── 관리자 ──
export const getAdminInquiries = () =>
  apiClient.get<Inquiry[]>('/admin/inquiry').then(r => r.data)

export const writeAnswer = (inquiryId: number, body: { content: string }) =>
  apiClient.post(`/admin/inquiry/${inquiryId}/answer`, body).then(r => r.data)

export const updateAnswer = (inquiryId: number, body: { content: string }) =>
  apiClient.patch(`/admin/inquiry/${inquiryId}/answer`, body).then(r => r.data)

export const deleteAnswer = (inquiryId: number) =>
  apiClient.delete(`/admin/inquiry/${inquiryId}/answer`).then(r => r.data)