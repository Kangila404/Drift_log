import { useState, useEffect } from 'react'

export default function Jeju() {
  const [isTall, setIsTall] = useState(false)
  useEffect(() => {
    const check = () => setIsTall(window.innerHeight / window.innerWidth > 0.9)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const align = isTall ? 'xMidYMid meet' : 'xMidYMax meet'

  const layerStyle: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%',
  }

  type Pt = [number, number]
  type Tri = { p: Pt[]; c: string }

  const G = {
    g1: '#2e5a3a', g2: '#356b42', g3: '#3e7d4c', g4: '#4a9159', g5: '#5dad6a',
    t1: '#2a5650', t2: '#26504e', t3: '#214a4c', t4: '#1d4244',
    d1: '#1a3a44', d2: '#15303a', d3: '#102730', d4: '#0a1c24',
  }

  const slopeL: Tri[] = [
    { p: [[-340, 380], [-260, 400], [-220, 460]], c: G.g3 },
    { p: [[-340, 380], [-220, 460], [-280, 470]], c: G.g2 },
    { p: [[-340, 380], [-280, 470], [-380, 460]], c: G.g2 },
    { p: [[-380, 460], [-280, 470], [-300, 540]], c: G.g1 },
    { p: [[-280, 470], [-220, 460], [-240, 540]], c: G.t1 },
    { p: [[-220, 460], [-160, 500], [-240, 540]], c: G.t1 },
    { p: [[-380, 460], [-300, 540], [-460, 540]], c: G.t1 },
    { p: [[-300, 540], [-240, 540], [-340, 610]], c: G.t2 },
    { p: [[-240, 540], [-160, 500], [-200, 610]], c: G.t2 },
    { p: [[-240, 540], [-200, 610], [-340, 610]], c: G.t2 },
    { p: [[-460, 540], [-300, 540], [-420, 640]], c: G.t2 },
    { p: [[-300, 540], [-340, 610], [-420, 640]], c: G.t3 },
    { p: [[-340, 610], [-200, 610], [-280, 720]], c: G.t3 },
    { p: [[-200, 610], [-160, 500], [-120, 640]], c: G.t2 },
    { p: [[-200, 610], [-120, 640], [-180, 720]], c: G.t3 },
    { p: [[-200, 610], [-280, 720], [-180, 720]], c: G.t4 },
    { p: [[-460, 540], [-420, 640], [-540, 660]], c: G.d1 },
    { p: [[-540, 660], [-420, 640], [-500, 740]], c: G.d2 },
    { p: [[-420, 640], [-280, 720], [-500, 740]], c: G.d2 },
    { p: [[-540, 660], [-500, 740], [-620, 720]], c: G.d2 },
    { p: [[-620, 720], [-500, 740], [-580, 800]], c: G.d3 },
    { p: [[-500, 740], [-280, 720], [-380, 800]], c: G.d3 },
    { p: [[-500, 740], [-380, 800], [-580, 800]], c: G.d3 },
    { p: [[-620, 720], [-580, 800], [-700, 800]], c: G.d4 },
    { p: [[-620, 720], [-700, 800], [-700, 720]], c: G.d3 },
    { p: [[-700, 720], [-700, 800], [-780, 800]], c: G.d4 },
    { p: [[-280, 720], [-180, 720], [-280, 800]], c: G.d2 },
    { p: [[-180, 720], [-280, 800], [-380, 800]], c: G.d3 },
    { p: [[-180, 720], [-120, 640], [-100, 720]], c: G.t4 },
    { p: [[-180, 720], [-100, 720], [-180, 800]], c: G.d2 },
    { p: [[-180, 720], [-180, 800], [-280, 800]], c: G.d2 },
  ]

  const slopeR: Tri[] = slopeL.map(t => ({
    p: t.p.map(([x, y]) => [-x, y] as Pt),
    c: t.c,
  }))

  const center: Tri[] = [
    { p: [[-160, 500], [160, 500], [0, 540]], c: G.t2 },
    { p: [[-160, 500], [0, 540], [-120, 640]], c: G.t3 },
    { p: [[160, 500], [0, 540], [120, 640]], c: G.t3 },
    { p: [[0, 540], [-120, 640], [120, 640]], c: G.t3 },
    { p: [[-120, 640], [120, 640], [0, 720]], c: G.t4 },
    { p: [[-120, 640], [0, 720], [-100, 720]], c: G.t4 },
    { p: [[120, 640], [0, 720], [100, 720]], c: G.t4 },
    { p: [[-100, 720], [0, 720], [-100, 800]], c: G.d2 },
    { p: [[0, 720], [100, 720], [100, 800]], c: G.d2 },
    { p: [[-100, 720], [100, 720], [0, 800]], c: G.d3 },
    { p: [[-100, 800], [0, 800], [100, 800]], c: G.d3 },
    { p: [[-100, 800], [-180, 800], [-100, 720]], c: G.d2 },
    { p: [[100, 800], [180, 800], [100, 720]], c: G.d2 },
  ]

  const craterRim: Tri[] = [
    { p: [[-340, 380], [-260, 372], [-180, 366]], c: G.g3 },
    { p: [[-180, 366], [-100, 358], [0, 354]], c: G.g4 },
    { p: [[0, 354], [100, 358], [180, 366]], c: G.g4 },
    { p: [[180, 366], [260, 372], [340, 380]], c: G.g3 },
    { p: [[-260, 372], [-180, 366], [-200, 400]], c: G.g4 },
    { p: [[-180, 366], [-100, 358], [-100, 396]], c: G.g5 },
    { p: [[-100, 358], [0, 354], [0, 394]], c: G.g5 },
    { p: [[0, 354], [100, 358], [100, 396]], c: G.g5 },
    { p: [[100, 358], [180, 366], [200, 400]], c: G.g5 },
    { p: [[180, 366], [260, 372], [240, 406]], c: G.g4 },
    { p: [[-260, 372], [-340, 380], [-300, 400]], c: G.g3 },
    { p: [[260, 372], [340, 380], [300, 400]], c: G.g3 },
  ]

  const allFaces = [...slopeL, ...slopeR, ...center, ...craterRim]

  // 뒤 수평선에 뜬 작은 배 실루엣
  const SmallBoat = ({ x, y, s }: { x: number; y: number; s: number }) => (
    <g transform={`translate(${x}, ${y}) scale(${s})`} opacity="0.5">
      <path d="M -22 0 L 22 0 L 16 10 L -16 10 Z" fill="#0c1c28" />
      <rect x="-1" y="-26" width="2" height="26" fill="#0c1c28" />
      <path d="M 1 -24 L 14 -4 L 1 -4 Z" fill="#16303e" />
      <path d="M -1 -20 L -11 -4 L -1 -4 Z" fill="#1a3848" />
    </g>
  )

  return (
    <>
      {/* ═══ 레이어 A: 수면 + 안개 + 달무리 + 배 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterJa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06101c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="haloJa" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#2f5a72" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#16344a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a1c2c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mistJa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="900" fill="url(#haloJa)" />
        <rect x="0" y="660" width="1600" height="120" fill="url(#mistJa)" />
        <rect x="0" y="720" width="1600" height="180" fill="url(#waterJa)" />
      </svg>

      {/* ═══ 레이어 B: 한라산 + 백록담 + 뒤 배 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={align}>
        <defs>
          <radialGradient id="greenGlow" cx="0.5" cy="0.42" r="0.55">
            <stop offset="0%" stopColor="#4a9159" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4a9159" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 수평선 뒤에 뜬 작은 배들 (산보다 먼저 = 뒤) */}
        <SmallBoat x={300} y={540} s={0.9} />
        <SmallBoat x={1180} y={552} s={1.1} />
        <SmallBoat x={1380} y={536} s={0.75} />

        <g transform="translate(800, 0)">
          <path d="M -780 800 L -700 720 L -620 660 L -540 600 L -460 540 L -380 480 L -300 430 L -220 400 L -140 388 L -60 384 L 0 382 L 60 384 L 140 388 L 220 400 L 300 430 L 380 480 L 460 540 L 540 600 L 620 660 L 700 720 L 780 800 Z"
            fill="#214a4c" />

          <ellipse cx="0" cy="430" rx="360" ry="180" fill="url(#greenGlow)" />

          {allFaces.map((t, i) => (
            <polygon key={i}
              points={t.p.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={t.c} stroke={t.c} strokeWidth="0.5" />
          ))}

          <path d="M -300 460 L -380 540 L -460 640 L -540 750" stroke="#0a1c24" strokeWidth="2.5" fill="none" opacity="0.5" />
          <path d="M -240 500 L -300 600 L -360 720 L -380 790" stroke="#0a1c24" strokeWidth="2" fill="none" opacity="0.42" />
          <path d="M -180 510 L -200 620 L -220 740 L -200 790" stroke="#0a1c24" strokeWidth="1.6" fill="none" opacity="0.35" />
          <path d="M -100 560 L -90 680 L -80 790" stroke="#0a1c24" strokeWidth="1.3" fill="none" opacity="0.3" />
          <path d="M 300 460 L 380 540 L 460 640 L 540 750" stroke="#0a1c24" strokeWidth="2.5" fill="none" opacity="0.5" />
          <path d="M 240 500 L 300 600 L 360 720 L 380 790" stroke="#0a1c24" strokeWidth="2" fill="none" opacity="0.42" />
          <path d="M 180 510 L 200 620 L 220 740 L 200 790" stroke="#0a1c24" strokeWidth="1.6" fill="none" opacity="0.35" />
          <path d="M 100 560 L 90 680 L 80 790" stroke="#0a1c24" strokeWidth="1.3" fill="none" opacity="0.3" />

          <path d="M -340 380 L -180 366 L 0 354 L 180 366 L 340 380" stroke="#85d195" strokeWidth="2" fill="none" opacity="0.6" />

          <path d="M -380 460 L -540 660 L -700 720" stroke="#0a1c24" strokeWidth="0.8" fill="none" opacity="0.35" />
          <path d="M 380 460 L 540 660 L 700 720" stroke="#0a1c24" strokeWidth="0.8" fill="none" opacity="0.35" />

          {(() => {
            const cx = 0, cy = 425
            const lakeR = 220, lakeRy = 65
            const oct = (rad: number, ry: number): [number, number][] =>
              Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2 - Math.PI / 8
                return [cx + Math.cos(a) * rad, cy + Math.sin(a) * ry]
              })
            const inner = oct(lakeR, lakeRy)
            const lakeC = ['#5aa0a0', '#4e9494', '#3f8585', '#357a7c', '#2f7074', '#357a7c', '#3f8585', '#4e9494']
            return (
              <>
                {inner.map(([x, y], i) => {
                  const [nx, ny] = inner[(i + 1) % 8]
                  return <polygon key={i}
                    points={`${cx},${cy} ${x},${y} ${nx},${ny}`}
                    fill={lakeC[i]} stroke="#2a5e60" strokeWidth="0.5" />
                })}
              </>
            )
          })()}
        </g>
      </svg>
    </>
  )
}