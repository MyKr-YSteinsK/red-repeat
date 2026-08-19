export interface SongEditionKeyboardActions {
  togglePlay: () => void
  previous: () => void
  next: () => void
  toggleLoop: () => void
  decreaseSpeed: () => void
  increaseSpeed: () => void
  cancelPractice: () => void
}

export type SongEditionKeyboardRegistration = (
  actions: SongEditionKeyboardActions | null,
) => void
