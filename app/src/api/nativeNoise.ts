import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { assetUrl } from "./config";

export type NoiseKey = "rain" | "wave" | "fire";

// 음원 경로 — 웹 noiseManager와 동일 (/sound/)
const NOISE_URL: Record<NoiseKey, string> = {
  rain: "/sound/rain.mp3",
  wave: "/sound/wave.mp3",
  fire: "/sound/fire.mp3",
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
    // 이미 같은 소리면 재생만 보장
    if (current === key && player) {
      if (!muted) { try { player.play(); } catch {} }
      return;
    }
    await ensureMode();
    killPlayer();
    const url = assetUrl(NOISE_URL[key]);
    if (!url) return;
    try {
      player = createAudioPlayer({ uri: url });
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