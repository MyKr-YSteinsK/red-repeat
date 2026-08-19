import { describe, expect, it, vi } from 'vitest'
import { createServiceWorkerRegistrationOptions } from './register-service-worker-options'

describe('Service Worker registration policy', () => {
  it('registers immediately without prescribing a reload on update', () => {
    const options = createServiceWorkerRegistrationOptions()

    expect(options.immediate).toBe(true)
    expect(options.onNeedRefresh).toBeTypeOf('function')
    expect(options.onNeedReload).toBeTypeOf('function')
    expect(options.onOfflineReady).toBeTypeOf('function')
    expect(options.onRegisterError).toBeTypeOf('function')

    expect(() => options.onNeedRefresh?.()).not.toThrow()
    expect(() => options.onNeedReload?.()).not.toThrow()
    expect(() => options.onOfflineReady?.()).not.toThrow()
    expect(() => options.onRegisterError?.(new Error('registration failed'))).not.toThrow()
    expect(vi.isMockFunction(options.onNeedReload)).toBe(false)
  })
})
