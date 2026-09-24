import { CityScene, Skyline, Reflect, C } from './_cityKit'

function NamsanTower() {
  return (
    <g transform="translate(800,0)">
      <path d="M -520 675 Q -280 575 -84 618 Q 0 635 84 618 Q 280 575 520 675 L 520 740 L -520 740 Z" fill={C.deep} opacity="0.86" />
      <path d="M -86 710 L -52 338 L -30 220 L 30 220 L 52 338 L 86 710 Z" fill="url(#seoul-tower)" />
      <path d="M -38 238 L 0 132 L 38 238 Z" fill={C.glass2} />
      <line x1="0" y1="130" x2="0" y2="74" stroke={C.lit} strokeWidth="4" />
      <circle cx="0" cy="70" r="7" fill={C.lit} />
      <ellipse cx="0" cy="345" rx="104" ry="32" fill={C.stone2} />
      <ellipse cx="0" cy="330" rx="118" ry="34" fill={C.harbor2} />
      <path d="M -108 328 Q 0 294 108 328" fill="none" stroke={C.lit} strokeWidth="3" opacity="0.42" />
      {[-48, -24, 0, 24, 48].map((x) => <rect key={x} x={x - 4} y="355" width="8" height="310" fill={C.ink} opacity="0.35" />)}
      {Array.from({ length: 14 }, (_, i) => <line key={i} x1={-58 + i * 9} y1={414 + i * 18} x2={58 - i * 9} y2={414 + i * 18} stroke={C.lit} strokeWidth="1" opacity="0.18" />)}
    </g>
  )
}

export default function Seoul() {
  return (
    <CityScene id="seoul" tone="blue" waterY={724}>
      <Skyline id="seoul" y={688} from={80} to={1520} count={24} accent={C.lit} />
      <Reflect waterY={724} opacity={0.1}><NamsanTower /></Reflect>
      <NamsanTower />
      <g opacity="0.46">
        <path d="M 130 706 Q 390 648 650 706" fill="none" stroke={C.lit} strokeWidth="4" />
        <path d="M 950 706 Q 1210 650 1470 706" fill="none" stroke={C.lit} strokeWidth="4" />
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x={175 + i * 90} y="704" width="7" height="40" fill={C.harbor2} />)}
      </g>
    </CityScene>
  )
}
