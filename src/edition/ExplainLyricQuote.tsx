import { useEffect, useMemo, useRef, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import type { AssembledOccurrence, AssembledSongEdition } from '../runtime/song-edition'
import { LyricText } from './LyricText'

export interface ExplainLyricQuoteProps {
  model: AssembledSongEdition
  segmentId: string
  audioEngine?: AudioEngine | null
}

export function ExplainLyricQuote({
  model,
  segmentId,
  audioEngine,
}: ExplainLyricQuoteProps) {
  const segment = model.segmentsById[segmentId]
  const occurrences = useMemo(
    () => model.occurrencesBySegmentId[segmentId] ?? [],
    [model.occurrencesBySegmentId, segmentId],
  )
  const occurrenceIds = useMemo(
    () => new Set(occurrences.map(({ occurrence }) => occurrence.id)),
    [occurrences],
  )
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState(
    occurrences[0]?.occurrence.id,
  )
  const [message, setMessage] = useState<string>()
  const [playingOccurrenceId, setPlayingOccurrenceId] = useState<string>()
  const operationRef = useRef(0)

  useEffect(
    () => () => {
      const state = audioEngine?.getState()
      operationRef.current += 1
      if (
        audioEngine &&
        state?.intent === 'range' &&
        state.activeOccurrenceId &&
        occurrenceIds.has(state.activeOccurrenceId)
      ) {
        audioEngine.pause()
      }
    },
    [audioEngine, occurrenceIds],
  )

  if (!segment) {
    return (
      <div className="explain-lyric-quote is-unavailable" role="note">
        这条歌词引用暂不可用。
      </div>
    )
  }

  const selectedOccurrence =
    occurrences.find(({ occurrence }) => occurrence.id === selectedOccurrenceId) ??
    occurrences[0]
  const reading = segment.layers?.[0]?.text

  const playSelectedOccurrence = (): void => {
    if (!selectedOccurrence) {
      setMessage('这句歌词还没有可播放的时间范围。')
      return
    }
    if (!audioEngine) {
      setMessage('当前环境无法播放音频。')
      return
    }

    const timing = model.timingProvider.getTiming(selectedOccurrence.occurrence)
    const operation = operationRef.current + 1
    operationRef.current = operation
    setMessage(undefined)
    setPlayingOccurrenceId(selectedOccurrence.occurrence.id)
    void audioEngine
      .playRangeUntilComplete(
        {
          startMs: timing.playStartMs,
          endMs: timing.playEndMs,
        },
        selectedOccurrence.occurrence.id,
      )
      .then((completion) => {
        if (operationRef.current !== operation) {
          return
        }
        setPlayingOccurrenceId(undefined)
        if (completion.status === 'errored') {
          setMessage(completion.error.message)
        }
      })
  }

  const selectOccurrence = (nextOccurrenceId: string): void => {
    operationRef.current += 1
    const state = audioEngine?.getState()
    if (
      audioEngine &&
      state?.intent === 'range' &&
      state.activeOccurrenceId &&
      occurrenceIds.has(state.activeOccurrenceId)
    ) {
      audioEngine.pause()
    }
    setPlayingOccurrenceId(undefined)
    setMessage(undefined)
    setSelectedOccurrenceId(nextOccurrenceId)
  }

  return (
    <div
      className="explain-lyric-quote"
      role="group"
      aria-label="歌词引用"
      data-selected-occurrence-id={selectedOccurrence?.occurrence.id}
    >
      <div className="explain-lyric-quote-copy">
        <p className="explain-lyric-quote-original">
          <LyricText segment={segment} />
        </p>
        <p className="explain-lyric-quote-translation">{segment.translation}</p>
        {reading ? (
          <p className="explain-lyric-quote-reading">{reading}</p>
        ) : null}
      </div>
      {occurrences.length > 0 ? (
        <div className="explain-lyric-quote-controls">
          {occurrences.length > 1 ? (
            <label>
              <span>选择出现位置</span>
              <select
                value={selectedOccurrence?.occurrence.id ?? ''}
                onChange={(event) => selectOccurrence(event.currentTarget.value)}
              >
                {occurrences.map((assembledOccurrence, index) => (
                  <option
                    key={assembledOccurrence.occurrence.id}
                    value={assembledOccurrence.occurrence.id}
                  >
                    {formatOccurrenceLabel(index, assembledOccurrence)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button className="control-button control-button--quiet control-button--sm" type="button" onClick={playSelectedOccurrence}>
            {playingOccurrenceId === selectedOccurrence?.occurrence.id
              ? '播放中…'
              : '试听这句'}
          </button>
        </div>
      ) : (
        <p className="explain-lyric-quote-unavailable">
          这句歌词还没有可播放的时间范围。
        </p>
      )}
      {message ? (
        <p className="explain-lyric-quote-message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function formatOccurrenceLabel(
  index: number,
  assembledOccurrence: AssembledOccurrence,
): string {
  return `第${index + 1}次·${assembledOccurrence.section.label}·${formatTime(
    assembledOccurrence.occurrence.startMs,
  )}`
}

function formatTime(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000))
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
