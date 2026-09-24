import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useVoyageStore } from '../../stores/voyageStore'
import { useBoatStore, type BoatColors } from '../../stores/boatStore'
import type { ScenePreset } from '../../constants/scenePreset'
import Campfire from './Campfire'
import VoyagerModel from './boat/VoyagerModel'
import { VOYAGER_DRAFT } from './boat/VoyagerGeometry'
import type { OceanSurfaceState } from './OceanWaves'
import { advanceBoatMotion, createBoatMotion, sampleBoatMotionTarget } from './BoatMotion'
import BoatWake from './voyage/BoatWake'
import { advanceVoyageNavigation, type VoyageNavigationRef } from './voyage/VoyageNavigation'

// ── 녹(rust) ──
const RUST_COLOR = '#357f6e'      // 녹청 (구리 부식 톤)
const RUST_FULL_SEC = 1200        // 항해 누적 ~20분이면 최대 녹
const RUST_FLUSH_SEC = 4          // 4초마다 store 반영 (localStorage 쓰기 빈도 제한)
/** hex를 녹색 쪽으로 amt만큼 섞기 (0~1) */
function rustMix(hex: string, amt: number) {
  if (amt <= 0) return hex
  return '#' + new THREE.Color(hex).lerp(new THREE.Color(RUST_COLOR), Math.min(1, amt)).getHexString()
}

// VoyagePage의 <Wake /> 가 깨지지 않도록 남겨둔 빈 컴포넌트
export function Wake() {
  return null
}

interface BoatProps {
  preset?: ScenePreset
  forceSailing?: boolean
  fireActive?: boolean
  presentationOnly?: boolean
  navigation?: VoyageNavigationRef
  playing?: boolean
  wakeEnabled?: boolean
}

export default function Boat({ preset, forceSailing, fireActive = false, presentationOnly = false, navigation, playing = true, wakeEnabled = !presentationOnly }: BoatProps) {
  const placement = useRef<THREE.Group>(null)
  const wakePose = useRef({ x: 0, heading: 0, speed: 0 })
  const boatRef = useRef<THREE.Group>(null)
  const waterSample = useRef({ height: 0, slopeX: 0, slopeZ: 0 })
  const motion = useRef(createBoatMotion())
  const motionTarget = useRef({ height: 0, pitch: 0, roll: 0 })
  const colors = useBoatStore((s) => s.colors)
  const rust = useBoatStore((s) => s.rust)
  const sailing = useVoyageStore((s) => forceSailing ?? (s.voyageState === 'SAILING'))

  // 로그인 후 1회: 서버에 저장된 보트 색 불러오기
  useEffect(() => {
    if (presentationOnly) return
    const hasToken = !!localStorage.getItem('accessToken')   // ← 토큰 저장 키에 맞게 수정
    if (hasToken) {
      useBoatStore.getState().loadFromServer()
    }
  }, [presentationOnly])

  // 시각용 rust — store rust를 lerp로 부드럽게 추적 (청소 시 스르륵 빠짐)
  const displayRustRef = useRef(rust)
  const [displayRust, setDisplayRust] = useState(rust)

  useFrame(() => {
    const target = rust
    const cur = displayRustRef.current
    if (Math.abs(target - cur) > 0.001) {
      displayRustRef.current = cur + (target - cur) * 0.12
      setDisplayRust(displayRustRef.current)
    } else if (cur !== target) {
      displayRustRef.current = target
      setDisplayRust(target)
    }
  })

  // 녹 적용 — displayRust(추적값) 기준
  const displayColors = useMemo<BoatColors>(() => ({
    sail: rustMix(colors.sail, displayRust * 0.45),
    hull: rustMix(colors.hull, displayRust * 0.9),
    lamp: colors.lamp,
  }), [colors, displayRust])

  const daylight = preset?.celestialBody === 'sun'   // 낮 = 돛 약하게 발광

  // 항해 중 녹 누적 (4초마다 store 반영)
  const rustAccum = useRef(0)
  const rustFlush = useRef(0)

  useFrame((state, delta) => {
    const vs = useVoyageStore.getState().voyageState
    const sailing = forceSailing ?? (vs === 'SAILING')

    // 녹은 항해 중일 때만 누적
    if (sailing && !presentationOnly && playing) {
      rustAccum.current += delta
      rustFlush.current += delta
      if (rustFlush.current >= RUST_FLUSH_SEC) {
        useBoatStore.getState().addRust(rustAccum.current / RUST_FULL_SEC)
        rustAccum.current = 0
        rustFlush.current = 0
      }
    }

    if (!boatRef.current) return

    const dt = playing ? Math.min(.05, delta) : 0
    if (navigation) {
      advanceVoyageNavigation(navigation.current, dt, sailing)
      Object.assign(wakePose.current, { x: navigation.current.x, heading: navigation.current.heading, speed: navigation.current.speed })
    } else {
      wakePose.current.speed += ((sailing ? 1 : 0) - wakePose.current.speed) * -Math.expm1(-2 * dt)
    }
    const pose = wakePose.current
    if (placement.current) {
      placement.current.position.x = pose.x
      placement.current.rotation.y = pose.heading
    }

    const surface = state.scene.userData.oceanSurface as OceanSurfaceState | undefined
    if (surface) {
      sampleBoatMotionTarget(pose.x, -4, 1.8, surface, motionTarget.current, waterSample.current, pose.heading)
    } else {
      motionTarget.current.height = 0
      motionTarget.current.pitch = 0
      motionTarget.current.roll = 0
    }
    if (advanceBoatMotion(motion.current, motionTarget.current, delta)) state.invalidate()
    boatRef.current.position.y = motion.current.height / 1.8
    boatRef.current.rotation.x = motion.current.pitch
    boatRef.current.rotation.z = motion.current.roll
  }, -1)

  return (
    <>
    {wakeEnabled && <BoatWake pose={wakePose} playing={playing} />}
    <group ref={placement} name="Navigable boat" position={[0, -2.0, -4]} scale={1.8}>

      <group ref={boatRef}>
        <VoyagerModel colors={displayColors} rust={displayRust} daylight={daylight} sailing={sailing} playing={playing} />

        {/* 모닥불 — 갑판 위, 배 출렁임 따라 흔들림 */}
        <Campfire active={fireActive} position={[0, 0.42 - VOYAGER_DRAFT, 1.25]} scale={0.4} />
      </group>
    </group>
    </>
  )
}
