import { CityScene, MoonGate, Reflect, C } from './_cityKit'

function FortressWall() {
  return (
    <g>
      <path d="M 0 752 Q 240 704 520 740 Q 800 772 1080 738 Q 1360 704 1600 752 L 1600 900 L 0 900 Z" fill={C.shadow} />
      {Array.from({ length: 38 }, (_, i) => <rect key={i} x={i * 44} y={724 + (i % 5) * 4} width="24" height="18" fill={C.stone2} />)}
      <MoonGate x={800} y={612} scale={1.18} accent={C.gold} />
      {[270, 1330].map((x) => (
        <g key={x} transform={`translate(${x},646)`}>
          <rect x="-54" y="24" width="108" height="90" fill={C.harbor2} />
          <path d="M -72 24 Q 0 -26 72 24 L 56 30 Q 0 0 -56 30 Z" fill={C.stone2} />
          <rect x="-46" y="46" width="28" height="36" fill={C.ink} />
          <rect x="18" y="46" width="28" height="36" fill={C.ink} />
        </g>
      ))}
    </g>
  )
}

export default function Suwon() {
  return (
    <CityScene id="suwon" tone="gold" waterY={760}>
      <Reflect waterY={760} opacity={0.08}><FortressWall /></Reflect>
      <FortressWall />
    </CityScene>
  )
}
