import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import OceanWater from '../components/r3f/OceanWater'
import OceanSky from '../components/r3f/OceanSky'
import { resolveScene } from '../constants/scenePreset'

// 도시 SVG
import Seoul from '../components/ui/cities/Seoul'
import Incheon from '../components/ui/cities/Incheon'
import Daejeon from '../components/ui/cities/Daejeon'
import Gangneung from '../components/ui/cities/Gangneung'
import Busan from '../components/ui/cities/Busan'
import Suwon from '../components/ui/cities/Suwon'
import Gwangju from '../components/ui/cities/Gwangju'
import Daegu from '../components/ui/cities/Daegu'
import Pohang from '../components/ui/cities/Pohang'
import Jeju from '../components/ui/cities/Jeju'

const CITIES: { id: number; name: string; Comp: React.ComponentType }[] = [
  { id: 1, name: '서울', Comp: Seoul },
  { id: 2, name: '인천', Comp: Incheon },
  { id: 3, name: '대전', Comp: Daejeon },
  { id: 4, name: '강릉', Comp: Gangneung },
  { id: 5, name: '부산', Comp: Busan },
  { id: 6, name: '수원', Comp: Suwon },
  { id: 7, name: '광주', Comp: Gwangju },
  { id: 8, name: '대구', Comp: Daegu },
  { id: 9, name: '포항', Comp: Pohang },
  { id: 10, name: '제주', Comp: Jeju },
]

// CityView 기본값과 동일한 맑은 낮 프리셋
const preset = resolveScene({ weatherId: 1, abnormalType: null, timeOfDay: 'day' })

export default function CityGalleryPage() {
  const [selected, setSelected] = useState(CITIES[0])
  const CityComponent = selected.Comp

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', backgroundColor: '#040c1a' }}>
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.2; transform: scaleX(1); }
          50% { opacity: 0.6; transform: scaleX(1.3); }
        }
      `}</style>

      {/* 바다 + 하늘 (CityView와 동일) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.2, 10], fov: 50 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
        >
          <color attach="background" args={[preset.fogColor]} />
          <fogExp2 attach="fog" args={[preset.fogColor, preset.fogDensity]} />
          <ambientLight intensity={preset.ambientIntensity} color="#4a6fa8" />
          <directionalLight position={[5, 8, -10]} intensity={0.8} color="#c8d8f0" />
          <OceanSky preset={preset} eclipsePhase={0} eclipseCoverage={0} />
          <OceanWater preset={preset} />
        </Canvas>
      </div>

      {/* 물 반사 shimmer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
        background: 'linear-gradient(to bottom, transparent, rgba(4, 12, 28, 0.6))',
        pointerEvents: 'none', zIndex: 2,
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${10 + i * 15}%`, bottom: `${8 + (i % 3) * 12}%`,
            width: `${40 + i * 8}px`, height: '1px',
            background: 'rgba(120, 180, 220, 0.25)', borderRadius: '50%',
            animation: `shimmer ${2.5 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`,
          }} />
        ))}
      </div>

      {/* 도시 SVG 실루엣 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
        <CityComponent />
      </div>

      {/* 도시 이름 */}
      <div style={{
        position: 'absolute', top: '8%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none',
      }}>
        <div style={{
          color: 'rgba(200, 220, 235, 0.9)', fontFamily: '"Noto Serif KR", serif',
          fontSize: '1.4rem', letterSpacing: '0.5em', fontWeight: 300,
          textShadow: '0 0 30px rgba(100,160,200,0.6)',
        }}>
          {selected.name}
        </div>
      </div>

      {/* 도시 선택 버튼 — 하단 */}
      <div style={{
        position: 'absolute', bottom: '4%', left: 0, right: 0,
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem',
        padding: '0 1rem', zIndex: 20,
      }}>
        {CITIES.map(city => {
          const active = city.id === selected.id
          return (
            <button
              key={city.id}
              onClick={() => setSelected(city)}
              className={`rounded font-serif whitespace-nowrap transition-colors duration-200 backdrop-blur-md
                         text-[0.75rem] tracking-[0.2em] px-4 py-2 border
                         ${active
                           ? 'border-[#7eb8d4]/80 text-[#cce8f5] bg-[#0a2233]/70'
                           : 'border-[#64a0c8]/30 text-[#b4d2e6]/70 bg-[#040c1c]/40 hover:border-[#64a0c8]/70 hover:text-[#c8e6f5]/95'}`}
            >
              {city.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}