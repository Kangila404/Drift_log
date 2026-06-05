import { apiClient } from './client'

function toLocalIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export type StudySummary = { todaySeconds: number; totalSeconds: number }
export type StudyLog = {
  id: number
  studyStartTimeAt: string
  studyEndTimeAt: string
  subject: string | null
}

export async function saveStudyTime(startAt: Date, endAt: Date, subject?: string) {
  const { data } = await apiClient.post('/study', {
    studyStartTimeAt: toLocalIso(startAt),
    studyEndTimeAt: toLocalIso(endAt),
    subject: subject?.trim() || null,
  })
  return data
}

export async function getStudySummary(): Promise<StudySummary> {
  const { data } = await apiClient.get('/study/summary')
  return data
}

export async function getStudyLogs(): Promise<StudyLog[]> {
  const { data } = await apiClient.get('/study/logs')
  return data
}

export async function updateStudySubject(id: number, subject: string) {
  const { data } = await apiClient.patch(`/study/logs/${id}`, { subject: subject.trim() || null })
  return data
}
export async function deleteStudyLog(id: number) {
  await apiClient.delete(`/study/logs/${id}`)
}