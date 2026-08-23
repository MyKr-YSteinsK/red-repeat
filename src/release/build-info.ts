declare const __RED_REPEAT_VERSION__: string | undefined
declare const __RED_REPEAT_BUILD_SHA__: string | undefined
declare const __RED_REPEAT_BUILD_ENVIRONMENT__: string | undefined

export const buildInfo = Object.freeze({
  version:
    typeof __RED_REPEAT_VERSION__ === 'string'
      ? __RED_REPEAT_VERSION__
      : '1.2.5',
  commit:
    typeof __RED_REPEAT_BUILD_SHA__ === 'string'
      ? __RED_REPEAT_BUILD_SHA__
      : 'local',
  environment:
    typeof __RED_REPEAT_BUILD_ENVIRONMENT__ === 'string'
      ? __RED_REPEAT_BUILD_ENVIRONMENT__
      : 'local',
})
