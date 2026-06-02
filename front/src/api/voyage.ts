import { apiClient } from './client'
import { useVoyageStore } from '../stores/voyageStore'

export async function completeVoyage() {
  const { occurredEventIds, clearOccurredEvents } = useVoyageStore.getState()

  const { data } = await apiClient.post('/voyages/complete', {
    eventIds: occurredEventIds,
  })

  // 도착 도시
  if (data.arrivedCity) {
    useVoyageStore.getState().setCurrentCity({
      cityId: data.arrivedCity.cityId,
      name: data.arrivedCity.cityName,
      bgmUrl: data.arrivedCity.bgmUrl ?? '',
    })
  }

  // 흔적
  useVoyageStore.getState().setDiscoveredTrace(
    data.discoverdTrace
      ? {
          familyMember: data.discoverdTrace.familyMember,
          content: data.discoverdTrace.content,
          imgUrl: data.discoverdTrace.imgUrl,
        }
      : null
  )

  // 엔딩
  if (data.isEnding) useVoyageStore.getState().setIsFamilyReunited(true)

  clearOccurredEvents()

  return data
}