export type AppRoute =
  | { kind: 'library' }
  | { kind: 'edition'; songId: string }
  | { kind: 'settings'; releaseVersion?: string }
  | { kind: 'timing-debugger'; songId?: string }
  | { kind: 'timeline-debugger'; songId?: string }

type NavigationLocation = Pick<Location, 'hash' | 'pathname' | 'search'>

export function parseAppRoute(
  location: Pick<Location, 'hash'>,
  options: { devMode?: boolean } = {},
): AppRoute {
  const hash = location.hash.startsWith('#')
    ? location.hash.slice(1)
    : location.hash
  const params = new URLSearchParams(hash)
  const debugMode = params.get('debug')?.trim()
  const timingMode = params.get('timing')?.trim()
  const songId = params.get('edition')?.trim()
  const releaseVersion = params.get('release')?.trim()

  const devMode = import.meta.env.DEV && (options.devMode ?? true)

  if (params.has('settings')) {
    return {
      kind: 'settings',
      ...(releaseVersion ? { releaseVersion } : {}),
    }
  }

  if (timingMode === 'debug') {
    return {
      kind: 'timing-debugger',
      ...(songId ? { songId } : {}),
    }
  }

  if (debugMode === 'timeline' && !devMode) {
    return { kind: 'library' }
  }

  if (devMode && debugMode === 'timeline') {
    return {
      kind: 'timeline-debugger',
      ...(songId ? { songId } : {}),
    }
  }

  return songId ? { kind: 'edition', songId } : { kind: 'library' }
}

export function createLibraryHref(location: NavigationLocation): string {
  return `${location.pathname}${location.search}`
}

export function createEditionHref(
  songId: string,
  location: NavigationLocation,
): string {
  return `${createLibraryHref(location)}#edition=${encodeURIComponent(songId)}`
}

export function createTimingDebuggerHref(
  songId: string | undefined,
  location: NavigationLocation,
): string {
  const query = songId ? `&edition=${encodeURIComponent(songId)}` : ''
  return `${createLibraryHref(location)}#timing=debug${query}`
}

export function createSettingsHref(
  location: NavigationLocation,
  releaseVersion?: string,
): string {
  const suffix = releaseVersion
    ? `&release=${encodeURIComponent(releaseVersion)}`
    : ''
  return `${createLibraryHref(location)}#settings${suffix}`
}
