/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register'
import { createServiceWorkerRegistrationOptions } from './register-service-worker-options'

export function registerServiceWorker(): void {
  if (
    !import.meta.env.PROD ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return
  }

  try {
    registerSW(createServiceWorkerRegistrationOptions())
  } catch {
    // Registration is best-effort; the app remains usable without a SW.
  }
}
