import { CityScene, Reflect, C } from './_cityKit'

function DolHareubang({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x},696) scale(${s})`} opacity="0.78">
      <ellipse cx="0" cy="-72" rx="36" ry="44" fill={C.shadow} stroke={C.mint} strokeWidth="2" opacity="0.9" />
      <path d="M -48 -34 Q 0 -72 48 -34 L 62 80 L -62 80 Z" fill={C.shadow} stroke={C.mint} strokeWidth="2" opacity="0.9" />
      <circle cx="-13" cy="-80" r="5" fill={C.ink} />
      <circle cx="13" cy="-80" r="5" fill={C.ink} />
      <rect x="-6" y="-74" width="12" height="28" rx="5" fill={C.ink} />
      <ellipse cx="-30" cy="6" rx="18" ry="10" fill={C.harbor2} />
      <ellipse cx="30" cy="6" rx="18" ry="10" fill={C.harbor2} />
    </g>
  )
}

function Hallasan() {
  return (
    <g transform="translate(800,0)">
      <path d="M -760 736 L -590 620 L -410 514 L -230 432 L -90 402 L 0 396 L 90 402 L 230 432 L 410 514 L 590 620 L 760 736 Z" fill="url(#jeju-hill)" />
      <path d="M -230 432 L -90 402 L 0 396 L 90 402 L 230 432 L 150 490 L 0 518 L -150 490 Z" fill={C.green} opacity="0.82" />
      <ellipse cx="0" cy="465" rx="220" ry="56" fill={C.deep} opacity="0.64" />
      <ellipse cx="0" cy="456" rx="168" ry="36" fill={C.mint} opacity="0.32" />
      {[-420, -270, -120, 130, 300, 480].map((x, i) => <path key={x} d={`M ${x} ${540 + i * 10} L ${x - 90} 730`} stroke={C.shadow} strokeWidth="3" opacity="0.32" />)}
    </g>
  )
}

export default function Jeju() {
  return (
    <CityScene id="jeju" tone="green" waterY={744}>
      <Reflect waterY={744} opacity={0.08}><Hallasan /></Reflect>
      <Hallasan />
      <DolHareubang x={248} s={0.86} />
      <DolHareubang x={1360} s={0.72} />
    </CityScene>
  )
}
