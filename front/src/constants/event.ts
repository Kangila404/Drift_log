export interface RandomEvent {
  eventId: number
  type: string
  textContent: string
  imageUrl: string | null
}

export const EVENT_DURATION_MS = 12_000

export const EVENT_COPY: Readonly<Partial<Record<number, string>>> = {
  1: '혼자가 아니라는 생각이 들었다.',
  2: '잠시, 마음에도 빛이 들었다.',
  3: '나란히 가는 길이 반가웠다.',
  4: '잊고 있던 하루가 떠올랐다.',
  5: '저 불빛이 누군가의 집이기를.',
}

export function getEventCaption(event: RandomEvent): string {
  return EVENT_COPY[event.eventId] ?? (event.textContent.trim() || event.type)
}
