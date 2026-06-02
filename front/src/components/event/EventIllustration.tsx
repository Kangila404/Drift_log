import { EVENT_ILLUST } from '../../constants/event'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function EventIllustration({ eventId }: { eventId: number }) {
  const key = EVENT_ILLUST[eventId]
  switch (key) {
    case 'whale':     return <Whale />
    case 'rainbow':   return <Rainbow />
    case 'dolphin':   return <Dolphin />
    case 'sign':      return <FloatingSign />
    case 'cityLight': return <CityLight />
    default:          return null
  }
}

const VB = '0 0 400 200'
const svgProps = {
  viewBox: VB,
  xmlns: 'http://www.w3.org/2000/svg',
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid meet' as const,
}
/* 1. 먼 고래 그림자 — 넓은 viewBox, 꼬리까지 온전, 떠올랐다 잠수 */
function Whale() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const durations = [1000, 1800, 3500, 1800, 1200]
    const timer = setTimeout(() => setPhase((p) => (p + 1) % 5), durations[phase])
    return () => clearTimeout(timer)
  }, [phase])

  const whaleAnim = {
    0: { x: -20, y: 60, opacity: 0 },
    1: { x: 0, y: 0, opacity: 0.9 },
    2: { x: 60, y: 0, opacity: 0.9 },
    3: { x: 90, y: 40, opacity: 0.45 },
    4: { x: 110, y: 90, opacity: 0 },
  }[phase]

  return (
    <svg
      viewBox="0 0 600 220"
      xmlns="http://www.w3.org/2000/svg"
      width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="whaleBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#28506c" />
          <stop offset="100%" stopColor="#11304c" />
        </linearGradient>
      </defs>

      {/* 고래 — 전체가 viewBox(0~600) 안. 꼬리 끝 x≈470 */}
      <motion.g animate={whaleAnim} transition={{ duration: 1.8, ease: 'easeInOut' }}>
        {/* 몸통 (머리 x=80, 꼬리 시작 x≈400) */}
        <path d="
          M 90 106
          Q 78 98 86 86
          Q 102 74 140 76
          Q 210 78 280 84
          Q 340 88 378 94
          Q 396 97 404 106
          Q 410 112 404 118
          Q 378 130 310 130
          Q 220 130 150 126
          Q 108 124 92 114
          Q 80 112 90 106 Z"
          fill="url(#whaleBody)" />
        {/* 등지느러미 */}
        <path d="M 280 84 Q 290 56 316 46 Q 302 62 300 78 Z" fill="url(#whaleBody)" />
        {/* 꼬리 (x 400~470, viewBox 안) */}
        <path d="M 388 100 Q 422 80 452 74 Q 434 98 440 110 Q 446 118 454 124 Q 428 114 402 108 Z" fill="url(#whaleBody)" />
        {/* 가슴지느러미 */}
        <path d="M 180 122 Q 192 140 220 146 Q 200 132 198 120 Z" fill="url(#whaleBody)" opacity="0.85" />
        {/* 눈 */}
        <circle cx="122" cy="94" r="2.8" fill="#0a1c2c" />
        {/* 등 음영 */}
        <path d="M 120 100 Q 230 88 370 98" fill="none" stroke="#0a1c2c" strokeWidth="1" opacity="0.4" />
      </motion.g>

      {/* 수면 잔물결 (고정) */}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M 30 ${122 + i * 8} Q 300 ${118 + i * 8} 570 ${122 + i * 8}`}
          fill="none" stroke="#2a5060" strokeWidth="1" opacity={0.2 - i * 0.06} />
      ))}
    </svg>
  )
}
/* 2. 무지개 — 화면 전체 기준, 수평선에 다리가 닿고 가운데 */
function Rainbow() {
  const colors = ['#8a7fa8', '#7f8fb0', '#7fa6a8', '#86b08a', '#b0ac82', '#b8967e']
  // viewBox를 화면 전체로(가로 1600, 세로 900) → 실제 바다 수평선(약 화면 절반)과 맞춤
  // 수평선 y = 430 (바다 시작 지점에 맞춤)
  const SEA = 330
  return (
    <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
      width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="rbFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="75%" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="rbMask">
          <rect x="0" y="0" width="1600" height={SEA} fill="url(#rbFade)" />
        </mask>
      </defs>

      {/* 무지개 — 화면 가운데(cx=800), 다리가 수평선(y=430)에 닿음 */}
      <g fill="none" strokeLinecap="round" mask="url(#rbMask)">
        {colors.map((c, i) => (
          <path key={i}
            d={`M ${560 + i * 9} ${SEA} A ${240 - i * 9} ${300 - i * 9} 0 0 1 ${1040 - i * 9} ${SEA}`}
            stroke={c} strokeWidth="9" opacity="0.55" />
        ))}
      </g>
    </svg>
  )
}

/* 3. 돌고래 떼 — 여러 마리 곡선 유영 + 한 마리 점프, 전체화면 */
function Dolphin() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const durations = [800, 2500, 2000, 1500]
    const timer = setTimeout(() => setPhase((p) => (p + 1) % 4), durations[phase])
    return () => clearTimeout(timer)
  }, [phase])

  const podAnim = {
    0: { x: -200, opacity: 0 },
    1: { x: 200, opacity: 1 },
    2: { x: 700, opacity: 1 },
    3: { x: 1200, opacity: 0 },
  }[phase]

  const SEA = 430
  const pod = [
    { x: 300, y: SEA + 70, s: 1.0, d: 0 },
    { x: 420, y: SEA + 110, s: 0.85, d: 0.5 },
    { x: 540, y: SEA + 60, s: 1.1, d: 1.0 },
    { x: 640, y: SEA + 120, s: 0.8, d: 0.3 },
    { x: 740, y: SEA + 90, s: 0.95, d: 0.7 },
  ]

  return (
    <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
      width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="dolBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a5470" />
          <stop offset="100%" stopColor="#14304a" />
        </linearGradient>
      </defs>

      <motion.g animate={podAnim} transition={{ duration: 2.0, ease: 'easeInOut' }}>
        {/* 유영하는 무리 */}
        {pod.map((d, i) => (
          <g key={i} fill="url(#dolBody)" opacity="0.75">
            <g transform={`translate(${d.x}, ${d.y}) scale(${d.s})`}>
              <animateTransform attributeName="transform" type="translate"
                values="0 0; 0 -10; 0 4; 0 0" dur={`${3 + d.d}s`}
                additive="sum" repeatCount="indefinite" begin={`${d.d}s`} />
              <DolphinShape />
            </g>
          </g>
        ))}

        {/* 점프하는 한 마리 — 위치 고정 g + 점프 애니 g 분리 */}
        <g transform={`translate(500, ${SEA + 90})`} fill="url(#dolBody)">
          {/* 점프 (상하) — 안쪽 g에만 적용, 부모 위치 안 건드림 */}
          <g>
            <animateTransform attributeName="transform" type="translate"
              values="0 0; 0 -150; 0 0" keyTimes="0;0.5;1"
              dur="3s" repeatCount="indefinite" />
            {/* 회전 — 또 한 겹 안쪽 */}
            <g>
              <animateTransform attributeName="transform" type="rotate"
                values="-35 60 0; 0 60 0; 35 60 0" keyTimes="0;0.5;1"
                dur="3s" repeatCount="indefinite" />
              <DolphinShape />
            </g>
          </g>
        </g>
      </motion.g>
    </svg>
  )
}

/* 돌고래 한 마리 형태 — 뾰족한 주둥이, 둥근 이마, 낫 모양 등지느러미, 가는 꼬리 */
function DolphinShape() {
  return (
    <>
      {/* 몸통 — 주둥이(왼쪽 뾰족) → 둥근 이마 → 등 → 가는 꼬리(오른쪽) */}
      <path d="
        M -28 24
        Q -10 22 4 20
        Q 0 14 8 10
        Q 26 0 56 2
        Q 92 5 120 16
        Q 138 22 150 30
        Q 138 30 124 30
        Q 100 30 78 32
        Q 48 36 24 34
        Q 4 32 -6 30
        Q -22 28 -28 24 Z" />

      {/* 등지느러미 — 뒤로 휘어진 낫 모양 */}
      <path d="M 56 2 Q 60 -22 80 -32 Q 74 -26 76 -14 Q 74 -4 70 4 Z" />

      {/* 꼬리지느러미 (갈래) */}
      <path d="M 144 26 Q 168 16 184 10 Q 172 22 176 30 Q 180 38 188 44 Q 168 36 150 32 Z" />

      {/* 가슴지느러미 */}
      <path d="M 40 30 Q 50 48 70 54 Q 56 42 54 30 Z" opacity="0.8" />

      {/* 배쪽 밝은 라인 (돌고래 특유 2톤) */}
      <path d="M -20 26 Q 30 38 90 34 Q 120 32 144 28"
        fill="none" stroke="#3a6a86" strokeWidth="3" opacity="0.4" />

      {/* 눈 */}
      <circle cx="14" cy="16" r="2" fill="#0a1c2c" />
    </>
  )
}

/* 4. 물 위 간판 — 크게, 디테일한 원목, 지워진 글씨, 둥둥 흔들림 */
function FloatingSign() {
  const SEA = 480
  return (
    <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"
      width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="woodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a5636" />
          <stop offset="40%" stopColor="#5e4228" />
          <stop offset="100%" stopColor="#3a2818" />
        </linearGradient>
        <linearGradient id="woodFrame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#523920" />
          <stop offset="100%" stopColor="#2a1c10" />
        </linearGradient>
        <linearGradient id="woodPlank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6e4e30" />
          <stop offset="100%" stopColor="#4a3420" />
        </linearGradient>
        {/* 나뭇결 */}
        <pattern id="woodGrain" width="300" height="20" patternUnits="userSpaceOnUse">
          <path d="M 0 6 Q 80 2 160 6 T 300 6" stroke="#2e2012" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M 0 13 Q 100 10 200 13 T 300 13" stroke="#2e2012" strokeWidth="0.8" fill="none" opacity="0.22" />
          <path d="M 0 18 Q 60 16 120 18 T 300 18" stroke="#3a2818" strokeWidth="0.6" fill="none" opacity="0.18" />
        </pattern>
        {/* 물때(이끼) */}
        <radialGradient id="moss" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3a5a3a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3a5a3a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 간판 전체 — 크게(scale 1.8), 물에 둥둥 */}
      <g transform={`translate(800, ${SEA})`}>
        <animateTransform attributeName="transform" type="translate"
          values={`800 ${SEA}; 814 ${SEA - 16}; 788 ${SEA + 10}; 800 ${SEA}`}
          dur="5.5s" repeatCount="indefinite" />
        <g transform="scale(1.8)">
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="-3.5 0 -20; 2.5 0 -20; -3.5 0 -20"
              dur="5.5s" repeatCount="indefinite" />

            {/* 떠받치는 기둥 2개 (물에 잠김) */}
            <g>
              <rect x="-72" y="-26" width="14" height="110" rx="4" fill="url(#woodFrame)" />
              <rect x="-72" y="-26" width="5" height="110" fill="#6e4e30" opacity="0.4" />
              <rect x="58" y="-26" width="14" height="110" rx="4" fill="url(#woodFrame)" />
              <rect x="58" y="-26" width="5" height="110" fill="#6e4e30" opacity="0.4" />
              {/* 기둥 물때 */}
              <ellipse cx="-65" cy="60" rx="14" ry="20" fill="url(#moss)" />
              <ellipse cx="65" cy="50" rx="12" ry="18" fill="url(#moss)" />
            </g>

            {/* 간판 본체 — 가로 판자 3장 이어붙임 */}
            <g>
              {/* 뒷 프레임 */}
              <rect x="-128" y="-128" width="256" height="104" rx="4" fill="url(#woodFrame)" />

              {/* 판자 3장 */}
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <rect x="-122" y={-124 + i * 32} width="244" height="30" rx="2"
                    fill="url(#woodPlank)" stroke="#2e2012" strokeWidth="1.5" />
                  <rect x="-122" y={-124 + i * 32} width="244" height="30" rx="2" fill="url(#woodGrain)" />
                </g>
              ))}
              {/* 전체 명암 오버레이 */}
              <rect x="-122" y="-124" width="244" height="96" rx="3" fill="url(#woodGrad)" opacity="0.25" />

              {/* 갈라짐(크랙) */}
              <path d="M -60 -124 L -56 -100 L -62 -84 L -58 -28" stroke="#2a1c10" strokeWidth="1.2" fill="none" opacity="0.5" />
              <path d="M 70 -124 L 66 -96 L 72 -60" stroke="#2a1c10" strokeWidth="1" fill="none" opacity="0.4" />

              {/* 모서리 녹슨 못 */}
              {[[-112, -114], [112, -114], [-112, -38], [112, -38]].map(([cx, cy], i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="4" fill="#241810" />
                  <circle cx={cx - 1} cy={cy - 1} r="1.5" fill="#5a4028" opacity="0.7" />
                  <circle cx={cx} cy={cy} r="6" fill="#6a3a20" opacity="0.25" />
                </g>
              ))}

              {/* 모서리 마모 (밝은 닳은 자국) */}
              <path d="M -128 -128 Q -120 -126 -122 -118" stroke="#8a6a48" strokeWidth="2" fill="none" opacity="0.4" />
              <path d="M 128 -24 Q 120 -26 122 -34" stroke="#8a6a48" strokeWidth="2" fill="none" opacity="0.3" />

              {/* 지워진 글씨 흔적 — 페인트 벗겨진 획 */}
              <g stroke="#d8c4a4" strokeWidth="4.5" strokeLinecap="round" fill="none">
                {/* 첫 줄 */}
                <path d="M -104 -110 L -88 -110 M -96 -118 L -96 -100" opacity="0.5" />
                <path d="M -78 -110 Q -68 -120 -58 -110 Q -50 -102 -58 -96" opacity="0.45" />
                <path d="M -42 -116 L -42 -98 M -42 -116 L -28 -116 M -42 -108 L -30 -108" opacity="0.3" />
                <path d="M -16 -110 Q -6 -118 4 -110" opacity="0.4" />
                <path d="M 18 -116 L 18 -98 M 28 -116 L 28 -98 M 18 -108 L 28 -108" opacity="0.25" />
                <path d="M 44 -114 Q 56 -110 50 -102 L 58 -98" opacity="0.35" />
                <path d="M 74 -112 L 86 -112 M 80 -118 L 80 -100" opacity="0.2" />
                {/* 둘째 줄 (거의 지워짐) */}
                <path d="M -90 -78 L -76 -78 M -83 -84 L -83 -70" opacity="0.28" />
                <path d="M -58 -82 Q -48 -76 -56 -68" opacity="0.18" />
                <path d="M -30 -82 L -30 -68 M -30 -82 L -18 -78" opacity="0.3" />
                <path d="M 2 -80 L 16 -80 M 9 -84 L 9 -68" opacity="0.22" />
                <path d="M 36 -82 Q 48 -78 40 -70 L 50 -68" opacity="0.16" />
                <path d="M 66 -80 L 66 -68 M 66 -80 Q 78 -80 76 -72" opacity="0.2" />
              </g>

              {/* 판자 물때 얼룩 */}
              <ellipse cx="-90" cy="-40" rx="30" ry="14" fill="url(#moss)" />
              <ellipse cx="60" cy="-48" rx="24" ry="12" fill="url(#moss)" />
            </g>
          </g>
        </g>
      </g>

      {/* 수면 물결 + 반사 */}
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M 480 ${SEA + 70 + i * 20} Q 800 ${SEA + 60 + i * 20} 1120 ${SEA + 70 + i * 20}`}
          fill="none" stroke="#2a5060" strokeWidth="2.5" opacity={0.32 - i * 0.07} />
      ))}
      {/* 간판 수면 반사 (흐릿) */}
      <g opacity="0.12">
        <rect x={800 - 230} y={SEA + 50} width="200" height="60" rx="4" fill="#6e4e30"
          transform={`translate(36, 0)`} />
      </g>
    </svg>
  )
}

