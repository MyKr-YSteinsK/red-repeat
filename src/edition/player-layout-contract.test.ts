import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const appCss = readFileSync(
  path.join(process.cwd(), 'src', 'App.css'),
  'utf8',
)
const fullSongCss = readFileSync(
  path.join(process.cwd(), 'src', 'edition', 'full-song-reader.css'),
  'utf8',
)
const timingCss = readFileSync(
  path.join(process.cwd(), 'src', 'debugger', 'timing-debugger.css'),
  'utf8',
)
const indexCss = readFileSync(
  path.join(process.cwd(), 'src', 'index.css'),
  'utf8',
)
const practiceMobileStart = appCss.indexOf(
  '/* Practice mobile dock: two frequent-control rows plus measured expansion reachability. */',
)
const practiceMobileEnd = appCss.indexOf(
  '/* Practice segment picker:',
  practiceMobileStart,
)
const practiceMobileCss = appCss.slice(practiceMobileStart, practiceMobileEnd)

describe('mobile player layout contracts', () => {
  it('keeps the primary play action beside More with measured expansion reachability reserve', () => {
    expect(practiceMobileCss).toContain(
      'grid-template-columns: minmax(0, 3fr) minmax(5.5rem, 1fr);',
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

  it('keeps the Full Song rail translucent and Timing values on opaque paper', () => {
    expect(fullSongCss).toContain('--player-glass-bg: color-mix(in srgb, var(--color-surface) 94%, transparent)')
    expect(fullSongCss).toContain('backdrop-filter: var(--player-glass-blur)')
    const timingConsole = timingCss.match(/\.timing-debugger-console\s*\{([^}]+)\}/)?.[1]
    expect(timingConsole).toContain('background: var(--color-surface)')
    expect(timingConsole).not.toContain('backdrop-filter')
    expect(indexCss).toContain('--color-surface:')
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

  it('keeps the Full Song play button beside speeds and reserves the measured safe-area dock', () => {
    expect(fullSongCss).toContain(
      'grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(5.4rem, 5.4rem);',
    )
    expect(fullSongCss).toMatch(
      /\.full-song-player-toggle\s*\{[^}]*min-width: 5\.4rem;[^}]*min-height: 44px;/s,
    )
    expect(fullSongCss).toContain('calc(0.95rem + env(safe-area-inset-bottom))')
    expect(fullSongCss).toContain('padding-bottom: calc(var(--full-song-dock-height, 13rem) + .75rem)')
  })

  it('makes the mobile Timing Debugger console an edge-to-edge safe-area sheet', () => {
    expect(timingCss).toMatch(
      /\.timing-debugger-console\s*\{[^}]*left: 0;[^}]*right: 0;[^}]*bottom: 0;/s,
    )
    expect(timingCss).toContain('calc(.6rem + env(safe-area-inset-bottom))')
    expect(timingCss).toContain('border-inline: 0;')
    expect(timingCss).toMatch(/\.timing-debugger-console-body\s*\{[^}]*min-height: 0;[^}]*overflow: auto;/s)
    expect(timingCss).toContain('padding-bottom: calc(var(--timing-debugger-dock-occlusion, 0px) + .75rem);')
    expect(timingCss).toContain(
      'border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;',
    )
  })
})
