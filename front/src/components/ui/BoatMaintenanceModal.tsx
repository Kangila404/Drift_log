import Boat from '../r3f/Boat'
import { useEffect, useRef, useState } from 'react'
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
      className="relative h-8 w-8 shrink-0 rounded-full border border-white/15 transition-transform hover:scale-110"
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

const rustLabel = (r: number) =>
  r > 0.66 ? '많이 낡음' : r > 0.33 ? '녹슴' : r > 0.05 ? '살짝 녹슴' : '깨끗함'

// 미리보기 위에 얹히는 청소 연출 (CSS wipe). 3D 안 건드림.
function CleanOverlay({ playKey }: { playKey: number }) {
  if (playKey === 0) return null
  return (
    <div key={playKey} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div className="dl-wipe absolute inset-x-0 top-0 h-1/2" />
      <style>{`
        @keyframes dlWipe {
          0%   { transform: translateY(-100%); opacity: 0; }
          15%  { opacity: 0.9; }
          100% { transform: translateY(220%); opacity: 0; }
        }
        .dl-wipe {
          background: linear-gradient(180deg,
            rgba(191,230,242,0) 0%,
            rgba(191,230,242,0.35) 45%,
            rgba(150,214,240,0.55) 55%,
            rgba(191,230,242,0) 100%);
          filter: blur(2px);
          animation: dlWipe 0.85s ease-in forwards;
        }
      `}</style>
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
  const rust = useBoatStore((s) => s.rust)
  const cleanBoat = useBoatStore((s) => s.cleanBoat)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cleanKey, setCleanKey] = useState(0)
  const cleanTimer = useRef<number | null>(null)

  const activePreset = Object.entries(BOAT_PRESETS).find(
    ([, p]) => p.sail === colors.sail && p.hull === colors.hull && p.lamp === colors.lamp,
  )?.[0]

  const markDirty = () => setSaved(false)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await useBoatStore.getState().saveToServer()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleClean = () => {
    if (rust <= 0) return
    setCleanKey((k) => k + 1)
    cleanBoat()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) { setSaved(false); setCleanKey(0) }
  }, [open])

  useEffect(() => {
    if (cleanKey === 0) return
    if (cleanTimer.current) window.clearTimeout(cleanTimer.current)
    cleanTimer.current = window.setTimeout(() => setCleanKey(0), 1000)
    return () => { if (cleanTimer.current) window.clearTimeout(cleanTimer.current) }
  }, [cleanKey])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1620] shadow-2xl"
          >
            {/* 헤더 */}
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm tracking-[0.18em] text-white/80">배 정비</span>
                <span className="mt-1 text-[11px] leading-relaxed text-white/35">
                  배 정비를 자주해주자, 따개비가 낄 수 있으니
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="-mr-1 shrink-0 rounded-full px-2 py-0.5 text-lg text-white/40 transition-colors hover:text-white/80"
              >
                ✕
              </button>
            </div>

            {/* 3D 미리보기 + 청소 오버레이 */}
            <div className="relative mx-5 h-[200px] shrink-0 overflow-hidden rounded-xl border border-white/8 bg-[#0a141e]">
              <Canvas
                camera={{ position: [0.7, 1.8, 4.0], fov: 45 }}
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
                  target={[0, 1.0, -4]}
                  enablePan={false}
                  minDistance={3.5}
                  maxDistance={11}
                  minPolarAngle={0.2}
                  maxPolarAngle={Math.PI - 0.15}
                  enableDamping
                  dampingFactor={0.08}
                  autoRotate
                  autoRotateSpeed={0.6}
                />
              </Canvas>
              <CleanOverlay playKey={cleanKey} />
              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/30">
                드래그해서 둘러보기
              </span>
            </div>

            {/* 컨트롤 (스크롤 영역) */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
              {/* 선체 상태(녹) + 청소 */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] tracking-[0.2em] text-white/45">선체 상태</span>
                  <span className="text-[10px] text-white/30">{rustLabel(rust)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#357f6e] transition-[width] duration-300"
                    style={{ width: `${Math.round(rust * 100)}%` }}
                  />
                </div>
                <button
                  onClick={handleClean}
                  disabled={rust <= 0}
                  className="w-full rounded-lg border border-white/15 px-4 py-2 text-xs text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  배 청소
                </button>
              </div>

              <div className="h-px bg-white/8" />

              <Section title="분위기">
                {Object.entries(BOAT_PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => { applyPreset(key); markDirty() }}
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

              <div className="h-px bg-white/8" />

              <Section title="돛">
                {SAIL_SWATCHES.map((c) => (
                  <Swatch key={c} color={c} active={colors.sail === c} onClick={() => { setColor('sail', c); markDirty() }} />
                ))}
              </Section>

              <Section title="선체">
                {HULL_SWATCHES.map((c) => (
                  <Swatch key={c} color={c} active={colors.hull === c} onClick={() => { setColor('hull', c); markDirty() }} />
                ))}
              </Section>

              <Section title="등불">
                {LAMP_SWATCHES.map((c) => (
                  <Swatch key={c} color={c} active={colors.lamp === c} onClick={() => { setColor('lamp', c); markDirty() }} />
                ))}
              </Section>

              <button
                onClick={() => { reset(); markDirty() }}
                className="self-start text-[11px] text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
              >
                초기화
              </button>
            </div>

            {/* 하단 저장 바 */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/8 px-5 py-3.5">
              <span className="min-w-0 flex-1 text-[11px] leading-snug text-white/35">
                {saved ? '저장되었습니다' : '저장을 눌러야 반영됩니다'}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/55 transition-colors hover:bg-white/5 hover:text-white/80"
                >
                  닫기
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="rounded-lg border border-white/30 bg-white/10 px-5 py-2 text-xs text-white transition-colors hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/10"
                >
                  {saving ? '저장 중…' : saved ? '저장됨' : '저장'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}