import { useState, useEffect } from 'react'

/* ───────── 공용 ───────── */
export const layerStyle: React.CSSProperties = {
  position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%',
}

/* 모바일(세로)에서도 항상 바닥 정렬 + 중앙 유지. 양옆은 잘림 → 조형물은 x 620~980에. */
export const ALIGN = 'xMidYMax slice' as const

/* (구버전 호환용 — 더는 쓰지 않음) */
export function useIsTall(threshold = 0.9) {
  const [isTall, setIsTall] = useState(false)
  useEffect(() => {
    const check = () => setIsTall(window.innerHeight / window.innerWidth > threshold)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [threshold])
  return isTall
}

/* ───────── 기본 팔레트 (차가운 몽환 베이스) ─────────
   건물 실루엣은 도시 공통(어두움). 무드는 하늘·수면·조형물 accent로 낸다. */
export const C = {
  waterTop: '#1a2146', waterBot: '#090d1e', ripple: '#5a64a6', mist: '#bcb9dc',
  bldgBase: '#202744', bldgFace: '#2b3358',
  edgeLight: '#5d6cb4', edgeShade: '#0b0e1e',
  window: '#0a0c1a', windowGlow: '#90b8e2',
  stone: '#2a3158', stoneLit: '#4b5896', metal: '#aab4e6',
  moon: '#ece7f6', cyan: '#a9cbe9', star: '#e2e2f6',
  ridgeFar: '#1b2042', ridgeMid: '#222a52',
  faceLit: '#3c4778', faceShade: '#1d2444', faceDeep: '#10152c',
}

/* ───────── 레이어 A: 달무리 + 안개 + 수면 (none, 항상 꽉 참) ─────────
   도시별 무드: halo(하늘 글로우) / water(수면 색) / accent(2차 글로우) 주입. */
export function SkyLayer({
  waterY = 720, mistY = 656, idSuffix = '',
  halo = '#3a3a6e', halo2 = '#22244a', water = C.waterTop,
  accent, accentY = 0.34,
}: {
  waterY?: number; mistY?: number; idSuffix?: string
  halo?: string; halo2?: string; water?: string
  accent?: string; accentY?: number
}) {
  const u = (s: string) => `${s}${idSuffix}`
  return (
    <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
      style={layerStyle} preserveAspectRatio="none">
      <defs>
        <radialGradient id={u('halo')} cx="0.5" cy="0.24" r="0.68">
          <stop offset="0%" stopColor={halo} stopOpacity="0.62" />
          <stop offset="54%" stopColor={halo2} stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0c0f22" stopOpacity="0" />
        </radialGradient>
        {accent && (
          <radialGradient id={u('acc')} cx="0.5" cy={`${accentY}`} r="0.5">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        )}
        <linearGradient id={u('water')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={water} stopOpacity="0.65" />
          <stop offset="100%" stopColor={C.waterBot} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={u('mist')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.mist} stopOpacity="0" />
          <stop offset="100%" stopColor={C.mist} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1600" height="900" fill={`url(#${u('halo')})`} />
      {accent && <rect x="0" y="0" width="1600" height="900" fill={`url(#${u('acc')})`} />}
      <rect x="0" y={mistY} width="1600" height={waterY - mistY + 80} fill={`url(#${u('mist')})`} />
      <rect x="0" y={waterY} width="1600" height={900 - waterY} fill={`url(#${u('water')})`} />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i}
          d={`M 0 ${waterY + 42 + i * 22} Q 400 ${waterY + 36 + i * 22} 800 ${waterY + 42 + i * 22} T 1600 ${waterY + 42 + i * 22}`}
          fill="none" stroke={C.ripple} strokeWidth="1.5" opacity={0.4 - i * 0.045} />
      ))}
    </svg>
  )
}

/* 수면 반사 — 조형물을 waterY 기준으로 뒤집어 흐릿하게. (가볍게, opacity 낮춤) */
export function Reflect({ waterY, opacity = 0.12, children }: { waterY: number; opacity?: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(0, ${2 * waterY}) scale(1, -1)`} opacity={opacity}
      style={{ filter: 'blur(0.6px)' }}>
      {children}
    </g>
  )
}

/* 별빛 (은은히 깜빡) */
export function Stars({ seed = 1, n = 18, color = C.star }: { seed?: number; n?: number; color?: string }) {
  const pts = Array.from({ length: n }, (_, i) => ({
    x: ((seed * 97 + i * 131) % 1560) + 20,
    y: ((seed * 53 + i * 71) % 280) + 36,
    r: 0.7 + ((i * seed) % 3) * 0.4,
    o: 0.28 + ((i * 7) % 5) * 0.08,
    d: 3 + (i % 4),
  }))
  return (
    <g>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={p.o}>
          <animate attributeName="opacity" values={`${p.o};${p.o * 0.25};${p.o}`} dur={`${p.d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

/* ───────── 건물 한 채 — 옥상 디테일·드문 불빛, 변형 다양 ─────────
   roof: 'flat' | 'antenna' | 'tank' | 'step'. lit: 켜진 창 밀도(0~6). */
export function Building({
  x, y, w, h, lit = 0, idx = 0, roof = 'flat', glow = C.windowGlow,
}: { x: number; y: number; w: number; h: number; lit?: number; idx?: number; roof?: 'flat' | 'antenna' | 'tank' | 'step'; glow?: string }) {
  const cols = Math.max(1, Math.floor(w / 15))
  const rows = Math.max(1, Math.floor(h / 22))
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={C.bldgBase} />
      <rect x={x} y={y} width="2.5" height={h} fill={C.edgeLight} opacity="0.42" />
      <rect x={x + w - 6} y={y} width="6" height={h} fill={C.edgeShade} />
      <rect x={x} y={y} width={w} height="2" fill={C.stoneLit} opacity="0.3" />
      {/* 옥상 */}
      {roof === 'antenna' && (
        <>
          <rect x={x + w / 2 - 0.8} y={y - 18} width="1.6" height="18" fill={C.stone} />
          <circle cx={x + w / 2} cy={y - 20} r="1.4" fill={glow} opacity="0.7" />
        </>
      )}
      {roof === 'tank' && <rect x={x + w * 0.3} y={y - 8} width={w * 0.4} height="8" rx="2" fill={C.bldgFace} />}
      {roof === 'step' && <rect x={x + w * 0.2} y={y - 10} width={w * 0.6} height="10" fill={C.bldgBase} />}
      {/* 창 */}
      {Array.from({ length: cols }, (_, c) =>
        Array.from({ length: rows }, (_, ri) => {
          const wx = x + 6 + c * 15, wy = y + 12 + ri * 22
          if (wy > y + h - 12 || wx > x + w - 8) return null
          const seed = (idx * 7 + c * 13 + ri * 17) % 23
          const on = seed < lit
          return <rect key={`${c}-${ri}`} x={wx} y={wy} width="5.5" height="8"
            fill={on ? glow : C.window} opacity={on ? 0.5 : 0.8} />
        })
      )}
    </g>
  )
}