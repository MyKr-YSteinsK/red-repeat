import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine, type AudioEngine, type AudioMediaAdapter, type FrameScheduler } from '../audio/audio-engine'
import { SongPlaybackSession } from './song-playback-session'

const engines: AudioEngine[] = []
const sessions: SongPlaybackSession[] = []
afterEach(() => { sessions.splice(0).forEach(session => session.close()); engines.splice(0).forEach(engine => engine.dispose()) })
const range = { startMs: 1000, endMs: 2000 }
const previewRange = { startMs: 4000, endMs: 4500 }

describe('SongPlaybackSession intent ownership', () => {
  it.each([true, false])('restores the original position/rate and playing=%s after natural preview completion', async playing => {
    const { session, media, frames, engine } = fixture()
    if (playing) await session.playContinuous()
    media.currentTime = 1.35
    session.setRate(0.8)
    const preview = session.playPreview(previewRange, 'quote', {})
    await tick()
    media.currentTime = 4.5
    frames.flush()
    expect(await preview).toEqual({ status: 'completed' })
    expect(media.currentTime).toBe(1.35)
    expect(media.paused).toBe(!playing)
    expect(media.playbackRate).toBe(0.8)
    expect(engine.getState().sourceUrl).toBe('/H1.m4a')
    expect(media.load).toHaveBeenCalledOnce()
  })

  it('replaces previews while retaining only the original context; stale completion cannot resume', async () => {
    const { session, media, frames } = fixture()
    await session.playContinuous()
    media.currentTime = 1.7
    const first = session.playPreview(previewRange, 'first', {})
    await tick()
    const second = session.playPreview({ startMs: 5000, endMs: 5500 }, 'second', {})
    await tick()
    expect(await first).toEqual({ status: 'cancelled' })
    expect(media.currentTime).toBe(5)
    media.currentTime = 5.5
    frames.flush()
    expect(await second).toEqual({ status: 'completed' })
    expect(media.currentTime).toBe(1.7)
    expect(media.paused).toBe(false)
  })

  it.each(['cancel', 'new-play', 'seek', 'rate', 'leave', 'new-edition', 'error', 'native-pause', 'timing'] as const)('does not restore after %s overrides a preview', async action => {
    const { session, media, frames, engine } = fixture()
    await session.playContinuous()
    media.currentTime = 1.7
    const preview = session.playPreview(previewRange, 'quote', {})
    await tick()
    if (action === 'cancel') session.cancelPreview()
    if (action === 'new-play') await session.playContinuous(6000)
    if (action === 'seek') await session.seek(6000)
    if (action === 'rate') session.setRate(0.6)
    if (action === 'leave') session.close()
    if (action === 'new-edition') new SongPlaybackSession('H2', '/H2.m4a', engine).activate()
    if (action === 'error') media.emit('error')
    if (action === 'native-pause') { media.paused = true; media.emit('pause') }
    if (action === 'timing') session.invalidateTiming()
    const plays = media.play.mock.calls.length
    media.currentTime = 4.5
    frames.flush()
    const completion = await preview
    expect(completion.status).toBe(action === 'error' ? 'errored' : 'cancelled')
    expect(media.play).toHaveBeenCalledTimes(plays)
    expect(media.currentTime).toBe(4.5)
    if (action === 'new-edition') expect(media.src).toBe('/H2.m4a')
  })

  it('old quote cleanup cannot cancel the newer quote preview', async () => {
    const { session, media, frames } = fixture()
    const old = {}
    const first = session.playPreview(previewRange, 'old', old)
    await tick()
    const second = session.playPreview(range, 'new', {})
    await tick()
    session.cancelPreview(old)
    expect(media.paused).toBe(false)
    media.currentTime = 2
    frames.flush()
    expect(await first).toEqual({ status: 'cancelled' })
    expect(await second).toEqual({ status: 'completed' })
  })

  it('pause/resume continues the current ramp pass; explicit replay restarts from the beginning', async () => {
    const { session, media, frames } = fixture()
    const first = session.playPractice(range, 'line', [0.6, 0.8, 1], 0.8)
    await tick()
    media.currentTime = 1.3
    session.pause()
    expect(await first).toEqual({ status: 'cancelled' })
    expect(session.canResumePractice()).toBe(true)
    const resumed = session.resumePractice()
    await tick()
    expect(media.currentTime).toBe(1.3)
    expect(media.playbackRate).toBe(0.6)
    for (const next of [0.8, 1]) {
      media.currentTime = 2
      frames.flush()
      await tick()
      expect(media.currentTime).toBe(1)
      expect(media.playbackRate).toBe(next)
    }
    media.currentTime = 2
    frames.flush()
    expect(await resumed).toEqual({ status: 'completed' })
    expect(media.playbackRate).toBe(0.8)
    void session.playPractice(range, 'line', [0.6, 0.8, 1], 0.8)
    await tick()
    expect(media.currentTime).toBe(1)
    expect(media.playbackRate).toBe(0.6)
  })

  it('preview suspends and naturally resumes the active ramp stage without advancing it', async () => {
    const { session, media, frames } = fixture()
    const practice = session.playPractice(range, 'line', [0.6, 0.8, 1], 1)
    await tick()
    media.currentTime = 1.3
    const preview = session.playPreview(previewRange, 'quote', {})
    await tick()
    expect(await practice).toEqual({ status: 'cancelled' })
    media.currentTime = 4.5
    frames.flush()
    expect(await preview).toEqual({ status: 'completed' })
    await tick()
    expect(media.currentTime).toBe(1.3)
    expect(media.playbackRate).toBe(0.6)
    media.currentTime = 2
    frames.flush()
    await tick()
    expect(media.currentTime).toBe(1)
    expect(media.playbackRate).toBe(0.8)
  })

  it('preserves paused Practice intent across a preview and resumes only on explicit action', async () => {
    const { session, media, frames } = fixture()
    void session.playPractice(range, 'line', [0.8], 0.8)
    await tick()
    media.currentTime = 1.4
    session.pause()
    const preview = session.playPreview(previewRange, 'quote', {})
    await tick()
    media.currentTime = 4.5
    frames.flush()
    expect(await preview).toEqual({ status: 'completed' })
    expect(media.paused).toBe(true)
    expect(media.currentTime).toBe(1.4)
    void session.resumePractice()
    await tick()
    expect(media.currentTime).toBe(1.4)
    expect(media.paused).toBe(false)
  })

  it('rejects stale commands and queued media play after Edition replacement', async () => {
    const { session, media, engine } = fixture()
    const pending = session.playContinuous()
    new SongPlaybackSession('H2', '/H2.m4a', engine).activate()
    await pending
    await session.playContinuous(8000)
    expect(media.play).not.toHaveBeenCalled()
    expect(media.src).toBe('/H2.m4a')
    expect(media.currentTime).toBe(0)
  })

  it('resets same URL with new content identity, but a compatible reopen keeps the F1 position paused', async () => {
    const { session, media, engine } = fixture()
    await session.playContinuous()
    media.currentTime = 1.7
    session.close()
    new SongPlaybackSession('H1', '/H1.m4a', engine).activate()
    expect(media.load).toHaveBeenCalledOnce()
    expect(media.currentTime).toBe(1.7)
    expect(media.paused).toBe(true)
    new SongPlaybackSession('H2', '/H1.m4a', engine).activate()
    expect(media.load).toHaveBeenCalledTimes(2)
    expect(media.currentTime).toBe(0)
  })

  it('media rejection never restores the prior playing intent', async () => {
    const { session, media } = fixture()
    await session.playContinuous()
    media.play.mockRejectedValueOnce(new Error('network failure'))
    const result = await session.playPreview(range, 'quote', {})
    expect(result.status).toBe('errored')
    expect(media.play).toHaveBeenCalledTimes(2)
    expect(media.paused).toBe(true)
  })

  it('a new command wins even in the natural-completion microtask gap', async () => {
    const { session, media, frames } = fixture()
    await session.playContinuous()
    media.currentTime = 1.2
    const preview = session.playPreview(previewRange, 'quote', {})
    await tick()
    media.currentTime = 4.5
    frames.flush()
    await session.playContinuous(6000)
    expect(await preview).toEqual({ status: 'cancelled' })
    expect(media.currentTime).toBe(6)
    expect(media.paused).toBe(false)
  })

  it('cancels a paused range when the Practice selection changes', async () => {
    const { session, media } = fixture()
    void session.playPractice(range, 'old', [0.8], 0.8)
    await tick()
    media.currentTime = 1.4
    session.pause()
    session.cancelPractice()
    expect(session.canResumePractice()).toBe(false)
    void session.playPractice(previewRange, 'new', [1], 1)
    await tick()
    expect(media.currentTime).toBe(4)
  })
})

