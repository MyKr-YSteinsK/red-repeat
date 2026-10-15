import {
  serializeTimingOverrides,
  type TimingOverridesDocument,
} from '../practice/practice-timing-overrides'

export interface TimingEditHistory {
  past: readonly TimingOverridesDocument[]
  current: TimingOverridesDocument
  future: readonly TimingOverridesDocument[]
  saved: TimingOverridesDocument
  limit: number
}

export function createTimingEditHistory(
  initial: TimingOverridesDocument,
  limit = 40,
): TimingEditHistory {
  return {
    past: [],
    current: initial,
    future: [],
    saved: initial,
    limit: Math.max(1, Math.floor(limit)),
  }
}

export function commitTimingEdit(
  history: TimingEditHistory,
  next: TimingOverridesDocument,
): TimingEditHistory {
  if (serializeTimingOverrides(history.current) === serializeTimingOverrides(next)) {
    return history
  }
  return {
    ...history,
    past: [...history.past, history.current].slice(-history.limit),
    current: next,
    future: [],
  }
}

export function undoTimingEdit(history: TimingEditHistory): TimingEditHistory {
  if (history.past.length === 0) return history
  const current = history.past[history.past.length - 1]
  return {
    ...history,
    past: history.past.slice(0, -1),
    current,
    future: [history.current, ...history.future],
  }
}

export function redoTimingEdit(history: TimingEditHistory): TimingEditHistory {
  if (history.future.length === 0) return history
  const [current, ...future] = history.future
  return {
    ...history,
    past: [...history.past, history.current].slice(-history.limit),
    current,
    future,
  }
}

export function markTimingEditSaved(history: TimingEditHistory): TimingEditHistory {
  return { ...history, saved: history.current }
}

export function isTimingEditDirty(history: TimingEditHistory): boolean {
  return serializeTimingOverrides(history.current) !== serializeTimingOverrides(history.saved)
}
