import { apiClient } from './client'

export interface DiscoveredTrace {
  familyMember: string
  traceName: string
  cityName: string
  content: string
  imageUrl: string | null
  discoveredTime: string
}

export async function getDiscoveredTraces(): Promise<DiscoveredTrace[]> {
  const { data } = await apiClient.get('/trace')
  return data
}