import { useState, useEffect } from 'react'

export default function Gwangju() {
  const [isTall, setIsTall] = useState(false)
  useEffect(() => {
    const check = () => setIsTall(window.innerHeight / window.innerWidth > 0.9)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const align = isTall ? 'xMidYMid slice' : 'xMidYMax slice'

  const layerStyle: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%',
  }

  type Bldg = [number, number, number, number, number, 'L' | 'R' | null]
  // 우측 큰 군락 + 좌측 소규모 (강릉의 대칭 배치와 차별)
  const cityBuildings: Bldg[] = [
    // 우측 큰 군락
    [950, 668, 56, 92, 0.3, 'R'],
    [1014, 638, 78, 122, 0, null],
    [1100, 658, 52, 102, 0.5, 'L'],
    [1160, 648, 70, 112, 0.2, 'R'],
    [1238, 678, 50, 82, 0.4, null],
    [1296, 658, 66, 102, 0.55, 'L'],
    [1370, 638, 78, 122, 0.15, 'R'],
    [1456, 678, 50, 82, 0.45, null],
    [1514, 658, 60, 102, 0.25, 'L'],
    // 좌측 작은 군락
    [80, 678, 50, 82, 0.4, 'R'],
    [138, 658, 60, 102, 0.6, null],
    [206, 688, 44, 72, 0.2, 'L'],
  ]

  const brokenPath = (x: number, y: number, w: number, h: number, sev: number, seed: number) => {
    if (sev === 0) return `M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Z`
    const teeth = 4
    let p = `M ${x} ${y + h} L ${x} ${y + sev * 30}`
    for (let i = 0; i <= teeth; i++) {
      const tx = x + (w * i) / teeth
      const d = ((seed * 13 + i * 37) % 100) / 100
      const ty = y + sev * (8 + d * 22)
      p += ` L ${tx} ${ty}`
    }
    p += ` L ${x + w} ${y + sev * 30} L ${x + w} ${y + h} Z`
    return p
  }


  return (
    <>
      <style>{`
        @keyframes gj-mist-pulse { 0%,100% { opacity: 0.7; } 50% { opacity: 0.55; } }

        .gj-mist { animation: gj-mist-pulse 9s ease-in-out infinite; }
      `}</style>

      {/* ═══ 레이어 A: 수면 + 안개 + 달무리 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterGJa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06101c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="haloGJa" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#2f5a72" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#16344a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a1c2c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mistGJa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="900" fill="url(#haloGJa)" />
        <rect x="0" y="660" width="1600" height="120" fill="url(#mistGJa)" />
        <rect x="0" y="720" width="1600" height="180" fill="url(#waterGJa)" />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i}
            d={`M 0 ${762 + i * 22} Q 400 ${756 + i * 22} 800 ${762 + i * 22} T 1600 ${762 + i * 22}`}
            fill="none" stroke="#2a5060" strokeWidth="1.5" opacity={0.45 - i * 0.045} />
        ))}
      </svg>

      {/* ═══ 레이어 B: 무등산 + 침수 도시 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={align}>
        <defs>
          <linearGradient id="ridge3GJ" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2c3e" />
            <stop offset="100%" stopColor="#0f1f2e" />
          </linearGradient>
          <linearGradient id="ridge2GJ" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f3245" />
            <stop offset="100%" stopColor="#142433" />
          </linearGradient>
          <linearGradient id="faceShade" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#2c4256" />
            <stop offset="60%" stopColor="#1d3144" />
            <stop offset="100%" stopColor="#11212f" />
          </linearGradient>
          <linearGradient id="faceLit" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#4f6a7e" />
            <stop offset="55%" stopColor="#3a5266" />
            <stop offset="100%" stopColor="#27394b" />
          </linearGradient>
          <linearGradient id="faceDeep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2c3d" />
            <stop offset="100%" stopColor="#0b1722" />
          </linearGradient>
          <linearGradient id="mistGJb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* ══════ 멀리 능선 — 부드러운 산맥 ══════ */}
        <path d="M 0 420 Q 200 405 380 418 Q 560 432 720 410 Q 880 388 1060 412 Q 1240 436 1420 414 Q 1510 404 1600 412 L 1600 900 L 0 900 Z"
          fill="url(#ridge3GJ)" opacity="0.55" />
        <path d="M 0 510 Q 220 488 440 502 Q 660 516 880 494 Q 1100 472 1320 498 Q 1480 514 1600 502 L 1600 900 L 0 900 Z"
          fill="url(#ridge2GJ)" opacity="0.7" />

        {/* ══════ 무등산 — 넓고 묵직한 산세 ══════ */}
        <path d="M 0 720 L 60 660 L 130 620 L 200 580 L 260 540 L 320 510 L 390 482 L 460 462 L 540 458 L 620 462 L 700 460 L 760 472 L 822 480 L 880 500 L 950 520 L 1020 550 L 1100 590 L 1180 630 L 1260 670 L 1340 700 L 1600 720 Z"
          fill="url(#faceShade)" />

        {/* 좌측 빛 면 */}
        <path d="M 540 458 L 460 462 L 390 482 L 380 540 L 462 514 L 540 502 Z" fill="url(#faceLit)" />
        <path d="M 460 462 L 390 482 L 320 510 L 314 564 L 380 540 Z" fill="url(#faceLit)" opacity="0.92" />
        <path d="M 390 482 L 320 510 L 260 540 L 250 590 L 314 564 Z" fill="url(#faceLit)" opacity="0.85" />
        <path d="M 320 510 L 260 540 L 200 580 L 190 620 L 250 590 Z" fill="url(#faceShade)" opacity="0.92" />
        <path d="M 260 540 L 200 580 L 130 620 L 120 660 L 190 620 Z" fill="url(#faceShade)" opacity="0.88" />
        <path d="M 200 580 L 130 620 L 60 660 L 50 700 L 120 660 Z" fill="url(#faceDeep)" opacity="0.85" />
        <path d="M 0 720 L 60 660 L 50 700 L 0 720 Z" fill="url(#faceDeep)" opacity="0.9" />

        {/* 우측 그늘 면 */}
        <path d="M 700 460 L 620 462 L 540 458 L 540 502 L 626 510 L 700 504 Z" fill="url(#faceShade)" opacity="0.96" />
        <path d="M 700 460 L 760 472 L 822 480 L 818 530 L 750 514 Z" fill="url(#faceDeep)" opacity="0.93" />
        <path d="M 822 480 L 880 500 L 950 520 L 944 568 L 880 548 Z" fill="url(#faceDeep)" opacity="0.9" />
        <path d="M 950 520 L 1020 550 L 1100 590 L 1090 632 L 1020 600 Z" fill="url(#faceShade)" opacity="0.88" />
        <path d="M 1100 590 L 1180 630 L 1260 670 L 1248 700 L 1180 678 Z" fill="url(#faceDeep)" opacity="0.85" />
        <path d="M 1260 670 L 1340 700 L 1600 720 L 1500 712 L 1340 700 Z" fill="url(#faceDeep)" opacity="0.92" />

        {/* 정점 평평한 능선 띠 */}
        {/* 협곡 / 균열 */}
        <path d="M 460 466 L 440 540 L 430 620 L 420 700 L 408 720" stroke="#0a141e" strokeWidth="2.2" fill="none" opacity="0.45" />
        <path d="M 540 462 L 552 540 L 548 620 L 558 700 L 548 720" stroke="#0a141e" strokeWidth="2" fill="none" opacity="0.42" />
        <path d="M 680 464 L 696 540 L 688 620 L 700 700 L 692 720" stroke="#091622" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 880 504 L 900 580 L 894 660 L 906 720" stroke="#091622" strokeWidth="1.6" fill="none" opacity="0.36" />
        <path d="M 280 530 L 264 610 L 274 720" stroke="#0a141e" strokeWidth="1.4" fill="none" opacity="0.32" />
        <path d="M 1140 610 L 1130 690 L 1140 720" stroke="#091622" strokeWidth="1.4" fill="none" opacity="0.32" />

        {/* 빛 모서리 */}
        <path d="M 540 458 L 460 462 L 390 482 L 320 510" stroke="#7c97a9" strokeWidth="1.5" fill="none" opacity="0.4" />

        {/* ══════ 안개층 ══════ */}
        <path className="gj-mist" d="M 0 660 Q 300 630 600 660 Q 900 690 1200 658 Q 1400 638 1600 666 L 1600 720 L 0 720 Z"
          fill="url(#mistGJb)" />

        {/* ══════ 침수 도시 ══════ */}
        {cityBuildings.map(([x, y, w, h, bt, cs], i) => {
          const off = bt > 0 ? bt * 30 : 0
          const crackX = cs === 'L' ? x + w * 0.3 : cs === 'R' ? x + w * 0.7 : null
          const cols = Math.floor(w / 14)
          const rows = Math.floor(h / 22)
          return (
            <g key={`b-${i}`}>
              <path d={brokenPath(x, y, w, h, bt, i + 3)} fill="#1d3b4a" />
              <rect x={x + w - 7} y={y + off} width="7" height={h - off} fill="#0e2129" />
              <rect x={x} y={y + off} width="2.5" height={h - off} fill="#2c5060" />
              {Array.from({ length: cols }, (_, c) =>
                Array.from({ length: rows }, (_, r) => {
                  const wx = x + 5 + c * 14
                  const wy = y + 8 + r * 22
                  if (bt > 0 && wy < y + bt * 30 + 3) return null
                  const seed = (i * 7 + c * 13 + r * 17) % 13
                  if (crackX !== null && Math.abs(wx + 3 - crackX) < 7 && seed < 6) return null
                  return <rect key={`${c}-${r}`} x={wx} y={wy} width="6" height="8" fill="#06121a" opacity="0.85" />
                })
              )}
              {crackX !== null && (
                <polyline
                  points={`${crackX},${y + 20} ${crackX + 3},${y + 45} ${crackX - 2},${y + 72} ${crackX + 4},${y + h - 12}`}
                  fill="none" stroke="#06121a" strokeWidth="1.2" opacity="0.85" />
              )}
            </g>
          )
        })}      </svg>
    </>
  )
}