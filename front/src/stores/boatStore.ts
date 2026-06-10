import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '../api/client'

/**
 * 배 외형 커스터마이징 색상.
 * - sail : 돛 (오른쪽 큰 돛 기준, 왼쪽 작은 돛은 자동으로 약간 어둡게 파생)
 * - hull : 선체 윗면 (그림자 면은 자동으로 더 어둡게 파생)
 * - lamp : 갑판등 / 선실 창 불빛
 *
 * 나침반등(빨강/초록), 마스트 정상등(흰색)은 항해등이라 커스터마이징에서 제외한다.
 */
export interface BoatColors {
  sail: string
  hull: string
  lamp: string
}

export const DEFAULT_BOAT_COLORS: BoatColors = {
  sail: '#e7e0cf',
  hull: '#142334',
  lamp: '#f4c57b',
}

export interface BoatPreset extends BoatColors {
  label: string
}

/**
 * 세계관 톤(deep navy / fog blue / moon cyan / sunset orange, 낮은 채도) 안에서만
 * 고를 수 있도록 큐레이션한 프리셋.
 */
export const BOAT_PRESETS: Record<string, BoatPreset> = {
  default:  { label: '기본', sail: '#e7e0cf', hull: '#142334', lamp: '#f4c57b' },
  baekja:   { label: '백자', sail: '#f1ece1', hull: '#1c2c3a', lamp: '#ffe3b0' },
  cheongja: { label: '청자', sail: '#cfe0d8', hull: '#10242a', lamp: '#bfe0c9' },
  noeul:    { label: '노을', sail: '#e9cdb0', hull: '#241826', lamp: '#ff9d6b' },
  meok:     { label: '먹',   sail: '#b9bcc0', hull: '#0a1016', lamp: '#7fa6c0' },
}

/** 패널에서 개별 조정용으로 노출하는 한정 스와치 (전부 낮은 채도) */
export const SAIL_SWATCHES = [
  '#e7e0cf', '#f1ece1', '#cfe0d8', '#e9cdb0', '#b9bcc0',
  '#c8b6d0', '#d8c4a8', '#a9c4c0', '#d6b8b2', '#9aa6b2',
]
export const HULL_SWATCHES = [
  '#142334', '#1c2c3a', '#10242a', '#241826', '#0a1016',
  '#1a1410', '#233140', '#2a2118', '#16302e', '#2c2530',
]
export const LAMP_SWATCHES = [
  '#f4c57b', '#ffe3b0', '#bfe0c9', '#ff9d6b', '#7fa6c0',
  '#e8eef2', '#ffd089', '#d8b4e0', '#9fd4c4', '#c4d8ff',
]

// ── 서버는 팔레트 인덱스(sail/body/lantern)로 저장. hex ↔ 인덱스 변환 ──
const colorToIndex = (arr: string[], hex: string) => {
  const i = arr.indexOf(hex)
  return i < 0 ? 0 : i
}
const indexToColor = (arr: string[], i: number) => arr[i] ?? arr[0]

// 여러 Boat 마운트(페이지/정비 모달 프리뷰)에서 중복 fetch 방지. 성공 시에만 true.
let serverSynced = false

interface BoatStore {
  colors: BoatColors
  rust: number               // 0~1, 항해 누적으로 증가 / 청소로 0
  setColor: (key: keyof BoatColors, value: string) => void
  applyPreset: (key: string) => void
  reset: () => void
  addRust: (amt: number) => void
  cleanBoat: () => void
  loadFromServer: () => Promise<void>
  saveToServer: () => Promise<void>
}

export const useBoatStore = create<BoatStore>()(
  persist(
    (set, get) => ({
      colors: DEFAULT_BOAT_COLORS,
      rust: 0,

      setColor: (key, value) =>
        set((s) => ({ colors: { ...s.colors, [key]: value } })),

      applyPreset: (key) => {
        const p = BOAT_PRESETS[key]
        if (!p) return
        set({ colors: { sail: p.sail, hull: p.hull, lamp: p.lamp } })
      },

      reset: () => set({ colors: DEFAULT_BOAT_COLORS }),

      // 녹 누적 (Boat가 항해 중일 때 조금씩 호출) / 0~1 클램프
      addRust: (amt) =>
        set((s) => ({ rust: Math.min(1, Math.max(0, s.rust + amt)) })),

      // 배 청소 → 녹 제거
      cleanBoat: () => set({ rust: 0 }),

      // 로그인 후 1회: 서버 색을 hex로 변환해 주입 (미로그인/오류 시 로컬 색 유지)
      loadFromServer: async () => {
        if (serverSynced) return
        try {
          const { data } = await apiClient.get('/custom-boat')
          set({
            colors: {
              sail: indexToColor(SAIL_SWATCHES, data.sail),
              hull: indexToColor(HULL_SWATCHES, data.body),
              lamp: indexToColor(LAMP_SWATCHES, data.lantern),
            },
          })
          serverSynced = true
        } catch {
          /* 미로그인 등 → 로컬 유지, 다음 마운트에서 재시도 */
        }
      },

      // 현재 색을 인덱스로 변환해 저장 (저장 버튼 클릭 시 호출)
      saveToServer: async () => {
        const c = get().colors
        try {
          await apiClient.patch('/custom-boat', {
            sail: colorToIndex(SAIL_SWATCHES, c.sail),
            body: colorToIndex(HULL_SWATCHES, c.hull),
            lantern: colorToIndex(LAMP_SWATCHES, c.lamp),
          })
        } catch (e) {
          console.error('보트 색 저장 실패:', e)
        }
      },
    }),
    {
      name: 'driftlog-boat',
      partialize: (s) => ({ colors: s.colors, rust: s.rust }),
    },
  ),
)