import { useState, useEffect } from 'react'

export default function Daejeon() {
  const [isTall, setIsTall] = useState(false)
  useEffect(() => {
    const check = () => setIsTall(window.innerHeight / window.innerWidth > 0.9)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const towerAlign = isTall ? 'xMidYMid meet' : 'xMidYMax meet'

  const layerStyle: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%',
  }

  return (
    <>
      {/* ═══ 레이어 A: 수면 반사 + 달무리 배경 (none) ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterlineD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06101c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="skyHaloD" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#2f5a72" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#16344a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0a1c2c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="900" fill="url(#skyHaloD)" />
        <rect x="0" y="770" width="1600" height="130" fill="url(#waterlineD)" />
      </svg>

      {/* ═══ 레이어 B: 한빛탑 (청록 단색 실루엣, 고디테일) ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={towerAlign}>
        <defs>
          <linearGradient id="shaftD" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0e2129" />
            <stop offset="24%" stopColor="#244653" />
            <stop offset="40%" stopColor="#3f6e7e" />
            <stop offset="60%" stopColor="#284c5b" />
            <stop offset="100%" stopColor="#0c1f27" />
          </linearGradient>
          <linearGradient id="shaftHi" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5a8ba0" stopOpacity="0" />
            <stop offset="45%" stopColor="#6fa3b6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6fa3b6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="baseD" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0c1e26" />
            <stop offset="50%" stopColor="#2e576a" />
            <stop offset="100%" stopColor="#0a1a22" />
          </linearGradient>
          <linearGradient id="coneD" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#102832" />
            <stop offset="40%" stopColor="#427485" />
            <stop offset="58%" stopColor="#2a505f" />
            <stop offset="100%" stopColor="#0e232c" />
          </linearGradient>
          <radialGradient id="ringTop" cx="0.42" cy="0.35" r="0.75">
            <stop offset="0%" stopColor="#3a6b7c" />
            <stop offset="100%" stopColor="#173440" />
          </radialGradient>
          <linearGradient id="ringSide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d586a" />
            <stop offset="100%" stopColor="#0c1e27" />
          </linearGradient>
          <linearGradient id="windowGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9fe0ec" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3f8092" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="metalD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cdeef4" />
            <stop offset="100%" stopColor="#5a8ba0" />
          </linearGradient>
          <radialGradient id="beacon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffcfb0" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ff8a6e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff8a6e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="entryGlow" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stopColor="#9fe0ec" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#9fe0ec" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform="translate(800, 0)">
          {/* ── 하단 탑신 ── */}
          <path d="M -88 900 L -76 540 Q -74 518 -50 514 L 50 514 Q 74 518 76 540 L 88 900 Z"
            fill="url(#shaftD)" />
          <path d="M -88 900 L -76 540 Q -74 518 -50 514 L 50 514 Q 74 518 76 540 L 88 900 Z"
            fill="url(#shaftHi)" opacity="0.55" />

          {/* 화강암 단 */}
          {Array.from({ length: 13 }, (_, i) => {
            const y = 540 + i * 28
            const t = (y - 514) / (900 - 514)
            const hw = 75 + t * 13
            return (
              <g key={`seg-${i}`}>
                <rect x={-hw} y={y} width={hw * 2} height="4" fill="#0a1a22" opacity="0.4" />
                <line x1={-hw} y1={y} x2={hw} y2={y} stroke="#0a1a22" strokeWidth="1.3" opacity="0.6" />
                <rect x={-hw} y={y + 1} width={hw * 2} height="2.5" fill="#5a8ba0" opacity="0.14" />
              </g>
            )
          })}

          {/* 탑신 세로 능선 */}
          <line x1="-40" y1="516" x2="-46" y2="900" stroke="#0a1a22" strokeWidth="1.2" opacity="0.4" />
          <line x1="-14" y1="516" x2="-16" y2="900" stroke="#6fa3b6" strokeWidth="1" opacity="0.16" />
          <line x1="30" y1="516" x2="34" y2="900" stroke="#0a1a22" strokeWidth="1.2" opacity="0.45" />
          <line x1="56" y1="520" x2="64" y2="900" stroke="#06141b" strokeWidth="1.4" opacity="0.5" />

          {/* ── 탑신 출입구 캐노피 ── */}
          <ellipse cx="0" cy="836" rx="50" ry="14" fill="url(#entryGlow)" />
          <rect x="-22" y="824" width="44" height="58" fill="#091820" opacity="0.85" />
          <rect x="-22" y="824" width="44" height="6" fill="#5a8ba0" opacity="0.45" />
          <line x1="-12" y1="828" x2="-12" y2="882" stroke="#3f6e7e" strokeWidth="0.8" opacity="0.5" />
          <line x1="0" y1="828" x2="0" y2="882" stroke="#3f6e7e" strokeWidth="0.8" opacity="0.5" />
          <line x1="12" y1="828" x2="12" y2="882" stroke="#3f6e7e" strokeWidth="0.8" opacity="0.5" />

          {/* ── 기단 ── */}
          <ellipse cx="0" cy="894" rx="120" ry="10" fill="#0a151c" opacity="0.7" />
          <rect x="-110" y="880" width="220" height="14" fill="url(#baseD)" />
          <rect x="-110" y="880" width="220" height="2" fill="#6fa3b6" opacity="0.35" />
          <rect x="-110" y="892" width="220" height="2" fill="#06141b" />
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`bs-${i}`} x1={-100 + i * 22} y1="882" x2={-100 + i * 22} y2="892"
              stroke="#06141b" strokeWidth="0.8" opacity="0.5" />
          ))}

          {/* ── 도넛 전망대 고리 ── */}
          <ellipse cx="0" cy="530" rx="200" ry="44" fill="#081820" opacity="0.6" />

          {/* 고리 하단 트러스 */}
          {Array.from({ length: 14 }, (_, i) => {
            const a = ((i / 13) - 0.5) * Math.PI * 0.95
            const x = Math.sin(a) * 192
            return <line key={`rb-${i}`} x1={x} y1={552 - Math.cos(a) * 6} x2={x * 0.55} y2={548}
              stroke="#06141b" strokeWidth="1" opacity="0.55" />
          })}

          <ellipse cx="0" cy="514" rx="198" ry="48" fill="url(#ringSide)" />
          <path d="M -176 512 A 198 48 0 0 0 176 512 L 168 500 A 188 40 0 0 1 -168 500 Z"
            fill="url(#windowGlow)" opacity="0.7" />

          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * Math.PI * 2
            if (Math.sin(a) < 0.05) return null
            const x = Math.cos(a) * 192
            return <line key={`w-${i}`} x1={x} y1={504 + Math.sin(a) * 42} x2={x} y2={516 + Math.sin(a) * 47}
              stroke="#0c2028" strokeWidth="1.4" opacity="0.7" />
          })}

          {/* 켜진 창 라이트닝 도트 */}
          {[
            { a: -0.95, b: 1 }, { a: -0.55, b: 0.55 }, { a: -0.25, b: 0.9 },
            { a: 0.1, b: 0.7 }, { a: 0.45, b: 1 }, { a: 0.85, b: 0.5 },
          ].map((p, i) => {
            const x = Math.cos(p.a) * 188
            const y = 508 + Math.sin(Math.abs(p.a)) * 38
            return <circle key={`lt-${i}`} cx={x} cy={y} r="1.6" fill="#cdeef4" opacity={p.b} />
          })}

          <ellipse cx="0" cy="504" rx="194" ry="44" fill="url(#ringTop)" />
          <ellipse cx="0" cy="502" rx="138" ry="30" fill="#102830" />
          <ellipse cx="0" cy="500" rx="136" ry="28" fill="#193743" />
          <path d="M -188 500 Q 0 460 188 500" fill="none" stroke="#5a8ba0" strokeWidth="2.2" opacity="0.45" />
          <path d="M -150 490 Q 0 466 150 490" fill="none" stroke="#7ec0d2" strokeWidth="1" opacity="0.3" />
          <path d="M -198 514 A 198 48 0 0 0 198 514" fill="none" stroke="#0a1a22" strokeWidth="1.5" opacity="0.5" />

          {/* 윗면 가장자리 난간 점 */}
          {Array.from({ length: 18 }, (_, i) => {
            const a = ((i / 17) - 0.5) * Math.PI
            const x = Math.sin(a) * 188
            const y = 484 + (1 - Math.cos(a)) * 18
            return <circle key={`rl-${i}`} cx={x} cy={y} r="1.2" fill="#5a8ba0" opacity="0.55" />
          })}

          {/* ── 상단 원뿔 첨탑 ── */}
          <path d="M -52 506 Q -48 384 -20 246 Q -8 206 0 196 Q 8 206 20 246 Q 48 384 52 506 Z"
            fill="url(#coneD)" />
          <path d="M -52 506 Q -48 384 -20 246 Q -8 206 0 196"
            fill="none" stroke="#6fa3b6" strokeWidth="2" opacity="0.4" />
          <path d="M 0 196 Q 8 206 20 246 Q 48 384 52 506"
            fill="none" stroke="#08161d" strokeWidth="1.6" opacity="0.5" />
          <path d="M 0 200 Q -3 360 -10 506" fill="none" stroke="#0a1a22" strokeWidth="1" opacity="0.35" />
          <path d="M 0 198 L 0 506" stroke="#6fa3b6" strokeWidth="1" opacity="0.18" />

          {Array.from({ length: 7 }, (_, i) => {
            const t = (i + 1) / 8
            const y = 506 - t * 300
            const hw = 50 - t * 47
            return (
              <g key={`cs-${i}`}>
                <path d={`M ${-hw} ${y} Q 0 ${y - 4} ${hw} ${y}`} fill="none" stroke="#0a1a22" strokeWidth="0.9" opacity="0.32" />
                <path d={`M ${-hw} ${y - 2} Q 0 ${y - 6} ${hw} ${y - 2}`} fill="none" stroke="#5a8ba0" strokeWidth="0.6" opacity="0.12" />
              </g>
            )
          })}

          {/* 비늘 결 */}
          {Array.from({ length: 22 }, (_, i) => {
            const t = i / 22
            const y = 500 - t * 290
            const hw = 50 - t * 47
            const off = (i % 2) * (hw * 0.5)
            return <line key={`scl-${i}`} x1={-hw + off} y1={y} x2={-hw + off + 6} y2={y}
              stroke="#5a8ba0" strokeWidth="0.4" opacity="0.18" />
          })}

          {/* 안테나 지선 케이블 */}
          <line x1="-44" y1="506" x2="-3" y2="246" stroke="#06141b" strokeWidth="0.6" opacity="0.45" />
          <line x1="44" y1="506" x2="3" y2="246" stroke="#06141b" strokeWidth="0.6" opacity="0.45" />

          {/* 첨탑 끝 침 + 금속 광택 */}
          <path d="M -3.5 250 L 0 152 L 3.5 250 Z" fill="url(#metalD)" />
          <path d="M 0 152 L 3.5 250 L 1 250 Z" fill="#0e232c" opacity="0.6" />

          {/* 항공장애등 */}
          <circle cx="0" cy="180" r="10" fill="url(#beacon)" />
          <circle cx="0" cy="180" r="2" fill="#ffcfb0" />

          {/* 최상단 발광점 */}
          <circle cx="0" cy="150" r="4" fill="#cdeef4" />
          <circle cx="0" cy="150" r="9" fill="#7ec0d2" opacity="0.25" />
        </g>
      </svg>
    </>
  )
}