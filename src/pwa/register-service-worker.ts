/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register'
import { getUpdateManager } from './update-manager'

export function registerServiceWorker(): void {
  if (
    !import.meta.env.PROD ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return
  }

  try {
    getUpdateManager().register(registerSW)
  } catch {
    // Registration is best-effort; the app remains usable without a SW.
  }
}