function fixture() {
  const media = new Media()
  const frames = new Frames()
  const engine = createAudioEngine(media, { frameScheduler: frames })
  engines.push(engine)
  const session = new SongPlaybackSession('H1', '/H1.m4a', engine)
  sessions.push(session)
  session.activate()
  return { session, media, frames, engine }
}
class Media implements AudioMediaAdapter {
  src = ''; currentTime = 0; duration = 10; paused = true; playbackRate = 1
  play = vi.fn(async () => { this.paused = false })
  pause = vi.fn(() => { const playing = !this.paused; this.paused = true; if (playing) this.emit('pause') })
  load = vi.fn()
  private listeners = new Map<string, Set<() => void>>()
  addEventListener(event: string, listener: () => void) { const set = this.listeners.get(event) ?? new Set(); set.add(listener); this.listeners.set(event, set) }
  removeEventListener(event: string, listener: () => void) { this.listeners.get(event)?.delete(listener) }
  emit(event: string) { this.listeners.get(event)?.forEach(listener => listener()) }
}
class Frames implements FrameScheduler {
  private id = 0
  private callbacks = new Map<number, () => void>()
  requestFrame(callback: () => void) { this.callbacks.set(++this.id, callback); return this.id }
  cancelFrame(handle: unknown) { this.callbacks.delete(handle as number) }
  flush() { const pending = [...this.callbacks.values()]; this.callbacks.clear(); pending.forEach(callback => callback()) }
}
async function tick() { for (let i = 0; i < 8; i++) await Promise.resolve() }
