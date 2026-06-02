import { useState, useEffect } from 'react'

type BuildingData = [number, number, number, number, number]

export default function Seoul() {

  const [isTall, setIsTall] = useState(false);

  useEffect(() => {
    const check = () => setIsTall(window.innerHeight / window.innerWidth > 0.9)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const buildingAlign = isTall ? 'xMidYMid meet' : 'xMidYMax meet'

  const farBuildings: BuildingData[] = [
    [0,640,52,260,0.3],[58,680,44,220,0.28],[108,660,60,240,0.3],[174,700,46,200,0.26],
    [226,650,66,250,0.3],[298,690,48,210,0.27],[352,670,58,230,0.29],[416,710,44,190,0.25],
    [466,680,62,220,0.28],[534,700,46,200,0.26],[586,660,56,240,0.29],[648,720,42,180,0.24],
    [910,720,42,180,0.24],[958,680,58,220,0.28],[1022,700,46,200,0.26],[1074,660,62,240,0.29],
    [1142,690,48,210,0.27],[1196,670,58,230,0.29],[1260,710,44,190,0.25],[1310,650,66,250,0.3],
    [1382,690,48,210,0.27],[1436,660,60,240,0.3],[1502,680,44,220,0.28],[1552,640,52,260,0.3],
  ]
  const nearBuildings: BuildingData[] = [
    [40,600,80,300,0.5],[140,650,66,250,0.46],[224,620,92,280,0.5],[330,680,72,220,0.44],
    [418,600,104,300,0.52],[540,700,76,200,0.42],[632,660,84,240,0.46],
    [884,660,84,240,0.46],[986,700,76,200,0.42],[1078,600,104,300,0.52],[1198,670,80,230,0.46],
    [1296,620,92,280,0.5],[1404,650,66,250,0.46],[1492,600,80,300,0.5],
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

  return (
    <>
      {/* ═══ 레이어 B: 타워 + 배경 빌딩 (meet — 비율 유지) ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={buildingAlign}>
        <defs>
          <linearGradient id="fargrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15273e"/><stop offset="100%" stopColor="#0c1828"/>
          </linearGradient>
          <linearGradient id="neargrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#244064"/><stop offset="100%" stopColor="#172c44"/>
          </linearGradient>
          <linearGradient id="tower" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2a4664"/>
            <stop offset="45%" stopColor="#3a5e84"/>
            <stop offset="55%" stopColor="#42688e"/>
            <stop offset="100%" stopColor="#243c5a"/>
          </linearGradient>
          <linearGradient id="towerV" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a7098"/><stop offset="100%" stopColor="#1c3046"/>
          </linearGradient>
        </defs>

        {/* 뒤쪽 먼 건물 */}
        {farBuildings.map((b,i)=>Building(b,i,'far','#0a1828'))}
        {/* 앞쪽 가까운 건물 */}
        {nearBuildings.map((b,i)=>Building(b,i,'near','#0e1e34'))}

        {/* ═══ 롯데월드타워 — 크기 축소(0.62) + 중앙 배치 ═══ */}
        <g transform="translate(800, 900) scale(0.62) translate(0, -900)">
          <path d="
            M -110 900
            L -96 480
            Q -78 300 -54 150
            Q -40 90 -22 56
            L 22 56
            Q 40 90 54 150
            Q 78 300 96 480
            L 110 900 Z"
            fill="url(#tower)"/>

          <path d="M 0 60 L 0 900" stroke="#5a82aa" strokeWidth="2.5" opacity="0.5"/>
          <path d="M -50 150 L -88 900" stroke="#1a2e44" strokeWidth="1.5" opacity="0.6"/>
          <path d="M 50 150 L 88 900" stroke="#1a2e44" strokeWidth="1.5" opacity="0.6"/>

          {Array.from({length:30},(_,i)=>{
            const y = 110 + i*26
            const t = (y - 56) / (900 - 56)
            const halfW = 22 + t * 88
            return (
              <line key={`fl-${i}`} x1={-halfW} y1={y} x2={halfW} y2={y}
                stroke="#1a3048" strokeWidth="0.8" opacity="0.5"/>
            )
          })}

          {Array.from({length:22},(_,i)=>{
            const y = 200 + i*30
            const t = (y - 56) / (900 - 56)
            const halfW = (22 + t * 88) * 0.7
            const lit = (i * 7 + 3) % 5 === 0
            return [-1,0,1].map(c=>(
              <rect key={`w-${i}-${c}`} x={c*halfW*0.6 - 3} y={y} width="6" height="9"
                fill="#5a86b0" opacity={lit ? 0.4 : 0.12}/>
            ))
          })}

          <path d="M -22 56 Q -14 20 0 0 Q 14 20 22 56 Z" fill="url(#towerV)"/>
          <path d="M 0 0 L 0 56" stroke="#6a92ba" strokeWidth="1.5" opacity="0.6"/>
          <circle cx="0" cy="2" r="3" fill="#8fb8dc" opacity="0.7"/>
          <circle cx="0" cy="2" r="6" fill="#8fb8dc" opacity="0.2"/>
        </g>
      </svg>
    </>
  )
}