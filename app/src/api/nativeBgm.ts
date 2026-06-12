import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { assetUrl } from "./config";

// 항해 BGM 트랙. 웹 bgmManager와 동일한 역할을 네이티브에서 수행.
// 나중에 react-native-track-player로 교체 시 이 파일만 갈아끼우면 됨 (잠금화면/위젯 대응).

type Track = "voyage" | "city" | "ending" | null;

const VOYAGE_URL = assetUrl("/bgm/voyage.mp3")!;
const ENDING_URL = assetUrl("/bgm/ending.mp3")!;
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

// 현재 플레이어 완전 제거 (중첩 방지)
function killPlayer() {
  if (player) {
    try { player.pause(); } catch {}
    try { player.remove(); } catch {}
    player = null;
  }
  currentTrack = null;
  currentUrl = null;
}

function loadAndPlay(url: string, track: Track, loop: boolean) {
  // 같은 트랙(도시는 url까지) 재생 중이면 무시
  if (player && currentTrack === track && (track !== "city" || currentUrl === url)) return;

  killPlayer();

  try {
    const p = createAudioPlayer({ uri: url });
    p.loop = loop;
    p.volume = effectiveVolume();
    p.play();
    player = p;
    currentTrack = track;
    currentUrl = track === "city" ? url : null;
  } catch {}
}

export const nativeBgm = {
  async playVoyage() {
    await ensureAudioMode();
    loadAndPlay(VOYAGE_URL, "voyage", true);
  },
  async playCity(rawUrl: string) {
    if (!rawUrl) return;
    await ensureAudioMode();
    const url = rawUrl.startsWith("http") ? rawUrl : assetUrl(rawUrl)!;
    loadAndPlay(url, "city", true);
  },
  async playEnding() {
    await ensureAudioMode();
    loadAndPlay(ENDING_URL, "ending", false);
  },
  stop() {
    killPlayer();
    ducked = false;   // 덕킹 상태도 초기화 (음소거는 사용자 설정이라 유지)
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