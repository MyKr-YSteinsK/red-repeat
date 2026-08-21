import { EDITION_THEMES, type EditionTheme } from './theme-preference'

export interface ThemeSwitcherProps {
  theme: EditionTheme
  onChange: (theme: EditionTheme) => void
}

const THEME_LABELS: Record<EditionTheme, string> = {
  liner: '经典',
  cinema: '影院',
  nocturne: '夜间',
}

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  return (
    <div className="theme-switcher" role="group" aria-label="显示风格">
      <span className="theme-switcher-label">显示风格</span>
      <div className="theme-switcher-options">
        {EDITION_THEMES.map((option) => (
          <button
            className="theme-switcher-option"
            key={option}
            type="button"
            aria-label={`使用${THEME_LABELS[option]}显示风格`}
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
