import { useEffect, useReducer, useState } from 'react'
import type { AudioEngine } from '../audio/audio-engine'
import {
  PracticeController,
  type PracticeStrategyState,
} from '../practice/practice-controller'

const IDLE_PRACTICE_STATE: PracticeStrategyState = { kind: 'idle' }

export interface PracticeControllerSnapshot {
  controller: PracticeController | null
  state: PracticeStrategyState
}

export function usePracticeController(
  engine: AudioEngine | null,
): PracticeControllerSnapshot {
  const [controller, setController] = useReducer(
    (_current: PracticeController | null, next: PracticeController | null) =>
      next,
    null,
  )
  const [state, setState] = useState<PracticeStrategyState>(
    IDLE_PRACTICE_STATE,
  )

  useEffect(() => {
    if (!engine) {
      return
    }

    const nextController = new PracticeController(engine)
    const unsubscribe = nextController.subscribe(setState)
    setController(nextController)

    return () => {
      unsubscribe()
      nextController.dispose()
      setController(null)
      setState(IDLE_PRACTICE_STATE)
    }
  }, [engine])

  return { controller, state }
}
