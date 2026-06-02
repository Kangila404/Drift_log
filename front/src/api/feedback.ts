import { apiClient } from './client'

export async function submitEndingFeedback(content: string): Promise<string> {
  const { data } = await apiClient.post('/feedback/ending', { content })
  return data.message
}