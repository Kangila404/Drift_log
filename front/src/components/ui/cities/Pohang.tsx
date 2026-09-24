import { CityScene, Reflect, C } from './_cityKit'

function SunriseHand() {
  const fingers = [-56, -26, 4, 34, 62]
  return (
    <g transform="translate(800,730)">
      <circle cx="0" cy="-205" r="72" fill={C.gold} opacity="0.16" />
      <path d="M -82 60 Q -68 -42 -38 -92 Q -12 -132 28 -98 Q 62 -68 78 42 L 58 150 L -66 150 Z" fill="url(#pohang-tower)" />
      {fingers.map((x, i) => (
        <path key={x} d={`M ${x - 13} -70 Q ${x - 18} ${-178 - i * 14} ${x + (i - 2) * 12} ${-258 + Math.abs(i - 2) * 24} Q ${x + 20} ${-174 - i * 12} ${x + 12} -66 Z`} fill={i % 2 ? C.glass2 : C.stone2} />
      ))}
      <ellipse cx="-22" cy="-18" rx="24" ry="12" fill={C.harbor2} />
      <ellipse cx="32" cy="-14" rx="24" ry="12" fill={C.harbor2} />
    </g>
  )
}

function Steelworks() {
  return (
    <g opacity="0.52">
      <path d="M 1040 720 L 1040 670 L 1090 638 L 1140 670 L 1190 638 L 1240 670 L 1290 638 L 1340 670 L 1340 720 Z" fill={C.harbor} />
      {[1160, 1230, 1390].map((x, i) => (
        <g key={x}>
          <rect x={x} y={560 + i * 18} width="28" height={160 - i * 18} fill={C.harbor2} />
          <circle cx={x + 14} cy={552 + i * 18} r="5" fill={C.violet} opacity="0.65" />
        </g>
      ))}
      <path d="M 1050 690 C 1160 634 1280 740 1450 640" fill="none" stroke={C.violet} strokeWidth="4" opacity="0.3" />
    </g>
  )
}

export default function Pohang() {
  return (
    <CityScene id="pohang" tone="gold" waterY={724}>
      <Steelworks />
      <Reflect waterY={724} opacity={0.11}><SunriseHand /></Reflect>
      <SunriseHand />
      <g opacity="0.46">
        <rect x="90" y="700" width="320" height="18" fill={C.harbor2} />
        <rect x="360" y="626" width="28" height="88" fill={C.harbor2} />
        <polygon points="350,626 374,604 398,626" fill={C.stone2} />
        <circle cx="374" cy="598" r="7" fill={C.gold} />
      </g>
    </CityScene>
  )
}
