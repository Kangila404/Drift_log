import { useState, useEffect } from 'react'

export default function Incheon() {
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

  // ── 다리 기하 ──
  const deckY = 680
  const deckH = 14
  const pylonTop = 240
  const pylonBaseY = 880
  const towers = [450, 1150]
  const legSpread = 50
  const neckY = deckY - 30
  const breakStart = 760, breakEnd = 880

  // 뒤편 도시 건물 한 그룹 [x, y, w, h, brokenTop, crackSide]
  type Bldg = [number, number, number, number, number, 'L' | 'R' | null]
  const bldgL: { x: number; bt: number }[] = [
    { x: 60, bt: 0.4 }, { x: 108, bt: 0 }, { x: 152, bt: 0.5 },
    { x: 200, bt: 0 }, { x: 244, bt: 0.35 }, { x: 290, bt: 0.2 },
  ]
  const bldgR: { x: number; bt: number }[] = [
    { x: 1310, bt: 0.15 }, { x: 1360, bt: 0.5 }, { x: 1408, bt: 0 },
    { x: 1456, bt: 0.4 }, { x: 1504, bt: 0.25 }, { x: 1552, bt: 0.45 },
  ]

  return (
    <>
      {/* ═══ 레이어 A: 수면 + 안개 + 달무리 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterIC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06101c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="haloIC" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#2f5a72" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#16344a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a1c2c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mistIC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="900" fill="url(#haloIC)" />
        <rect x="0" y="620" width="1600" height="100" fill="url(#mistIC)" opacity="0.55" />
        <rect x="0" y="720" width="1600" height="180" fill="url(#waterIC)" />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i}
            d={`M 0 ${762 + i * 22} Q 400 ${756 + i * 22} 800 ${762 + i * 22} T 1600 ${762 + i * 22}`}
            fill="none" stroke="#2a5060" strokeWidth="1.5" opacity={0.45 - i * 0.045} />
        ))}
      </svg>

      {/* ═══ 레이어 B: 뒤 도시 + 인천공항 + 인천대교 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={align}>

        {/* ══════ 뒤편 좌측 도시 (작게, 멀리) ══════ */}
        <g opacity="0.72">
          {bldgL.map(({ x, bt }, i) => {
            const w = 28, h = 26 + (i % 3) * 8
            const y = 648 - h
            const off = bt * 15
            let d: string
            if (bt === 0) {
              d = `M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Z`
            } else {
              const teeth = 3
              let p = `M ${x} ${y + h} L ${x} ${y + bt * 15}`
              for (let j = 0; j <= teeth; j++) {
                const tx = x + (w * j) / teeth
                const dd = ((i * 13 + j * 37) % 100) / 100
                const ty = y + bt * (5 + dd * 15)
                p += ` L ${tx} ${ty}`
              }
              p += ` L ${x + w} ${y + bt * 15} L ${x + w} ${y + h} Z`
              d = p
            }
            return (
              <g key={`bL-${i}`}>
                <path d={d} fill="#1d3b4a" />
                <rect x={x + w - 6} y={y + off} width="6" height={h - off} fill="#0e2129" />
                <rect x={x} y={y + off} width="1.5" height={h - off} fill="#2c5060" />
                {Array.from({ length: Math.floor(h / 14) }, (_, r) => (
                  <g key={r}>
                    <rect x={x + 4} y={y + 5 + r * 14} width="4" height="5" fill="#06121a" opacity="0.85" />
                    <rect x={x + 18} y={y + 5 + r * 14} width="4" height="5" fill="#06121a" opacity="0.85" />
                  </g>
                ))}
              </g>
            )
          })}
        </g>

        {/* ══════ 가운데 멀리 인천공항 (터미널 + 관제탑) ══════ */}
        <g transform="translate(800, 580)" opacity="0.78">
          {/* 침수 그림자 */}
          <rect x="-220" y="62" width="440" height="16" fill="#0a141e" opacity="0.65" />
          {/* 터미널 본체 */}
          <rect x="-210" y="44" width="420" height="30" fill="#1a3744" />
          <rect x="-210" y="44" width="3.5" height="30" fill="#3f6e7e" opacity="0.7" />
          <rect x="205" y="44" width="5" height="30" fill="#06121a" />
          <rect x="-210" y="44" width="420" height="1.8" fill="#5a8ba0" opacity="0.55" />
          {/* 터미널 옥상 깨진 톱니 (좌우) */}
          <polygon points="-180,44 -170,36 -160,44 -150,32 -140,44 -130,38 -120,44 -110,42 -100,44" fill="#15303e" />
          <polygon points="100,44 110,36 120,44 130,30 140,44 150,38 160,44 170,42 180,44" fill="#15303e" />
          {/* 창문 격자 (꺼짐) */}
          {Array.from({ length: 36 }, (_, i) => (
            <rect key={i} x={-200 + i * 12} y="54" width="4" height="7" fill="#06121a" opacity="0.8" />
          ))}
          {/* 측면 균열 */}
          <polyline points="-50,46 -48,58 -52,72" fill="none" stroke="#06121a" strokeWidth="1" opacity="0.8" />
          <polyline points="70,46 72,58 68,72" fill="none" stroke="#06121a" strokeWidth="1" opacity="0.8" />

          {/* 관제탑 기둥 */}
          <rect x="-4" y="-32" width="8" height="76" fill="#1a3744" />
          <rect x="-4" y="-32" width="2" height="76" fill="#3f6e7e" />
          <rect x="2" y="-32" width="2" height="76" fill="#06121a" />
          {/* 관제탑 꼭대기 박스 */}
          <rect x="-12" y="-44" width="24" height="16" fill="#1a3744" />
          <rect x="-12" y="-44" width="24" height="1.8" fill="#5a8ba0" opacity="0.6" />
          <rect x="-12" y="-42" width="24" height="11" fill="#06121a" opacity="0.6" />
          {/* 관제탑 지붕 */}
          <polygon points="-12,-44 0,-54 12,-44" fill="#2c5060" />
          <polygon points="-12,-44 0,-54 0,-44" fill="#3f6e7e" opacity="0.5" />
          {/* 안테나 */}
          <rect x="-0.6" y="-66" width="1.2" height="13" fill="#234654" />
          <circle cx="0" cy="-67" r="1.5" fill="#5a8ba0" opacity="0.8" />
          {/* 관제탑 균열 */}
          <line x1="0" y1="-10" x2="-2" y2="30" stroke="#06121a" strokeWidth="0.8" opacity="0.75" />
        </g>

        {/* ══════ 뒤편 우측 도시 ══════ */}
        <g opacity="0.72">
          {bldgR.map(({ x, bt }, i) => {
            const w = 28, h = 26 + (i % 3) * 9
            const y = 648 - h
            const off = bt * 15
            const teeth = 3
            let p = `M ${x} ${y + h} L ${x} ${y + bt * 15}`
            for (let j = 0; j <= teeth; j++) {
              const tx = x + (w * j) / teeth
              const dd = ((i * 13 + j * 37 + 7) % 100) / 100
              const ty = y + bt * (5 + dd * 15)
              p += ` L ${tx} ${ty}`
            }
            p += ` L ${x + w} ${y + bt * 15} L ${x + w} ${y + h} Z`
            return (
              <g key={`bR-${i}`}>
                <path d={p} fill="#1d3b4a" />
                <rect x={x + w - 6} y={y + off} width="6" height={h - off} fill="#0e2129" />
                <rect x={x} y={y + off} width="1.5" height={h - off} fill="#2c5060" />
                {Array.from({ length: Math.floor(h / 14) }, (_, r) => (
                  <g key={r}>
                    <rect x={x + 4} y={y + 5 + r * 14} width="4" height="5" fill="#06121a" opacity="0.85" />
                    <rect x={x + 18} y={y + 5 + r * 14} width="4" height="5" fill="#06121a" opacity="0.85" />
                  </g>
                ))}
              </g>
            )
          })}
        </g>

        {/* ══════ 인천대교 ══════ */}
        {/* 접속교 교각 (좌측) */}
        {[80, 200, 320].map((x, i) => (
          <g key={`pL-${i}`}>
            <rect x={x} y={deckY + deckH} width="16" height={900 - deckY - deckH} fill="#1a3744" />
            <rect x={x} y={deckY + deckH} width="2" height={900 - deckY - deckH} fill="#3f6e7e" opacity="0.55" />
            <rect x={x + 14} y={deckY + deckH} width="2" height={900 - deckY - deckH} fill="#06121a" />
            <rect x={x - 3} y={deckY + 80} width="22" height="4" fill="#234654" />
            <rect x={x - 3} y={deckY + 150} width="22" height="4" fill="#234654" />
          </g>
        ))}
        {/* 접속교 교각 (우측) */}
        {[1284, 1404, 1524].map((x, i) => (
          <g key={`pR-${i}`}>
            <rect x={x} y={deckY + deckH} width="16" height={900 - deckY - deckH} fill="#1a3744" />
            <rect x={x} y={deckY + deckH} width="2" height={900 - deckY - deckH} fill="#3f6e7e" opacity="0.55" />
            <rect x={x + 14} y={deckY + deckH} width="2" height={900 - deckY - deckH} fill="#06121a" />
            <rect x={x - 3} y={deckY + 80} width="22" height="4" fill="#234654" />
            <rect x={x - 3} y={deckY + 150} width="22" height="4" fill="#234654" />
          </g>
        ))}

        {/* 상판 (가운데 끊김) */}
        <rect x="0" y={deckY} width={breakStart} height={deckH} fill="#234654" />
        <rect x={breakEnd} y={deckY} width={1600 - breakEnd} height={deckH} fill="#234654" />
        <rect x="0" y={deckY - 2} width={breakStart} height="2" fill="#3f6e7e" opacity="0.6" />
        <rect x={breakEnd} y={deckY - 2} width={1600 - breakEnd} height="2" fill="#3f6e7e" opacity="0.6" />
        <rect x="0" y={deckY + 12} width={breakStart} height="2" fill="#06121a" />
        <rect x={breakEnd} y={deckY + 12} width={1600 - breakEnd} height="2" fill="#06121a" />
        {/* 끊긴 상판 가장자리 톱니 */}
        <polygon points={`${breakStart},${deckY} ${breakStart + 8},${deckY - 4} ${breakStart + 2},${deckY + 6} ${breakStart + 10},${deckY + 14} ${breakStart},${deckY + 14}`} fill="#234654" />
        <polygon points={`${breakEnd},${deckY} ${breakEnd - 8},${deckY - 4} ${breakEnd - 2},${deckY + 6} ${breakEnd - 10},${deckY + 14} ${breakEnd},${deckY + 14}`} fill="#234654" />
        {/* 끊긴 상판 잔해 */}
        <polygon points={`790,${deckY + 40} 820,${deckY + 36} 830,${deckY + 46} 800,${deckY + 48}`} fill="#1a3744" opacity="0.7" />
        <polygon points={`840,${deckY + 60} 862,${deckY + 56} 866,${deckY + 66} 844,${deckY + 68}`} fill="#15303e" opacity="0.6" />

        {/* 사장교 케이블 (부채꼴) */}
        {towers.map((tx, ti) => (
          <g key={`cIn-${ti}`}>
            {Array.from({ length: 11 }, (_, i) => {
              const dir = ti === 0 ? 1 : -1
              const dx = tx + dir * (28 + i * 30)
              if ((ti === 0 && dir === 1 && dx > breakStart - 10) ||
                  (ti === 1 && dir === -1 && dx < breakEnd + 10)) return null
              if (dx < 20 || dx > 1580) return null
              const seed = (i * 13 + ti * 7) % 9
              const broken = seed < 3
              const endY = broken ? deckY + (pylonTop - deckY) * 0.4 : deckY
              return (
                <line key={i} x1={tx} y1={pylonTop + 12} x2={dx} y2={endY}
                  stroke="#3f6e7e" strokeWidth="1.4" opacity="0.7" />
              )
            })}
          </g>
        ))}
        {towers.map((tx, ti) => (
          <g key={`cOut-${ti}`}>
            {Array.from({ length: 7 }, (_, i) => {
              const dir = ti === 0 ? -1 : 1
              const dx = tx + dir * (50 + i * 42)
              if (dx < 20 || dx > 1580) return null
              return (
                <line key={i} x1={tx} y1={pylonTop + 12} x2={dx} y2={deckY}
                  stroke="#3f6e7e" strokeWidth="1.4" opacity="0.7" />
              )
            })}
          </g>
        ))}
        {/* 케이블 미세 하이라이트 */}
        {towers.map((tx, ti) => (
          <line key={`ch-${ti}`} x1={tx} y1={pylonTop + 12}
            x2={tx + (ti === 0 ? -280 : 280)} y2={deckY}
            stroke="#7ec0d2" strokeWidth="0.5" opacity="0.4" />
        ))}

        {/* 주탑 2개 (다이아몬드 형태, 좌측 꼭대기 부서짐) */}
        {towers.map((tx, ti) => (
          <g key={`tw-${ti}`}>
            {/* 기단 */}
            <ellipse cx={tx} cy={pylonBaseY + 10} rx="58" ry="18" fill="#0a141e" opacity="0.7" />
            <ellipse cx={tx} cy={pylonBaseY + 4} rx="50" ry="14" fill="#15303e" />
            {/* 다리 (다이아몬드) */}
            <path d={`M ${tx - 7} ${neckY} L ${tx - legSpread} ${pylonBaseY} L ${tx - legSpread + 18} ${pylonBaseY} L ${tx - 2} ${neckY + 22} L ${tx + legSpread - 18} ${pylonBaseY} L ${tx + legSpread} ${pylonBaseY} L ${tx + 7} ${neckY} Z`}
              fill="#1a3744" />
            {/* 좌측 빛 띠 */}
            <path d={`M ${tx - 7} ${neckY} L ${tx - legSpread} ${pylonBaseY} L ${tx - legSpread + 4} ${pylonBaseY} L ${tx - 3} ${neckY + 2} Z`}
              fill="#3f6e7e" opacity="0.7" />
            {/* 우측 그늘 */}
            <path d={`M ${tx + 7} ${neckY} L ${tx + legSpread} ${pylonBaseY} L ${tx + legSpread - 4} ${pylonBaseY} L ${tx + 3} ${neckY + 2} Z`}
              fill="#06121a" />
            {/* 가로보 */}
            <rect x={tx - 34} y={deckY + 50} width="68" height="9" fill="#234654" />
            <rect x={tx - 34} y={deckY + 50} width="68" height="2" fill="#5a8ba0" opacity="0.45" />
            {/* 목 (다리→머리) */}
            <rect x={tx - 7} y={pylonTop + 20} width="14" height={neckY - pylonTop - 20} fill="#1a3744" />
            <rect x={tx - 7} y={pylonTop + 20} width="3" height={neckY - pylonTop - 20} fill="#3f6e7e" opacity="0.7" />
            <rect x={tx + 4} y={pylonTop + 20} width="3" height={neckY - pylonTop - 20} fill="#06121a" />
            {/* 꼭대기 — 좌측은 부서진 톱니, 우측은 깨끗 */}
            {ti === 0 ? (
              <polygon points={`${tx - 9},${pylonTop + 20} ${tx + 9},${pylonTop + 20} ${tx + 9},${pylonTop} ${tx + 4},${pylonTop + 6} ${tx - 2},${pylonTop} ${tx - 6},${pylonTop + 8} ${tx - 9},${pylonTop + 4}`}
                fill="#1a3744" />
            ) : (
              <>
                <rect x={tx - 9} y={pylonTop} width="18" height="20" fill="#1a3744" />
                <rect x={tx - 9} y={pylonTop} width="18" height="2" fill="#5a8ba0" opacity="0.55" />
              </>
            )}
            {/* 균열 (좌측 주탑) */}
            {ti === 0 && (
              <line x1={tx} y1={pylonTop + 30} x2={tx - 2} y2={deckY - 10}
                stroke="#06121a" strokeWidth="0.8" opacity="0.55" />
            )}
          </g>
        ))}
      </svg>
    </>
  )
}