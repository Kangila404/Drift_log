import { useState, useEffect } from 'react'

export default function Daegu() {
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

  // 도시 건물 — [x, y, w, h, brokenTop, crackSide]
  type Bldg = [number, number, number, number, number, 'L' | 'R' | null]
  // 본 줄 건물 (앞줄, 큼)
  const cityBuildings: Bldg[] = [
    [470, 680, 36, 80, 0.35, 'R'],
    [510, 660, 44, 100, 0, null],
    [558, 642, 52, 118, 0.4, 'L'],
    [614, 668, 38, 92, 0.55, null],
    [656, 650, 56, 110, 0.15, 'R'],
    [716, 660, 42, 100, 0.3, null],
    [762, 638, 60, 122, 0, 'L'],
    [826, 668, 44, 92, 0.5, 'R'],
    [874, 678, 36, 82, 0.25, null],
    // (920~960 계산성당 자리)
    [968, 670, 42, 90, 0.45, 'L'],
    [1014, 642, 56, 118, 0, null],
    [1074, 660, 48, 100, 0.3, 'R'],
    [1126, 678, 36, 82, 0.55, null],
    [1166, 670, 40, 90, 0.2, 'L'],
  ]
  // 뒷줄 건물 (작고 흐림)
  const backBuildings: Bldg[] = [
    [490, 690, 30, 70, 0.4, null],
    [594, 700, 24, 60, 0, null],
    [684, 696, 28, 64, 0.5, null],
    [752, 698, 26, 62, 0.25, null],
    [868, 698, 22, 62, 0, null],
    [992, 700, 26, 60, 0.4, null],
    [1108, 696, 24, 64, 0.3, null],
    [1198, 700, 28, 60, 0.5, null],
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

  const renderBuilding = ([x, y, w, h, bt, cs]: Bldg, i: number) => {
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
  }

  return (
    <>
      {/* ═══ 레이어 A: 수면 + 안개 + 달무리 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterDg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06101c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="haloDg" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#2f5a72" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#16344a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a1c2c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mistDgA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="900" fill="url(#haloDg)" />
        <rect x="0" y="600" width="1600" height="160" fill="url(#mistDgA)" opacity="0.5" />
        <rect x="0" y="720" width="1600" height="180" fill="url(#waterDg)" />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i}
            d={`M 0 ${762 + i * 22} Q 400 ${756 + i * 22} 800 ${762 + i * 22} T 1600 ${762 + i * 22}`}
            fill="none" stroke="#2a5060" strokeWidth="1.5" opacity={0.45 - i * 0.045} />
        ))}
      </svg>

      {/* ═══ 레이어 B: 분지 (좌우 산 + 도시 + 성당) ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={align}>
        <defs>
          <linearGradient id="ridge3D" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2c3e" />
            <stop offset="100%" stopColor="#0f1f2e" />
          </linearGradient>
          <linearGradient id="ridge2D" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f3245" />
            <stop offset="100%" stopColor="#142433" />
          </linearGradient>
          <linearGradient id="faceShadeD" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#2c4256" />
            <stop offset="60%" stopColor="#1d3144" />
            <stop offset="100%" stopColor="#11212f" />
          </linearGradient>
          <linearGradient id="faceLitD" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#4f6a7e" />
            <stop offset="55%" stopColor="#3a5266" />
            <stop offset="100%" stopColor="#27394b" />
          </linearGradient>
          <linearGradient id="faceDeepD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2c3d" />
            <stop offset="100%" stopColor="#0b1722" />
          </linearGradient>
          <linearGradient id="mistDgB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* ══════ 뒤편 멀리 능선 (분지 너머 산맥) ══════ */}
        <path d="M 0 360 L 90 340 L 180 370 L 270 332 L 360 366 L 450 320 L 540 358 L 620 310 L 700 348 L 780 295 L 870 340 L 960 305 L 1050 352 L 1140 318 L 1240 360 L 1330 322 L 1420 358 L 1510 330 L 1600 350 L 1600 900 L 0 900 Z"
          fill="url(#ridge3D)" opacity="0.55" />
        <path d="M 0 470 L 110 445 L 220 478 L 330 442 L 450 482 L 560 450 L 680 488 L 800 442 L 920 484 L 1050 450 L 1170 488 L 1290 452 L 1400 484 L 1510 458 L 1600 478 L 1600 900 L 0 900 Z"
          fill="url(#ridge2D)" opacity="0.72" />

        {/* ══════ 좌측 산 (분지의 서쪽 면) ══════ */}
        <path d="M 0 720 L 0 580 L 60 520 L 120 480 L 180 440 L 220 410 L 250 400 L 280 410 L 320 450 L 360 500 L 400 560 L 440 620 L 470 680 L 500 720 Z"
          fill="url(#faceShadeD)" />
        <path d="M 250 400 L 220 410 L 180 440 L 200 480 L 240 460 L 250 420 Z" fill="url(#faceLitD)" />
        <path d="M 180 440 L 120 480 L 140 530 L 200 480 Z" fill="url(#faceLitD)" opacity="0.92" />
        <path d="M 120 480 L 60 520 L 80 580 L 140 530 Z" fill="url(#faceLitD)" opacity="0.85" />
        <path d="M 60 520 L 0 580 L 0 660 L 80 580 Z" fill="url(#faceShadeD)" opacity="0.9" />
        <path d="M 250 400 L 280 410 L 320 450 L 290 480 L 260 450 L 250 420 Z" fill="url(#faceShadeD)" />
        <path d="M 320 450 L 360 500 L 330 540 L 290 480 Z" fill="url(#faceDeepD)" opacity="0.92" />
        <path d="M 360 500 L 400 560 L 370 600 L 330 540 Z" fill="url(#faceDeepD)" opacity="0.88" />
        <path d="M 400 560 L 440 620 L 410 660 L 370 600 Z" fill="url(#faceShadeD)" opacity="0.85" />
        <path d="M 440 620 L 470 680 L 500 720 L 410 660 Z" fill="url(#faceDeepD)" opacity="0.92" />
        <path d="M 250 410 L 240 480 L 260 580 L 280 700" stroke="#0a141e" strokeWidth="2.2" fill="none" opacity="0.45" />
        <path d="M 320 460 L 340 560 L 360 700" stroke="#0a141e" strokeWidth="1.8" fill="none" opacity="0.4" />
        <path d="M 180 460 L 160 580 L 180 700" stroke="#091622" strokeWidth="1.5" fill="none" opacity="0.35" />
        <path d="M 250 400 L 220 410 L 180 440 L 120 480 L 60 520" stroke="#7c97a9" strokeWidth="1.5" fill="none" opacity="0.4" />

        {/* ══════ 우측 산 (분지의 동쪽 면) ══════ */}
        <path d="M 1600 720 L 1600 580 L 1540 520 L 1480 480 L 1420 440 L 1370 410 L 1330 400 L 1290 410 L 1250 450 L 1210 510 L 1170 580 L 1140 640 L 1110 700 L 1100 720 Z"
          fill="url(#faceShadeD)" />
        <path d="M 1330 400 L 1290 410 L 1250 450 L 1270 490 L 1310 470 L 1330 420 Z" fill="url(#faceLitD)" />
        <path d="M 1250 450 L 1210 510 L 1230 560 L 1270 490 Z" fill="url(#faceLitD)" opacity="0.88" />
        <path d="M 1210 510 L 1170 580 L 1190 630 L 1230 560 Z" fill="url(#faceLitD)" opacity="0.82" />
        <path d="M 1170 580 L 1140 640 L 1160 690 L 1190 630 Z" fill="url(#faceShadeD)" opacity="0.9" />
        <path d="M 1140 640 L 1110 700 L 1100 720 L 1160 690 Z" fill="url(#faceShadeD)" opacity="0.85" />
        <path d="M 1330 400 L 1370 410 L 1420 440 L 1400 490 L 1350 460 L 1330 420 Z" fill="url(#faceShadeD)" />
        <path d="M 1420 440 L 1480 480 L 1460 540 L 1400 490 Z" fill="url(#faceDeepD)" opacity="0.92" />
        <path d="M 1480 480 L 1540 520 L 1520 580 L 1460 540 Z" fill="url(#faceDeepD)" opacity="0.9" />
        <path d="M 1540 520 L 1600 580 L 1600 660 L 1520 580 Z" fill="url(#faceDeepD)" opacity="0.92" />
        <path d="M 1330 410 L 1340 480 L 1320 580 L 1300 700" stroke="#0a141e" strokeWidth="2.2" fill="none" opacity="0.45" />
        <path d="M 1250 460 L 1230 560 L 1210 700" stroke="#0a141e" strokeWidth="1.8" fill="none" opacity="0.4" />
        <path d="M 1420 460 L 1440 580 L 1420 700" stroke="#091622" strokeWidth="1.5" fill="none" opacity="0.35" />
        <path d="M 1330 400 L 1290 410 L 1250 450 L 1210 510 L 1170 580" stroke="#7c97a9" strokeWidth="1.5" fill="none" opacity="0.4" />

        {/* ══════ 분지 안개층 ══════ */}
        <path d="M 0 660 Q 400 630 800 660 Q 1200 690 1600 660 L 1600 720 L 0 720 Z"
          fill="url(#mistDgB)" opacity="0.65" />

        {/* ══════ 도시 — 뒷줄 (작고 흐림) ══════ */}
        <g opacity="0.7">
          {backBuildings.map((b, i) => renderBuilding(b, i + 100))}
        </g>

        {/* ══════ 도시 — 앞줄 (수많은 건물) ══════ */}
        {cityBuildings.map((b, i) => renderBuilding(b, i))}

        {/* ══════ 계산성당 — 수많은 건물 중 하나, 작게 ══════ */}
        <g transform="translate(940, 545)">
          {/* 본당 */}
          <rect x="-18" y="60" width="36" height="155" fill="#1d3b4a" />
          <rect x="-18" y="60" width="2" height="155" fill="#2c5060" />
          <rect x="14" y="60" width="4" height="155" fill="#0e2129" />
          {/* 박공 */}
          <path d="M -18 60 L 0 38 L 18 60 Z" fill="#234654" />
          <path d="M 0 38 L 18 60 L 9 60 Z" fill="#0e2129" />
          {/* 좌측 종탑 */}
          <rect x="-30" y="48" width="14" height="167" fill="#1d3b4a" />
          <rect x="-30" y="48" width="1.5" height="167" fill="#2c5060" />
          <rect x="-18" y="48" width="2.5" height="167" fill="#0e2129" />
          <polygon points="-30,48 -23,20 -16,48" fill="#234654" />
          <polygon points="-23,20 -16,48 -19,48" fill="#0e2129" />
          <line x1="-23" y1="20" x2="-23" y2="12" stroke="#5a8ba0" strokeWidth="0.8" />
          <line x1="-25" y1="16" x2="-21" y2="16" stroke="#5a8ba0" strokeWidth="0.8" />
          {/* 우측 종탑 */}
          <rect x="16" y="48" width="14" height="167" fill="#1d3b4a" />
          <rect x="16" y="48" width="1.5" height="167" fill="#2c5060" />
          <rect x="28" y="48" width="2.5" height="167" fill="#0e2129" />
          <polygon points="16,48 23,20 30,48" fill="#234654" />
          <polygon points="23,20 30,48 26,48" fill="#0e2129" />
          <line x1="23" y1="20" x2="23" y2="12" stroke="#5a8ba0" strokeWidth="0.8" />
          <line x1="21" y1="16" x2="25" y2="16" stroke="#5a8ba0" strokeWidth="0.8" />
          {/* 장미창 */}
          <circle cx="0" cy="78" r="6" fill="#0e2129" stroke="#3f6e7e" strokeWidth="0.8" />
          <circle cx="0" cy="78" r="2.5" fill="#5a8ba0" opacity="0.7" />
          {/* 종탑 창 */}
          <rect x="-26" y="70" width="6" height="14" fill="#06121a" opacity="0.85" />
          <rect x="20" y="70" width="6" height="14" fill="#06121a" opacity="0.85" />
          {/* 정문 아치 */}
          <path d="M -10 215 L -10 105 Q -10 95 0 95 Q 10 95 10 105 L 10 215 Z" fill="#06121a" />
          {/* 본당 측면 창 */}
          <rect x="-14" y="120" width="3" height="20" fill="#06121a" />
          <rect x="11" y="120" width="3" height="20" fill="#06121a" />
          <rect x="-14" y="155" width="3" height="20" fill="#06121a" />
          <rect x="11" y="155" width="3" height="20" fill="#06121a" />
        </g>
      </svg>
    </>
  )
}