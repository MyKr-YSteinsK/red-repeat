import type { SectionCue, VisualDocument } from '../library/schema'
import type { EditionTheme } from './theme-preference'

export type CompositionVariant =
  | 'editorial-standard'
  | 'editorial-offset'
  | 'left'
  | 'center'
  | 'offset-right'
  | 'split'
  | 'wide-isolated'
  | 'edge'
  | 'quiet-left'
  | 'centered'
  | 'low-field'

export interface ArtDirection {
  density: NonNullable<VisualDocument['density']>
  energy: NonNullable<VisualDocument['energy']>
  motion: NonNullable<VisualDocument['motion']>
  coverTreatment: NonNullable<VisualDocument['coverTreatment']>
  compositionVariant: CompositionVariant
  sectionCueById: ReadonlyMap<string, SectionCue['cue']>
}

const COMPOSITION_VARIANTS: Record<
  EditionTheme,
  readonly CompositionVariant[]
> = {
  liner: ['editorial-standard', 'editorial-offset'],
  cinema: ['left', 'center', 'offset-right', 'split', 'wide-isolated', 'edge'],
  nocturne: ['quiet-left', 'centered', 'low-field'],
}

export function resolveArtDirection(
  songId: string,
  visual: VisualDocument,
  theme: EditionTheme,
): ArtDirection {
  const mood = visual.mood ?? []
  const motifs = visual.motifs ?? []
  const seed = stableHash([
    songId,
    ...mood,
    ...motifs,
    theme,
  ].join('\u001f'))

  return {
    density: visual.density ?? (theme === 'nocturne' ? 'sparse' : 'balanced'),
    energy: visual.energy ?? 'restrained',
    motion: visual.motion ?? 'still',
    coverTreatment:
      visual.coverTreatment ??
      (theme === 'cinema'
        ? 'editorial'
        : theme === 'nocturne'
          ? 'atmospheric'
          : 'clean'),
    compositionVariant: pickVariant(COMPOSITION_VARIANTS[theme], seed),
    sectionCueById: new Map(
      (visual.sectionCues ?? []).map(({ sectionId, cue }) => [sectionId, cue]),
    ),
  }
}

export function getSectionCue(
  artDirection: ArtDirection,
  sectionId: string | undefined,
): SectionCue['cue'] | undefined {
  return sectionId ? artDirection.sectionCueById.get(sectionId) : undefined
}

export function stableHash(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function pickVariant(
  variants: readonly CompositionVariant[],
  seed: number,
): CompositionVariant {
  return variants[seed % variants.length]
}
