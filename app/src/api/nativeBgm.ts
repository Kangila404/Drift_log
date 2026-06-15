import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { assetUrl } from "./config";
import { BGM_AUDIO } from "../constants/assets";

// 항해 BGM 트랙. 웹 bgmManager와 동일한 역할을 네이티브에서 수행.

type Track = "voyage" | "city" | "ending" | null;

const BASE_VOLUME = 0.5;

let player: AudioPlayer | null = null;
let currentTrack: Track = null;
let currentUrl: string | null = null;
let muted = false;
let ducked = false;
let audioModeSet = false;

function effectiveVolume() {
  if (muted || ducked) return 0;
  return BASE_VOLUME;
}

function applyVolume() {
  if (player) {
    try { player.volume = effectiveVolume(); } catch {}
  }
}

async function ensureAudioMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix",
  }).catch(() => {});
}

function killPlayer() {
  if (player) {
    try { player.pause(); } catch {}
    try { player.remove(); } catch {}
    player = null;
  }
  currentTrack = null;
  currentUrl = null;
}

// source: require된 모듈(number) 또는 {uri} 객체
function loadAndPlay(source: any, track: Track, loop: boolean, key: string) {
  if (player && currentTrack === track && (track !== "city" || currentUrl === key)) return;

  killPlayer();

  try {
    const p = createAudioPlayer(source);
    p.loop = loop;
    p.volume = effectiveVolume();
    p.play();
    player = p;
    currentTrack = track;
    currentUrl = track === "city" ? key : null;
  } catch {}
}

export const nativeBgm = {
  async playVoyage() {
    await ensureAudioMode();
    loadAndPlay(BGM_AUDIO.voyage, "voyage", true, "voyage");
  },
  async playCity(rawUrl: string) {
    if (!rawUrl) return;
    await ensureAudioMode();
    // 도시 BGM은 서버 URL로 올 수 있음 — 문자열이면 {uri}, 아니면 require 모듈
    const source = typeof rawUrl === "string"
      ? { uri: rawUrl.startsWith("http") ? rawUrl : assetUrl(rawUrl)! }
      : rawUrl;
    loadAndPlay(source, "city", true, String(rawUrl));
  },
  async playEnding() {
    await ensureAudioMode();
    loadAndPlay(BGM_AUDIO.ending, "ending", false, "ending");
  },
  stop() {
    killPlayer();
    ducked = false;
  },
  toggleMute() {
    muted = !muted;
    applyVolume();
    return muted;
  },
  setMuted(v: boolean) {
    muted = v;
    applyVolume();
  },
  isMuted() {
    return muted;
  },
  duck(on: boolean) {
    ducked = on;
    applyVolume();
  },
  async prime() {
    await ensureAudioMode();
  },
};