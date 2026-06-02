import { useState, useEffect } from 'react'

type BuildingData = [number, number, number, number, number]

export default function Suwon() {
  const [isTall, setIsTall] = useState(false)
  useEffect(() => {
    const check = () => setIsTall(window.innerHeight / window.innerWidth > 0.9)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const farBuildings: BuildingData[] = [
    [0,600,52,300,0.3],[58,650,44,250,0.28],[108,620,60,280,0.3],[174,680,46,220,0.26],
    [226,610,66,290,0.3],[298,660,48,240,0.27],[352,630,58,270,0.29],[416,690,44,210,0.25],
    [466,640,62,260,0.28],[534,670,46,230,0.26],[586,620,56,280,0.29],[648,700,42,200,0.24],
    [910,700,42,200,0.24],[958,640,58,260,0.28],[1022,680,46,220,0.26],[1074,620,62,280,0.29],
    [1142,660,48,240,0.27],[1196,630,58,270,0.29],[1260,690,44,210,0.25],[1310,610,66,290,0.3],
    [1382,660,48,240,0.27],[1436,620,60,280,0.3],[1502,650,44,250,0.28],[1552,600,52,300,0.3],
  ]
  const nearBuildings: BuildingData[] = [
    [30,560,80,340,0.5],[130,620,66,280,0.46],[212,580,92,320,0.5],[320,660,72,240,0.44],
    [408,560,104,340,0.52],[528,680,76,220,0.42],[620,630,84,270,0.46],
    [900,630,84,270,0.46],[1000,680,76,220,0.42],[1092,560,104,340,0.52],[1212,640,80,260,0.46],
    [1308,580,92,320,0.5],[1416,620,66,280,0.46],[1500,560,80,340,0.5],
  ]

  const Building = (b: BuildingData, i: number, prefix: string, winFill: string) => {
    const [x, y, w, h, op] = b
    return (
      <g key={`${prefix}-${i}`}>
        <rect x={x} y={y} width={w} height={h} fill={`url(#${prefix}grad)`} opacity={op}/>
        {Array.from({length:Math.max(1,Math.floor(w/20))},(_,c)=>
          Array.from({length:Math.max(1,Math.floor(h/30))},(_,r)=>(
            <rect key={`${prefix}w-${i}-${c}-${r}`}
              x={x+8+c*20} y={y+14+r*30} width="8" height="11"
              fill={winFill} opacity={op*0.9}/>
          ))
        )}
      </g>
    )
  }

  const layerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }

  const buildingAlign = isTall ? 'xMidYMid meet' : 'xMidYMax meet'

  return (
    <>
      {/* ═══ 레이어 B: 건물 + 망루 (먼저 그려짐 = 뒤) ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={buildingAlign}>
        <defs>
          <linearGradient id="swB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#28364e"/><stop offset="100%" stopColor="#111924"/>
          </linearGradient>
          <linearGradient id="sb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e2c40"/><stop offset="100%" stopColor="#0d1522"/>
          </linearGradient>
          <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#223044"/><stop offset="100%" stopColor="#14203a"/>
          </linearGradient>
          <linearGradient id="fargrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15273e"/><stop offset="100%" stopColor="#0c1828"/>
          </linearGradient>
          <linearGradient id="neargrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#244064"/><stop offset="100%" stopColor="#172c44"/>
          </linearGradient>
        </defs>

        {farBuildings.map((b,i)=>Building(b,i,'far','#0a1828'))}
        {nearBuildings.map((b,i)=>Building(b,i,'near','#0e1e34'))}

        <g transform="translate(800, 770) scale(0.42)">
          {/* 행궁 전체 불투명 받침 */}
          <path d="
            M -398 300 L -398 -88 L -306 -156 L -222 -286 L -198 -336
            L 198 -336 L 222 -286 L 306 -156 L 398 -88 L 398 300 Z"
            fill="#0c1726"/>

          {/* 왼쪽 망루 */}
          <rect x="-380" y="-20" width="152" height="320" fill="url(#swB)"/>
          {Array.from({length:5},(_,i)=><rect key={`mfl-${i}`} x={-378+i*30} y="-36" width="20" height="18" rx="1" fill="#243452"/>)}
          {[-360,-320,-280].map(x=><rect key={x} x={x} y="10" width="18" height="28" rx="1" fill="#080f1c"/>)}
          <rect x="-398" y="-76" width="192" height="60" fill="url(#bd)"/>
          {[-382,-346,-308,-270,-230].map(x=><rect key={`mlp-${x}`} x={x} y="-76" width="10" height="60" fill="#16263c"/>)}
          {[-374,-334,-294].map(x=>(
            <g key={`mlw-${x}`}>
              <rect x={x} y="-68" width="28" height="34" rx="1" fill="#0a1624" stroke="#1e3250" strokeWidth="1"/>
              <line x1={x+14} y1="-68" x2={x+14} y2="-34" stroke="#132034" strokeWidth="0.8"/>
            </g>
          ))}
          <path d="M -424 -74 Q -396 -92 -362 -86 L -254 -86 Q -220 -92 -192 -74 L -206 -72 Q -236 -88 -252 -84 L -364 -84 Q -380 -88 -410 -72 Z" fill="#0d1c2e"/>
          <path d="M -416 -72 L -394 -84 L -206 -84 L -184 -72 Z" fill="#121e30"/>
          <rect x="-398" y="-88" width="196" height="6" rx="2" fill="#08121e"/>

          {/* 오른쪽 망루 */}
          <rect x="228" y="-20" width="152" height="320" fill="url(#swB)"/>
          {Array.from({length:5},(_,i)=><rect key={`mfr-${i}`} x={230+i*30} y="-36" width="20" height="18" rx="1" fill="#243452"/>)}
          {[244,284,324].map(x=><rect key={x} x={x} y="10" width="18" height="28" rx="1" fill="#080f1c"/>)}
          <rect x="206" y="-76" width="192" height="60" fill="url(#bd)"/>
          {[216,254,292,330,370].map(x=><rect key={`mrp-${x}`} x={x} y="-76" width="10" height="60" fill="#16263c"/>)}
          {[224,264,304].map(x=>(
            <g key={`mrw-${x}`}>
              <rect x={x} y="-68" width="28" height="34" rx="1" fill="#0a1624" stroke="#1e3250" strokeWidth="1"/>
              <line x1={x+14} y1="-68" x2={x+14} y2="-34" stroke="#132034" strokeWidth="0.8"/>
            </g>
          ))}
          <path d="M 192 -74 Q 220 -92 254 -86 L 362 -86 Q 396 -92 424 -74 L 410 -72 Q 380 -88 364 -84 L 252 -84 Q 236 -88 206 -72 Z" fill="#0d1c2e"/>
          <path d="M 200 -72 L 222 -84 L 410 -84 L 432 -72 Z" fill="#121e30"/>
          <rect x="206" y="-88" width="196" height="6" rx="2" fill="#08121e"/>

          {/* 중앙 누각 본체 */}
          <rect x="-360" y="0" width="720" height="300" fill="url(#sb)"/>
          {Array.from({length:24},(_,i)=><rect key={`fc-${i}`} x={-358+i*30} y="-16" width="20" height="18" rx="1" fill="#243452"/>)}
          {[-334,-252,-170,-90].map(x=><rect key={x} x={x} y="34" width="18" height="30" rx="2" fill="#080f1c"/>)}
          {[90,170,250,324].map(x=><rect key={x} x={x} y="34" width="18" height="30" rx="2" fill="#080f1c"/>)}

          <path d="M -132 300 L -132 110 Q 0 48 132 110 L 132 300 Z" fill="#030b16"/>
          <ellipse cx="0" cy="108" rx="134" ry="64" fill="#030b16"/>
          <path d="M -132 300 L -132 112 Q 0 48 132 112 L 132 300" fill="none" stroke="#263c56" strokeWidth="4"/>
          <path d="M -16 44 L 0 32 L 16 44 L 10 52 L -10 52 Z" fill="#2a3c56"/>
          <ellipse cx="0" cy="108" rx="110" ry="50" fill="#020910"/>

          <rect x="-300" y="-126" width="600" height="132" fill="url(#bd)"/>
          {[-282,-224,-166,-108,-50,8,66,124,182,264].map(x=><rect key={`p1-${x}`} x={x} y="-126" width="13" height="132" fill="#14223a"/>)}
          {[-272,-208,-144,-80,-16,48,112,172].map(x=>(
            <g key={`w1-${x}`}>
              <rect x={x} y="-114" width="50" height="70" rx="1" fill="#09162a" stroke="#1e3454" strokeWidth="1.2"/>
              <line x1={x+17} y1="-114" x2={x+17} y2="-44" stroke="#122038" strokeWidth="0.8"/>
              <line x1={x+33} y1="-114" x2={x+33} y2="-44" stroke="#122038" strokeWidth="0.8"/>
              <line x1={x} y1="-92" x2={x+50} y2="-92" stroke="#122038" strokeWidth="0.8"/>
            </g>
          ))}
          <rect x="-300" y="-126" width="600" height="14" fill="#263e60"/>
          {Array.from({length:22},(_,i)=><path key={`g1-${i}`} d={`M ${-296+i*27} -112 L ${-282+i*27} -126 L ${-269+i*27} -112 Z`} fill="#1c3256"/>)}
          <rect x="-300" y="-8" width="600" height="11" fill="#223658"/>

          <path d="M -376 -122 Q -304 -160 -222 -152 L 222 -152 Q 304 -160 376 -122 L 350 -118 Q 282 -156 220 -150 L -220 -150 Q -282 -156 -350 -118 Z" fill="#0c1a2c"/>
          <path d="M -360 -118 L -302 -150 L 302 -150 L 360 -118 Z" fill="#101e30"/>
          <path d="M -376 -122 Q -394 -130 -402 -120 Q -386 -112 -374 -120 Z" fill="#182a3e"/>
          <path d="M 376 -122 Q 394 -130 402 -120 Q 386 -112 374 -120 Z" fill="#182a3e"/>
          <rect x="-306" y="-156" width="612" height="8" rx="2" fill="#07101c"/>

          <rect x="-216" y="-256" width="432" height="116" fill="url(#bd)"/>
          {[-200,-146,-92,-38,16,70,124,178].map(x=><rect key={`p2-${x}`} x={x} y="-256" width="12" height="116" fill="#14223a"/>)}
          {[-192,-134,-76,-18,40,98].map(x=>(
            <g key={`w2-${x}`}>
              <rect x={x} y="-244" width="46" height="68" rx="1" fill="#09162a" stroke="#1e3454" strokeWidth="1.2"/>
              <line x1={x+15} y1="-244" x2={x+15} y2="-176" stroke="#122038" strokeWidth="0.8"/>
              <line x1={x+31} y1="-244" x2={x+31} y2="-176" stroke="#122038" strokeWidth="0.8"/>
            </g>
          ))}
          <rect x="-216" y="-256" width="432" height="13" fill="#263e60"/>
          {Array.from({length:16},(_,i)=><path key={`g2-${i}`} d={`M ${-212+i*27} -243 L ${-198+i*27} -256 L ${-185+i*27} -243 Z`} fill="#1c3256"/>)}
          <rect x="-216" y="-153" width="432" height="11" fill="#223658"/>

          <path d="M -284 -252 Q -220 -288 -146 -282 L 146 -282 Q 220 -288 284 -252 L 260 -248 Q 198 -284 148 -280 L -148 -280 Q -198 -284 -260 -248 Z" fill="#0c1a2c"/>
          <path d="M -270 -248 L -218 -280 L 218 -280 L 270 -248 Z" fill="#101e30"/>
          <path d="M -284 -252 Q -302 -260 -310 -250 Q -294 -242 -282 -250 Z" fill="#182a3e"/>
          <path d="M 284 -252 Q 302 -260 310 -250 Q 294 -242 282 -250 Z" fill="#182a3e"/>
          <rect x="-222" y="-286" width="444" height="8" rx="2" fill="#07101c"/>

          <path d="M -204 -284 Q -100 -324 0 -332 Q 100 -324 204 -284 L 192 -282 Q 94 -320 0 -328 Q -94 -320 -192 -282 Z" fill="#0c1a2c"/>
          <path d="M -192 -282 L 0 -328 L 192 -282 Z" fill="#101c2e"/>
          <rect x="-198" y="-336" width="396" height="8" rx="2" fill="#07101c"/>
          <path d="M -198 -332 Q -216 -344 -224 -334 Q -210 -326 -196 -334 Z" fill="#182a3e"/>
          <path d="M 198 -332 Q 216 -344 224 -334 Q 210 -326 196 -334 Z" fill="#182a3e"/>
        </g>
      </svg>

      {/* ═══ 레이어 A: 성벽 (나중에 그려짐 = 앞, 건물을 가림) ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#28364e"/><stop offset="100%" stopColor="#111924"/>
          </linearGradient>
        </defs>
        {/* 왼쪽 성벽 — 불투명 받침(총안 포함) + 성벽 */}
        <rect x="0" y="771" width="660" height="129" fill="#0a1422"/>
        <rect x="0" y="780" width="660" height="120" fill="url(#sw)"/>
        {Array.from({length:Math.ceil(660/30)},(_,i)=><rect key={`fl-${i}`} x={i*30} y="771" width="20" height="10" rx="1" fill="#243452"/>)}
        {Array.from({length:7},(_,i)=><rect key={`dl-${i}`} x={30+i*90} y="804" width="14" height="20" rx="1" fill="#080f1c"/>)}
        {/* 오른쪽 성벽 — 불투명 받침(총안 포함) + 성벽 */}
        <rect x="940" y="771" width="660" height="129" fill="#0a1422"/>
        <rect x="940" y="780" width="660" height="120" fill="url(#sw)"/>
        {Array.from({length:Math.ceil(660/30)},(_,i)=><rect key={`fr-${i}`} x={940+i*30} y="771" width="20" height="10" rx="1" fill="#243452"/>)}
        {Array.from({length:7},(_,i)=><rect key={`dr-${i}`} x={970+i*90} y="804" width="14" height="20" rx="1" fill="#080f1c"/>)}
      </svg>
    </>
  )
}