/* 5. 희미한 도시 불빛 — 수평선 멀리 깜빡이는 점 */
function CityLight() {
  const lights = [
    [120, 96], [140, 92], [158, 98], [180, 90], [202, 94],
    [224, 91], [246, 97], [268, 93], [288, 95],
  ]
  return (
    <svg {...svgProps}>
      {/* 멀리 도시 실루엣 */}
      <path d="M 100 100 L 100 86 L 120 86 L 120 80 L 150 80 L 150 88 L 180 88 L 180 78 L 210 78 L 210 84 L 250 84 L 250 80 L 290 80 L 290 90 L 310 90 L 310 100 Z"
        fill="#0c1c28" opacity="0.7" />
      {/* 불빛 */}
      {lights.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill="#cfe0d8">
          <animate attributeName="opacity"
            values="0.2;0.9;0.3;0.7;0.2"
            dur={`${2.5 + (i % 4) * 0.7}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* 수평선 + 반사 */}
      <line x1="20" y1="100" x2="380" y2="100" stroke="#16303c" strokeWidth="1.5" />
      {lights.map(([x], i) => (
        <line key={`r-${i}`} x1={x} y1="102" x2={x} y2="118"
          stroke="#cfe0d8" strokeWidth="1" opacity="0.12" />
      ))}
    </svg>
  )
}