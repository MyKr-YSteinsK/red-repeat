import { describe, expect, it } from 'vitest'
import type {
  AudioEngineState,
  BoundedPlaybackCompletion,
} from '../audio/audio-engine'
import {
  PracticePlaybackSession,
  type PracticePlaybackEngine,
  type PracticePlaybackTarget,
} from './practice-playback-session'

const target: PracticePlaybackTarget = {
  range: { startMs: 100, endMs: 300, occurrenceIds: ['o001', 'o002'] },
  activeOccurrenceId: 'o002',
}

describe('PracticePlaybackSession', () => {
  it('plays one repetition and completes exactly once', async () => {
    const engine = new DeferredPracticeEngine()
    const session = new PracticePlaybackSession(engine)

    session.start(target, 1)
    expect(engine.requests).toHaveLength(1)
    expect(engine.requests[0]?.range).toEqual(target.range)
    expect(engine.requests[0]?.activeOccurrenceId).toBe('o002')

    engine.resolve(0, { status: 'completed' })
    await flushPromises()

    expect(session.getState()).toMatchObject({
      status: 'completed',
      completedRepetitions: 1,
    })
    expect(engine.requests).toHaveLength(1)
  })

  it('starts the original range for every repetition of repeat 3', async () => {
    const engine = new DeferredPracticeEngine()
    const session = new PracticePlaybackSession(engine)

    session.start(target, 3)
    engine.resolve(0, { status: 'completed' })
    await flushPromises()
    engine.resolve(1, { status: 'completed' })
    await flushPromises()
    engine.resolve(2, { status: 'completed' })
    await flushPromises()

    expect(engine.requests.map(({ range }) => range)).toEqual([
      target.range,
      target.range,
      target.range,
    ])
    expect(session.getState()).toMatchObject({
      status: 'completed',
      completedRepetitions: 3,
    })
  })

  it('continues infinite repetition and stops without allowing a stale round', async () => {
    const engine = new DeferredPracticeEngine()
    const session = new PracticePlaybackSession(engine)

    session.start(target, 'infinite')
    engine.resolve(0, { status: 'completed' })
    await flushPromises()
    engine.resolve(1, { status: 'completed' })
    await flushPromises()

    expect(engine.requests).toHaveLength(3)
    session.stop()
    engine.resolve(2, { status: 'completed' })
    await flushPromises()

    expect(session.getState()).toMatchObject({ status: 'idle' })
    expect(engine.requests).toHaveLength(3)
  })

  it('pauses the current repetition, resumes to its original end, then restarts next round', async () => {
    const engine = new DeferredPracticeEngine()
    const session = new PracticePlaybackSession(engine)

    session.start(target, 3)
    engine.state.currentTimeMs = 175
    session.pause()

    expect(session.getState()).toMatchObject({
      status: 'paused',
      completedRepetitions: 0,
      resumeAtMs: 175,
    })

    session.resume()
    expect(engine.requests[1]?.range).toEqual({
      ...target.range,
      startMs: 175,
    })

    engine.resolve(1, { status: 'completed' })
    await flushPromises()
    expect(engine.requests[2]?.range).toEqual(target.range)

    engine.resolve(2, { status: 'completed' })
    await flushPromises()
    engine.resolve(3, { status: 'completed' })
    await flushPromises()
    expect(session.getState()).toMatchObject({
      status: 'completed',
      completedRepetitions: 3,
    })
  })

  it('ignores a stale completion after explicit cancellation', async () => {
    const engine = new DeferredPracticeEngine()
    const session = new PracticePlaybackSession(engine)

    session.start(target, 3)
    session.cancel()
    engine.resolve(0, { status: 'completed' })
    await flushPromises()

    expect(session.getState()).toMatchObject({
      status: 'idle',
      completedRepetitions: 0,
    })
    expect(engine.requests).toHaveLength(1)
  })

  it('exits on an engine cancellation or error without starting another round', async () => {
    const engine = new DeferredPracticeEngine()
    const session = new PracticePlaybackSession(engine)

    session.start(target, 3)
    engine.resolve(0, { status: 'cancelled' })
    await flushPromises()
    expect(session.getState()).toMatchObject({ status: 'idle' })

    session.start(target, 3)
    const error = new Error('source failed')
    engine.resolve(1, { status: 'errored', error })
    await flushPromises()
    expect(session.getState()).toMatchObject({ status: 'error', error })
    expect(engine.requests).toHaveLength(2)
  })
})

class DeferredPracticeEngine implements PracticePlaybackEngine {
  state: AudioEngineState = {
    status: 'ready',
    intent: 'range',
    playbackRate: 1,
    currentTimeMs: 100,
    sourceUrl: '/audio.m4a',
  }
  requests: Array<{
    range: PracticePlaybackTarget['range']
    activeOccurrenceId?: string
    resolve: (completion: BoundedPlaybackCompletion) => void
  }> = []

  getState(): AudioEngineState {
    return { ...this.state }
  }

  pause(): void {
    this.state = { ...this.state, status: 'paused' }
  }

  playRangeUntilComplete(
    range: PracticePlaybackTarget['range'],
    activeOccurrenceId?: string,
  ): Promise<BoundedPlaybackCompletion> {
    this.state = {
      ...this.state,
      status: 'playing',
      activeOccurrenceId,
      activeRange: { startMs: range.startMs, endMs: range.endMs },
      currentTimeMs: range.startMs,
    }
    return new Promise((resolve) => {
      this.requests.push({ range: { ...range }, activeOccurrenceId, resolve })
    })
  }

  resolve(index: number, completion: BoundedPlaybackCompletion): void {
    this.requests[index]?.resolve(completion)
  }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}
