import { apiClient } from './client'
import type { RandomEvent } from '../constants/event'

export async function getRandomEvent(): Promise<RandomEvent | null> {
  const { data } = await apiClient.get<RandomEvent>('/events/random')
  
  if (!data || !data.eventId) return null
  return data
}