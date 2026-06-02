import type { WeatherEffect } from '../../constants/scenePreset'

function RainLayer({ stormMode = false }: { stormMode?: boolean }) {
  const drops = Array.from({ length: 90 }, (_, i) => ({
    id: i,
    left: -5 + Math.random() * 110,
    top: Math.random() * 100,
    delay: -Math.random() * 2,
    duration: 0.5 + Math.random() * 0.4,
    length: 40 + Math.random() * 40,
    opacity: 0.1 + Math.random() * 0.25,
  }))

  return (
    <div data-effect="rain" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes rainFall {
          0% { transform: translateY(-20vh); }
          100% { transform: translateY(120vh); }
        }
        @keyframes cloudDrift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-3%); }
        }
      `}</style>

      {/* 먹구름 — 화면보다 넓게 */}
      <div style={{
        position: 'absolute', top: 0, left: '-15%', width: '130%', height: '55%',
        background: 'linear-gradient(to bottom, rgba(30,40,55,0.92) 0%, rgba(38,50,68,0.8) 35%, rgba(50,65,85,0.45) 70%, transparent 100%)',
        animation: 'cloudDrift 18s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: '-15%', width: '130%', height: '40%',
        background: 'radial-gradient(ellipse 50% 100% at 20% 10%, rgba(22,30,42,0.7), transparent 60%), radial-gradient(ellipse 50% 100% at 55% 5%, rgba(22,30,42,0.65), transparent 60%), radial-gradient(ellipse 50% 100% at 88% 10%, rgba(22,30,42,0.7), transparent 60%)',
        animation: 'cloudDrift 26s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: '-15%', width: '130%', height: '35%',
        background: 'radial-gradient(ellipse 55% 100% at 75% 0%, rgba(20,28,40,0.6), transparent 65%)',
        animation: 'cloudDrift 30s ease-in-out infinite',
      }} />

      {/* 수직 빗줄기 — 폭풍 모드면 숨김 (wind 레이어가 사선 비 담당) */}
      {!stormMode && drops.map(d => (
        <div
          key={d.id}
          style={{
            position: 'absolute',
            top: `${d.top}%`,
            left: `${d.left}%`,
            width: '1px',
            height: `${d.length}px`,
            background: `linear-gradient(to bottom, transparent, rgba(170,200,230,${d.opacity}))`,
            animation: `rainFall ${d.duration}s linear infinite`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// 안개 낀 바다
function FogEffect() {
  return (
    <div data-effect="fog" style={{ position: 'absolute', top: -100, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes fogFlow1 {
          0%, 100% { transform: translateX(-8%) scaleX(1); }
          50% { transform: translateX(8%) scaleX(1.15); }
        }
        @keyframes fogFlow2 {
          0%, 100% { transform: translateX(10%) scaleX(1.1); }
          50% { transform: translateX(-10%) scaleX(1); }
        }
        @keyframes fogPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* 수평선 안개 띠 — 화면 중앙(수평선)에 가장 진하게 */}
      <div style={{
        position: 'absolute', top: '38%', left: 0, right: 0, height: '24%',
        background: 'linear-gradient(to bottom, transparent 0%, rgba(200,215,228,0.45) 45%, rgba(205,218,230,0.5) 55%, transparent 100%)',
        animation: 'fogPulse 9s ease-in-out infinite',
      }} />

      {/* 떠다니는 안개 덩어리 — 수평선 라인 따라 흐름 */}
      <div style={{
        position: 'absolute', top: '32%', left: '-20%', width: '140%', height: '30%',
        background: 'radial-gradient(ellipse 45% 50% at 25% 50%, rgba(205,218,230,0.4), transparent 65%), radial-gradient(ellipse 40% 45% at 70% 50%, rgba(195,210,225,0.35), transparent 65%)',
        animation: 'fogFlow1 16s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '34%', left: '-20%', width: '140%', height: '28%',
        background: 'radial-gradient(ellipse 50% 45% at 50% 50%, rgba(210,222,232,0.38), transparent 65%), radial-gradient(ellipse 38% 40% at 90% 50%, rgba(198,213,226,0.32), transparent 65%)',
        animation: 'fogFlow2 20s ease-in-out infinite',
      }} />

      {/* 전체 옅은 베일 (은은하게) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(180,200,215,0.04) 0%, rgba(175,198,212,0.08) 50%, rgba(170,195,210,0.1) 100%)',
        animation: 'fogPulse 12s ease-in-out infinite',
      }} />
    </div>
  )
}

// 탁한 안개 (황사)
// 탁한 안개 (더 짙고 넓은 안개)
function DustFogEffect() {
  return (
    <div data-effect="dustFog" style={{ position: 'absolute', top: -100, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes dustFlow1 {
          0%, 100% { transform: translateX(-7%) scaleX(1); }
          50% { transform: translateX(7%) scaleX(1.12); }
        }
        @keyframes dustFlow2 {
          0%, 100% { transform: translateX(9%) scaleX(1.1); }
          50% { transform: translateX(-9%) scaleX(1); }
        }
        @keyframes dustPulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* 전체 베일 — fog보다 짙게, 화면 전반 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(180,200,215,0.12) 0%, rgba(175,198,212,0.2) 50%, rgba(170,195,210,0.28) 100%)',
        animation: 'dustPulse 11s ease-in-out infinite',
      }} />

      {/* 수평선 짙은 안개 띠 — fog보다 넓게 */}
      <div style={{
        position: 'absolute', top: '30%', left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to bottom, transparent 0%, rgba(200,215,228,0.5) 40%, rgba(205,218,230,0.55) 55%, transparent 100%)',
        animation: 'dustPulse 9s ease-in-out infinite',
      }} />

      {/* 떠다니는 안개 덩어리 — 넓고 크게 */}
      <div style={{
        position: 'absolute', top: '22%', left: '-25%', width: '150%', height: '50%',
        background: 'radial-gradient(ellipse 50% 50% at 22% 50%, rgba(205,218,230,0.42), transparent 65%), radial-gradient(ellipse 45% 48% at 65% 52%, rgba(195,210,225,0.38), transparent 65%)',
        animation: 'dustFlow1 22s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '24%', left: '-25%', width: '150%', height: '48%',
        background: 'radial-gradient(ellipse 55% 48% at 48% 50%, rgba(210,222,232,0.4), transparent 65%), radial-gradient(ellipse 42% 45% at 88% 52%, rgba(198,213,226,0.36), transparent 65%)',
        animation: 'dustFlow2 28s ease-in-out infinite',
      }} />
    </div>
  )
}

// 흐린 수평선
function HorizonBlur() {
  return (
    <div data-effect="horizonBlur" style={{ position: 'absolute', top: -500, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        /* 진하게 덮였다(수평선 안보임) → 옅어졌다(수평선 보임) 크게 출렁 */
        @keyframes horizonFade {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.15; }
        }
        @keyframes horizonFadeSlow {
          0%, 100% { opacity: 0.2; }
          40% { opacity: 0.9; }
          70% { opacity: 0.35; }
        }
        @keyframes horizonDrift {
          0% { transform: translateX(-4%); }
          50% { transform: translateX(4%); }
          100% { transform: translateX(-4%); }
        }
      `}</style>

