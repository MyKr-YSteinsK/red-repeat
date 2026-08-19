import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

export function createServiceWorkerRegistrationOptions(): RegisterSWOptions {
  return {
    immediate: true,
    onNeedRefresh: () => undefined,
    onNeedReload: () => undefined,
    onOfflineReady: () => undefined,
    onRegisterError: () => undefined,
  }
}
