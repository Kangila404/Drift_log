import { Canvas } from "@react-three/fiber";
import { useWeather } from "../../contexts/WeatherContext";
import { useTimeOfDay } from "../../hooks/useTimeOfDay";
import { resolveScene } from "../../constants/scenePreset";
import OceanWater from "./OceanWater";
import OceanSky from "./OceanSky";
import WakeParticles from "./WakeParticles";

export default function OceanScene() {
  const { weatherId, abnormalType } = useWeather();
  const timeOfDay = useTimeOfDay();

  const preset = resolveScene({ weatherId, abnormalType, timeOfDay });

  return (
    <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
      <fogExp2 attach="fog" args={[preset.fogColor, preset.fogDensity]} />
      <ambientLight intensity={preset.ambientIntensity} />
      <OceanWater preset={preset} />
      {preset.showMoon && <OceanSky preset={preset} />}
      <WakeParticles />
    </Canvas>
  );
}