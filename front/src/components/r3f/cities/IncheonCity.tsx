import { useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { FileLoader } from 'three'
import { OCEAN_SURFACE_Y } from '../OceanWater'
import CityGeometry from '../city/CityGeometry'
import { buildChinatownNeighborhood, buildChinatownLandmark } from '../incheon/ChinatownNeighborhood'
import { createChinatownShading } from '../incheon/ChinatownShading'
import townDesktopAO from '../incheon/baked/town-desktop.bin?url'
import townPortraitAO from '../incheon/baked/town-portrait.bin?url'
import gateDesktopAO from '../incheon/baked/gate-desktop.bin?url'
import gatePortraitAO from '../incheon/baked/gate-portrait.bin?url'

const TOWN_PALETTE = { concrete: '#879b9f', edge: '#5a7480', paint: '#617b78', faded: '#6a7779', trim: '#91a4a4', steel: '#4d6f73', rust: '#796165' }
const GATE_PALETTE = { concrete: '#95a5a6', edge: '#726e65', paint: '#a69a73', faded: '#496c6e', trim: '#b1aa8a', steel: '#43585f', rust: '#93686d' }

export default function IncheonCity() {
  const { size } = useThree()
  const portrait = size.width / size.height < .9
  const [townAO, gateAO] = useLoader(FileLoader, portrait ? [townPortraitAO, gatePortraitAO] : [townDesktopAO, gateDesktopAO], loader => loader.setResponseType('arraybuffer')) as ArrayBuffer[]
  const shading = useMemo(() => ({ town: createChinatownShading(townAO), gate: createChinatownShading(gateAO) }), [townAO, gateAO])
  const builders = useMemo(() => ({
    town: (kit: Parameters<typeof buildChinatownNeighborhood>[0]) => buildChinatownNeighborhood(kit, portrait),
    gate: (kit: Parameters<typeof buildChinatownLandmark>[0]) => buildChinatownLandmark(kit, portrait),
  }), [portrait])
  return <group name="Incheon city geometry" position={[0, OCEAN_SURFACE_Y - 4.25, 0]} userData={{ artSource: 'modeled-geometry', imageTextures: 0 }}>
    <CityGeometry name="Incheon Chinatown neighborhood" build={builders.town} palette={TOWN_PALETTE} prepare={shading.town} />
    <CityGeometry name="Incheon Chinatown gateway landmark" build={builders.gate} palette={GATE_PALETTE} prepare={shading.gate} />
  </group>
}
