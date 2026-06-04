import { useState, useEffect } from 'react'

export default function Gangneung() {
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
  const cityBuildings: Bldg[] = [
    [100, 660, 60, 100, 0.45, 'R'],
    [168, 638, 78, 122, 0.2, null],
    [254, 668, 50, 92, 0.6, 'L'],
    [312, 650, 72, 110, 0, 'R'],
    [392, 678, 46, 82, 0.35, null],
    [446, 658, 60, 102, 0.55, 'L'],
    [1080, 668, 56, 92, 0.3, null],
    [1144, 638, 78, 122, 0, 'R'],
    [1230, 658, 52, 102, 0.5, 'L'],
    [1290, 678, 58, 82, 0.2, null],
    [1356, 648, 66, 112, 0.4, 'R'],
    [1430, 688, 44, 72, 0, null],
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
        @keyframes gn-board-1 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(2px,-3px) rotate(1.5deg); } }
        @keyframes gn-board-2 { 0%,100% { transform: translate(880px,800px) rotate(-12deg); } 50% { transform: translate(882px,797px) rotate(-10deg); } }
        @keyframes gn-board-3 { 0%,100% { transform: translate(540px,830px) rotate(8deg); } 50% { transform: translate(541px,827px) rotate(10deg); } }
        @keyframes gn-board-4 { 0%,100% { transform: translate(1020px,820px) rotate(-5deg); } 50% { transform: translate(1022px,818px) rotate(-3.5deg); } }
        @keyframes gn-board-shadow { 0%,100% { opacity: 0.3; } 50% { opacity: 0.18; } }
        @keyframes gn-bird-drift { 0% { transform: translateX(0); } 100% { transform: translateX(40px); } }
        @keyframes gn-mist-pulse { 0%,100% { opacity: 0.7; } 50% { opacity: 0.55; } }
        @keyframes gn-pavilion-bob { 0%,100% { transform: translate(900px,640px) scale(0.4); } 50% { transform: translate(900px,641px) scale(0.4); } }

        .gn-board-1 { animation: gn-board-1 4.5s ease-in-out infinite; transform-origin: 680px 778px; }
        .gn-board-2 { animation: gn-board-2 5.2s ease-in-out infinite; transform-box: fill-box; }
        .gn-board-3 { animation: gn-board-3 6s ease-in-out infinite; transform-box: fill-box; }
        .gn-board-4 { animation: gn-board-4 4.8s ease-in-out infinite; transform-box: fill-box; }
        .gn-board-shadow-1 { animation: gn-board-shadow 4.5s ease-in-out infinite; }
        .gn-board-shadow-2 { animation: gn-board-shadow 5.2s ease-in-out infinite; }
        .gn-board-shadow-3 { animation: gn-board-shadow 6s ease-in-out infinite; }
        .gn-board-shadow-4 { animation: gn-board-shadow 4.8s ease-in-out infinite; }
        .gn-birds { animation: gn-bird-drift 28s ease-in-out infinite alternate; }
        .gn-mist { animation: gn-mist-pulse 9s ease-in-out infinite; }
        .gn-pavilion { animation: gn-pavilion-bob 5s ease-in-out infinite; }
      `}</style>

      {/* ═══ 레이어 A: 수면 + 안개 + 달무리 (정적) ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06101c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="haloG" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#2f5a72" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#16344a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a1c2c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mistA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="900" fill="url(#haloG)" />
        <rect x="0" y="660" width="1600" height="120" fill="url(#mistA)" />
        <rect x="0" y="720" width="1600" height="180" fill="url(#waterG)" />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i}
            d={`M 0 ${762 + i * 22} Q 400 ${756 + i * 22} 800 ${762 + i * 22} T 1600 ${762 + i * 22}`}
            fill="none" stroke="#2a5060" strokeWidth="1.5" opacity={0.45 - i * 0.045} />
        ))}
      </svg>

      {/* ═══ 레이어 B: 산 + 디테일 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={align}>
        <defs>
          <linearGradient id="ridge3G" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a2c3e" />
            <stop offset="100%" stopColor="#0f1f2e" />
          </linearGradient>
          <linearGradient id="ridge2G" x1="0" y1="0" x2="0" y2="1">
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
          <linearGradient id="mistG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* 멀리 새떼 (천천히 떠다님) */}
        <g className="gn-birds">
          <path d="M 380 200 Q 386 195 392 200 Q 398 195 404 200" stroke="#3a5266" strokeWidth="1.2" fill="none" opacity="0.55" />
          <path d="M 420 215 Q 425 211 430 215 Q 435 211 440 215" stroke="#3a5266" strokeWidth="1" fill="none" opacity="0.45" />
          <path d="M 350 240 Q 355 236 360 240 Q 365 236 370 240" stroke="#3a5266" strokeWidth="0.9" fill="none" opacity="0.4" />
          <path d="M 460 180 Q 466 176 472 180 Q 478 176 484 180" stroke="#3a5266" strokeWidth="1" fill="none" opacity="0.45" />
        </g>

        {/* ══════ 먼 톱니 능선 ══════ */}
        <path d="M 0 380 L 90 365 L 170 390 L 240 358 L 320 380 L 400 350 L 470 384 L 550 348 Q 600 332 650 350 L 730 374 L 810 348 L 880 376 L 960 350 L 1040 378 L 1130 354 L 1210 384 L 1290 358 L 1380 388 L 1470 360 L 1600 380 L 1600 900 L 0 900 Z"
          fill="url(#ridge3G)" opacity="0.55" />
        <path d="M 0 488 L 110 460 L 200 494 L 290 458 L 380 496 L 470 462 Q 530 444 590 466 L 680 502 L 770 470 L 870 506 L 960 472 L 1060 502 L 1160 470 L 1260 506 L 1360 472 L 1460 494 L 1600 472 L 1600 900 L 0 900 Z"
          fill="url(#ridge2G)" opacity="0.7" />

        {/* ══════ 메인 산 ══════ */}
        <path d="M 0 720 L 80 660 Q 120 638 160 624 L 210 600 Q 260 580 290 562 L 340 526 L 380 500 Q 410 480 440 446 L 470 408 L 490 360 L 500 318 L 514 296 L 530 322 L 548 362 L 572 414 Q 596 442 622 478 L 660 514 L 700 546 Q 738 568 762 580 L 800 600 L 830 624 L 900 656 Q 940 678 970 720 L 0 720 Z"
          fill="url(#faceShade)" />

        <path d="M 514 296 L 500 318 L 490 360 L 470 408 L 460 460 L 482 462 L 502 410 L 514 340 Z" fill="url(#faceLit)" />
        <path d="M 470 408 Q 440 446 410 480 L 408 524 L 442 510 L 462 470 L 460 460 Z" fill="url(#faceLit)" opacity="0.95" />
        <path d="M 410 480 L 380 500 L 340 526 L 320 564 L 380 552 L 408 524 Z" fill="url(#faceLit)" opacity="0.88" />
        <path d="M 340 526 L 290 562 L 260 580 L 244 610 L 290 600 L 320 564 Z" fill="url(#faceShade)" opacity="0.92" />
        <path d="M 260 580 L 210 600 L 160 624 L 140 660 L 200 644 L 244 610 Z" fill="url(#faceShade)" opacity="0.88" />
        <path d="M 160 624 L 120 638 L 80 660 L 60 700 L 130 686 L 140 660 Z" fill="url(#faceDeep)" opacity="0.85" />
        <path d="M 0 720 L 80 660 L 60 700 L 0 720 Z" fill="url(#faceDeep)" opacity="0.9" />

        <path d="M 514 296 L 530 322 L 548 362 L 572 414 L 558 460 L 526 380 L 514 340 Z" fill="url(#faceShade)" />
        <path d="M 572 414 Q 596 442 622 478 L 622 530 L 580 510 L 558 460 Z" fill="url(#faceDeep)" opacity="0.95" />
        <path d="M 622 478 L 660 514 L 700 546 L 698 580 L 654 562 L 622 530 Z" fill="url(#faceDeep)" opacity="0.9" />
        <path d="M 700 546 Q 738 568 762 580 L 770 614 L 720 600 L 698 580 Z" fill="url(#faceShade)" opacity="0.92" />
        <path d="M 762 580 L 800 600 L 830 624 L 832 660 L 790 644 L 770 614 Z" fill="url(#faceDeep)" opacity="0.88" />
        <path d="M 830 624 L 900 656 L 940 678 L 920 706 L 850 690 L 832 660 Z" fill="url(#faceShade)" opacity="0.85" />
        <path d="M 900 656 L 940 678 L 970 720 L 920 706 Z" fill="url(#faceDeep)" opacity="0.92" />

        <path d="M 514 296 L 500 318 L 490 360 L 470 408" stroke="#88a3b5" strokeWidth="1.5" fill="none" opacity="0.45" />
        <path d="M 514 296 L 530 322 L 548 362" stroke="#0a141e" strokeWidth="1" fill="none" opacity="0.5" />

        <path d="M 502 320 L 488 408 L 480 480 L 466 560 L 458 650 L 448 720" stroke="#0a141e" strokeWidth="2.5" fill="none" opacity="0.45" />
        <path d="M 520 340 L 540 440 L 528 540 L 540 640 L 530 720" stroke="#0a141e" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 380 530 L 360 620 L 374 720" stroke="#0a141e" strokeWidth="1.5" fill="none" opacity="0.35" />
        <path d="M 700 560 L 720 650 L 708 720" stroke="#091622" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 200 640 L 210 720" stroke="#091622" strokeWidth="1.4" fill="none" opacity="0.3" />
        <path d="M 870 660 L 880 720" stroke="#091622" strokeWidth="1.4" fill="none" opacity="0.3" />

        <polygon points="514,296 506,310 514,318 522,310" fill="#5a8ba0" opacity="0.45" />

        {/* 우측 보조 봉우리 */}
        <path d="M 970 720 L 1020 680 L 1080 644 L 1140 612 L 1200 584 L 1250 568 L 1284 558 L 1310 562 L 1346 580 L 1390 608 L 1440 642 L 1500 678 L 1600 720 Z"
          fill="url(#faceShade)" opacity="0.93" />
        <path d="M 1284 558 L 1250 568 L 1200 584 L 1140 612 L 1146 660 L 1210 622 L 1260 596 Z" fill="url(#faceLit)" opacity="0.75" />
        <path d="M 1284 558 L 1310 562 L 1346 580 L 1390 608 L 1380 660 L 1330 626 L 1296 600 Z" fill="url(#faceDeep)" opacity="0.92" />
        <path d="M 1284 580 L 1278 660 L 1290 720" stroke="#0a141e" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 1140 620 L 1130 700" stroke="#0a141e" strokeWidth="1.4" fill="none" opacity="0.32" />
        <path d="M 1390 620 L 1410 700" stroke="#0a141e" strokeWidth="1.4" fill="none" opacity="0.32" />

        {/* ══════ 안개층 (살짝 펄스) ══════ */}
        <path className="gn-mist" d="M 0 660 Q 300 630 600 660 Q 900 690 1200 658 Q 1400 638 1600 666 L 1600 720 L 0 720 Z"
          fill="url(#mistG)" />

        {/* ══════ 경포대 (아주 작게, 중앙 작은 섬) ══════ */}
        <g className="gn-pavilion">
          {/* 작은 섬/바위 */}
          <ellipse cx="0" cy="80" rx="80" ry="10" fill="#0a141e" opacity="0.55" />
          <path d="M -65 80 L -60 60 L -30 50 L 0 48 L 30 50 L 60 60 L 65 80 Z" fill="#1d3144" opacity="0.85" />
          {/* 기단 */}
          <rect x="-50" y="36" width="100" height="14" fill="#234654" />
          <rect x="-50" y="36" width="100" height="2" fill="#5a8ba0" opacity="0.5" />
          {/* 기둥 */}
          <rect x="-42" y="0" width="5" height="38" fill="#2c5060" />
          <rect x="-14" y="0" width="5" height="38" fill="#2c5060" />
          <rect x="10" y="0" width="5" height="38" fill="#2c5060" />
          <rect x="38" y="0" width="5" height="38" fill="#2c5060" />
          {/* 처마 */}
          <path d="M -64 4 Q -50 -8 -40 -4 L 40 -4 Q 50 -8 64 4 L 56 8 Q 46 0 38 2 L -38 2 Q -46 0 -56 8 Z" fill="#356b82" />
          {/* 지붕 */}
          <path d="M -56 -2 L 0 -28 L 56 -2 Z" fill="#27536a" />
          <rect x="-30" y="-12" width="60" height="3" fill="#1a3744" />
          <polygon points="-2,-28 0,-36 2,-28" fill="#5a8ba0" />
        </g>

        {/* ══════ 침수·파괴 도시 (정적) ══════ */}
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
        })}

        {/* ══════ 서핑보드 4개 (떠다님) ══════ */}
        {/* 보드 1 */}
        <ellipse className="gn-board-shadow-1" cx="680" cy="784" rx="26" ry="2" fill="#0a141e" />
        <g className="gn-board-1">
          <ellipse cx="680" cy="780" rx="22" ry="4" fill="#1d3b4a" />
          <ellipse cx="680" cy="778" rx="22" ry="4" fill="#2c5060" />
          <ellipse cx="680" cy="778" rx="20" ry="3" fill="#3f6e7e" opacity="0.7" />
          <line x1="660" y1="778" x2="700" y2="778" stroke="#0a141e" strokeWidth="0.5" opacity="0.6" />
        </g>

        {/* 보드 2 */}
        <ellipse className="gn-board-shadow-2" cx="880" cy="808" rx="28" ry="2" fill="#0a141e" />
        <g className="gn-board-2">
          <ellipse cx="0" cy="2" rx="24" ry="5" fill="#1d3b4a" />
          <ellipse cx="0" cy="0" rx="24" ry="5" fill="#2c5060" />
          <ellipse cx="0" cy="0" rx="22" ry="3.5" fill="#5a8ba0" opacity="0.6" />
          <line x1="-22" y1="0" x2="22" y2="0" stroke="#0a141e" strokeWidth="0.5" opacity="0.6" />
        </g>

        {/* 보드 3 */}
        <ellipse className="gn-board-shadow-3" cx="540" cy="836" rx="22" ry="2" fill="#0a141e" />
        <g className="gn-board-3">
          <ellipse cx="0" cy="2" rx="18" ry="3.5" fill="#1d3b4a" />
          <ellipse cx="0" cy="0" rx="18" ry="3.5" fill="#27536a" />
          <line x1="-16" y1="0" x2="16" y2="0" stroke="#0a141e" strokeWidth="0.4" opacity="0.5" />
        </g>

        {/* 보드 4 */}
        <ellipse className="gn-board-shadow-4" cx="1020" cy="828" rx="24" ry="2" fill="#0a141e" />
        <g className="gn-board-4">
          <ellipse cx="0" cy="2" rx="20" ry="4" fill="#1d3b4a" />
          <ellipse cx="0" cy="0" rx="20" ry="4" fill="#356b82" />
          <ellipse cx="0" cy="0" rx="18" ry="3" fill="#5a8ba0" opacity="0.5" />
          <line x1="-18" y1="0" x2="18" y2="0" stroke="#0a141e" strokeWidth="0.4" opacity="0.55" />
        </g>
      </svg>
    </>
  )
}