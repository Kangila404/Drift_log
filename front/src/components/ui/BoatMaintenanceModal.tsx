import Boat from '../r3f/Boat'
import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import {
  useBoatStore,
  BOAT_PRESETS,
  SAIL_SWATCHES,
  HULL_SWATCHES,
  LAMP_SWATCHES,
} from '../../stores/boatStore'
import type { ScenePreset } from '../../constants/scenePreset'

// 미리보기용: 달 분위기로 갑판등 켜고, 아주 약하게만 흔들리게
const previewPreset = {
  celestialBody: 'moon',
  waveScale: 0.5,
  waveSpeed: 0.9,
} as ScenePreset

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={color}
      className="relative h-8 w-8 rounded-full border border-white/15 transition-transform hover:scale-110"
      style={{ backgroundColor: color }}
    >
      {active && <span className="pointer-events-none absolute -inset-[3px] rounded-full ring-2 ring-white/80" />}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] tracking-[0.2em] text-white/45">{title}</span>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  )
}

export default function BoatMaintenanceModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const colors = useBoatStore((s) => s.colors)
  const setColor = useBoatStore((s) => s.setColor)
  const applyPreset = useBoatStore((s) => s.applyPreset)
  const reset = useBoatStore((s) => s.reset)

  const activePreset = Object.entries(BOAT_PRESETS).find(
    ([, p]) => p.sail === colors.sail && p.hull === colors.hull && p.lamp === colors.lamp,
  )?.[0]

  // ESC로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-[min(600px,92vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1620]/95 shadow-2xl"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 pb-3 pt-5">
              <div className="flex flex-col">
                <span className="text-sm tracking-[0.18em] text-white/80">배 정비</span>
                <span className="mt-0.5 text-[11px] text-white/35">배 정비를 자주해주자, 따개비가 낄 수 있으니</span>
              </div>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="rounded-full px-2 text-lg text-white/40 transition-colors hover:text-white/80"
              >
                ✕
              </button>
            </div>

            {/* 3D 미리보기 */}
            <div className="relative mx-6 h-[280px] overflow-hidden rounded-xl border border-white/8 bg-[#0a141e]">
              <Canvas
                camera={{ position: [0.6, 1.4, 2.4], fov: 45 }}
                gl={{ antialias: true }}
                onCreated={({ scene }) => {
                  scene.fog = new THREE.FogExp2('#0a141e', 0.05)
                }}
              >
                <color attach="background" args={['#0a141e']} />
                <ambientLight intensity={0.55} />
                <directionalLight position={[3, 5, 4]} intensity={0.7} color="#bcd0e0" />
                <directionalLight position={[-3, 2, -2]} intensity={0.25} color="#6a86a0" />
                <Boat preset={previewPreset} />
                <OrbitControls
                    target={[0, 0.5, -4]}
                    enablePan={false}
                    minDistance={3.5}
                    maxDistance={9}
                    minPolarAngle={0.2}
                    maxPolarAngle={Math.PI - 0.15}
                    enableDamping
                    dampingFactor={0.08}
                    autoRotate
                    autoRotateSpeed={0.6}
                  />
              </Canvas>
              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/30">
                드래그해서 둘러보기
              </span>
            </div>

            {/* 컨트롤 */}
            <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
              <div className="flex items-center justify-between">
                <Section title="분위기">
                  {Object.entries(BOAT_PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className={[
                        'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                        activePreset === key
                          ? 'border-white/60 bg-white/10 text-white'
                          : 'border-white/15 text-white/55 hover:bg-white/5',
                      ].join(' ')}
                    >
                      {p.label}
                    </button>
                  ))}
                </Section>
              </div>

              <div className="h-px bg-white/8" />

              <Section title="돛">
                {SAIL_SWATCHES.map((c) => (
                  <Swatch key={c} color={c} active={colors.sail === c} onClick={() => setColor('sail', c)} />
                ))}
              </Section>

              <Section title="선체">
                {HULL_SWATCHES.map((c) => (
                  <Swatch key={c} color={c} active={colors.hull === c} onClick={() => setColor('hull', c)} />
                ))}
              </Section>

              <Section title="등불">
                {LAMP_SWATCHES.map((c) => (
                  <Swatch key={c} color={c} active={colors.lamp === c} onClick={() => setColor('lamp', c)} />
                ))}
              </Section>

              <button
                onClick={reset}
                className="self-start text-[11px] text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
              >
                초기화
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}