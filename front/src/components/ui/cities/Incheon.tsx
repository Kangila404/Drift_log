import { Bridge, CityScene, Skyline, Reflect, C } from './_cityKit'

function Plane() {
  return (
    <g transform="translate(1230,252)" opacity="0.38">
      <path d="M 0 28 L 98 52 L 0 76 L 24 54 L -44 54 L -44 48 L 24 48 Z" fill={C.foam} />
      <path d="M 8 44 L -24 12 L 30 48 Z M 8 60 L -24 92 L 30 56 Z" fill={C.lit} opacity="0.55" />
    </g>
  )
}

export default function Incheon() {
  return (
    <CityScene id="incheon" tone="blue" waterY={724}>
      <Skyline id="incheon" y={688} from={60} to={420} count={8} accent={C.lit} />
      <Skyline id="incheon-r" y={688} from={1180} to={1540} count={8} accent={C.lit} />
      <Plane />
      <g opacity="0.48">
        {[210, 310].map((x) => (
          <g key={x}>
            <rect x={x} y="622" width="12" height="96" fill={C.harbor2} />
            <line x1={x + 6} y1="624" x2={x + 116} y2="592" stroke={C.lit} strokeWidth="4" />
            <rect x={x + 84} y="672" width="52" height="20" fill={C.harbor} />
          </g>
        ))}
      </g>
      <Reflect waterY={724} opacity={0.11}><Bridge id="incheon" x1={280} x2={1320} y={646} towerY={300} accent={C.lit} /></Reflect>
      <Bridge id="incheon" x1={280} x2={1320} y={646} towerY={300} accent={C.lit} />
    </CityScene>
  )
}
