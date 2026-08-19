import { EDITION_THEMES, type EditionTheme } from './theme-preference'

export interface ThemeSwitcherProps {
  theme: EditionTheme
  onChange: (theme: EditionTheme) => void
}

const THEME_LABELS: Record<EditionTheme, string> = {
  liner: 'Liner',
  cinema: 'Cinema',
  nocturne: 'Nocturne',
}

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  return (
    <div className="theme-switcher" role="group" aria-label="Edition style">
      <span className="theme-switcher-label">EDITION STYLE</span>
      <div className="theme-switcher-options">
        {EDITION_THEMES.map((option) => (
          <button
            className="theme-switcher-option"
            key={option}
            type="button"
            aria-label={`Use ${THEME_LABELS[option]} theme`}
            aria-pressed={theme === option}
            onClick={() => onChange(option)}
          >
            {THEME_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  )
}
