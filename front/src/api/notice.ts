// src/api/notice.ts
import { apiClient } from './client'

export type Notice = {
  noticeId: number
  title: string
  content: string
  authorName: string
  createdAt: string
  updatedAt: string
}

// ── 유저 (공개 조회) ──
export const getNotices = () =>
  apiClient.get<Notice[]>('/notice').then(r => r.data)

// ── 관리자 ──
export const getAdminNotices = () =>
  apiClient.get<Notice[]>('/admin/notice').then(r => r.data)

export const writeNotice = (body: { title: string; content: string }) =>
  apiClient.post('/admin/notice', body).then(r => r.data)

export const updateNotice = (noticeId: number, body: { title: string; content: string }) =>
  apiClient.patch(`/admin/notice/${noticeId}`, body).then(r => r.data)

export const deleteNotice = (noticeId: number) =>
  apiClient.delete(`/admin/notice/${noticeId}`).then(r => r.data)