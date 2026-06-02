import { useState, useEffect } from 'react'

export default function Pohang() {
  const [isTall, setIsTall] = useState(false)
  useEffect(() => {
    const check = () => setIsTall(window.innerHeight / window.innerWidth > 0.9)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const handAlign = isTall ? 'xMidYMid slice' : 'xMidYMax slice'

  const layerStyle: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%',
  }

  type Pt = [number, number]
  type Tri = { p: Pt[], c: string }

  const C = {
    d3: '#0d1f2b', d2: '#132c3a', d1: '#1a3a4b',
    m1: '#234c5e', m2: '#2c5c70', l1: '#3a7185', l2: '#4c8a9e', l3: '#62a3b6', hi: '#7bbccd',
  }

  // 손가락
  const finger = (bx: number, by: number, tx: number, ty: number, w: number, segs = 3): Tri[] => {
    const ang = Math.atan2(ty - by, tx - bx)
    const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2)
    const tris: Tri[] = []
    const node = (t: number, wf: number): { l: Pt, c: Pt, r: Pt } => {
      const x = bx + (tx - bx) * t, y = by + (ty - by) * t
      const hw = (w / 2) * wf
      return { l: [x + nx * hw, y + ny * hw], c: [x, y], r: [x - nx * hw, y - ny * hw] }
    }
    const wfs = [1, 0.92, 0.78, 0.6, 0.35]
    const ts: number[] = []
    for (let i = 0; i <= segs; i++) ts.push(i / segs)
    const nodes = ts.map((t, i) => node(t, wfs[Math.min(i, wfs.length - 1)]))
    const tip: Pt = [tx, ty]
    for (let i = 0; i < segs; i++) {
      const a = nodes[i], b = nodes[i + 1]
      tris.push({ p: [a.l, a.c, b.c], c: i % 2 ? C.l2 : C.l1 })
      tris.push({ p: [a.l, b.c, b.l], c: i % 2 ? C.l1 : C.l2 })
      tris.push({ p: [a.c, a.r, b.r], c: i % 2 ? C.d1 : C.m1 })
      tris.push({ p: [a.c, b.r, b.c], c: i % 2 ? C.m1 : C.d1 })
    }
    const top = nodes[segs]
    tris.push({ p: [top.l, top.c, tip], c: C.hi })
    tris.push({ p: [top.c, top.r, tip], c: C.m2 })
    return tris
  }

  const palm: Tri[] = [
    { p: [[-56, 30], [-48, -70], [-14, -50]], c: C.m2 },
    { p: [[-56, 30], [-14, -50], [-18, 30]], c: C.l1 },
    { p: [[-48, -70], [-10, -92], [-14, -50]], c: C.l1 },
    { p: [[-14, -50], [-10, -92], [16, -70]], c: C.l2 },
    { p: [[-14, -50], [16, -70], [6, -30]], c: C.m2 },
    { p: [[-18, 30], [-14, -50], [6, -30]], c: C.m1 },
    { p: [[-18, 30], [6, -30], [12, 30]], c: C.l1 },
    { p: [[16, -70], [-10, -92], [34, -88]], c: C.d1 },
    { p: [[16, -70], [34, -88], [52, -58]], c: C.m1 },
    { p: [[16, -70], [52, -58], [28, -34]], c: C.m2 },
    { p: [[6, -30], [16, -70], [28, -34]], c: C.l1 },
    { p: [[12, 30], [6, -30], [28, -34]], c: C.m1 },
    { p: [[12, 30], [28, -34], [42, 30]], c: C.l1 },
    { p: [[28, -34], [52, -58], [58, -30]], c: C.d1 },
    { p: [[28, -34], [58, -30], [42, 30]], c: C.m1 },
    { p: [[42, 30], [58, -30], [58, 30]], c: C.d2 },
    { p: [[42, 30], [58, 30], [54, -10]], c: C.d2 },
  ]
  const wrist: Tri[] = [
    { p: [[-44, 30], [-38, 150], [6, 150]], c: C.d2 },
    { p: [[-44, 30], [6, 150], [4, 30]], c: C.d1 },
    { p: [[4, 30], [6, 150], [50, 150]], c: C.d3 },
    { p: [[4, 30], [50, 150], [50, 30]], c: C.d2 },
    { p: [[-44, 30], [4, 30], [-20, 52]], c: C.d2 },
    { p: [[4, 30], [50, 30], [26, 52]], c: C.d3 },
  ]
  const fingers: Tri[] = [
    ...finger(-46, -66, -56, -204, 28, 3),
    ...finger(-20, -84, -26, -296, 34, 4),
    ...finger(4, -90, 5, -356, 38, 4),
    ...finger(30, -82, 42, -306, 34, 4),
    ...finger(50, -46, 108, -166, 32, 3),
  ]
  const allTris = [...wrist, ...palm, ...fingers]

  return (
    <>
      <style>{`
        @keyframes ph-buoy-1 { 0%,100% { transform: translate(540px,820px) rotate(0deg); } 50% { transform: translate(540px,818px) rotate(3deg); } }
        @keyframes ph-buoy-2 { 0%,100% { transform: translate(960px,810px) rotate(0deg); } 50% { transform: translate(961px,808px) rotate(-4deg); } }
        @keyframes ph-buoy-3 { 0%,100% { transform: translate(840px,832px) rotate(0deg); } 50% { transform: translate(840px,830px) rotate(5deg); } }
        @keyframes ph-log-1 { 0%,100% { transform: translate(440px,805px) rotate(-8deg); } 50% { transform: translate(442px,803px) rotate(-5deg); } }
        @keyframes ph-log-2 { 0%,100% { transform: translate(1080px,838px) rotate(-4deg); } 50% { transform: translate(1082px,836px) rotate(-1deg); } }
        @keyframes ph-plank-1 { 0%,100% { transform: translate(310px,830px) rotate(5deg); } 50% { transform: translate(311px,828px) rotate(8deg); } }
        @keyframes ph-plank-2 { 0%,100% { transform: translate(1450px,825px) rotate(15deg); } 50% { transform: translate(1451px,823px) rotate(18deg); } }
        @keyframes ph-bird-drift { 0% { transform: translateX(0); } 100% { transform: translateX(35px); } }
        @keyframes ph-mist-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 0.4; } }
        @keyframes ph-lighthouse-glow { 0%,100% { opacity: 0.6; } 50% { opacity: 0.85; } }

        .ph-buoy-1 { animation: ph-buoy-1 5s ease-in-out infinite; transform-box: fill-box; }
        .ph-buoy-2 { animation: ph-buoy-2 5.8s ease-in-out infinite; transform-box: fill-box; }
        .ph-buoy-3 { animation: ph-buoy-3 4.6s ease-in-out infinite; transform-box: fill-box; }
        .ph-log-1 { animation: ph-log-1 6.2s ease-in-out infinite; transform-box: fill-box; }
        .ph-log-2 { animation: ph-log-2 5.4s ease-in-out infinite; transform-box: fill-box; }
        .ph-plank-1 { animation: ph-plank-1 5.6s ease-in-out infinite; transform-box: fill-box; }
        .ph-plank-2 { animation: ph-plank-2 6.4s ease-in-out infinite; transform-box: fill-box; }
        .ph-birds { animation: ph-bird-drift 32s ease-in-out infinite alternate; }
        .ph-mist { animation: ph-mist-pulse 9s ease-in-out infinite; }
        .ph-lighthouse-glow { animation: ph-lighthouse-glow 4.2s ease-in-out infinite; }
      `}</style>

      {/* ═══ 레이어 A: 수면 + 안개 + 달무리 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06101c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="haloP" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#2f5a72" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#16344a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a1c2c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mistP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="900" fill="url(#haloP)" />
        <rect className="ph-mist" x="0" y="640" width="1600" height="120" fill="url(#mistP)" />
        <rect x="0" y="720" width="1600" height="180" fill="url(#waterP)" />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i}
            d={`M 0 ${762 + i * 22} Q 400 ${756 + i * 22} 800 ${762 + i * 22} T 1600 ${762 + i * 22}`}
            fill="none" stroke="#2a5060" strokeWidth="1.5" opacity={0.45 - i * 0.045} />
        ))}
      </svg>

      {/* ═══ 레이어 B: 손 + 항구 요소 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={handAlign}>

        {/* ══════ 갈매기 (떠다님) ══════ */}
        <g className="ph-birds">
          <path d="M 280 200 Q 286 195 292 200 Q 298 195 304 200" stroke="#3a7185" strokeWidth="1.3" fill="none" opacity="0.6" />
          <path d="M 340 180 Q 346 175 352 180 Q 358 175 364 180" stroke="#3a7185" strokeWidth="1.2" fill="none" opacity="0.55" />
          <path d="M 460 220 Q 465 216 470 220 Q 475 216 480 220" stroke="#3a7185" strokeWidth="1" fill="none" opacity="0.5" />
          <path d="M 1180 200 Q 1186 195 1192 200 Q 1198 195 1204 200" stroke="#3a7185" strokeWidth="1.2" fill="none" opacity="0.55" />
          <path d="M 1280 180 Q 1286 176 1292 180 Q 1298 176 1304 180" stroke="#3a7185" strokeWidth="1" fill="none" opacity="0.5" />
        </g>

        {/* ══════ 좌측 방파제 + 등대 ══════ */}
        {/* 방파제 본체 */}
        <rect x="40" y="720" width="380" height="22" fill="#1a3a4b" />
        <rect x="40" y="720" width="380" height="3" fill="#3a7185" opacity="0.65" />
        <rect x="40" y="739" width="380" height="3" fill="#0a1820" />
        {/* 끝 부서진 톱니 */}
        <polygon points="380,720 388,710 396,720 404,712 412,720 420,720 420,742 380,742" fill="#1a3a4b" />
        <polygon points="380,720 388,710 388,716 380,716" fill="#0d1f2b" />
        {/* 균열 */}
        <polyline points="120,720 124,732 118,742" stroke="#0a1820" strokeWidth="0.9" opacity="0.75" />
        <polyline points="240,720 244,734 240,742" stroke="#0a1820" strokeWidth="0.9" opacity="0.7" />
        <polyline points="340,720 344,734 348,742" stroke="#0a1820" strokeWidth="0.9" opacity="0.7" />

        {/* 테트라포드 */}
        <g transform="translate(60,752)">
          <polygon points="0,0 -10,-12 -16,0 -10,12" fill="#234c5e" />
          <polygon points="0,0 16,-10 10,12 -10,12" fill="#1a3a4b" />
          <polygon points="0,0 -10,-12 16,-10" fill="#3a7185" opacity="0.7" />
        </g>
        <g transform="translate(96,758)">
          <polygon points="0,0 -8,-10 -14,0 -8,10" fill="#1a3a4b" />
          <polygon points="0,0 14,-8 8,10 -8,10" fill="#132c3a" />
        </g>
        <g transform="translate(200,760)">
          <polygon points="0,0 -10,-11 -16,0 -10,11" fill="#234c5e" />
          <polygon points="0,0 16,-9 10,11 -10,11" fill="#1a3a4b" />
        </g>
        <g transform="translate(320,758)">
          <polygon points="0,0 -9,-10 -14,0 -9,10" fill="#1a3a4b" />
          <polygon points="0,0 14,-8 8,10 -8,10" fill="#132c3a" />
        </g>

        {/* 방파제 끝 등대 */}
        <g transform="translate(400,640)">
          <rect x="-14" y="76" width="28" height="6" fill="#234c5e" />
          <rect x="-10" y="20" width="20" height="60" fill="#1a3a4b" />
          <rect x="-10" y="20" width="3" height="60" fill="#3a7185" opacity="0.65" />
          <rect x="7" y="20" width="3" height="60" fill="#0a1820" />
          <rect x="-10" y="35" width="20" height="6" fill="#0d1f2b" />
          <rect x="-10" y="55" width="20" height="6" fill="#0d1f2b" />
          <rect x="-12" y="10" width="24" height="14" fill="#234c5e" />
          <rect x="-12" y="10" width="24" height="2" fill="#62a3b6" opacity="0.6" />
          <rect className="ph-lighthouse-glow" x="-10" y="13" width="20" height="9" fill="#7bbccd" />
          <polygon points="-13,10 0,2 13,10" fill="#2c5c70" />
          <rect x="-0.5" y="-4" width="1" height="8" fill="#234c5e" />
          <circle cx="0" cy="-6" r="2" fill="#7bbccd" />
          <circle cx="0" cy="-6" r="6" fill="#7bbccd" opacity="0.3" />
        </g>

        {/* ══════ 우측 침몰선 ══════ */}
        <g transform="translate(1280,720) rotate(-12)">
          {/* 선체 */}
          <path d="M -160 0 Q -150 30 -110 38 L 110 38 Q 150 30 160 0 L 130 -10 L -130 -10 Z" fill="#1a3a4b" />
          <path d="M -160 0 L -130 -10 L 130 -10 L 160 0 L 156 4 L -156 4 Z" fill="#3a7185" opacity="0.55" />
          <path d="M 130 -10 L 160 0 Q 150 30 110 38 L 110 -10 Z" fill="#0a1820" opacity="0.55" />
          {/* 갑판 */}
          <rect x="-130" y="-30" width="260" height="20" fill="#234c5e" />
          <rect x="-130" y="-30" width="260" height="2" fill="#4c8a9e" opacity="0.55" />
          {/* 부서진 갑판 톱니 */}
          <polygon points="-30,-30 -20,-44 -10,-30 0,-48 10,-30 20,-40 30,-30" fill="#1a3a4b" />
          {/* 선실 */}
          <rect x="-90" y="-70" width="50" height="40" fill="#1a3a4b" />
          <rect x="-90" y="-70" width="2" height="40" fill="#3a7185" opacity="0.6" />
          <rect x="-42" y="-70" width="3" height="40" fill="#0a1820" />
          {/* 선실 창문 */}
          <rect x="-84" y="-62" width="8" height="6" fill="#06121a" />
          <rect x="-72" y="-62" width="8" height="6" fill="#06121a" />
          <rect x="-60" y="-62" width="8" height="6" fill="#06121a" />
          <rect x="-84" y="-50" width="8" height="6" fill="#06121a" />
          <rect x="-72" y="-50" width="8" height="6" fill="#06121a" />
          <rect x="-60" y="-50" width="8" height="6" fill="#06121a" />
          {/* 선실 옥상 부서짐 */}
          <polygon points="-90,-70 -82,-78 -70,-70 -56,-80 -48,-70" fill="#0d1f2b" />
          {/* 마스트 (부러짐) */}
          <line x1="40" y1="-30" x2="35" y2="-90" stroke="#234c5e" strokeWidth="3" />
          <line x1="35" y1="-90" x2="20" y2="-110" stroke="#234c5e" strokeWidth="2.5" />
          <polygon points="20,-110 14,-108 18,-104 24,-106" fill="#1a3a4b" />
          {/* 굴뚝 */}
          <rect x="-10" y="-65" width="14" height="35" fill="#234c5e" transform="rotate(8 -3 -47)" />
          {/* 선체 균열 */}
          <polyline points="-40,-10 -38,5 -42,20" fill="none" stroke="#0a1820" strokeWidth="1.2" opacity="0.75" />
          <polyline points="60,-10 62,8 58,22" fill="none" stroke="#0a1820" strokeWidth="1.2" opacity="0.75" />
        </g>
        {/* 침몰선 주변 잔해 */}
        <polygon points="1110,790 1130,786 1138,794 1118,796" fill="#234c5e" opacity="0.6" />
        <polygon points="1180,820 1198,816 1204,824 1186,826" fill="#1a3a4b" opacity="0.5" />

        {/* ══════ 상생의 손 (로우폴리) ══════ */}
        <g transform="translate(800, 770)">
          {allTris.map((t, i) => (
            <polygon key={i}
              points={t.p.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={t.c} stroke={t.c} strokeWidth="0.6" />
          ))}
        </g>

        {/* ══════ 떠다니는 잔해 (애니메이션) ══════ */}
        {/* 부표 1 */}
        <g className="ph-buoy-1">
          <ellipse cx="0" cy="6" rx="11" ry="2" fill="#0a141e" opacity="0.4" />
          <circle cx="0" cy="0" r="9" fill="#1a3a4b" />
          <circle cx="0" cy="0" r="9" fill="none" stroke="#3a7185" strokeWidth="1" opacity="0.6" />
          <rect x="-1" y="-15" width="2" height="10" fill="#234c5e" />
          <polygon points="-3,-15 3,-15 0,-19" fill="#234c5e" />
        </g>
        {/* 통나무 1 */}
        <g className="ph-log-1">
          <ellipse cx="0" cy="6" rx="42" ry="3" fill="#0a141e" opacity="0.35" />
          <rect x="-40" y="-4" width="80" height="9" rx="4" fill="#1a3a4b" />
          <rect x="-40" y="-4" width="80" height="2" fill="#3a7185" opacity="0.5" />
          <line x1="-35" y1="0" x2="35" y2="0" stroke="#0a141e" strokeWidth="0.6" opacity="0.5" />
        </g>
        {/* 판자 1 */}
        <g className="ph-plank-1">
          <ellipse cx="0" cy="4" rx="22" ry="2" fill="#0a141e" opacity="0.35" />
          <rect x="-20" y="-3" width="40" height="6" fill="#234c5e" />
          <rect x="-20" y="-3" width="40" height="1" fill="#4c8a9e" opacity="0.55" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#0a141e" strokeWidth="0.5" opacity="0.6" />
        </g>
        {/* 부표 2 */}
        <g className="ph-buoy-2">
          <ellipse cx="0" cy="5" rx="9" ry="2" fill="#0a141e" opacity="0.4" />
          <circle cx="0" cy="0" r="7" fill="#234c5e" />
          <circle cx="0" cy="0" r="7" fill="none" stroke="#3a7185" strokeWidth="0.9" opacity="0.55" />
          <rect x="-1" y="-12" width="2" height="8" fill="#234c5e" />
        </g>
        {/* 통나무 2 */}
        <g className="ph-log-2">
          <ellipse cx="0" cy="5" rx="32" ry="2.5" fill="#0a141e" opacity="0.35" />
          <rect x="-30" y="-3.5" width="60" height="7" rx="3" fill="#1a3a4b" />
          <rect x="-30" y="-3.5" width="60" height="1.5" fill="#3a7185" opacity="0.5" />
        </g>
        {/* 판자 2 */}
        <g className="ph-plank-2">
          <ellipse cx="0" cy="4" rx="20" ry="2" fill="#0a141e" opacity="0.35" />
          <rect x="-18" y="-3" width="36" height="6" fill="#234c5e" />
          <rect x="-18" y="-3" width="36" height="1" fill="#4c8a9e" opacity="0.55" />
        </g>
        {/* 부표 3 */}
        <g className="ph-buoy-3">
          <ellipse cx="0" cy="4" rx="7" ry="1.6" fill="#0a141e" opacity="0.4" />
          <circle cx="0" cy="0" r="5.5" fill="#1a3a4b" />
          <circle cx="0" cy="0" r="5.5" fill="none" stroke="#3a7185" strokeWidth="0.8" opacity="0.55" />
        </g>
      </svg>
    </>
  )
}