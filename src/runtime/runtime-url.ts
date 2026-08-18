const RUNTIME_PATH_PREFIX = '/library-runtime/'

export function resolveRuntimeAsset(
  logicalRuntimePath: string,
  appBaseUrl: string,
): string {
  validateLogicalRuntimePath(logicalRuntimePath)

  const normalizedBase = normalizeAppBaseUrl(appBaseUrl)
  const relativeRuntimePath = logicalRuntimePath.slice(1)

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(normalizedBase)) {
    return new URL(relativeRuntimePath, normalizedBase).toString()
  }

  return `${normalizedBase}${relativeRuntimePath}`
}

function validateLogicalRuntimePath(logicalRuntimePath: string): void {
  if (
    !logicalRuntimePath.startsWith(RUNTIME_PATH_PREFIX) ||
    logicalRuntimePath.includes('?') ||
    logicalRuntimePath.includes('#') ||
    logicalRuntimePath.split('/').some((segment) => segment === '..')
  ) {
    throw new Error(
      `runtime asset path must be a clean /library-runtime/ logical path: ${logicalRuntimePath}`,
    )
  }
}

function normalizeAppBaseUrl(appBaseUrl: string): string {
  const trimmedBase = appBaseUrl.trim()

  if (trimmedBase.length === 0) {
    throw new Error('app base URL must not be empty')
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmedBase)) {
    return trimmedBase.endsWith('/') ? trimmedBase : `${trimmedBase}/`
  }

  if (!trimmedBase.startsWith('/')) {
    throw new Error(`app base URL must be root-relative or absolute: ${appBaseUrl}`)
  }

  const withoutTrailingSlashes = trimmedBase.replace(/\/+$/, '')
  return withoutTrailingSlashes.length === 0
    ? '/'
    : `${withoutTrailingSlashes}/`
}
