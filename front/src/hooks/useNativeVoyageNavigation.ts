import { useEffect } from 'react'
import type { VoyageNavigationRef } from '../components/r3f/voyage/VoyageNavigation'
import { createNativeNavigationReceiver } from '../components/r3f/voyage/NativeVoyageNavigation'
import { isNativeApp, sendNavigationAvailability } from '../lib/nativeBridge'
import { VOYAGE_VIEWING_EVENT } from '../components/r3f/voyage/VoyageView'

export function useNativeVoyageNavigation(navigation: VoyageNavigationRef, available: boolean, canSteer: boolean) {
  useEffect(() => {
    if (!isNativeApp()) return
    const viewing = () => document.documentElement.dataset.voyageViewing === 'true'
    const availability = { available: available && !viewing(), canSteer: canSteer && !viewing() }
    const publish = () => sendNavigationAvailability(availability)
    const receiver = createNativeNavigationReceiver(navigation, availability, publish, () => document.hidden)
    const viewChanged = () => {
      availability.available = available && !viewing()
      availability.canSteer = canSteer && !viewing()
      receiver.clear()
      publish()
    }
    const receive = (event: MessageEvent) => receiver.receive(event.data)
    window.addEventListener('message', receive)
    document.addEventListener('message', receive as EventListener)
    window.addEventListener('blur', receiver.clear)
    document.addEventListener('visibilitychange', receiver.clear)
    window.addEventListener(VOYAGE_VIEWING_EVENT, viewChanged)
    publish()
    return () => {
      receiver.clear()
      window.removeEventListener('message', receive)
      document.removeEventListener('message', receive as EventListener)
      window.removeEventListener('blur', receiver.clear)
      document.removeEventListener('visibilitychange', receiver.clear)
      window.removeEventListener(VOYAGE_VIEWING_EVENT, viewChanged)
      sendNavigationAvailability({ available: false, canSteer: false })
    }
  }, [navigation, available, canSteer])
}
