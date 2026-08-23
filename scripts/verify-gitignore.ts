import { execFileSync } from 'node:child_process'

const ignoredPaths = [
  '.private/library/work-millennium-parade/audio/source.mp3',
  'public/library-runtime/catalog.json',
  'dist/index.html',
]

for (const candidate of ignoredPaths) {
  try {
    execFileSync('git', ['check-ignore', '--no-index', '--quiet', '--', candidate], {
      stdio: 'ignore',
    })
  } catch {
    throw new Error(`repository hygiene check failed: ${candidate} is not ignored`)
  }
}

console.log(
  `Repository hygiene passed: ${ignoredPaths.length} private/generated path patterns are ignored.`,
)
