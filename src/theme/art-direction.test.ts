import { describe, expect, it } from 'vitest'
import type { VisualDocument } from '../library/schema'
import {
  getSectionCue,
  resolveArtDirection,
  stableHash,
} from './art-direction'

const visual: VisualDocument = {
  recommendedTheme: 'cinema',
  mood: ['tender', 'wide'],
  motifs: ['window', 'tide'],
  energy: 'balanced',
  density: 'sparse',
  motion: 'slow',
  coverTreatment: 'editorial',
  sectionCues: [
    { sectionId: 'verse', cue: 'isolate' },
    { sectionId: 'chorus', cue: 'expand' },
  ],
}

describe('Theme Art Direction resolver', () => {
  it('is deterministic across repeated resolution and stable remount inputs', () => {
    const first = resolveArtDirection('first-light', visual, 'cinema')
    const second = resolveArtDirection('first-light', visual, 'cinema')

    expect(second).toEqual(first)
    expect([...second.sectionCueById]).toEqual([
      ['verse', 'isolate'],
      ['chorus', 'expand'],
    ])
    expect(stableHash('first-light')).toBe(stableHash('first-light'))
  })

  it('preserves authored mood and motif order in the seed material', () => {
    const reordered = resolveArtDirection(
      'first-light',
      {
        ...visual,
        mood: ['wide', 'tender'],
      },
      'cinema',
    )

    expect(reordered).toBeDefined()
    expect(stableHash('tender\u001fwide')).not.toBe(
      stableHash('wide\u001ftender'),
    )
  })

  it('maps every Theme to its renderer-owned variant set and restrained defaults', () => {
    const minimal: VisualDocument = { recommendedTheme: 'liner' }
    const liner = resolveArtDirection('song', minimal, 'liner')
    const cinema = resolveArtDirection('song', minimal, 'cinema')
    const nocturne = resolveArtDirection('song', minimal, 'nocturne')

    expect(liner).toMatchObject({
      density: 'balanced',
      energy: 'restrained',
      motion: 'still',
      coverTreatment: 'clean',
    })
    expect(cinema.coverTreatment).toBe('editorial')
    expect(nocturne).toMatchObject({
      density: 'sparse',
      coverTreatment: 'atmospheric',
    })
    expect([
      'editorial-standard',
      'editorial-offset',
    ]).toContain(liner.compositionVariant)
    expect([
      'left',
      'center',
      'offset-right',
      'split',
      'wide-isolated',
      'edge',
    ]).toContain(cinema.compositionVariant)
    expect(['quiet-left', 'centered', 'low-field']).toContain(
      nocturne.compositionVariant,
    )
  })

  it('resolves Section cues by authored Section ID and tolerates missing cues', () => {
    const direction = resolveArtDirection('first-light', visual, 'cinema')

    expect(getSectionCue(direction, 'verse')).toBe('isolate')
    expect(getSectionCue(direction, 'missing')).toBeUndefined()
    expect(getSectionCue(direction, undefined)).toBeUndefined()
  })
})
