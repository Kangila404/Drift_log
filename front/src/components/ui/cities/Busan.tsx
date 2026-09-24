import { Bridge, CityScene, Skyline, Reflect, C } from './_cityKit'

function HarborCranes() {
  return (
    <g opacity="0.5">
      {[150, 1240].map((x, i) => (
        <g key={x} transform={`translate(${x},0) scale(${i ? -1 : 1},1)`}>
          <rect x="0" y="610" width="13" height="112" fill={C.harbor2} />
          <line x1="6" y1="612" x2="132" y2="568" stroke={C.coral} strokeWidth="5" />
          <line x1="64" y1="590" x2="64" y2="676" stroke={C.coral} strokeWidth="2" />
          <rect x="42" y="674" width="46" height="22" fill={C.harbor} />
        </g>
      ))}
    </g>
  )
}

export default function Busan() {
  return (
    <CityScene id="busan" tone="coral" waterY={724}>
      <Skyline id="busan" y={674} from={70} to={1530} count={18} accent={C.coral} />
      <HarborCranes />
      <Reflect waterY={724} opacity={0.1}><Bridge id="busan" y={620} towerY={350} accent={C.coral} /></Reflect>
      <Bridge id="busan" y={620} towerY={350} accent={C.coral} />
      <g transform="translate(1365,0)">
        <rect x="-18" y="464" width="36" height="238" fill={C.harbor2} />
        <ellipse cx="0" cy="440" rx="72" ry="18" fill={C.stone2} />
        <rect x="-54" y="402" width="108" height="40" fill={C.harbor} />
        <path d="M -64 402 Q 0 368 64 402 Z" fill={C.stone2} />
        <line x1="0" y1="370" x2="0" y2="326" stroke={C.coral} strokeWidth="3" />
        <circle cx="0" cy="322" r="6" fill={C.coral} />
      </g>
    </CityScene>
  )
}
