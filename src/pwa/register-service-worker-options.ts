import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

export interface ServiceWorkerRegistrationCallbacks {
  onNeedRefresh?: RegisterSWOptions['onNeedRefresh']
  onNeedReload?: RegisterSWOptions['onNeedReload']
  onOfflineReady?: RegisterSWOptions['onOfflineReady']
  onRegisteredSW?: RegisterSWOptions['onRegisteredSW']
  onRegisterError?: RegisterSWOptions['onRegisterError']
}

export function createServiceWorkerRegistrationOptions(
  callbacks: ServiceWorkerRegistrationCallbacks = {},
): RegisterSWOptions {
  return {
    immediate: true,
    onNeedRefresh: callbacks.onNeedRefresh ?? (() => undefined),
    onNeedReload: callbacks.onNeedReload ?? (() => undefined),
    onOfflineReady: callbacks.onOfflineReady ?? (() => undefined),
    onRegisteredSW: callbacks.onRegisteredSW,
    onRegisterError: callbacks.onRegisterError ?? (() => undefined),
  }
}
