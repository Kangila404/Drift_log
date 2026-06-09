export type NoiseKey = 'rain' | 'wave' | 'fire'

const SOURCES: Record<NoiseKey, string> = {
  rain: '/sound/rain.mp3',
  wave: '/sound/wave.mp3',
  fire: '/sound/fire.mp3',
}

const emitNoiseChange = () => window.dispatchEvent(new Event('noise-change'))

class NoiseManager {
  private els: Partial<Record<NoiseKey, HTMLAudioElement>> = {}
  private current: NoiseKey | null = null
  private muted = false

  private get(key: NoiseKey): HTMLAudioElement {
    if (!this.els[key]) {
      const el = new Audio(SOURCES[key])
      el.loop = true
      el.volume = 0.6
      this.els[key] = el
    }
    return this.els[key]!
  }

  select(key: NoiseKey | null) {
    ;(Object.keys(this.els) as NoiseKey[]).forEach(k => {
      if (k !== key) this.els[k]?.pause()
    })
    if (key === null || this.current === key) {
      if (this.current) this.els[this.current]?.pause()
      this.current = null
      emitNoiseChange()   // ← 끌 때도 발사
      return
    }
    this.current = key
    if (!this.muted) {
      const el = this.get(key)
      el.currentTime = 0
      el.play().catch(() => {})
    }
    emitNoiseChange()     // ← 켤 때 발사
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    if (this.muted) {
      if (this.current) this.els[this.current]?.pause()
    } else if (this.current) {
      this.get(this.current).play().catch(() => {})
    }
    return this.muted
  }

  isMuted() { return this.muted }
  getCurrent(): NoiseKey | null { return this.current }

  stopAll() {
    ;(Object.keys(this.els) as NoiseKey[]).forEach(k => this.els[k]?.pause())
    this.current = null
    emitNoiseChange()
  }
}

export const noise = new NoiseManager()