import { layerStyle, ALIGN, SkyLayer, Stars, Building, C } from './_cityKit'

const ACC = '#9cc4e8'   // 새벽 바다 빛

export default function Gangneung() {
  const waterY = 720
  return (
    <>
      <style>{`
        @keyframes gn-bird { 0% { transform: translateX(0);} 100% { transform: translateX(34px);} }
        @keyframes gn-pav { 0%,100%{ transform: translate(812px,646px) scale(0.44);} 50%{ transform: translate(812px,648px) scale(0.44);} }
        .gn-birds{ animation: gn-bird 30s ease-in-out infinite alternate;}
        .gn-pav{ animation: gn-pav 6s ease-in-out infinite;}
      `}</style>

      <SkyLayer idSuffix="GN" waterY={waterY} mistY={646} halo="#2c3e6e" halo2="#1b2748" water="#142146" accent={ACC} accentY={0.3} />

      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" style={layerStyle} preserveAspectRatio={ALIGN}>
        <defs>
          <linearGradient id="gnFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.ridgeFar} /><stop offset="100%" stopColor={C.faceDeep} /></linearGradient>
          <linearGradient id="gnMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.ridgeMid} /><stop offset="100%" stopColor={C.faceDeep} /></linearGradient>
          <linearGradient id="gnLit" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stopColor={C.faceLit} /><stop offset="100%" stopColor={C.faceShade} /></linearGradient>
          <linearGradient id="gnShade" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stopColor={C.faceShade} /><stop offset="100%" stopColor={C.faceDeep} /></linearGradient>
        </defs>

        <Stars seed={3} n={18} color={ACC} />

        <g className="gn-birds" opacity="0.5">
          <path d="M 360 200 Q 366 195 372 200 Q 378 195 384 200" stroke={C.edgeLight} strokeWidth="1.2" fill="none" />
          <path d="M 402 216 Q 407 212 412 216 Q 417 212 422 216" stroke={C.edgeLight} strokeWidth="1" fill="none" />
          <path d="M 332 240 Q 337 236 342 240 Q 347 236 352 240" stroke={C.edgeLight} strokeWidth="0.9" fill="none" />
        </g>

        {/* 능선 */}
        <path d="M 0 420 Q 200 380 400 408 T 800 396 T 1200 410 T 1600 392 L 1600 900 L 0 900 Z" fill="url(#gnFar)" opacity="0.6" />
        <path d="M 0 510 Q 240 470 480 500 T 960 488 T 1600 502 L 1600 900 L 0 900 Z" fill="url(#gnMid)" opacity="0.72" />

        {/* 메인 봉우리 (중앙) — 면 분할 */}
        <path d="M 60 720 Q 240 630 380 540 Q 520 450 640 320 Q 700 380 760 470 Q 880 600 1000 670 Q 1090 712 1180 720 Z" fill="url(#gnShade)" />
        <path d="M 640 320 Q 520 450 380 540 Q 320 582 290 632 L 430 580 Q 540 470 640 360 Z" fill="url(#gnLit)" />
        <path d="M 380 540 L 290 632 L 240 686 L 360 636 L 440 560 Z" fill="url(#gnLit)" opacity="0.82" />
        <path d="M 640 320 Q 700 380 760 470 Q 820 560 880 612 L 800 566 Q 700 440 640 360 Z" fill="url(#gnShade)" opacity="0.95" />
        <path d="M 760 470 Q 880 600 1000 670 L 920 632 Q 820 540 760 470 Z" fill={C.faceDeep} />
        <path d="M 640 320 L 540 470" stroke={C.edgeLight} strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 640 320 L 760 470" stroke={C.edgeShade} strokeWidth="1" fill="none" opacity="0.5" />
        {/* 능선 균열 음영 */}
        <path d="M 560 400 L 540 520 L 530 640 L 524 720" stroke={C.edgeShade} strokeWidth="1.6" fill="none" opacity="0.32" />
        <path d="M 700 420 L 716 540 L 708 660 L 716 720" stroke={C.edgeShade} strokeWidth="1.3" fill="none" opacity="0.28" />
        <polygon points="640,320 632,334 640,342 648,334" fill={ACC} opacity="0.55" />

        {/* 우측 보조 봉우리 */}
        <path d="M 1000 720 Q 1110 650 1210 600 Q 1310 552 1370 560 Q 1450 580 1530 660 Q 1580 698 1600 720 Z" fill="url(#gnShade)" opacity="0.9" />
        <path d="M 1370 560 Q 1310 552 1210 600 L 1270 588 Q 1330 566 1370 580 Z" fill="url(#gnLit)" opacity="0.65" />

        {/* 안개 */}
        <path d="M 0 660 Q 400 632 800 660 Q 1200 688 1600 660 L 1600 720 L 0 720 Z" fill={C.mist} opacity="0.18" />

        {/* 침수 도시 (좌측 곁가지 — 모바일선 잘림) */}
        {([[150, 666, 46, 94], [206, 650, 54, 110], [270, 670, 40, 90], [1230, 668, 44, 92], [1290, 652, 52, 108]] as const).map(([x, y, w, h], i) => (
          <Building key={i} x={x} y={y} w={w} h={h} lit={i % 2 ? 2 : 1} roof={i % 2 ? 'antenna' : 'flat'} idx={i + 5} glow={ACC} />
        ))}

        {/* 경포대 정자 (중앙 작은 섬) */}
        <g className="gn-pav">
          <ellipse cx="0" cy="80" rx="78" ry="9" fill={C.edgeShade} opacity="0.55" />
          <path d="M -62 80 L -56 60 L -28 50 L 0 48 L 28 50 L 56 60 L 62 80 Z" fill={C.faceShade} opacity="0.9" />
          <rect x="-48" y="36" width="96" height="14" fill={C.stone} />
          <rect x="-48" y="36" width="96" height="2" fill={C.stoneLit} opacity="0.5" />
          {[-40, -14, 12, 38].map((x, i) => <rect key={i} x={x} y="0" width="5" height="38" fill={C.bldgFace} />)}
          <rect x="-44" y="14" width="88" height="20" fill={ACC} opacity="0.1" />
          <path d="M -64 4 Q -50 -8 -40 -4 L 40 -4 Q 50 -8 64 4 L 56 8 Q 46 0 38 2 L -38 2 Q -46 0 -56 8 Z" fill={C.stoneLit} />
          <path d="M -56 -2 L 0 -28 L 56 -2 Z" fill={C.stone} />
          <polygon points="-2,-28 0,-37 2,-28" fill={ACC} opacity="0.7" />
        </g>
      </svg>
    </>
  )
}