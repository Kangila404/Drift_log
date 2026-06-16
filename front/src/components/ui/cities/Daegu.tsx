import { layerStyle, ALIGN, SkyLayer, Stars, Building, Reflect, C } from './_cityKit'

const ACC = '#c3aee4'   // 이월드 라벤더 별빛

export default function Daegu() {
  const waterY = 720

  const Tower83 = ({ x }: { x: number }) => (
    <g transform={`translate(${x},0)`}>
      {/* 밑동 넓은 테이퍼 탑신 + 격자 */}
      <path d="M -26 720 L -12 420 L -8 360 L 8 360 L 12 420 L 26 720 Z" fill={C.bldgBase} />
      <path d="M -26 720 L -12 420 L -8 360 L 0 360 L -3 720 Z" fill={C.edgeLight} opacity="0.4" />
      <path d="M 26 720 L 12 420 L 8 360 L 4 360 L 8 720 Z" fill={C.edgeShade} opacity="0.9" />
      {[440, 500, 560, 620, 680].map((y) => {
        const t = (720 - y) / (720 - 360); const hw = 26 - t * 16
        return <line key={y} x1={-hw} y1={y} x2={hw} y2={y} stroke={C.stone} strokeWidth="3" opacity="0.7" />
      })}
      <path d="M -22 700 L 8 440 M 22 700 L -8 440" stroke={C.edgeShade} strokeWidth="1" opacity="0.4" fill="none" />
      {/* 전망 디스크 */}
      <ellipse cx="0" cy="360" rx="42" ry="11" fill={C.edgeShade} opacity="0.6" />
      <path d="M -40 358 L -32 330 L 32 330 L 40 358 Z" fill={C.bldgFace} />
      <rect x="-36" y="302" width="72" height="30" fill={C.stone} />
      <rect x="-36" y="302" width="3.5" height="30" fill={C.stoneLit} opacity="0.6" />
      <rect x="-32" y="308" width="64" height="17" fill={ACC} opacity="0.3" />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={-30 + i * 9} y="308" width="1.4" height="17" fill={C.bldgBase} />)}
      <path d="M -44 302 Q 0 280 44 302 L 36 308 Q 0 290 -36 308 Z" fill={C.stoneLit} />
      <path d="M -30 290 L 0 274 L 30 290 Z" fill={C.stone} />
      <polygon points="-2.5,276 0,222 2.5,276" fill={C.metal} />
      <circle cx="0" cy="218" r="2.6" fill={ACC} opacity="0.9" />
      <circle cx="0" cy="218" r="8" fill={ACC} opacity="0.26" />
    </g>
  )

  const Mountain = ({ px, bl, br, py, litLeft, op }: { px: number; bl: number; br: number; py: number; litLeft: boolean; op: number }) => (
    <g>
      <path d={`M ${bl} 720 L ${px - 60} ${py + 90} L ${px} ${py} L ${px + 80} ${py + 70} L ${br} 720 Z`} fill="url(#dgHillS)" opacity={op} />
      {litLeft
        ? <path d={`M ${px} ${py} L ${px - 60} ${py + 90} L ${bl + (px - 60 - bl) * 0.4} 720 L ${px - 20} ${py + 40} Z`} fill="url(#dgHillL)" opacity={op * 0.9} />
        : <path d={`M ${px} ${py} L ${px + 80} ${py + 70} L ${br - (br - px - 80) * 0.4} 720 L ${px + 20} ${py + 40} Z`} fill={C.faceLit} opacity={op * 0.7} />}
      <path d={`M ${px} ${py} L ${px - 60} ${py + 90}`} stroke={C.edgeLight} strokeWidth="1.4" fill="none" opacity="0.4" />
      <path d={`M ${px} ${py} L ${px + 80} ${py + 70}`} stroke={C.edgeShade} strokeWidth="1" fill="none" opacity="0.5" />
      <polygon points={`${px},${py} ${px - 8},${py + 14} ${px + 8},${py + 14}`} fill={ACC} opacity="0.4" />
    </g>
  )

  const City = () => {
    const blds: [number, number, number, number, number][] = [
      [450, 694, 30, 66, 1], [484, 672, 24, 88, 2], [512, 706, 34, 54, 0], [550, 686, 26, 74, 1],
      [580, 712, 40, 48, 0], [624, 664, 28, 96, 2], [656, 702, 22, 58, 0], [682, 690, 32, 70, 1],
      [740, 696, 30, 64, 1], [774, 710, 26, 50, 0], [806, 700, 34, 60, 2], [844, 684, 24, 76, 1],
      [872, 708, 30, 52, 0], [906, 690, 26, 70, 1], [936, 700, 38, 60, 2], [978, 710, 22, 50, 0],
      [1004, 680, 30, 80, 1], [1038, 704, 26, 56, 0], [1068, 692, 34, 68, 1], [1106, 708, 24, 52, 0],
    ]
    return <>{blds.map(([x, y, w, h, lit], i) => (
      <Building key={i} x={x} y={y} w={w} h={h} lit={lit} idx={i}
        roof={i % 5 === 0 ? 'antenna' : i % 5 === 2 ? 'tank' : 'flat'} glow={ACC} />
    ))}</>
  }

  return (
    <>
      <SkyLayer idSuffix="DG" waterY={waterY} mistY={624} halo="#3b3568" halo2="#221f46" water="#1c1f44" accent={ACC} accentY={0.32} />

      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" style={layerStyle} preserveAspectRatio={ALIGN}>
        <defs>
          <linearGradient id="dgFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.ridgeFar} /><stop offset="100%" stopColor={C.faceDeep} /></linearGradient>
          <linearGradient id="dgMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.ridgeMid} /><stop offset="100%" stopColor={C.faceDeep} /></linearGradient>
          <linearGradient id="dgHillL" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stopColor={C.faceLit} /><stop offset="100%" stopColor={C.faceShade} /></linearGradient>
          <linearGradient id="dgHillS" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stopColor={C.faceShade} /><stop offset="100%" stopColor={C.faceDeep} /></linearGradient>
        </defs>

        <Stars seed={5} n={20} color={ACC} />

        {/* 분지 너머 능선 */}
        <path d="M 0 400 Q 240 360 480 392 T 960 380 T 1600 394 L 1600 900 L 0 900 Z" fill="url(#dgFar)" opacity="0.55" />
        <path d="M 0 492 Q 280 456 560 486 T 1120 476 T 1600 492 L 1600 900 L 0 900 Z" fill="url(#dgMid)" opacity="0.7" />

        {/* 분지 산 (각진, 비대칭) */}
        <Mountain px={250} bl={-40} br={560} py={430} litLeft op={0.95} />
        <Mountain px={1360} bl={1060} br={1660} py={460} litLeft={false} op={0.95} />
        <Mountain px={120} bl={-120} br={360} py={510} litLeft op={0.7} />

        {/* 골 안개 */}
        <path d="M 0 640 Q 400 614 800 640 Q 1200 666 1600 640 L 1600 720 L 0 720 Z" fill={C.mist} opacity="0.16" />

        {/* 타워(뒤) + 반사 + 도시(앞, 밑동 감쌈) */}
        <Reflect waterY={waterY} opacity={0.1}><Tower83 x={800} /></Reflect>
        <Tower83 x={800} />
        <City />
      </svg>
    </>
  )
}