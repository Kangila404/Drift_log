export interface RandomEvent {
  eventId: number
  type: string
  textContent: string
  imageUrl: string | null
}

// eventId → SVG 일러스트 키
export const EVENT_ILLUST: Record<number, string> = {
  1: 'whale',
  2: 'rainbow',
  3: 'dolphin',
  4: 'sign',
  5: 'cityLight',
}

// eventId → 화면상 일러스트 배치 (top/left는 %, width/height는 CSS 값)
export interface EventLayout {
  top: string
  left: string
  width: string
  height: string
}

export const EVENT_LAYOUT: Record<number, EventLayout> = {
  1: { top: '34%', left: '58%', width: 'min(55vw, 520px)', height: 'min(26vw, 220px)' }, // 고래
  2: { top: '23%', left: '7%', width: 'min(85vw, 900px)', height: 'min(42vw, 440px)' }, // 무지개
  3: { top: '40%', left: '50%', width: 'min(50vw, 420px)', height: 'min(26vw, 220px)' }, // 돌고래
  4: { top: '36%', left: '50%', width: 'min(40vw, 340px)', height: 'min(24vw, 200px)' }, // 간판
  5: { top: '30%', left: '50%', width: 'min(60vw, 560px)', height: 'min(20vw, 180px)' }, // 도시불빛
}

export const DEFAULT_LAYOUT: EventLayout = {
  top: '34%', left: '50%', width: 'min(50vw, 420px)', height: 'min(26vw, 220px)',
}