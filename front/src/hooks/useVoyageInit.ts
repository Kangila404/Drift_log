import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { useVoyageStore } from '../stores/voyageStore'

// cityId → bgmUrl (DB city.bgm_url 규칙과 동일)
const CITY_BGM: Record<number, string> = {
  1: '/city/seoul_bgm.mp3',
  2: '/city/incheon_bgm.mp3',
  3: '/city/daejeon_bgm.mp3',
  4: '/city/gangneung_bgm.mp3',
  5: '/city/busan_bgm.mp3',
  6: '/city/suwon_bgm.mp3',
  7: '/city/gwangju_bgm.mp3',
  8: '/city/daegu_bgm.mp3',
  9: '/city/pohang_bgm.mp3',
  10: '/city/jeju_bgm.mp3',
}

export function useVoyageInit() {
  const {
    setVoyageState,
    setCurrentCity,
    setDestinationCityId,
    setProgress,
    setIsFamilyReunited,
    setRemainingSeconds,
  } = useVoyageStore()

  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await apiClient.get('/map')

        setVoyageState(data.voyageState)
        setProgress(data.progress ?? 0)
        setIsFamilyReunited(data.isFamilyReunited ?? false)

        if (data.remainingSeconds != null) {
          setRemainingSeconds(data.remainingSeconds)
        }

        if (data.destinationCity?.cityId) {
          setDestinationCityId(data.destinationCity.cityId)
        }

        const city = data.currentCity ?? data.departedCity
        if (city?.cityId) {
          setCurrentCity({
            cityId: city.cityId,
            name: city.cityName,
            bgmUrl: city.bgmUrl ?? CITY_BGM[city.cityId] ?? '',
          })
        }

      } catch (e) {
        console.error('항해 상태 초기화 실패:', e)
      } finally {
        setReady(true)
      }
    }

    init()
  }, [])

  return { ready }
}