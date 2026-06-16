import { layerStyle, ALIGN, SkyLayer, Stars, Reflect, C } from './_cityKit'

const ACC = '#c2b6e0'   // 여명 라벤더 (따뜻한 색 없음)

const F = {
  d3: '#10142c', d2: '#181d3a', d1: '#222744', m1: '#2b3358', m2: '#3c4778',
  l1: '#525e96', l2: '#6b78b0', l3: '#8b97cc', hi: '#aab4e6',
}

type Pt = [number, number]
type Tri = { p: Pt[]; c: string }

function buildHand(): Tri[] {
  const finger = (bx: number, by: number, tx: number, ty: number, w: number, segs = 3): Tri[] => {
    const ang = Math.atan2(ty - by, tx - bx)
    const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2)
    const tris: Tri[] = []
    const node = (t: number, wf: number) => {
      const x = bx + (tx - bx) * t, y = by + (ty - by) * t, hw = (w / 2) * wf
      return { l: [x + nx * hw, y + ny * hw] as Pt, c: [x, y] as Pt, r: [x - nx * hw, y - ny * hw] as Pt }
    }
    const wfs = [1, 0.96, 0.86, 0.72, 0.55]
    const ts: number[] = []
    for (let i = 0; i <= segs; i++) ts.push(i / segs)
    const nodes = ts.map((t, i) => node(t, wfs[Math.min(i, wfs.length - 1)]))
    const tip: Pt = [tx, ty]
    for (let i = 0; i < segs; i++) {
      const a = nodes[i], b = nodes[i + 1]
      tris.push({ p: [a.l, a.c, b.c], c: i % 2 ? F.l2 : F.l1 })
      tris.push({ p: [a.l, b.c, b.l], c: i % 2 ? F.l1 : F.l2 })
      tris.push({ p: [a.c, a.r, b.r], c: i % 2 ? F.d1 : F.m1 })
      tris.push({ p: [a.c, b.r, b.c], c: i % 2 ? F.m1 : F.d1 })
    }
    const top = nodes[segs]
    tris.push({ p: [top.l, top.c, tip], c: F.l3 })
    tris.push({ p: [top.c, top.r, tip], c: F.m2 })
    return tris
  }

  const palm: Tri[] = [
    { p: [[-56, 30], [-48, -70], [-14, -50]], c: F.m2 }, { p: [[-56, 30], [-14, -50], [-18, 30]], c: F.l1 },
    { p: [[-48, -70], [-10, -92], [-14, -50]], c: F.l1 }, { p: [[-14, -50], [-10, -92], [16, -70]], c: F.l2 },
    { p: [[-14, -50], [16, -70], [6, -30]], c: F.m2 }, { p: [[-18, 30], [-14, -50], [6, -30]], c: F.m1 },
    { p: [[-18, 30], [6, -30], [12, 30]], c: F.l1 }, { p: [[16, -70], [-10, -92], [34, -88]], c: F.d1 },
    { p: [[16, -70], [34, -88], [52, -58]], c: F.m1 }, { p: [[16, -70], [52, -58], [28, -34]], c: F.m2 },
    { p: [[6, -30], [16, -70], [28, -34]], c: F.l1 }, { p: [[12, 30], [6, -30], [28, -34]], c: F.m1 },
    { p: [[12, 30], [28, -34], [42, 30]], c: F.l1 }, { p: [[28, -34], [52, -58], [58, -30]], c: F.d1 },
    { p: [[28, -34], [58, -30], [42, 30]], c: F.m1 }, { p: [[42, 30], [58, -30], [58, 30]], c: F.d2 },
    { p: [[42, 30], [58, 30], [54, -10]], c: F.d2 },
  ]
  const wrist: Tri[] = [
    { p: [[-44, 30], [-38, 150], [6, 150]], c: F.d2 }, { p: [[-44, 30], [6, 150], [4, 30]], c: F.d1 },
    { p: [[4, 30], [6, 150], [50, 150]], c: F.d3 }, { p: [[4, 30], [50, 150], [50, 30]], c: F.d2 },
    { p: [[-44, 30], [4, 30], [-20, 52]], c: F.d2 }, { p: [[4, 30], [50, 30], [26, 52]], c: F.d3 },
  ]
  const fingers: Tri[] = [
    ...finger(-46, -66, -54, -198, 36, 3),
    ...finger(-20, -84, -24, -286, 42, 4),
    ...finger(4, -90, 5, -342, 46, 4),
    ...finger(30, -82, 40, -296, 42, 4),
    ...finger(50, -46, 104, -160, 40, 3),
  ]
  return [...wrist, ...palm, ...fingers]
}

