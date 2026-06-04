import { useState, useEffect } from 'react'

export default function Busan() {
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

  // 현수교 케이블 처짐 (포물선)
  const cableY = (x: number, x1: number, x2: number, topY: number, sagY: number) => {
    const t = (x - x1) / (x2 - x1)
    return topY + (sagY - topY) * 4 * t * (1 - t)
  }

  // 도시 빌딩 [x, y, w, h, opacity, brokenTop, brokenSide]
  // brokenTop: 옥상 깨진 정도(0~1), brokenSide: 측면 균열 여부
  type Bldg = [number, number, number, number, number, number, 'L' | 'R' | null]
  const skyline: Bldg[] = [
    [60, 560, 70, 200, 0.65, 0.3, 'R'],
    [140, 600, 54, 160, 0.6, 0, null],
    [206, 540, 82, 220, 0.7, 0.5, 'L'],
    [300, 590, 60, 170, 0.62, 0.2, null],
    [372, 560, 72, 200, 0.65, 0, 'R'],
    [452, 600, 50, 160, 0.6, 0.4, null],
    [510, 570, 66, 190, 0.65, 0.15, 'L'],
    [1080, 580, 60, 180, 0.62, 0.35, null],
    [1150, 550, 76, 210, 0.7, 0, 'R'],
    [1238, 600, 54, 160, 0.6, 0.45, null],
    [1302, 560, 70, 200, 0.65, 0.2, 'L'],
  ]

  // 옥상이 깨진 빌딩 윤곽 생성 (불규칙 톱니)
  const brokenTopPath = (x: number, y: number, w: number, h: number, severity: number, seed: number) => {
    if (severity === 0) {
      return `M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Z`
    }
    // 옥상 부분을 톱니로
    const teeth = 5
    let path = `M ${x} ${y + h} L ${x} ${y + severity * 60}`
    for (let i = 0; i <= teeth; i++) {
      const tx = x + (w * i) / teeth
      const dropRand = ((seed * 13 + i * 37) % 100) / 100
      const ty = y + severity * (20 + dropRand * 50)
      path += ` L ${tx} ${ty}`
    }
    path += ` L ${x + w} ${y + severity * 60} L ${x + w} ${y + h} Z`
    return path
  }

  return (
    <>
      {/* ═══ 레이어 A: 수면 + 물결 + 안개 + 달무리 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12304a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#06101c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="haloB" cx="0.5" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#2f5a72" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#16344a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a1c2c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mistB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9db4c4" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f9aae" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="900" fill="url(#haloB)" />
        <rect x="0" y="660" width="1600" height="120" fill="url(#mistB)" />
        <rect x="0" y="720" width="1600" height="180" fill="url(#waterB)" />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i}
            d={`M 0 ${762 + i * 22} Q 400 ${756 + i * 22} 800 ${762 + i * 22} T 1600 ${762 + i * 22}`}
            fill="none" stroke="#2a5060" strokeWidth="1.5" opacity={0.45 - i * 0.045} />
        ))}
        {/* 다리 잔해 수면 반사 (끊긴 흔적) */}
        <path d="M 560 770 Q 700 790 820 776" fill="none" stroke="#5a8ba0" strokeWidth="1.5" opacity="0.15" />
        <path d="M 880 776 Q 960 790 1040 770" fill="none" stroke="#5a8ba0" strokeWidth="1.5" opacity="0.15" />
      </svg>

      {/* ═══ 레이어 B: 광안대교 잔해 + 무너진 도시 + 부산타워 ═══ */}
      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
        style={layerStyle} preserveAspectRatio={align}>

        {/* ══════ 뒤: 도시 스카이라인 — 부서진 빌딩, 창 모두 꺼짐 ══════ */}
        {skyline.map(([x, y, w, h, op, brokenTop, brokenSide], i) => {
          const cols = Math.floor(w / 16)
          const rows = Math.floor(h / 26)
          // 측면 균열 라인 좌표
          const crackX = brokenSide === 'L' ? x + w * 0.25 : brokenSide === 'R' ? x + w * 0.7 : null

          return (
            <g key={`sk-${i}`} opacity={op}>
              {/* 빌딩 본체 — 깨진 옥상 형태로 컷아웃 */}
              <path d={brokenTopPath(x, y, w, h, brokenTop, i + 3)} fill="#1d3b4a" />

              {/* 정면 단색 톤 + 우측 그늘 단색 (그라데이션 없음) */}
              <rect x={x + w - 10} y={y + (brokenTop > 0 ? brokenTop * 60 : 0)} width="10"
                height={h - (brokenTop > 0 ? brokenTop * 60 : 0)} fill="#0e2129" />
              {/* 좌측 빛 모서리 (얇은 단색 띠) */}
              <rect x={x} y={y + (brokenTop > 0 ? brokenTop * 60 : 0)} width="3"
                height={h - (brokenTop > 0 ? brokenTop * 60 : 0)} fill="#2c5060" />

              {/* 창문 격자 — 전부 꺼짐 (어두운 점만) */}
              {Array.from({ length: cols }, (_, c) =>
                Array.from({ length: rows }, (_, r) => {
                  const wx = x + 6 + c * 16
                  const wy = y + 10 + r * 26
                  // 깨진 옥상 영역엔 창 안 그림
                  if (brokenTop > 0 && wy < y + brokenTop * 60 + 4) return null
                  // 측면 균열 영역 일부 창 빠짐 (불규칙)
                  const seed = (i * 7 + c * 13 + r * 17) % 13
                  if (crackX !== null && Math.abs(wx + 3.5 - crackX) < 8 && seed < 6) return null
                  return (
                    <rect key={`${c}-${r}`} x={wx} y={wy} width="7" height="9"
                      fill="#06121a" opacity="0.85" />
                  )
                })
              )}

              {/* 측면 균열 라인 (지그재그) */}
              {crackX !== null && (
                <polyline
                  points={`${crackX},${y + 30} ${crackX + 4},${y + 60} ${crackX - 3},${y + 95} ${crackX + 5},${y + 130} ${crackX - 2},${y + 165} ${crackX + 3},${y + h - 10}`}
                  fill="none" stroke="#06121a" strokeWidth="1.4" opacity="0.85" />
              )}

              {/* 빌딩 옆에 무너진 잔해 (가끔) */}
              {brokenTop > 0.3 && (
                <g>
                  <polygon
                    points={`${x + w * 0.3},${y + brokenTop * 40} ${x + w * 0.5},${y + brokenTop * 20} ${x + w * 0.42},${y + brokenTop * 55}`}
                    fill="#15303e" opacity="0.7" />
                </g>
              )}
            </g>
          )
        })}

        {/* ══════ 광안대교 — 일부 끊긴 잔해 ══════ */}
        {(() => {
          const deckY = 560
          const towerL = 560, towerR = 1040
          const topY = 360
          // 가운데 일부 끊긴 메인 케이블 (760~880 끊김)
          const breakStart = 760, breakEnd = 880
          const seg1: string[] = []
          const seg2: string[] = []
          for (let x = towerL; x <= breakStart; x += 8) {
            seg1.push(`${x},${cableY(x, towerL, towerR, topY + 10, 500)}`)
          }
          for (let x = breakEnd; x <= towerR; x += 8) {
            seg2.push(`${x},${cableY(x, towerL, towerR, topY + 10, 500)}`)
          }

          return (
            <g>
              {/* 상판 — 단색 + 위/아래 얇은 띠 (그라데이션 없음) */}
              <rect x="0" y={deckY} width="760" height="14" fill="#234654" />
              <rect x="880" y={deckY} width="720" height="14" fill="#234654" />
              {/* 상판 위/아래 윤곽선 */}
              <rect x="0" y={deckY - 2} width="760" height="2" fill="#3f6e7e" opacity="0.6" />
              <rect x="880" y={deckY - 2} width="720" height="2" fill="#3f6e7e" opacity="0.6" />
              <rect x="0" y={deckY + 12} width="760" height="2" fill="#06121a" />
              <rect x="880" y={deckY + 12} width="720" height="2" fill="#06121a" />

              {/* 끊어진 상판 가장자리 (들쭉날쭉) */}
              <polygon points={`760,${deckY} 768,${deckY - 4} 762,${deckY + 6} 770,${deckY + 14} 760,${deckY + 14}`}
                fill="#234654" />
              <polygon points={`880,${deckY} 872,${deckY - 4} 878,${deckY + 6} 870,${deckY + 14} 880,${deckY + 14}`}
                fill="#234654" />

              {/* 끊어진 상판 잔해 (수면 위 떠 있는 조각) */}
              <polygon points={`790,${deckY + 30} 820,${deckY + 26} 830,${deckY + 36} 800,${deckY + 38}`}
                fill="#1a3744" opacity="0.7" />
              <polygon points={`840,${deckY + 50} 862,${deckY + 46} 866,${deckY + 56} 844,${deckY + 58}`}
                fill="#15303e" opacity="0.6" />

              {/* 접속교 교각 (단색, 그라데이션 없음) */}
              {[80, 200, 320, 440, 1140, 1260, 1380, 1500].map((x, i) => (
                <g key={`p-${i}`}>
                  <rect x={x} y={deckY + 14} width="16" height={760 - deckY} fill="#1a3744" />
                  {/* 빛 받는 좌측 얇은 띠 */}
                  <rect x={x} y={deckY + 14} width="2" height={760 - deckY} fill="#3f6e7e" opacity="0.55" />
                  {/* 그늘 우측 띠 */}
                  <rect x={x + 14} y={deckY + 14} width="2" height={760 - deckY} fill="#06121a" />
                  <rect x={x - 3} y={deckY + 80} width="22" height="4" fill="#234654" />
                  <rect x={x - 3} y={deckY + 160} width="22" height="4" fill="#234654" />
                </g>
              ))}

              {/* 메인 케이블 — 가운데 끊김, 끊긴 끝부분 처짐 */}
              <polyline points={seg1.join(' ')} fill="none" stroke="#3f6e7e" strokeWidth="2.5" opacity="0.7" />
              <polyline points={seg2.join(' ')} fill="none" stroke="#3f6e7e" strokeWidth="2.5" opacity="0.7" />
              {/* 끊긴 케이블 늘어진 끝 (왼쪽 끝이 아래로) */}
              <path d={`M 760 ${cableY(760, towerL, towerR, topY + 10, 500)} Q 770 ${cableY(760, towerL, towerR, topY + 10, 500) + 40} 758 ${cableY(760, towerL, towerR, topY + 10, 500) + 70}`}
                fill="none" stroke="#3f6e7e" strokeWidth="2.2" opacity="0.6" />
              <path d={`M 880 ${cableY(880, towerL, towerR, topY + 10, 500)} Q 868 ${cableY(880, towerL, towerR, topY + 10, 500) + 40} 882 ${cableY(880, towerL, towerR, topY + 10, 500) + 70}`}
                fill="none" stroke="#3f6e7e" strokeWidth="2.2" opacity="0.6" />

              {/* 사이드 케이블 — 단색 */}
              <line x1={towerL} y1={topY + 10} x2={towerL - 200} y2={deckY} stroke="#3f6e7e" strokeWidth="2.2" opacity="0.7" />
              <line x1={towerR} y1={topY + 10} x2={towerR + 200} y2={deckY} stroke="#3f6e7e" strokeWidth="2.2" opacity="0.7" />

              {/* 수직 행어 — 일부 끊김 */}
              {Array.from({ length: 33 }, (_, i) => {
                const x = towerL + (towerR - towerL) * (i / 32)
                if (x > breakStart - 6 && x < breakEnd + 6) return null
                const seed = (i * 13) % 9
                const broken = seed < 2
                const y = cableY(x, towerL, towerR, topY + 10, 500)
                const endY = broken ? y + (deckY - y) * 0.6 : deckY
                return (
                  <line key={`h-${i}`} x1={x} y1={y} x2={x} y2={endY}
                    stroke="#2c5060" strokeWidth="0.9" opacity="0.55" />
                )
              })}

              {/* 두 주탑 (단색 면 + 직선 음영) */}
              {[towerL, towerR].map((tx, i) => (
                <g key={`tw-${i}`}>
                  {/* 본체 단색 */}
                  <rect x={tx - 11} y={topY} width="22" height={deckY - topY + 22} fill="#1a3744" />
                  {/* 빛 받는 좌측 얇은 띠 (단색) */}
                  <rect x={tx - 11} y={topY} width="4" height={deckY - topY + 22} fill="#3f6e7e" />
                  {/* 그늘 우측 얇은 띠 */}
                  <rect x={tx + 7} y={topY} width="4" height={deckY - topY + 22} fill="#06121a" />
                  {/* 가로보 */}
                  <rect x={tx - 16} y={topY + 50} width="32" height="9" fill="#234654" />
                  <rect x={tx - 16} y={topY + 130} width="32" height="9" fill="#234654" />
                  {/* 꼭대기 — i==0 좌측은 깨진 흔적 */}
                  {i === 0 ? (
                    <polygon
                      points={`${tx - 9},${topY} ${tx + 9},${topY} ${tx + 9},${topY - 14} ${tx + 4},${topY - 8} ${tx - 2},${topY - 14} ${tx - 6},${topY - 6} ${tx - 9},${topY - 10}`}
                      fill="#2c5060" />
                  ) : (
                    <rect x={tx - 9} y={topY - 14} width="18" height="14" fill="#2c5060" />
                  )}
                </g>
              ))}
            </g>
          )
        })()}

        {/* ══════ 부산타워 — 단색 면 + 직선 음영, 부분적 파손 ══════ */}
        <g transform="translate(1340, 0)">
          {/* 기둥 본체 단색 */}
          <rect x="-13" y="360" width="26" height="400" fill="#1a3744" />
          {/* 빛 받는 좌측 띠 (단색) */}
          <rect x="-13" y="360" width="4" height="400" fill="#3f6e7e" />
          {/* 그늘 우측 띠 */}
          <rect x="9" y="360" width="4" height="400" fill="#06121a" />
          {/* 기둥 마디 */}
          {[440, 520, 600, 680].map((y, i) => (
            <rect key={i} x="-16" y={y} width="32" height="6" fill="#2c5060" />
          ))}

          {/* 기둥 균열 라인 */}
          <polyline points="-6,500 -3,560 -8,620 -1,690 -5,740"
            fill="none" stroke="#06121a" strokeWidth="1" opacity="0.7" />

          {/* 전망대 받침 그림자 */}
          <ellipse cx="0" cy="362" rx="50" ry="13" fill="#06121a" opacity="0.6" />

          {/* 전망대 본체 (사다리꼴, 단색) */}
          <path d="M -48 360 L -40 332 L 40 332 L 48 360 Z" fill="#1d3b4a" />
          {/* 전망대 좌측 빛 면 */}
          <path d="M -48 360 L -40 332 L -32 332 L -38 360 Z" fill="#3f6e7e" opacity="0.5" />

          {/* 전망대 본체 박스 (단색) */}
          <rect x="-42" y="304" width="84" height="30" fill="#234654" />
          <rect x="-42" y="304" width="4" height="30" fill="#3f6e7e" />
          <rect x="38" y="304" width="4" height="30" fill="#06121a" />
          {/* 전망대 가로 윤곽 */}
          <rect x="-42" y="304" width="84" height="2" fill="#5a8ba0" opacity="0.55" />
          <rect x="-42" y="332" width="84" height="2" fill="#06121a" />

          {/* 전망대 창문 — 전부 꺼짐 (어두운 띠) */}
          <rect x="-38" y="310" width="76" height="18" fill="#06121a" opacity="0.9" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={-36 + i * 10} y="310" width="1.5" height="18" fill="#1a3744" />
          ))}
          {/* 깨진 창 한 칸 (파편 흔적) */}
          <polygon points="-16,310 -10,316 -14,322 -8,328 -16,328" fill="#1a3744" opacity="0.8" />

          {/* 전망대 지붕 (단색 면 분할) */}
          <path d="M -52 304 Q 0 282 52 304 L 44 310 Q 0 290 -44 310 Z" fill="#2c5060" />
          <path d="M -52 304 Q 0 282 0 282 L -44 310 Q -26 296 -52 304 Z" fill="#3f6e7e" opacity="0.4" />
          {/* 위 지붕 */}
          <path d="M -38 290 L 0 270 L 38 290 Z" fill="#2c5060" />
          <path d="M -38 290 L 0 270 L 0 290 Z" fill="#3f6e7e" opacity="0.45" />

          {/* 첨탑 — 살짝 기울어 부서진 느낌 */}
          <polygon points="-3.5,272 -2,246 1.5,246 3.5,272" fill="#1a3744" />
          <polygon points="-3.5,272 -2,246 -1,246 -2,272" fill="#3f6e7e" />
          {/* 끝 살짝 꺾임 */}
          <line x1="0" y1="248" x2="-3" y2="232" stroke="#1a3744" strokeWidth="2" />
        </g>
      </svg>
    </>
  )
}