import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'

export const layerStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
}

export const ALIGN = 'xMidYMax meet' as const

export function useIsTall(threshold = 0.9) {
  const [isTall, setIsTall] = useState(false)

  useEffect(() => {
    const check = () => setIsTall(window.innerHeight / window.innerWidth > threshold)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [threshold])

  return isTall
}

export const C = {
  ink: '#050814',
  deep: '#0b1228',
  harbor: '#111b37',
  harbor2: '#1b294b',
  glass: '#263d66',
  glass2: '#33527e',
  lit: '#7fb4d8',
  gold: '#f4c46b',
  coral: '#ee7e73',
  mint: '#8bcfb2',
  violet: '#b6a0e8',
  green: '#5fa76d',
  stone: '#34394a',
  stone2: '#54586a',
  foam: '#bcd6de',
  shadow: '#07101f',
}

type SceneTone = 'blue' | 'gold' | 'green' | 'violet' | 'coral'

const tones: Record<SceneTone, { glow: string; glow2: string; water: string; accent: string }> = {
  blue: { glow: '#2d5f8a', glow2: '#102849', water: '#123452', accent: C.lit },
  gold: { glow: '#8f5e25', glow2: '#2b1f24', water: '#183044', accent: C.gold },
  green: { glow: '#2f6b57', glow2: '#102d32', water: '#133848', accent: C.mint },
  violet: { glow: '#594685', glow2: '#211d42', water: '#1b2448', accent: C.violet },
  coral: { glow: '#89445a', glow2: '#2c1f35', water: '#18334c', accent: C.coral },
}

export function CityScene({
  id,
  tone = 'blue',
  waterY = 720,
  children,
}: {
  id: string
  tone?: SceneTone
  waterY?: number
  children: ReactNode
}) {
  const isTall = useIsTall()
  const align = isTall ? 'xMidYMax slice' : ALIGN
  const t = tones[tone]

  return (
    <>
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" style={layerStyle} preserveAspectRatio="none">
        <defs>
          <radialGradient id={`${id}-glow`} cx="50%" cy="35%" r="62%">
            <stop offset="0%" stopColor={t.glow} stopOpacity="0.58" />
            <stop offset="58%" stopColor={t.glow2} stopOpacity="0.3" />
            <stop offset="100%" stopColor={C.ink} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.water} stopOpacity="0.68" />
            <stop offset="100%" stopColor={C.ink} stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.foam} stopOpacity="0" />
            <stop offset="100%" stopColor={C.foam} stopOpacity="0.34" />
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill={`url(#${id}-glow)`} />
        <rect x="0" y={waterY - 78} width="1600" height="134" fill={`url(#${id}-mist)`} />
        <rect x="0" y={waterY} width="1600" height={900 - waterY} fill={`url(#${id}-water)`} />
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={i}
            d={`M -80 ${waterY + 30 + i * 22} C 260 ${waterY + 16 + i * 22} 430 ${waterY + 48 + i * 22} 780 ${waterY + 30 + i * 22} S 1260 ${waterY + 16 + i * 22} 1680 ${waterY + 28 + i * 22}`}
            fill="none"
            stroke={i % 2 ? t.accent : C.foam}
            strokeWidth={i < 2 ? 1.8 : 1.1}
            opacity={0.3 - i * 0.022}
          />
        ))}
      </svg>

      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" style={layerStyle} preserveAspectRatio={align}>
        <defs>
          <linearGradient id={`${id}-tower`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.glass2} />
            <stop offset="52%" stopColor={C.harbor2} />
            <stop offset="100%" stopColor={C.shadow} />
          </linearGradient>
          <linearGradient id={`${id}-stone`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.stone2} />
            <stop offset="100%" stopColor={C.stone} />
          </linearGradient>
          <linearGradient id={`${id}-hill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} />
            <stop offset="100%" stopColor={C.harbor} />
          </linearGradient>
          <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <Stars id={id} seed={id.length * 11} color={t.accent} />
        {children}
        <HarborBand id={id} y={waterY} accent={t.accent} />
      </svg>
    </>
  )
}

export function Stars({ id, seed = 1, n = 22, color = C.foam }: { id: string; seed?: number; n?: number; color?: string }) {
  const pts = useMemo(() => Array.from({ length: n }, (_, i) => ({
    x: ((seed * 83 + i * 137) % 1500) + 50,
    y: ((seed * 47 + i * 61) % 250) + 44,
    r: 0.8 + ((seed + i) % 3) * 0.45,
    o: 0.22 + ((seed + i * 5) % 5) * 0.07,
  })), [seed, n])

  return (
    <g>
      {pts.map((p, i) => (
        <circle key={`${id}-star-${i}`} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={p.o}>
          <animate attributeName="opacity" values={`${p.o};${p.o * 0.28};${p.o}`} dur={`${3 + (i % 4)}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

export function Skyline({
  id,
  y = 650,
  from = 90,
  to = 1510,
  count = 18,
  accent = C.lit,
}: {
  id: string
  y?: number
  from?: number
  to?: number
  count?: number
  accent?: string
}) {
  const width = (to - from) / count
  return (
    <g opacity="0.74">
      {Array.from({ length: count }, (_, i) => {
        const h = 54 + ((i * 37 + id.length * 9) % 116)
        const w = Math.max(24, width * (0.5 + ((i * 19) % 34) / 100))
        const x = from + i * width
        const roof = i % 5
        return (
          <g key={`${id}-b-${i}`}>
            <rect x={x} y={y - h} width={w} height={h} fill={i % 2 ? C.harbor : C.harbor2} />
            <rect x={x} y={y - h} width="2.5" height={h} fill={accent} opacity="0.24" />
            {roof === 1 && <polygon points={`${x},${y - h} ${x + w / 2},${y - h - 22} ${x + w},${y - h}`} fill={C.harbor} />}
            {roof === 2 && <rect x={x + w * 0.25} y={y - h - 12} width={w * 0.5} height="12" fill={C.harbor2} />}
            {roof === 3 && <line x1={x + w / 2} y1={y - h} x2={x + w / 2} y2={y - h - 28} stroke={accent} strokeWidth="1.3" opacity="0.55" />}
            {Array.from({ length: Math.floor(w / 16) }, (_, c) =>
              Array.from({ length: Math.floor(h / 24) }, (_, r) => {
                const on = (i * 7 + c * 5 + r * 3) % 9 < 2
                return (
                  <rect
                    key={`${c}-${r}`}
                    x={x + 7 + c * 16}
                    y={y - h + 13 + r * 24}
                    width="5"
                    height="8"
                    fill={on ? accent : C.ink}
                    opacity={on ? 0.5 : 0.55}
                  />
                )
              }),
            )}
          </g>
        )
      })}
    </g>
  )
}

export function HarborBand({ id, y = 720, accent = C.lit }: { id: string; y?: number; accent?: string }) {
  return (
    <g>
      <path d={`M 0 ${y + 8} C 280 ${y - 10} 500 ${y + 28} 800 ${y + 8} S 1320 ${y - 10} 1600 ${y + 10} L 1600 900 L 0 900 Z`} fill={C.shadow} opacity="0.7" />
      <path d={`M 0 ${y + 3} C 320 ${y - 15} 520 ${y + 22} 800 ${y + 4} S 1280 ${y - 16} 1600 ${y + 4}`} fill="none" stroke={accent} strokeWidth="2" opacity="0.25" />
      {Array.from({ length: 16 }, (_, i) => (
        <ellipse key={`${id}-glint-${i}`} cx={90 + i * 96} cy={y + 36 + (i % 4) * 18} rx={18 + (i % 3) * 8} ry="1.2" fill={accent} opacity={0.12 + (i % 3) * 0.04} />
      ))}
    </g>
  )
}

export function Reflect({ waterY, opacity = 0.13, children }: { waterY: number; opacity?: number; children: ReactNode }) {
  return (
    <g transform={`translate(0, ${2 * waterY}) scale(1, -1)`} opacity={opacity} filter="blur(0.8px)">
      {children}
    </g>
  )
}

export function Bridge({ id, x1 = 230, x2 = 1370, y = 625, towerY = 360, accent = C.lit }: { id: string; x1?: number; x2?: number; y?: number; towerY?: number; accent?: string }) {
  const left = x1 + (x2 - x1) * 0.32
  const right = x1 + (x2 - x1) * 0.68
  const cable = (x: number) => {
    const t = (x - left) / (right - left)
    return towerY + 14 + (y - towerY - 44) * 4 * t * (1 - t)
  }

  return (
    <g>
      <path d={`M ${x1} ${y} L ${x2} ${y}`} stroke={`url(#${id}-stone)`} strokeWidth="14" />
      <path d={`M ${x1} ${y - 8} L ${x2} ${y - 8}`} stroke={accent} strokeWidth="2" opacity="0.5" />
      {[left, right].map((x) => (
        <g key={x}>
          <rect x={x - 13} y={towerY} width="26" height={y - towerY + 56} fill={C.harbor2} />
          <rect x={x - 13} y={towerY} width="4" height={y - towerY + 56} fill={accent} opacity="0.35" />
          <rect x={x - 22} y={towerY + 76} width="44" height="8" fill={C.stone} />
          <circle cx={x} cy={towerY - 8} r="5" fill={accent} opacity="0.8" />
        </g>
      ))}
      {Array.from({ length: 42 }, (_, i) => {
        const x = left + ((right - left) * i) / 41
        return <line key={i} x1={x} y1={cable(x)} x2={x} y2={y - 8} stroke={accent} strokeWidth="1" opacity="0.32" />
      })}
      <path d={Array.from({ length: 50 }, (_, i) => {
        const x = left + ((right - left) * i) / 49
        return `${i ? 'L' : 'M'} ${x} ${cable(x)}`
      }).join(' ')} fill="none" stroke={accent} strokeWidth="3" opacity="0.56" />
    </g>
  )
}

export function MoonGate({ x = 800, y = 640, scale = 1, accent = C.gold }: { x?: number; y?: number; scale?: number; accent?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <path d="M -260 60 L 260 60 L 260 92 L -260 92 Z" fill={C.stone} />
      <path d="M -210 58 Q 0 -128 210 58 L 170 58 Q 0 -72 -170 58 Z" fill={C.stone2} />
      <path d="M -156 58 Q 0 -42 156 58" fill="none" stroke={accent} strokeWidth="4" opacity="0.55" />
      {[-220, -150, 150, 220].map((px) => <rect key={px} x={px - 10} y="60" width="20" height="96" fill={C.harbor2} />)}
      <circle cx="0" cy="-62" r="6" fill={accent} opacity="0.9" />
    </g>
  )
}
