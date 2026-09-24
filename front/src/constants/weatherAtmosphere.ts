import type { WeatherEffect } from './scenePreset'

export interface WeatherAtmosphere {
  cloudiness: number
  haze: number
  rain: number
  wind: number
  transmission: number
  stars: number
  foam: number
}

const CLEAR: WeatherAtmosphere = { cloudiness: 0, haze: 0, rain: 0, wind: 0, transmission: 1, stars: 1, foam: 0 }

// One optical profile drives sky, precipitation, source light and water response.
export function getWeatherAtmosphere(effects: readonly WeatherEffect[] = []): WeatherAtmosphere {
  const rain = effects.includes('rain'), wind = effects.includes('wind')
  if (rain && wind) return { cloudiness: 1, haze: .65, rain: 1, wind: 1, transmission: 0, stars: 0, foam: .55 }
  if (effects.includes('dustFog')) return { cloudiness: .78, haze: .95, rain: 0, wind: .12, transmission: .06, stars: 0, foam: 0 }
  if (effects.includes('fog')) return { cloudiness: .55, haze: 1, rain: 0, wind: 0, transmission: .1, stars: .015, foam: 0 }
  if (rain) return { cloudiness: .86, haze: .38, rain: .45, wind: .12, transmission: .12, stars: 0, foam: 0 }
  if (wind) return { cloudiness: .38, haze: .16, rain: 0, wind: .8, transmission: .68, stars: .42, foam: .42 }
  if (effects.includes('horizonBlur')) return { cloudiness: .42, haze: .5, rain: 0, wind: .08, transmission: .6, stars: .38, foam: 0 }
  return CLEAR
}
