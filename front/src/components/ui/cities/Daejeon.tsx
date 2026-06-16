// front/src/components/ui/cities/Daejeon.tsx
import { useIsTall, layerStyle, SkyLayer, Stars, C } from './_cityKit'

export default function Daejeon() {
  const isTall = useIsTall()
  const align = isTall ? 'xMidYMid meet' : 'xMidYMax meet'

  return (
    <>
      <SkyLayer idSuffix="DJ" waterY={760} mistY={700} halo="#b56b85" halo2="#4d2a3c" />

      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={align}>
        <defs>
          <linearGradient id="djShaft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.edgeShade} />
            <stop offset="32%" stopColor={C.bldgFace} />
            <stop offset="55%" stopColor={C.stoneLit} />
            <stop offset="100%" stopColor={C.edgeShade} />
          </linearGradient>
          <linearGradient id="djCone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.edgeShade} />
            <stop offset="46%" stopColor={C.stoneLit} />
            <stop offset="100%" stopColor={C.edgeShade} />
          </linearGradient>
          <radialGradient id="djRing" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stopColor={C.stoneLit} />
            <stop offset="100%" stopColor={C.stone} />
          </radialGradient>
          <linearGradient id="djGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.windowGlow} stopOpacity="0.85" />
            <stop offset="100%" stopColor={C.windowGlow} stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="djBeacon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={C.cyan} stopOpacity="0.9" />
            <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
          </radialGradient>
        </defs>

        <Stars seed={7} n={20} />

        <g transform="translate(800, 0)">
          {/* 하단 탑신 */}
          <path d="M -78 900 L -66 560 Q -64 540 -44 536 L 44 536 Q 64 540 66 560 L 78 900 Z" fill="url(#djShaft)" />
          {/* 화강암 단 */}
          {Array.from({ length: 11 }, (_, i) => {
            const y = 560 + i * 30
            const t = (y - 536) / (900 - 536)
            const hw = 66 + t * 12
            return <line key={i} x1={-hw} y1={y} x2={hw} y2={y} stroke={C.edgeShade} strokeWidth="1.2" opacity="0.5" />
          })}
          {/* 세로 능선 */}
          <line x1="-30" y1="538" x2="-36" y2="900" stroke={C.edgeShade} strokeWidth="1" opacity="0.4" />
          <line x1="34" y1="540" x2="42" y2="900" stroke={C.stoneLit} strokeWidth="1" opacity="0.18" />

          {/* 기단 */}
          <ellipse cx="0" cy="896" rx="112" ry="9" fill={C.edgeShade} opacity="0.7" />
          <rect x="-100" y="884" width="200" height="12" fill={C.stone} />
          <rect x="-100" y="884" width="200" height="2" fill={C.stoneLit} opacity="0.4" />

          {/* 도넛 전망대 */}
          <ellipse cx="0" cy="530" rx="182" ry="40" fill={C.edgeShade} opacity="0.55" />
          <ellipse cx="0" cy="516" rx="178" ry="44" fill="url(#djRing)" />
          <path d="M -160 514 A 178 44 0 0 0 160 514 L 152 502 A 168 36 0 0 1 -152 502 Z" fill="url(#djGlow)" opacity="0.7" />
          {/* 켜진 창 점 */}
          {[-0.9, -0.5, -0.2, 0.15, 0.5, 0.85].map((a, i) => (
            <circle key={i} cx={Math.cos(a) * 168} cy={508 + Math.sin(Math.abs(a)) * 34} r="1.6" fill={C.cyan} opacity="0.8" />
          ))}
          <ellipse cx="0" cy="504" rx="174" ry="40" fill="url(#djRing)" />
          <ellipse cx="0" cy="502" rx="120" ry="26" fill={C.bldgBase} />
          <path d="M -170 500 Q 0 466 170 500" fill="none" stroke={C.stoneLit} strokeWidth="1.6" opacity="0.4" />

          {/* 원뿔 첨탑 */}
          <path d="M -46 506 Q -42 380 -18 250 Q -7 210 0 200 Q 7 210 18 250 Q 42 380 46 506 Z" fill="url(#djCone)" />
          <path d="M -46 506 Q -42 380 -18 250 Q -7 210 0 200" fill="none" stroke={C.stoneLit} strokeWidth="1.4" opacity="0.35" />
          <line x1="0" y1="204" x2="0" y2="506" stroke={C.stoneLit} strokeWidth="0.8" opacity="0.18" />
          {/* 가로 단 */}
          {Array.from({ length: 6 }, (_, i) => {
            const t = (i + 1) / 7
            const y = 506 - t * 290
            const hw = 46 - t * 43
            return <path key={i} d={`M ${-hw} ${y} Q 0 ${y - 3} ${hw} ${y}`} fill="none" stroke={C.edgeShade} strokeWidth="0.8" opacity="0.3" />
          })}

          {/* 첨탑 끝 + 비콘 */}
          <path d="M -3 250 L 0 158 L 3 250 Z" fill={C.metal} />
          <circle cx="0" cy="188" r="12" fill="url(#djBeacon)" />
          <circle cx="0" cy="188" r="2.4" fill={C.cyan} />
          <circle cx="0" cy="158" r="4" fill={C.moon} />
          <circle cx="0" cy="158" r="9" fill={C.cyan} opacity="0.3" />
        </g>
      </svg>
    </>
  )
}