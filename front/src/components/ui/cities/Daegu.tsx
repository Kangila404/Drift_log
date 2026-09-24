import { CityScene, Skyline, Reflect, C } from './_cityKit'

function Tower83() {
  return (
    <g transform="translate(800,0)">
      <path d="M -42 724 L -18 404 L -9 326 L 9 326 L 18 404 L 42 724 Z" fill="url(#daegu-tower)" />
      <path d="M -54 328 L -38 292 L 38 292 L 54 328 Z" fill={C.harbor2} />
      <rect x="-46" y="258" width="92" height="36" fill={C.stone} />
      <rect x="-38" y="266" width="76" height="18" fill={C.violet} opacity="0.38" />
      <path d="M -58 258 Q 0 224 58 258 Z" fill={C.stone2} />
      <line x1="0" y1="224" x2="0" y2="168" stroke={C.violet} strokeWidth="3" />
      <circle cx="0" cy="164" r="7" fill={C.violet} />
    </g>
  )
}

function Wheel() {
  const spokes = Array.from({ length: 12 }, (_, i) => (Math.PI * 2 * i) / 12)
  return (
    <g transform="translate(578,670)" opacity="0.64">
      <circle cx="0" cy="0" r="66" fill="none" stroke={C.violet} strokeWidth="4" />
      <circle cx="0" cy="0" r="8" fill={C.violet} />
      {spokes.map((a) => <line key={a} x1="0" y1="0" x2={Math.cos(a) * 66} y2={Math.sin(a) * 66} stroke={C.violet} strokeWidth="1.5" />)}
      <path d="M -44 92 L 0 0 L 44 92" fill="none" stroke={C.stone2} strokeWidth="5" />
    </g>
  )
}

export default function Daegu() {
  return (
    <CityScene id="daegu" tone="violet" waterY={732}>
      <path d="M 0 640 Q 240 524 420 574 Q 580 620 760 560 Q 1000 480 1220 580 Q 1390 650 1600 622 L 1600 760 L 0 760 Z" fill="url(#daegu-hill)" opacity="0.66" />
      <Skyline id="daegu" y={708} from={420} to={1180} count={16} accent={C.violet} />
      <Reflect waterY={732} opacity={0.09}><Tower83 /></Reflect>
      <Tower83 />
      <Wheel />
    </CityScene>
  )
}