{/* 1. 블러 띠 — 수평선 라인에만 얇게 */}
      <div style={{
        position: 'absolute', top: '47%', left: '-5%', right: '-5%', height: '8%',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        maskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)',
        animation: 'horizonFade 7s ease-in-out infinite',
      }} />

      {/* 2. 뿌연 흐림 베일 */}
      <div style={{
        position: 'absolute', top: '46%', left: '-6%', right: '-6%', height: '10%',
        background: 'linear-gradient(to bottom, transparent, rgba(150,180,205,0.5) 50%, transparent)',
        filter: 'blur(6px)',
        animation: 'horizonFadeSlow 11s ease-in-out infinite',
      }} />

      {/* 3. 옅은 빛 번짐 */}
      <div style={{
        position: 'absolute', top: '48%', left: '-6%', right: '-6%', height: '5%',
        background: 'linear-gradient(to bottom, transparent, rgba(135,165,195,0.3) 50%, transparent)',
        filter: 'blur(5px)',
        animation: 'horizonDrift 13s ease-in-out infinite, horizonFade 9s ease-in-out infinite',
      }} />
    </div>
  )
}

// 바람 (폭풍우)
function WindLayer() {
  // 바람에 휘날리는 빗줄기 (기울어짐)
  const streaks = Array.from({ length: 200 }, (_, i) => ({
    id: i,
    left: -10 + Math.random() * 120,
    top: Math.random() * 100,
    delay: -Math.random() * 1.5,
    duration: 0.35 + Math.random() * 0.25,
    length: 60 + Math.random() * 60,
    opacity: 0.12 + Math.random() * 0.2,
  }))

  return (
    <div data-effect="wind" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 6, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes stormDark {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes windStreak {
          0% { transform: translate(20vw, -20vh) rotate(18deg); }
          100% { transform: translate(-20vw, 120vh) rotate(18deg); }
        }
        @keyframes lightning {
          0%, 100% { opacity: 0; }
          0%, 91%, 100% { opacity: 0; }
          92% { opacity: 0.0; }
          92.5% { opacity: 0.7; }
          93% { opacity: 0.1; }
          93.5% { opacity: 0.85; }
          94.5% { opacity: 0; }
        }
      `}</style>

      {/* 하늘 더 어둡게 (폭풍 오버레이) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(6,10,18,0.6) 0%, rgba(10,16,26,0.35) 45%, transparent 75%)',
        animation: 'stormDark 7s ease-in-out infinite',
      }} />

      {/* 천둥 번개 flash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 60% 20%, rgba(200,220,255,0.9), rgba(160,190,255,0.3) 40%, transparent 70%)',
        animation: 'lightning 8s linear infinite',
        mixBlendMode: 'screen',
      }} />

      {/* 휘날리는 빗줄기 (바람에 기울어짐) */}
      {streaks.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: '1px',
            height: `${s.length}px`,
            background: `linear-gradient(to bottom, transparent, rgba(180,205,235,${s.opacity}))`,
            animation: `windStreak ${s.duration}s linear infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function WeatherEffects({ effects }: { effects: WeatherEffect[] }) {
  const isStorm = effects.includes('wind')
  return (
    <>
      {effects.includes('rain') && <RainLayer stormMode={isStorm} />}
      {effects.includes('fog') && <FogEffect />}
      {effects.includes('dustFog') && <DustFogEffect />}
      {effects.includes('horizonBlur') && <HorizonBlur />}
      {effects.includes('wind') && <WindLayer />}
    </>
  )
}