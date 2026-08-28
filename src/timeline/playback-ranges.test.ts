import { describe, expect, it, vi } from 'vitest'
import { createAudioEngine, type AudioMediaAdapter, type FrameScheduler } from '../audio/audio-engine'
import type { TimelineDocument } from '../library/schema'
import { resolveTimeline } from './resolver'
import {
  toOccurrencePlaybackRange,
  toOccurrencesPlaybackRange,
  toSectionPlaybackRange,
} from './playback-ranges'

const timeline: TimelineDocument = {
  audioSourceHash: 'a'.repeat(64),
  sections: [
    { id: 'verse-1', label: 'Verse 1', startMs: 100, endMs: 1000 },
    { id: 'instrumental', label: 'Instrumental', startMs: 1500, endMs: 2500 },
    { id: 'verse-2', label: 'Verse 2', startMs: 2500, endMs: 4000 },
  ],
  occurrences: [
    occurrence('o001', 0, 450),
    occurrence('o002', 350, 750),
    occurrence('o003', 350, 600),
    occurrence('o004', 750, 950),
  ],
}

describe('Timeline playback ranges', () => {
  it('maps one Occurrence to its explicit practice range', () => {
    expect(toOccurrencePlaybackRange(timeline.occurrences[0])).toEqual({
      startMs: 0,
      endMs: 450,
    })
  })

  it('creates one continuous envelope for multiple Occurrences', () => {
    expect(toOccurrencesPlaybackRange(timeline.occurrences.slice(1, 3))).toEqual({
      startMs: 350,
      endMs: 750,
    })
  })

  it('returns null for an empty list and uses Occurrences for Section practice', () => {
    expect(toOccurrencesPlaybackRange([])).toBeNull()
    expect(
      toSectionPlaybackRange(timeline.sections[1], timeline.occurrences),
    ).toBeNull()
    expect(
      toSectionPlaybackRange(timeline.sections[0], timeline.occurrences),
    ).toEqual({ startMs: 0, endMs: 950 })
  })

  it('combines Resolver overlap information with bounded playback', async () => {
    const resolution = resolveTimeline(timeline, 450)
    const media = new FakeMedia()
    const frames = new FakeFrameScheduler()
    const engine = createAudioEngine(media, { frameScheduler: frames })
    engine.loadSource('/audio.m4a')

    expect(resolution.activeOccurrences.map(({ id }) => id)).toEqual([
      'o002',
      'o003',
    ])
    const range = toOccurrencesPlaybackRange(resolution.activeOccurrences)
    expect(range).toEqual({ startMs: 350, endMs: 750 })

    if (!range) {
      throw new Error('expected active occurrence range')
    }
    await engine.playRange(range, resolution.primaryOccurrence?.id)
    media.currentTime = range.endMs / 1000
    frames.flush()

    expect(engine.getState()).toMatchObject({
      status: 'paused',
      activeOccurrenceId: 'o002',
    })

    const instrumental = resolveTimeline(timeline, 2000)
    expect(instrumental.currentSection?.id).toBe('instrumental')
    expect(instrumental.activeOccurrences).toEqual([])
    expect(toSectionPlaybackRange(timeline.sections[1], timeline.occurrences)).toBeNull()
  })
})

function occurrence(
  id: string,
  startMs: number,
  endMs: number,
) {
  return {
    id,
    segmentId: `s${id.slice(1)}`,
    sectionId: 'verse-1',
    startMs,
    endMs,
  }
}

class FakeMedia implements AudioMediaAdapter {
  src = ''
  currentTime = 0
  duration = Number.NaN
  paused = true
  playbackRate = 1
  preservesPitch = false
  play = vi.fn(async () => {
    this.paused = false
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  load = vi.fn()
  private readonly listeners = new Map<string, Set<() => void>>()

  addEventListener(event: string, listener: () => void): void {
    const eventListeners = this.listeners.get(event) ?? new Set<() => void>()
    eventListeners.add(listener)
    this.listeners.set(event, eventListeners)
  }

  removeEventListener(event: string, listener: () => void): void {
    this.listeners.get(event)?.delete(listener)
  }
}

class FakeFrameScheduler implements FrameScheduler {
  private nextId = 0
  private readonly callbacks = new Map<number, () => void>()

  requestFrame(callback: () => void): number {
    const id = this.nextId
    this.nextId += 1
    this.callbacks.set(id, callback)
    return id
  }

  cancelFrame(handle: unknown): void {
    this.callbacks.delete(handle as number)
  }

  flush(): void {
    const pendingCallbacks = [...this.callbacks.values()]
    this.callbacks.clear()
    pendingCallbacks.forEach((callback) => callback())
  }
}
