import { useEffect } from 'react'
import type { VoyageNavigationRef } from '../components/r3f/voyage/VoyageNavigation'
import { createNativeNavigationReceiver } from '../components/r3f/voyage/NativeVoyageNavigation'
import { isNativeApp, sendNavigationAvailability } from '../lib/nativeBridge'

export function useNativeVoyageNavigation(navigation: VoyageNavigationRef, available: boolean, canSteer: boolean) {
  useEffect(() => {
    if (!isNativeApp()) return
    const publish = () => sendNavigationAvailability({ available, canSteer })
    const receiver = createNativeNavigationReceiver(navigation, { available, canSteer }, publish, () => document.hidden)
    const receive = (event: MessageEvent) => receiver.receive(event.data)
    window.addEventListener('message', receive)
    document.addEventListener('message', receive as EventListener)
    window.addEventListener('blur', receiver.clear)
    document.addEventListener('visibilitychange', receiver.clear)
    publish()
    return () => {
      receiver.clear()
      window.removeEventListener('message', receive)
      document.removeEventListener('message', receive as EventListener)
      window.removeEventListener('blur', receiver.clear)
      document.removeEventListener('visibilitychange', receiver.clear)
      sendNavigationAvailability({ available: false, canSteer: false })
    }
  }, [navigation, available, canSteer])
}
