import { layerStyle, ALIGN, SkyLayer, Stars, Building, Reflect, C } from './_cityKit'

const ACC = '#bcd2ee'   // 강철 케이블 빛

export default function Incheon() {
  const deckY = 660
  const towers = [660, 940]
  const pylonTop = 286
  const baseY = 760
  const waterY = 720

  const Pylon = ({ tx }: { tx: number }) => (
    <g>
      <path d={`M ${tx - 6} ${deckY - 24} L ${tx - 42} ${baseY} L ${tx - 27} ${baseY} L ${tx - 2} ${deckY} L ${tx + 23} ${baseY} L ${tx + 42} ${baseY} L ${tx + 6} ${deckY - 24} Z`} fill={C.bldgBase} />
      <path d={`M ${tx - 6} ${deckY - 24} L ${tx - 42} ${baseY} L ${tx - 38} ${baseY} L ${tx - 3} ${deckY - 20} Z`} fill={C.edgeLight} opacity="0.55" />
      <rect x={tx - 28} y={deckY + 42} width="56" height="8" fill={C.stone} />
      <rect x={tx - 6} y={pylonTop + 12} width="12" height={deckY - 24 - pylonTop - 12} fill={C.bldgBase} />
      <rect x={tx - 6} y={pylonTop + 12} width="2.4" height={deckY - 24 - pylonTop - 12} fill={C.edgeLight} opacity="0.55" />
      <rect x={tx - 8} y={pylonTop} width="16" height="16" rx="3" fill={C.stone} />
    </g>
  )

  return (
    <>
      <SkyLayer idSuffix="IC" waterY={waterY} mistY={646} halo="#33476f" halo2="#1f2a4c" water="#16224a" accent={ACC} />

      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" style={layerStyle} preserveAspectRatio={ALIGN}>
        <defs>
          <linearGradient id="icCable" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACC} stopOpacity="0.6" />
            <stop offset="100%" stopColor={C.stoneLit} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <Stars seed={4} n={16} color={ACC} />

        {/* 뒤편 도시 (양옆 — 모바일선 잘림) */}
        <g opacity="0.62">
          {[60, 104, 150, 196, 244, 292].map((x, i) => (
            <Building key={`l${i}`} x={x} y={642 - (i % 3) * 12} w={30} h={30 + (i % 3) * 16} lit={i % 2 ? 2 : 0} roof={i % 2 ? 'antenna' : 'flat'} idx={i} glow={ACC} />
          ))}
          {[1310, 1356, 1402, 1448, 1496, 1544].map((x, i) => (
            <Building key={`r${i}`} x={x} y={642 - ((i + 1) % 3) * 12} w={30} h={30 + ((i + 1) % 3) * 16} lit={i % 2 ? 0 : 2} roof={i % 2 ? 'flat' : 'tank'} idx={i + 9} glow={ACC} />
          ))}
        </g>

        {/* 케이블 (부채꼴) */}
        {towers.map((tx, ti) => (
          <g key={`c${ti}`}>
            {Array.from({ length: 10 }, (_, i) => {
              const inner = tx + (ti === 0 ? 1 : -1) * (28 + i * 28)
              const outer = tx + (ti === 0 ? -1 : 1) * (40 + i * 40)
              return (
                <g key={i}>
                  {inner > 10 && inner < 1590 && <line x1={tx} y1={pylonTop + 16} x2={inner} y2={deckY} stroke="url(#icCable)" strokeWidth="1.3" opacity="0.72" />}
                  {i < 7 && outer > 10 && outer < 1590 && <line x1={tx} y1={pylonTop + 16} x2={outer} y2={deckY} stroke="url(#icCable)" strokeWidth="1.3" opacity="0.5" />}
                </g>
              )
            })}
          </g>
        ))}

        {/* 상판 */}
        <rect x="0" y={deckY} width="1600" height="12" fill={C.stone} />
        <rect x="0" y={deckY - 2} width="1600" height="2" fill={C.stoneLit} opacity="0.6" />
        <rect x="0" y={deckY + 10} width="1600" height="2" fill={C.edgeShade} />
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx={60 + i * 64} cy={deckY - 4} r="1.5" fill={ACC} opacity="0.5">
            <animate attributeName="opacity" values="0.25;0.6;0.25" dur={`${3 + (i % 4)}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* 교각 */}
        {[120, 320, 1280, 1480].map((x, i) => (
          <g key={`p${i}`}>
            <rect x={x} y={deckY + 12} width="14" height={baseY - deckY - 12} fill={C.bldgBase} />
            <rect x={x} y={deckY + 12} width="2" height={baseY - deckY - 12} fill={C.edgeLight} opacity="0.42" />
          </g>
        ))}

        {/* 수면 반사 */}
        <Reflect waterY={waterY} opacity={0.1}>
          {towers.map((tx) => <Pylon key={tx} tx={tx} />)}
        </Reflect>

        {/* 주탑 */}
        {towers.map((tx) => (
          <g key={`t${tx}`}>
            <ellipse cx={tx} cy={baseY + 4} rx="46" ry="11" fill={C.edgeShade} opacity="0.6" />
            <Pylon tx={tx} />
            <circle cx={tx} cy={pylonTop - 4} r="3" fill={ACC} opacity="0.85" />
            <circle cx={tx} cy={pylonTop - 4} r="8" fill={ACC} opacity="0.22" />
          </g>
        ))}
      </svg>
    </>
  )
}