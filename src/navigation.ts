export type AppRoute =
  | { kind: 'library' }
  | { kind: 'edition'; songId: string; continueLast?: true; practiceQueueItemId?: string }
  | { kind: 'settings'; releaseVersion?: string }
  | { kind: 'timing-debugger'; songId?: string; occurrenceId?: string; returnToEdition?: true }
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
  const occurrenceId = params.has('occurrence')
    ? params.get('occurrence') ?? ''
    : undefined
  const practiceQueueItemId = params.get('practiceItem')?.trim()
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
      ...(songId && occurrenceId !== undefined ? { occurrenceId } : {}),
      ...(songId && params.get('return') === 'edition'
        ? { returnToEdition: true as const }
        : {}),
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

  return songId
    ? {
        kind: 'edition',
        songId,
        ...(practiceQueueItemId ? { practiceQueueItemId } : {}),
        ...(!practiceQueueItemId && params.get('continue') === '1'
          ? { continueLast: true as const }
          : {}),
      }
    : { kind: 'library' }
}

export function createLibraryHref(location: NavigationLocation): string {
  return `${createAppPath(location)}#library`
}

export function createEditionHref(
  songId: string,
  location: NavigationLocation,
): string {
  return `${createAppPath(location)}#edition=${encodeURIComponent(songId)}`
}

export function createContinueHref(
  songId: string,
  location: NavigationLocation,
): string {
  return `${createAppPath(location)}#edition=${encodeURIComponent(songId)}&continue=1`
}

export function createPracticeQueueHref(
  songId: string,
  itemId: string,
  location: NavigationLocation,
): string {
  return `${createAppPath(location)}#edition=${encodeURIComponent(songId)}&practiceItem=${encodeURIComponent(itemId)}`
}

export function createTimingDebuggerHref(
  songId: string | undefined,
  location: NavigationLocation,
  occurrenceId?: string,
  options: { returnToEdition?: boolean } = {},
): string {
  const query = songId ? `&edition=${encodeURIComponent(songId)}` : ''
  const occurrence = songId && occurrenceId !== undefined
    ? `&occurrence=${encodeURIComponent(occurrenceId)}`
    : ''
  const returnToEdition = songId && options.returnToEdition
    ? '&return=edition'
    : ''
  return `${createAppPath(location)}#timing=debug${query}${occurrence}${returnToEdition}`
}

export function createSettingsHref(
  location: NavigationLocation,
  releaseVersion?: string,
): string {
  const suffix = releaseVersion
    ? `&release=${encodeURIComponent(releaseVersion)}`
    : ''
  return `${createAppPath(location)}#settings${suffix}`
}

function createAppPath(location: NavigationLocation): string {
  return `${location.pathname}${location.search}`
}