const HAND = buildHand()

export default function Pohang() {
  const waterY = 720

  const Hand = () => (
    <g transform="translate(792, 778) scale(1.2)">
      {HAND.map((t, i) => (
        <polygon key={i} points={t.p.map(([x, y]) => `${x},${y}`).join(' ')} fill={t.c} stroke={t.c} strokeWidth="0.6" />
      ))}
    </g>
  )

  return (
    <>
      <style>{`
        @keyframes ph-beam { 0%,100%{ opacity:0.5;} 50%{ opacity:0.85;} }
        @keyframes ph-bird { 0%{ transform:translateX(0);} 100%{ transform:translateX(34px);} }
        .ph-beam{ animation: ph-beam 4.2s ease-in-out infinite;}
        .ph-birds{ animation: ph-bird 32s ease-in-out infinite alternate;}
      `}</style>

      <SkyLayer idSuffix="PH" waterY={waterY} mistY={644} halo="#34396a" halo2="#1f2246" water="#171d42" accent={ACC} accentY={0.36} />

      <svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" style={layerStyle} preserveAspectRatio={ALIGN}>
        <Stars seed={6} n={18} color={ACC} />

        <g className="ph-birds" opacity="0.5">
          <path d="M 320 200 Q 326 195 332 200 Q 338 195 344 200" stroke={C.edgeLight} strokeWidth="1.2" fill="none" />
          <path d="M 380 182 Q 386 177 392 182 Q 398 177 404 182" stroke={C.edgeLight} strokeWidth="1" fill="none" />
          <path d="M 1180 196 Q 1186 191 1192 196 Q 1198 191 1204 196" stroke={C.edgeLight} strokeWidth="1" fill="none" />
        </g>

        {/* 좌측 방파제 + 등대 (곁가지 — 모바일선 잘림) */}
        <rect x="40" y="720" width="340" height="20" fill={C.bldgBase} />
        <rect x="40" y="720" width="340" height="3" fill={C.edgeLight} opacity="0.5" />
        <rect x="40" y="737" width="340" height="3" fill={C.edgeShade} />
        {[80, 160, 250, 330].map((x, i) => (
          <g key={i} transform={`translate(${x},754)`}>
            <polygon points="0,0 -9,-11 -14,0 -9,11" fill={C.bldgFace} />
            <polygon points="0,0 14,-9 9,11 -9,11" fill={C.bldgBase} />
            <polygon points="0,0 -9,-11 14,-9" fill={C.edgeLight} opacity="0.5" />
          </g>
        ))}
        <g transform="translate(380, 640)">
          <rect x="-14" y="76" width="28" height="6" fill={C.stone} />
          <rect x="-10" y="20" width="20" height="60" fill={C.bldgBase} />
          <rect x="-10" y="20" width="3" height="60" fill={C.edgeLight} opacity="0.5" />
          <rect x="-10" y="36" width="20" height="6" fill={C.edgeShade} />
          <rect x="-10" y="56" width="20" height="6" fill={C.edgeShade} />
          <rect x="-12" y="10" width="24" height="12" fill={C.stone} />
          <rect className="ph-beam" x="-10" y="12" width="20" height="9" fill={ACC} />
          <polygon points="-13,10 0,2 13,10" fill={C.stoneLit} />
          <circle cx="0" cy="-4" r="2.4" fill={ACC} />
          <circle cx="0" cy="-4" r="8" fill={ACC} opacity="0.3" />
        </g>

        {/* 상생의 손 (중앙 hero) + 반사 */}
        <Reflect waterY={waterY} opacity={0.1}><Hand /></Reflect>
        <Hand />
      </svg>
    </>
  )
}