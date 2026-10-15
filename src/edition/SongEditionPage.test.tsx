import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioEngine,
  type AudioEngine,
  type AudioMediaAdapter,
} from '../audio/audio-engine'
import type { CatalogEdition, RuntimeEdition } from '../library/runtime-schema'
import type {
  LyricsDocument,
  PracticeDocument,
  TimelineDocument,
} from '../library/schema'
import {
  RuntimeClientError,
  type RuntimeClient,
  type RuntimeClientErrorKind,
} from '../runtime/runtime-client'
import { SongEditionPage, type SongEditionPageProps } from './SongEditionPage'
import { saveResumeContext } from '../practice/resume-context'
import { addPracticeQueueItem, readPracticeQueue } from '../practice/practice-queue'

let activeEngine: AudioEngine | undefined

afterEach(() => {
  cleanup()
  activeEngine?.dispose()
  activeEngine = undefined
  window.localStorage.clear()
})

const catalogEdition: CatalogEdition = {
  songId: 'first-light',
  title: 'First Light',
  artist: 'A Composer',
  album: 'Returning',
  year: 2026,
  coverUrl: '/library-runtime/cover.webp',
  editionUrl: '/library-runtime/edition.json',
}

const edition: RuntimeEdition = {
  contractVersion: 3,
  contentHash: 'a'.repeat(64),
  song: {
    songId: 'first-light',
    title: 'First Light',
    artist: 'A Composer',
    album: 'Returning',
    year: 2026,
  },
  lyricsUrl: '/library-runtime/lyrics.json',
  timelineUrl: '/library-runtime/timeline.json',
  practiceUrl: '/library-runtime/practice.json',
  features: [
    {
      id: 'note',
      url: '/library-runtime/features/note.md',
    },
  ],
  audio: {
    url: '/library-runtime/audio.m4a',
    sourceHash: 'b'.repeat(64),
    runtimeHash: 'c'.repeat(64),
    durationMs: 2000,
    format: {
      container: 'm4a',
      codec: 'aac-lc',
      bitrateKbps: 192,
      sampleRate: 48000,
      channels: 2,
    },
  },
  artwork: {
    coverSmallUrl: '/library-runtime/cover.webp',
    coverLargeUrl: '/library-runtime/cover-large.webp',
  },
}

const lyrics: LyricsDocument = {
  segments: [
    { id: 's001', lyrics: 'First line', translation: '第一句' },
    { id: 's002', lyrics: 'Second line', translation: '第二句' },
  ],
}

const timeline: TimelineDocument = {
  audioSourceHash: 'a'.repeat(64),
  sections: [{ id: 'verse', label: 'Verse', startMs: 0, endMs: 1200 }],
  occurrences: [
    occurrence('o001', 's001', 100, 300, 50, 350),
    occurrence('o002', 's002', 500, 750, 450, 800),
  ],
}

const practice: PracticeDocument = {
  units: [
    { id: 'p001', sectionId: 'verse', label: '主歌 A', occurrenceIds: ['o001', 'o002'] },
  ],
}

