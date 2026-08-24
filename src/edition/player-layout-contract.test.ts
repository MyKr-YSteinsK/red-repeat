import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const appCss = readFileSync(
  path.join(process.cwd(), 'src', 'App.css'),
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
})
