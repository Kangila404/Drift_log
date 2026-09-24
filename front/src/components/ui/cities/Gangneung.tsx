import { CityScene, Reflect, C } from './_cityKit'

function Pavilion() {
  return (
    <g transform="translate(806,646) scale(1.22)">
      <ellipse cx="0" cy="88" rx="104" ry="13" fill={C.shadow} opacity="0.62" />
      <rect x="-78" y="34" width="156" height="46" fill={C.harbor2} />
      {[-60, -20, 20, 60].map((x) => <rect key={x} x={x - 5} y="0" width="10" height="82" fill={C.stone2} />)}
      <path d="M -110 -2 Q -72 -36 -30 -28 L 30 -28 Q 72 -36 110 -2 L 92 6 Q 56 -20 28 -18 L -28 -18 Q -56 -20 -92 6 Z" fill={C.stone2} />
      <path d="M -86 -20 L 0 -66 L 86 -20 Z" fill={C.harbor} />
      <line x1="0" y1="-66" x2="0" y2="-88" stroke={C.lit} strokeWidth="3" />
      <circle cx="0" cy="-90" r="5" fill={C.lit} />
    </g>
  )
}

function Reeds() {
  return (
    <g opacity="0.42">
      {[100, 130, 168, 1370, 1412, 1450].map((x, i) => (
        <g key={x}>
          <path d={`M ${x} 760 Q ${x + (i % 2 ? -14 : 12)} 710 ${x + (i % 2 ? -6 : 8)} 674`} fill="none" stroke={C.gold} strokeWidth="3" />
          <ellipse cx={x + (i % 2 ? -6 : 8)} cy="674" rx="6" ry="16" fill={C.gold} />
        </g>
      ))}
    </g>
  )
}

export default function Gangneung() {
  return (
    <CityScene id="gangneung" tone="blue" waterY={740}>
      <circle cx="1160" cy="390" r="56" fill={C.lit} opacity="0.11" />
      <path d="M 0 710 Q 220 620 420 548 Q 570 492 680 336 Q 800 498 960 628 Q 1080 706 1210 730 L 0 730 Z" fill="url(#gangneung-hill)" opacity="0.9" />
      <path d="M 680 336 Q 568 494 420 548 L 340 646 Q 540 554 680 380 Z" fill={C.glass2} opacity="0.48" />
      <path d="M 680 336 Q 800 498 960 628 L 856 588 Q 744 442 680 380 Z" fill={C.shadow} opacity="0.52" />
      <Reflect waterY={740} opacity={0.1}><Pavilion /></Reflect>
      <Pavilion />
      <Reeds />
    </CityScene>
  )
}