describe('SongEditionPage 学唱入口', () => {
  it.each([true, false])('restores playing=%s through the actual Explain quote integration', async (playing) => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const props = propsFor(undefined, engine)
    vi.mocked(props.runtimeClient.loadFeature).mockResolvedValue('# Quote\n\n[[segment:s001]]')
    render(<SongEditionPage {...props} />)
    await screen.findByRole('heading', { name: 'First Light' })
    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    if (playing) {
      fireEvent.click(screen.getByRole('button', { name: '播放' }))
      await waitFor(() => expect(media.paused).toBe(false))
    }
    media.currentTime = 1.2
    fireEvent.click(screen.getByRole('button', { name: '讲解' }))
    fireEvent.click(await screen.findByRole('button', { name: '试听这句' }))
    await waitFor(() => expect(engine.getState().activeOccurrenceId).toBe('o001'))
    await waitFor(() => expect(media.paused).toBe(false))
    act(() => { media.currentTime = 0.35; media.paused = true; media.emit('ended') })
    await waitFor(() => expect(media.currentTime).toBe(1.2))
    expect(media.paused).toBe(!playing)
    expect(screen.getByRole('button', { name: '试听这句' })).toBeInTheDocument()
  })

  it('keeps mode selection/preferences/topics across unmounts without retaining hidden workspaces', async () => {
    const props = propsFor()
    vi.mocked(props.runtimeClient.loadEdition).mockResolvedValue({ ...edition, features: [...edition.features, { id: 'second', url: '/library-runtime/second.md' }] })
    const { container } = render(<SongEditionPage {...props} />)
    await screen.findByRole('heading', { name: 'First Light' })
    fireEvent.click(screen.getByRole('button', { name: '连续播放' }))
    fireEvent.click(screen.getByRole('button', { name: '渐速练习' }))
    fireEvent.click(screen.getByRole('button', { name: '讲解' }))
    await screen.findByRole('combobox', { name: '选择讲解主题' })
    fireEvent.change(screen.getByRole('combobox', { name: '选择讲解主题' }), { target: { value: 'second' } })
    await waitFor(() => expect(container.querySelector('.explain-workspace')).toHaveAttribute('data-current-topic-id', 'second'))
    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    fireEvent.click(screen.getByRole('button', { name: '从这里连续播放：Second line' }))
    fireEvent.wheel(container.querySelector('.full-song-lyrics-stream')!)
    fireEvent.click(screen.getByRole('button', { name: '学唱' }))
    expect(screen.getByRole('button', { name: '连续播放' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '渐速练习' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.practice-workspace,.full-song-workspace,.explain-workspace')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '讲解' }))
    expect(screen.getByRole('combobox', { name: '选择讲解主题' })).toHaveValue('second')
    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    expect(container.querySelector('.full-song-workspace')).toHaveAttribute('data-selected-occurrence-id', 'o002')
    expect(container.querySelector('.full-song-workspace')).toHaveAttribute('data-follow-lyrics', 'false')
  })

  it.each(['讲解', '学唱'])('keeps continuous media playing when browsing %s', async (mode) => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })
    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    await waitFor(() => expect(media.paused).toBe(false))
    engine.setPlaybackRate(0.8)
    media.currentTime = 0.62
    const calls = { pause: media.pause.mock.calls.length, load: media.load.mock.calls.length, play: media.play.mock.calls.length }
    fireEvent.click(screen.getByRole('button', { name: mode }))
    expect(media.paused).toBe(false)
    expect(media.currentTime).toBe(0.62)
    expect(media.playbackRate).toBe(0.8)
    expect(media.pause).toHaveBeenCalledTimes(calls.pause)
    expect(media.load).toHaveBeenCalledTimes(calls.load)
    expect(media.play).toHaveBeenCalledTimes(calls.play)
  })

  it('defaults to the Chinese Practice workspace without Focus or Immersive primary controls', async () => {
    render(<SongEditionPage {...propsFor()} />)

    expect(await screen.findByRole('heading', { name: 'First Light' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '学唱' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '主歌 A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '播放第 01 句' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Focus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Immersive' })).not.toBeInTheDocument()
  })

  it('opens the high-quality cover in a centered backdrop without a close button', async () => {
    render(<SongEditionPage {...propsFor()} />)

    await screen.findByRole('heading', { name: 'First Light' })
    const trigger = screen.getByRole('button', {
      name: '查看First Light封面大图',
    })
    expect(trigger.querySelector('img')).toHaveAttribute(
      'src',
      '/app/library-runtime/cover.webp',
    )

    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'First Light封面预览' })
    const image = screen.getByRole('img', { name: 'First Light封面大图' })
    expect(image).toHaveAttribute(
      'src',
      '/app/library-runtime/cover-large.webp',
    )
    expect(dialog.querySelector('button')).toBeNull()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(image)
    expect(screen.getByRole('dialog', { name: 'First Light封面预览' })).toBeInTheDocument()

    fireEvent.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog', { name: 'First Light封面预览' })).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    expect(trigger).toHaveFocus()
  })

  it('closes the cover backdrop with Escape', async () => {
    render(<SongEditionPage {...propsFor()} />)

    await screen.findByRole('heading', { name: 'First Light' })
    const trigger = screen.getByRole('button', {
      name: '查看First Light封面大图',
    })
    fireEvent.click(trigger)

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'First Light封面预览' })).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })

  it('keeps 全曲 and 讲解 as explicit transition tabs', async () => {
    render(<SongEditionPage {...propsFor()} />)
    await screen.findByRole('heading', { name: 'First Light' })

    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    expect(screen.getByRole('region', { name: '全曲歌词' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: '全曲播放器' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Focus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Immersive' })).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'f' })
    fireEvent.keyDown(window, { key: 'l' })
    expect(screen.queryByText('渐速练习')).not.toBeInTheDocument()
    expect(screen.queryByText('Loop')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '讲解' }))
    expect(screen.queryByRole('region', { name: '学唱工作台' })).not.toBeInTheDocument()
    expect(await screen.findByText('A small note.')).toBeInTheDocument()
  })

  it('starts a bounded Practice Unit only on the explicit Full Song Practice action', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })

    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    fireEvent.click(
      screen.getByRole('button', { name: '从这里连续播放：Second line' }),
    )
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '开始学这一段 →' }))

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '学唱工作台' })).toHaveAttribute(
        'data-current-occurrence-id',
        'o002',
      )
    })
    await waitFor(() => expect(media.play).toHaveBeenCalledTimes(2))
    expect(engine.getState().activeRange).toMatchObject({ startMs: 450, endMs: 800 })
  })

  it('searches related Features only after a Practice action and returns to the exact Occurrence without audio takeover', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const props = propsFor(undefined, engine)
    vi.mocked(props.runtimeClient.loadFeature).mockResolvedValue('# Quote\n\n[[segment:s001]]')
    const { container } = render(<SongEditionPage {...props} />)
    await screen.findByRole('heading', { name: 'First Light' })
    expect(props.runtimeClient.loadFeature).not.toHaveBeenCalled()
    expect(media.play).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '看相关讲解' }))
    expect(await screen.findByRole('region', { name: '讲解工作台' })).toBeInTheDocument()
    await waitFor(() => expect(props.runtimeClient.loadFeature).toHaveBeenCalledOnce())
    expect(container.querySelector('.explain-workspace')).toHaveAttribute('data-current-topic-id', 'note')
    expect(container.querySelector('.feature-markdown-block--lyric-reference.is-related-target')).not.toBeNull()
    expect(container.querySelector('[data-selected-occurrence-id="o001"]')).not.toBeNull()
    expect(media.play).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '返回来源位置' }))
    expect(await screen.findByRole('region', { name: '学唱工作台' })).toHaveAttribute('data-current-occurrence-id', 'o001')
    expect(media.play).not.toHaveBeenCalled()
  })

  it('locates the exact Feature quote from Full Song and returns without autoplay', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const props = propsFor(undefined, engine)
    vi.mocked(props.runtimeClient.loadFeature).mockResolvedValue('# Quote\n\n[[segment:s001]]')
    const { container } = render(<SongEditionPage {...props} />)

    await screen.findByRole('heading', { name: 'First Light' })
    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    expect(screen.getByRole('region', { name: '全曲歌词' })).toBeInTheDocument()
    expect(props.runtimeClient.loadFeature).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '从这里连续播放：First line' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    await waitFor(() => expect(media.paused).toBe(true))
    const playCountBeforeExplain = media.play.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: '看相关讲解' }))

    expect(await screen.findByRole('region', { name: '讲解工作台' })).toBeInTheDocument()
    await waitFor(() => {
      expect(container.querySelector('.feature-markdown-block--lyric-reference.is-related-target')).not.toBeNull()
    })
    expect(container.querySelector('.explain-lyric-quote'))
      .toHaveAttribute('data-selected-occurrence-id', 'o001')
    expect(media.play).toHaveBeenCalledTimes(playCountBeforeExplain)

    fireEvent.click(screen.getByRole('button', { name: '返回来源位置' }))
    expect(await screen.findByRole('region', { name: '全曲歌词' })).toBeInTheDocument()
    expect(container.querySelector('.full-song-workspace'))
      .toHaveAttribute('data-selected-occurrence-id', 'o001')
    expect(media.play).toHaveBeenCalledTimes(playCountBeforeExplain)
  })

  it('continues a compatible saved Full Song position on the startup build without autoplay', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    saveResumeContext({
      schemaVersion: 1,
      songId: 'first-light',
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      timelineUrl: edition.timelineUrl,
      mode: 'all',
      occurrenceId: 'o002',
      updatedAt: 10,
    })

    const { container } = render(<SongEditionPage {...propsFor(undefined, engine)} continueLastRequested />)
    await screen.findByRole('heading', { name: 'First Light' })
    expect(screen.getByRole('region', { name: '全曲歌词' })).toBeInTheDocument()
    expect(container.querySelector('.full-song-workspace')).toHaveAttribute('data-selected-occurrence-id', 'o002')
    expect(media.play).not.toHaveBeenCalled()
    expect(media.currentTime).toBe(0)
  })

  it('restores a compatible Unicode Explain Feature ID exactly without autoplay', async () => {
    const featureId = '01-先行单曲与《13月1日》-「あの歌」・解説'
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const props = propsFor(undefined, engine)
    const explainEdition = {
      ...edition,
      features: [{ id: featureId, url: '/library-runtime/features/unicode.md' }],
    }
    vi.mocked(props.runtimeClient.loadEdition).mockResolvedValue(explainEdition)
    vi.mocked(props.runtimeClient.loadFeature).mockResolvedValue('# 讲解正文\n\n恢复到了精确文章。')
    expect(saveResumeContext({
      schemaVersion: 1,
      songId: 'first-light',
      editionContentHash: explainEdition.contentHash,
      audioSourceHash: explainEdition.audio.sourceHash,
      timelineUrl: explainEdition.timelineUrl,
      mode: 'explain',
      featureId,
      updatedAt: 127,
    })).toBe(true)

    const { container } = render(<SongEditionPage {...props} continueLastRequested />)

    const workspace = await screen.findByRole('region', { name: '讲解工作台' })
    expect(workspace).toHaveAttribute('data-current-topic-id', featureId)
    expect(container.querySelector('.explain-topic-directory button[aria-current="page"]')).not.toBeNull()
    expect(await screen.findByText('恢复到了精确文章。')).toBeInTheDocument()
    expect(media.play).not.toHaveBeenCalled()
    expect(media.currentTime).toBe(0)
    expect(container.querySelector('.practice-workspace')).toBeNull()
  })

  it('safely falls back when a compatible saved Unicode Feature ID is absent from the Edition', async () => {
    expect(saveResumeContext({
      schemaVersion: 1,
      songId: 'first-light',
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      timelineUrl: edition.timelineUrl,
      mode: 'explain',
      featureId: '《已合并的旧文章》「初版」',
      updatedAt: 128,
    })).toBe(true)
    render(<SongEditionPage {...propsFor()} continueLastRequested />)

    expect(await screen.findByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
    expect(screen.getByText('最近的讲解主题已不在当前版本中，已安全回到学唱。')).toBeInTheDocument()
  })

  it('falls back to Practice for a mismatched saved Edition identity', async () => {
    saveResumeContext({
      schemaVersion: 1,
      songId: 'first-light',
      editionContentHash: 'd'.repeat(64),
      audioSourceHash: edition.audio.sourceHash,
      timelineUrl: edition.timelineUrl,
      mode: 'all',
      occurrenceId: 'o002',
      updatedAt: 10,
    })
    render(<SongEditionPage {...propsFor()} continueLastRequested />)

    expect(await screen.findByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
    expect(screen.getByText(/最近位置与当前完整 Song Edition 不兼容/)).toBeInTheDocument()
  })

  it('opens a compatible queue item at its exact Practice Occurrence without autoplay', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    expect(addPracticeQueueItem({
      songId: 'first-light',
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      timelineUrl: edition.timelineUrl,
      practiceUnitId: 'p001',
      occurrenceId: 'o002',
      segmentId: 's002',
    })).toBe('added')
    const itemId = readPracticeQueue().items[0].id
    const { container } = render(<SongEditionPage {...propsFor(undefined, engine)} practiceQueueItemId={itemId} />)

    expect(await screen.findByRole('region', { name: '学唱工作台' })).toHaveAttribute('data-current-occurrence-id', 'o002')
    expect(container.querySelector('.practice-workspace')).toBeInTheDocument()
    expect(media.play).not.toHaveBeenCalled()
  })

  it('updates the exact Practice target when a same-song queue route changes in place', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const props = propsFor(undefined, engine)
    vi.mocked(props.runtimeClient.loadPractice).mockResolvedValue({
      units: [
        { id: 'p001', sectionId: 'verse', label: '主歌 A', occurrenceIds: ['o001'] },
        { id: 'p002', sectionId: 'verse', label: '副歌 B', occurrenceIds: ['o002'] },
      ],
    })
    expect(addPracticeQueueItem({
      songId: 'first-light',
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      timelineUrl: edition.timelineUrl,
      practiceUnitId: 'p001',
      occurrenceId: 'o001',
      segmentId: 's001',
    })).toBe('added')
    expect(addPracticeQueueItem({
      songId: 'first-light',
      editionContentHash: edition.contentHash,
      audioSourceHash: edition.audio.sourceHash,
      timelineUrl: edition.timelineUrl,
      practiceUnitId: 'p002',
      occurrenceId: 'o002',
      segmentId: 's002',
    })).toBe('added')
    const [firstItem, secondItem] = readPracticeQueue().items
    const view = render(
      <SongEditionPage {...props} practiceQueueItemId={firstItem.id} />,
    )

    const workspace = await screen.findByRole('region', { name: '学唱工作台' })
    await waitFor(() => expect(workspace).toHaveAttribute('data-current-occurrence-id', 'o001'))
    expect(screen.getByRole('heading', { name: '主歌 A' })).toBeInTheDocument()

    view.rerender(
      <SongEditionPage {...props} practiceQueueItemId={secondItem.id} />,
    )

    await waitFor(() => expect(workspace).toHaveAttribute('data-current-occurrence-id', 'o002'))
    expect(screen.getByRole('heading', { name: '副歌 B' })).toBeInTheDocument()
    expect(media.play).not.toHaveBeenCalled()
  })

  it('keeps the same audio session across Full Song to Practice without reload, reset, or autoplay', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })

    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    await waitFor(() => expect(media.load).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    media.currentTime = 0.62
    const loadCount = media.load.mock.calls.length
    const playCount = media.play.mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: '学唱' }))
    await screen.findByRole('region', { name: '学唱工作台' })

    expect(media.load).toHaveBeenCalledTimes(loadCount)
    expect(media.currentTime).toBe(0.62)
    expect(media.play).toHaveBeenCalledTimes(playCount)
  })

  it('pauses audio and retains its position when the song page returns to Catalog', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const view = render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })
    fireEvent.click(screen.getByRole('button', { name: '全曲' }))
    await waitFor(() => expect(engine.getState().sourceUrl).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    media.currentTime = 0.62
    const pauseCount = media.pause.mock.calls.length

    view.unmount()

    expect(media.pause).toHaveBeenCalledTimes(pauseCount + 1)
    expect(engine.getState()).toMatchObject({
      status: 'paused',
      currentTimeMs: 620,
      sourceUrl: '/app/library-runtime/audio.m4a',
    })
    expect(media.currentTime).toBe(0.62)
  })

  it('keeps Full Song structure stable while switching tabs', async () => {
    render(<SongEditionPage {...propsFor()} />)
    await screen.findByRole('heading', { name: 'First Light' })
    fireEvent.click(screen.getByRole('button', { name: '全曲' }))

    const before = screen
      .getByRole('region', { name: '全曲歌词' })
      .querySelectorAll('[data-occurrence-id]').length
    expect(
      screen
        .getByRole('region', { name: '全曲歌词' })
        .querySelectorAll('[data-occurrence-id]').length,
    ).toBe(before)
    expect(screen.getByRole('complementary', { name: '全曲播放器' })).toBeInTheDocument()
  })

  it('plays the clicked real occurrence and preserves the engine across tabs', async () => {
    const media = new FakeMedia()
    const engine = createAudioEngine(media)
    activeEngine = engine
    const loadCountBeforeRender = media.load.mock.calls.length
    render(<SongEditionPage {...propsFor(undefined, engine)} />)
    await screen.findByRole('heading', { name: 'First Light' })
    await waitFor(() => expect(media.load).toHaveBeenCalledTimes(loadCountBeforeRender + 1))

    fireEvent.click(screen.getByRole('button', { name: '播放第 01 句' }))
    await waitFor(() => expect(media.play).toHaveBeenCalledOnce())
    expect(media.currentTime).toBe(0.05)

    expect(media.load).toHaveBeenCalledTimes(loadCountBeforeRender + 1)
    expect(screen.getByRole('region', { name: '学唱工作台' })).toBeInTheDocument()
  })

  it('keeps edition loading errors recoverable', async () => {
    render(<SongEditionPage {...propsFor(new Error('offline'))} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '无法读取这首歌的内容，请重试。',
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The edition resources returned an unexpected error.',
    )
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回曲库' })).toHaveAttribute(
      'href',
      '/red-repeat/',
    )
  })

  it.each([
    [
      'offline-not-downloaded',
      '这首歌的当前版本尚未下载，离线时无法打开。',
    ],
    [
      'download-incomplete',
      '这首歌的本地下载不完整，请联网后重新下载。',
    ],
    [
      'schema',
      '歌曲 Runtime 数据格式无效，请联网重试或重新下载。',
    ],
  ] satisfies Array<[RuntimeClientErrorKind, string]>)(
    'distinguishes the %s recovery message',
    async (kind, message) => {
      render(
        <SongEditionPage
          {...propsFor(new RuntimeClientError({
            kind,
            logicalPath: catalogEdition.editionUrl,
            url: catalogEdition.editionUrl,
            message: kind,
          }))}
        />,
      )

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
    },
  )
})

