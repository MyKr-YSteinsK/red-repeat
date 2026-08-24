import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const appCss = readFileSync(
  path.join(process.cwd(), 'src', 'App.css'),
  'utf8',
)
const indexCss = readFileSync(
  path.join(process.cwd(), 'src', 'index.css'),
  'utf8',
)
const practiceMobileStart = appCss.indexOf(
  '/* Practice 1.0 mobile dock: three compact rows plus safe-area reservation. */',
)
const practiceMobileEnd = appCss.indexOf(
  '/* Practice segment picker:',
  practiceMobileStart,
)
const practiceMobileCss = appCss.slice(practiceMobileStart, practiceMobileEnd)

describe('mobile player layout contracts', () => {
  it('keeps the Practice rates before a bounded play column without fixed reserve guesses', () => {
    expect(practiceMobileCss).toContain(
      'grid-template-columns: minmax(0, 3fr) minmax(5rem, 0.9fr);',
    )
    expect(practiceMobileCss).toContain(
      'padding-bottom: calc(var(--practice-dock-occlusion, 0px) + 0.25rem);',
    )
    expect(practiceMobileCss).not.toContain('--practice-dock-reserve')
  })

  it('shares a translucent player glass material with explicit backdrop filters', () => {
    expect(indexCss).toContain(
      '--player-glass-bg: color-mix(in srgb, var(--color-surface) 72%, transparent);',
    )
    expect(appCss).toMatch(
      /\.practice-controls\.practice-dock\s*\{[^}]*background: var\(--player-glass-bg\);[^}]*backdrop-filter: var\(--player-glass-blur\);[^}]*-webkit-backdrop-filter: var\(--player-glass-blur\);/s,
    )
    expect(appCss).toMatch(
      /\.full-song-player\s*\{[^}]*background: var\(--player-glass-bg\);[^}]*backdrop-filter: var\(--player-glass-blur\);[^}]*-webkit-backdrop-filter: var\(--player-glass-blur\);/s,
    )
    expect(appCss).not.toContain(
      'background: color-mix(in srgb, var(--color-surface) 92%, transparent);',
    )
  })

  it('keeps the Full Song play control on the speed row and raises centered actions', () => {
    expect(appCss).toContain(
      'grid-template-columns: repeat(2, minmax(6rem, 8.5rem));',
    )
    expect(appCss).toContain(
      'grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(5.4rem, 5.4rem);',
    )
    expect(appCss).toMatch(
      /\.full-song-player-toggle\s*\{[^}]*min-width: 5\.4rem;[^}]*min-height: 2\.5rem;/s,
    )
    expect(appCss).toContain(
      'calc(0.95rem + env(safe-area-inset-bottom))',
    )
  })
})
