import { Howl, Howler } from 'howler'

type Track = 'voyage' | 'city' | 'ending' | null

let current: Howl | null = null
let currentTrack: Track = null
let currentCityUrl: string | null = null
let muted = false

// ── 미리듣기 전용 플레이어 (메인 BGM과 분리) ──
let preview: Howl | null = null
let previewUrl: string | null = null
let previewRate = 1

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

  // ── seek 바용 (메인 트랙) ──
  duration() {
    return current ? current.duration() : 0
  },
  getSeek() {
    if (!current) return 0
    const s = current.seek()
    return typeof s === 'number' ? s : 0
  },
  setSeek(sec: number) {
    if (current) current.seek(sec)
  },

  // ─────────────────────────────────────────────
  // 미리듣기 전용 플레이어 — 메인 BGM(current)과 완전히 분리.
  // 음악 모달에서만 사용. 메인 BGM 상태를 건드리지 않으므로
  // 모달을 닫고 previewStop()만 부르면 항해/도시 BGM이 그대로 이어진다.
  // 단, 메인 BGM과 동시에 울리지 않도록 preview 재생 중엔 메인을 음소거 처리한다.
  // ─────────────────────────────────────────────
  preview(url: string) {
    if (!url) return
    // 기존 미리듣기 정리
    if (preview) { preview.stop(); preview.unload(); preview = null }
    // 메인 BGM 잠시 죽이기 (겹침 방지)
    if (current) current.volume(0)

    previewUrl = url
    previewRate = 1
    const p = new Howl({
      src: [url],
      loop: false,
      volume: muted ? 0 : 0.6,
      rate: 1,
    })
    p.play()
    preview = p
  },
  previewPause() {
    if (preview) preview.pause()
  },
  previewResume() {
    if (preview) preview.play()
  },
  previewStop() {
    if (preview) { preview.stop(); preview.unload(); preview = null }
    previewUrl = null
    previewRate = 1
    // 메인 BGM 볼륨 복원
    if (current) current.volume(muted ? 0 : 0.5)
  },
  previewIsPlaying() {
    return !!preview && preview.playing()
  },
  previewDuration() {
    return preview ? preview.duration() : 0
  },
  previewGetSeek() {
    if (!preview) return 0
    const s = preview.seek()
    return typeof s === 'number' ? s : 0
  },
  previewSetSeek(sec: number) {
    if (preview) preview.seek(sec)
  },
  previewSeekBy(delta: number) {
    if (!preview) return
    const dur = preview.duration() || 0
    const cur = typeof preview.seek() === 'number' ? (preview.seek() as number) : 0
    const target = Math.max(0, Math.min(dur, cur + delta))
    preview.seek(target)
  },
  previewSetRate(rate: number) {
    previewRate = rate
    if (preview) preview.rate(rate)
  },
  previewGetRate() {
    return previewRate
  },
  previewUrl() {
    return previewUrl
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