function propsFor(error?: Error, audioEngine?: AudioEngine): SongEditionPageProps {
  const client = {
    loadEdition: vi.fn(async () => {
      if (error) {
        throw error
      }
      return edition
    }),
    loadLyrics: vi.fn(async () => lyrics),
    loadTimeline: vi.fn(async () => timeline),
    loadPractice: vi.fn(async () => practice),
    loadFeature: vi.fn(async () => '# Notes\n\nA small note.'),
    resolveAsset: vi.fn((logicalPath: string) => `/app${logicalPath}`),
  } as unknown as RuntimeClient

  return {
    catalogEdition,
    runtimeClient: client,
    homeHref: '/red-repeat/',
    audioEngine,
  }
}

function occurrence(
  id: string,
  segmentId: string,
  _editorialStartMs: number,
  _editorialEndMs: number,
  effectiveStartMs: number,
  effectiveEndMs: number,
) {
  return {
    id,
    segmentId,
    sectionId: 'verse',
    startMs: effectiveStartMs,
    endMs: effectiveEndMs,
  }
}

class FakeMedia implements AudioMediaAdapter {
  src = ''
  currentTime = 0
  duration = 2
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
    const listeners = this.listeners.get(event) ?? new Set<() => void>()
    listeners.add(listener)
    this.listeners.set(event, listeners)
  }

  removeEventListener(event: string, listener: () => void): void {
    this.listeners.get(event)?.delete(listener)
  }

  emit(event: string): void { this.listeners.get(event)?.forEach(listener => listener()) }
}
