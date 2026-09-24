import { CityScene, C } from './_cityKit'

function Mudeungsan() {
  const columns = Array.from({ length: 14 }, (_, i) => ({ x: 604 + i * 16, h: 62 + (i % 5) * 14 }))
  return (
    <g>
      <path d="M 0 726 L 96 660 L 190 604 L 302 544 L 432 492 L 552 462 L 684 448 L 812 464 L 938 506 L 1084 584 L 1260 664 L 1600 730 Z" fill="url(#gwangju-hill)" opacity="0.82" />
      <path d="M 552 462 L 432 492 L 302 544 L 250 620 L 420 570 Z" fill={C.glass2} opacity="0.38" />
      <path d="M 812 464 L 938 506 L 1084 584 L 1010 628 L 890 556 Z" fill={C.shadow} opacity="0.42" />
      <g opacity="0.62">
        {columns.map((c) => <rect key={c.x} x={c.x} y={462 - c.h} width="11" height={c.h} rx="2" fill={C.stone2} />)}
      </g>
    </g>
  )
}

function CultureSquare() {
  return (
    <g transform="translate(800,678)">
      <rect x="-330" y="42" width="660" height="24" fill={C.stone} />
      <rect x="-270" y="12" width="540" height="34" fill={C.harbor2} />
      <rect x="-190" y="-26" width="380" height="40" fill={C.harbor} />
      <rect x="-72" y="-58" width="144" height="74" fill={C.ink} />
      <path d="M -190 -26 L -72 -58 L 72 -58 L 190 -26 Z" fill={C.glass2} opacity="0.34" />
      <path d="M -330 66 L 330 66 L 390 100 L -390 100 Z" fill={C.shadow} />
    </g>
  )
}

export default function Gwangju() {
  return (
    <CityScene id="gwangju" tone="green" waterY={760}>
      <Mudeungsan />
      <CultureSquare />
    </CityScene>
  )
}
