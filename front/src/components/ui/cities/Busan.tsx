import { useIsTall, layerStyle, SkyLayer, Stars, Building, C } from './_cityKit'

export default function Busan() {
  const isTall = useIsTall()
  const align = isTall ? 'xMidYMid meet' : 'xMidYMax meet'

  const deckY = 600
  const towerL = 540, towerR = 1020
  const topY = 400
  const baseY = 760

  // 현수교 메인 케이블 처짐 (포물선)
  const cableY = (x: number) => {
    const t = (x - towerL) / (towerR - towerL)
    return (topY + 10) + (520 - (topY + 10)) * 4 * t * (1 - t)
  }

  return (
    <>
      <SkyLayer idSuffix="BS" waterY={720} mistY={648} />

      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={align}>
        <Stars seed={9} n={18} />

        {/* 뒤 도시 스카이라인 (차분, 드문 불빛) */}
        {([
          [70, 540, 64, 220], [150, 580, 50, 180], [212, 520, 76, 240],
          [300, 566, 56, 194], [370, 540, 66, 220], [448, 580, 48, 180],
          [1100, 560, 56, 200], [1166, 530, 72, 230], [1248, 576, 50, 184],
          [1306, 548, 66, 212],
        ] as const).map(([x, y, w, h], i) => (
          <Building key={i} x={x} y={y} w={w} h={h} lit={i % 3 === 0 ? 3 : 1} idx={i} />
        ))}

        {/* ── 광안대교 (온전) ── */}
        {/* 상판 */}
        <rect x="0" y={deckY} width="1600" height="13" fill={C.stone} />
        <rect x="0" y={deckY - 2} width="1600" height="2" fill={C.stoneLit} opacity="0.6" />
        <rect x="0" y={deckY + 11} width="1600" height="2" fill={C.edgeShade} />
        {/* 상판 등불 */}
        {Array.from({ length: 22 }, (_, i) => (
          <circle key={i} cx={70 + i * 70} cy={deckY - 4} r="1.5" fill={C.cyan} opacity="0.5">
            <animate attributeName="opacity" values="0.25;0.6;0.25" dur={`${3 + (i % 3)}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* 교각 */}
        {[80, 220, 360, 1180, 1320, 1460].map((x, i) => (
          <g key={`p${i}`}>
            <rect x={x} y={deckY + 13} width="15" height={baseY - deckY - 13} fill={C.bldgBase} />
            <rect x={x} y={deckY + 13} width="2" height={baseY - deckY - 13} fill={C.edgeLight} opacity="0.45" />
            <rect x={x - 3} y={deckY + 80} width="21" height="4" fill={C.stone} />
          </g>
        ))}

        {/* 메인 케이블 (온전, 부드러운 처짐) */}
        {(() => {
          const seg: string[] = []
          for (let x = towerL; x <= towerR; x += 8) seg.push(`${x},${cableY(x)}`)
          return <polyline points={seg.join(' ')} fill="none" stroke={C.stoneLit} strokeWidth="2.4" opacity="0.7" />
        })()}
        <line x1={towerL} y1={topY + 10} x2={towerL - 220} y2={deckY} stroke={C.stoneLit} strokeWidth="2.2" opacity="0.65" />
        <line x1={towerR} y1={topY + 10} x2={towerR + 220} y2={deckY} stroke={C.stoneLit} strokeWidth="2.2" opacity="0.65" />
        {/* 수직 행어 */}
        {Array.from({ length: 31 }, (_, i) => {
          const x = towerL + (towerR - towerL) * (i / 30)
          return <line key={i} x1={x} y1={cableY(x)} x2={x} y2={deckY} stroke={C.edgeLight} strokeWidth="0.8" opacity="0.4" />
        })}

        {/* 주탑 2개 (온전) */}
        {[towerL, towerR].map((tx, i) => (
          <g key={`t${i}`}>
            <rect x={tx - 11} y={topY} width="22" height={deckY - topY + 22} fill={C.bldgBase} />
            <rect x={tx - 11} y={topY} width="4" height={deckY - topY + 22} fill={C.edgeLight} opacity="0.5" />
            <rect x={tx + 7} y={topY} width="4" height={deckY - topY + 22} fill={C.edgeShade} />
            <rect x={tx - 16} y={topY + 52} width="32" height="9" fill={C.stone} />
            <rect x={tx - 16} y={topY + 130} width="32" height="9" fill={C.stone} />
            <rect x={tx - 9} y={topY - 14} width="18" height="14" rx="2" fill={C.stone} />
            <circle cx={tx} cy={topY - 18} r="2.4" fill={C.cyan} opacity="0.85" />
            <circle cx={tx} cy={topY - 18} r="6" fill={C.cyan} opacity="0.22" />
          </g>
        ))}

        {/* ── 부산타워 (온전, 예쁘게) ── */}
        <g transform="translate(1380, 0)">
          <rect x="-12" y={topY} width="24" height={baseY - topY} fill={C.bldgBase} />
          <rect x="-12" y={topY} width="4" height={baseY - topY} fill={C.edgeLight} opacity="0.5" />
          <rect x="8" y={topY} width="4" height={baseY - topY} fill={C.edgeShade} />
          {[460, 540, 620, 700].map((y, i) => <rect key={i} x="-15" y={y} width="30" height="6" fill={C.stone} />)}
          {/* 전망대 */}
          <ellipse cx="0" cy={topY + 2} rx="48" ry="12" fill={C.edgeShade} opacity="0.6" />
          <path d={`M -46 ${topY} L -38 ${topY - 28} L 38 ${topY - 28} L 46 ${topY} Z`} fill={C.bldgFace} />
          <rect x="-42" y={topY - 56} width="84" height="30" fill={C.stone} />
          <rect x="-42" y={topY - 56} width="4" height="30" fill={C.stoneLit} opacity="0.6" />
          {/* 전망대 창 — 은은한 띠 */}
          <rect x="-38" y={topY - 50} width="76" height="18" fill={C.windowGlow} opacity="0.28" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={-36 + i * 10} y={topY - 50} width="1.5" height="18" fill={C.bldgBase} />
          ))}
          {/* 지붕 */}
          <path d={`M -52 ${topY - 56} Q 0 ${topY - 78} 52 ${topY - 56} L 44 ${topY - 50} Q 0 ${topY - 68} -44 ${topY - 50} Z`} fill={C.stoneLit} />
          <path d={`M -38 ${topY - 70} L 0 ${topY - 90} L 38 ${topY - 70} Z`} fill={C.stone} />
          {/* 첨탑 */}
          <polygon points={`-3,${topY - 88} 0,${topY - 116} 3,${topY - 88}`} fill={C.metal} />
          <circle cx="0" cy={topY - 120} r="3" fill={C.cyan} opacity="0.85" />
          <circle cx="0" cy={topY - 120} r="8" fill={C.cyan} opacity="0.25" />
        </g>
      </svg>
    </>
  )
}