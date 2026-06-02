import { useState } from 'react'
import { resolveScene } from '../constants/scenePreset'
import type { TimeOfDay } from '../hooks/useTimeOfDay'
import type { WeatherId, AbnormalType } from '../constants/weather'
// ⚠️ 씬 컴포넌트 import — 실제 경로/이름에 맞게 수정
import OceanScene from '../components/r3f/OceanScene'

const TIMES: TimeOfDay[] = ['dawn', 'day', 'night']
const WEATHERS: { id: WeatherId; label: string }[] = [
  { id: 1, label: '1 맑음' },
  { id: 2, label: '2 흐림(horizonBlur)' },
  { id: 3, label: '3 안개(fog)' },
  { id: 4, label: '4 비(rain)' },
  { id: 5, label: '5 거친 파도' },
  { id: 6, label: '6 폭풍(rain+wind)' },
  { id: 7, label: '7 황사(dustFog)' },
  { id: 8, label: '8' },
  { id: 9, label: '9' },
]
const ABNORMALS: { v: AbnormalType; label: string }[] = [
  { v: null, label: '없음' },
  { v: 'ECLIPSE', label: 'ECLIPSE (일식)' },
  { v: 'BLOOD_MOON', label: 'BLOOD_MOON (블러드문)' },
]

export default function ScenePreview() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('night')
  const [weatherId, setWeatherId] = useState<WeatherId | null>(1)
  const [abnormalType, setAbnormalType] = useState<AbnormalType>(null)

  const preset = resolveScene({ weatherId, abnormalType, timeOfDay })

  const selCls =
    'bg-[#040d16] border border-[#1a4a64]/60 rounded px-2 py-1 text-[12px] text-[#cce8f5] font-mono outline-none focus:border-[#4a9abb]'

  return (
    <div className="fixed inset-0 bg-black">
      {/* 씬 — preset 주입 구조 확인 후 연결 */}
      <OceanScene preset={preset} />

      {/* 컨트롤 패널 */}
      <div className="absolute top-4 left-4 z-50 bg-[#050e18]/95 border border-[#1a4a64]/50 rounded-lg p-4 flex flex-col gap-3 backdrop-blur-md"
        style={{ minWidth: 240 }}>
        <p className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.3em] uppercase">Scene Preview</p>

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-mono text-[#4a7a94] uppercase tracking-widest">시간대</span>
          <select className={selCls} value={timeOfDay} onChange={e => setTimeOfDay(e.target.value as TimeOfDay)}>
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-mono text-[#4a7a94] uppercase tracking-widest">날씨 (day만 적용)</span>
          <select className={selCls} value={weatherId ?? ''} onChange={e => setWeatherId(e.target.value === '' ? null : Number(e.target.value) as WeatherId)}>
            <option value="">null</option>
            {WEATHERS.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-mono text-[#4a7a94] uppercase tracking-widest">비정상</span>
          <select className={selCls} value={abnormalType ?? ''} onChange={e => setAbnormalType(e.target.value === '' ? null : e.target.value as AbnormalType)}>
            {ABNORMALS.map(a => <option key={a.label} value={a.v ?? ''}>{a.label}</option>)}
          </select>
        </label>

        {/* 현재 preset 덤프 — 실제 적용값 확인 */}
        <div className="mt-1 pt-2 border-t border-[#0d2233] text-[9px] font-mono text-[#3a6880] leading-relaxed">
          <div>body: <span className="text-[#7eb8d4]">{preset.celestialBody}</span></div>
          <div>showMoon: <span className="text-[#7eb8d4]">{String(preset.showMoon)}</span></div>
          <div>ambient: <span className="text-[#7eb8d4]">{preset.ambientIntensity}</span></div>
          <div>waterNear: <span className="text-[#7eb8d4]">[{preset.waterNear.join(', ')}]</span></div>
          <div>waterFar: <span className="text-[#7eb8d4]">[{preset.waterFar.join(', ')}]</span></div>
          <div>fog: <span className="text-[#7eb8d4]">{preset.fogColor} / {preset.fogDensity}</span></div>
          <div>sky: <span className="text-[#7eb8d4]">{preset.skyTop} → {preset.skyBottom}</span></div>
          <div>effects: <span className="text-[#7eb8d4]">[{preset.effects.join(', ') || '—'}]</span></div>
        </div>
      </div>
    </div>
  )
}