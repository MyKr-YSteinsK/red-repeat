import type { AudioEngine } from '../audio/audio-engine'
import { LinerLyrics } from './LinerLyrics'
import { useSongEditionPlayback } from './use-song-edition-playback'
import type { RuntimeClient } from '../runtime/runtime-client'
import type { AssembledSongEdition } from '../runtime/song-edition'

export interface SongEditionPlaybackSurfaceProps {
  model: AssembledSongEdition
  runtimeClient: RuntimeClient
  audioEngine?: AudioEngine
}

export function SongEditionPlaybackSurface({
  model,
  runtimeClient,
  audioEngine,
}: SongEditionPlaybackSurfaceProps) {
  const playback = useSongEditionPlayback(model, runtimeClient, audioEngine)
  const activeOccurrenceIds = new Set(
    playback.resolution.activeOccurrences.map(({ id }) => id),
  )
  const sectionLabel = playback.resolution.currentSection?.label ?? 'Gap'

  return (
    <section
      className="song-playback-surface"
      aria-label="Song timeline playback"
      data-engine-active-occurrence-id={
        playback.audioState.activeOccurrenceId
      }
      data-selected-occurrence-id={playback.selectedOccurrenceId}
    >
      <p className="playback-context" role="status">
        <span>NOW / {sectionLabel}</span>
        <span>
          {playback.resolution.primaryOccurrence
            ? `Line ${playback.resolution.primaryOccurrence.id}`
            : 'No lyric active'}
        </span>
      </p>
      <LinerLyrics
        model={model}
        activeOccurrenceIds={activeOccurrenceIds}
        primaryOccurrenceId={playback.resolution.primaryOccurrence?.id}
        selectedOccurrenceId={playback.selectedOccurrenceId}
        onSelectOccurrence={playback.selectOccurrence}
      />
    </section>
  )
}
