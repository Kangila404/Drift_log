import { apiClient } from '../api/client'
import { useVoyageStore } from '../stores/voyageStore'

export function useVoyageActions() {
  const {
    setVoyageState,
    setCurrentCity,
    setDestinationCityId,
    setDiscoveredTrace,
    setIsFamilyReunited,
    setCityArrival,
  } = useVoyageStore()

  const startVoyage = async (destinationCityId: number) => {
    const { data } = await apiClient.post('/voyages/start', { destinationCityId })
    setVoyageState('SAILING')
    setDestinationCityId(destinationCityId)
    useVoyageStore.getState().setCompleting(false) // 새 항해 시작 → complete 가드 해제
    // directionAngle 저장
    const angle = data.voyages?.[0]?.directionAngle ?? null
    if (angle !== null) useVoyageStore.getState().setDirectionAngle(angle)
    return data
  }

  const completeVoyage = async () => {
    // 중복 호출 방지 (StrictMode 이중 실행/재마운트/재시도 무관)
    if (useVoyageStore.getState().completing) return
    useVoyageStore.getState().setCompleting(true)

    // 항해 중 누적된 이벤트 id를 store에서 직접 읽어 전송
    const { occurredEventIds, clearOccurredEvents } = useVoyageStore.getState()

    const { data } = await apiClient.post('/voyages/complete', {
      eventIds: occurredEventIds,
    })

    if (data.arrivedCity) {
      setCurrentCity({
        cityId: data.arrivedCity.cityId,
        name: data.arrivedCity.cityName,
        bgmUrl: data.arrivedCity.bgmUrl,
      })

      // 첫 방문이면 도착 시퀀스용 데이터 저장, 아니면 비움
      if (data.isFirstVisit) {
        setCityArrival({
          cityName: data.arrivedCity.cityName,
          description: data.arrivedCity.description ?? '',  // 백엔드 오타(desription) 그대로
          imageUrl: data.arrivedCity.imgUrl ?? '',
        })
      } else {
        setCityArrival(null)
      }
    }

    setDiscoveredTrace(data.discoverdTrace ?? null)
    if (data.isEnding) setIsFamilyReunited(true)

    setVoyageState('ANCHORED')
    setDestinationCityId(null)

    clearOccurredEvents()
    return data
  }

  const stopVoyage = async () => {
    await apiClient.post('/voyages/stop')
    setVoyageState('PAUSED')
  }

  const resumeVoyage = async () => {
    await apiClient.post('/voyages/resume')
    setVoyageState('SAILING')
  }

  return { startVoyage, completeVoyage, stopVoyage, resumeVoyage }
}