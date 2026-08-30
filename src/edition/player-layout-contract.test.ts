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
  '/* Practice mobile dock: three compact rows plus measured final-row reachability. */',
)
const practiceMobileEnd = appCss.indexOf(
  '/* Practice segment picker:',
  practiceMobileStart,
)
const practiceMobileCss = appCss.slice(practiceMobileStart, practiceMobileEnd)

describe('mobile player layout contracts', () => {
  it('keeps the Practice rates before a bounded play column with measured reachability reserve', () => {
    expect(practiceMobileCss).toContain(
      'grid-template-columns: minmax(0, 3fr) minmax(5rem, 0.9fr);',
    )
    expect(practiceMobileCss).toContain(
      'padding-bottom: var(--practice-dock-reachability-reserve, 1rem);',
    )
    expect(practiceMobileCss).not.toContain(
      'padding-bottom: calc(var(--practice-dock-occlusion',
    )
    expect(appCss).toMatch(
      /\.full-song-lyric-cluster,\s*\.practice-lyric-cluster\s*\{[^}]*width: 100%;[^}]*margin-inline: 0;/s,
    )
    expect(appCss).toMatch(
      /\.full-song-lyric-cluster > \.full-song-original,\s*\.practice-lyric-cluster > \.practice-original\s*\{[^}]*width: 100%;/s,
    )
  })

  it('shares a translucent player glass material with explicit backdrop filters', () => {
    expect(indexCss).toContain(
      '--player-glass-bg: color-mix(in srgb, var(--color-surface) 38%, transparent);',
    )
    expect(indexCss).toContain(
      '--player-glass-control-bg: color-mix(in srgb, var(--color-surface) 46%, transparent);',
    )
    expect(appCss).toMatch(
      /\.practice-controls\.practice-dock\s*\{[^}]*background: var\(--player-glass-bg\);[^}]*backdrop-filter: var\(--player-glass-blur\);[^}]*-webkit-backdrop-filter: var\(--player-glass-blur\);/s,
    )
    expect(appCss).toMatch(
      /\.full-song-player\s*\{[^}]*background: var\(--player-glass-bg\);[^}]*backdrop-filter: var\(--player-glass-blur\);[^}]*-webkit-backdrop-filter: var\(--player-glass-blur\);/s,
    )
    expect(appCss).toMatch(
      /\.timing-debugger-console\s*\{[^}]*background: var\(--player-glass-bg\);[^}]*backdrop-filter: var\(--player-glass-blur\);[^}]*-webkit-backdrop-filter: var\(--player-glass-blur\);/s,
    )
    expect(appCss).not.toContain(
      'background: color-mix(in srgb, var(--color-surface) 92%, transparent);',
    )
  })

  it('keeps the Practice mobile dock edge-to-edge with safe-area padding inside', () => {
    expect(practiceMobileCss).toMatch(
      /\.practice-controls\.practice-dock\s*\{[^}]*left: 0;[^}]*right: 0;[^}]*bottom: 0;[^}]*width: 100%;/s,
    )
    expect(practiceMobileCss).toContain('margin: 0;')
    expect(practiceMobileCss).toContain(
      'calc(0.65rem + env(safe-area-inset-bottom))',
    )
    expect(practiceMobileCss).toContain('border-inline: 0;')
    expect(practiceMobileCss).toContain(
      'border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;',
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

  it('makes the mobile Timing Debugger console an edge-to-edge safe-area sheet', () => {
    expect(appCss).toMatch(
      /\.timing-debugger-console\s*\{[^}]*left: 0;[^}]*right: 0;[^}]*bottom: 0;/s,
    )
    expect(appCss).toContain(
      'calc(var(--control-sheet-padding-block) + env(safe-area-inset-bottom))',
    )
    expect(appCss).toContain('border-inline: 0;')
    expect(appCss).toContain(
      'border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;',
    )
  })
})
