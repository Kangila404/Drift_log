import { Howl, Howler } from 'howler'

type Track = 'voyage' | 'city' | 'ending' | null

let current: Howl | null = null
let currentTrack: Track = null
let currentCityUrl: string | null = null
let muted = false

const VOYAGE_URL = '/bgm/voyage.mp3'
const ENDING_URL = '/bgm/ending.mp3'

function fadeToNewTrack(url: string, track: Track) {
  // 같은 트랙(도시는 같은 url)이면 무시
  if (currentTrack === track && (track !== 'city' || currentCityUrl === url)) return

  // 이전 트랙 정리
  if (current) {
    const prev = current
    prev.fade(prev.volume(), 0, 800)
    setTimeout(() => {
      prev.stop()
      prev.unload()
    }, 850)
  }

  const next = new Howl({
    src: [url],
    loop: track !== 'ending',
    volume: 0,
    // html5 제거 → Web Audio 사용 (풀 제한 없음, 새로고침 반복해도 고갈 X)
  })

  next.once('play', () => {
    next.fade(0, muted ? 0 : 0.5, 1200)
  })
  next.play()

  current = next
  currentTrack = track
  currentCityUrl = track === 'city' ? url : null
}

export const bgm = {
  playVoyage() {
    fadeToNewTrack(VOYAGE_URL, 'voyage')
  },
  playCity(url: string) {
    if (!url) return
    fadeToNewTrack(url, 'city')
  },
  playEnding() {
    fadeToNewTrack(ENDING_URL, 'ending')
  },
  stop() {
    if (current) {
      const c = current
      c.fade(c.volume(), 0, 600)
      setTimeout(() => { c.stop(); c.unload() }, 650)
    }
    current = null
    currentTrack = null
    currentCityUrl = null
  },
  toggleMute() {
    muted = !muted
    Howler.mute(muted)
    return muted
  },
  isMuted() {
    return muted
  },
}

// 첫 사용자 상호작용 시 오디오 언락 (자동재생 정책)
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') ctx.resume()
    window.removeEventListener('click', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('click', unlock)
  window.addEventListener('keydown', unlock)
  window.addEventListener('touchstart', unlock)

  // 새로고침/이탈 시 현재 오디오 정리 (인스턴스 누수 방지)
  window.addEventListener('beforeunload', () => {
    Howler.unload()
  })
}