import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { NOISE_AUDIO } from "../constants/assets";

export type NoiseKey = "rain" | "wave" | "fire";

// require된 오디오 모듈 매핑 (웹 /sound/ 와 동일 음원)
const NOISE_SOURCE: Record<NoiseKey, any> = {
  rain: NOISE_AUDIO.rain,
  wave: NOISE_AUDIO.wave,
  fire: NOISE_AUDIO.fire,
};

const VOLUME = 0.6;

let player: AudioPlayer | null = null;
let current: NoiseKey | null = null;
let muted = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

function killPlayer() {
  if (player) {
    try { player.pause(); player.remove(); } catch {}
    player = null;
  }
}

async function ensureMode() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" });
  } catch {}
}

export const nativeNoise = {
  getCurrent: () => current,
  isMuted: () => muted,

  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  async select(key: NoiseKey | null) {
    if (key === null) {
      killPlayer();
      current = null;
      notify();
      return;
    }
    if (current === key && player) {
      if (!muted) { try { player.play(); } catch {} }
      return;
    }
    await ensureMode();
    killPlayer();
    const source = NOISE_SOURCE[key];
    if (!source) return;
    try {
      player = createAudioPlayer(source);
      player.loop = true;
      player.volume = muted ? 0 : VOLUME;
      player.play();
      current = key;
      notify();
    } catch {}
  },

  toggleMute() {
    muted = !muted;
    if (player) { try { player.volume = muted ? 0 : VOLUME; } catch {} }
    notify();
    return muted;
  },

  setMuted(v: boolean) {
    muted = v;
    if (player) { try { player.volume = muted ? 0 : VOLUME; } catch {} }
    notify();
  },

  stopAll() {
    killPlayer();
    current = null;
    notify();
  },
};