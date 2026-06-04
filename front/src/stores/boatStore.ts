import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
export const SAIL_SWATCHES = ['#e7e0cf', '#f1ece1', '#cfe0d8', '#e9cdb0', '#b9bcc0', '#c8b6d0']
export const HULL_SWATCHES = ['#142334', '#1c2c3a', '#10242a', '#241826', '#0a1016', '#1a1410']
export const LAMP_SWATCHES = ['#f4c57b', '#ffe3b0', '#bfe0c9', '#ff9d6b', '#7fa6c0', '#e8eef2']

interface BoatStore {
  colors: BoatColors
  setColor: (key: keyof BoatColors, value: string) => void
  applyPreset: (key: string) => void
  reset: () => void
}

export const useBoatStore = create<BoatStore>()(
  persist(
    (set) => ({
      colors: DEFAULT_BOAT_COLORS,
      setColor: (key, value) =>
        set((s) => ({ colors: { ...s.colors, [key]: value } })),
      applyPreset: (key) => {
        const p = BOAT_PRESETS[key]
        if (!p) return
        set({ colors: { sail: p.sail, hull: p.hull, lamp: p.lamp } })
      },
      reset: () => set({ colors: DEFAULT_BOAT_COLORS }),
    }),
    { name: 'driftlog-boat' },
  ),
)