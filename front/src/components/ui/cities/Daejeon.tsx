import { CityScene, Reflect, C } from './_cityKit'

function HanbitTower() {
  return (
    <g transform="translate(800,0)">
      <ellipse cx="0" cy="505" rx="280" ry="62" fill="none" stroke={C.lit} strokeWidth="3" opacity="0.2" />
      <ellipse cx="0" cy="505" rx="280" ry="62" fill="none" stroke={C.lit} strokeWidth="2" opacity="0.2" transform="rotate(18 0 505)" />
      <ellipse cx="0" cy="505" rx="280" ry="62" fill="none" stroke={C.lit} strokeWidth="2" opacity="0.18" transform="rotate(-18 0 505)" />
      {[[-226, 470], [248, 538], [62, 438]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill={C.coral} opacity="0.72" />)}
      <path d="M -88 724 L -54 530 Q -44 486 0 482 Q 44 486 54 530 L 88 724 Z" fill="url(#daejeon-tower)" />
      <ellipse cx="0" cy="502" rx="168" ry="44" fill={C.stone2} />
      <ellipse cx="0" cy="486" rx="184" ry="46" fill={C.harbor2} />
      <ellipse cx="0" cy="480" rx="120" ry="25" fill={C.deep} />
      <path d="M -42 488 Q -32 338 0 204 Q 32 338 42 488 Z" fill={C.glass2} />
      <line x1="0" y1="204" x2="0" y2="146" stroke={C.lit} strokeWidth="3" />
      <circle cx="0" cy="146" r="10" fill={C.lit} opacity="0.9" />
    </g>
  )
}

export default function Daejeon() {
  return (
    <CityScene id="daejeon" tone="coral" waterY={748}>
      <Reflect waterY={748} opacity={0.09}><HanbitTower /></Reflect>
      <HanbitTower />
    </CityScene>
  )
}
