import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const base = normalizeBase(process.argv[2] ?? '/')
const distRoot = resolve(process.cwd(), 'dist')
const indexHtml = readText('index.html')
const manifest = JSON.parse(readText('manifest.webmanifest')) as {
  name?: string
  display?: string
  start_url?: string
  scope?: string
  icons?: Array<{ src?: string; purpose?: string; type?: string }>
}
const serviceWorker = readText('sw.js')
const assetBundle = readdirSync(resolve(distRoot, 'assets'))
  .filter((fileName) => fileName.endsWith('.js'))
  .map((fileName) => readText(`assets/${fileName}`))
  .join('\n')

assert(manifest.name === 'RED:REPEAT', 'manifest name must be RED:REPEAT')
assert(manifest.display === 'standalone', 'manifest display must be standalone')
assert(manifest.start_url === './', 'manifest start_url must remain relative')
assert(manifest.scope === './', 'manifest scope must remain relative')
assert(
  manifest.icons?.length === 3 &&
    manifest.icons.every(
      (icon) =>
        icon.src &&
        !icon.src.startsWith('/') &&
        icon.type === 'image/png',
    ) &&
    manifest.icons.some(
      (icon) => icon.src === 'icon-192.png' && icon.purpose === 'any',
    ) &&
    manifest.icons.some(
      (icon) => icon.src === 'icon-512.png' && icon.purpose === 'maskable',
    ),
  'manifest must contain relative PNG any and maskable icons',
)

assert(statSync(resolve(distRoot, 'favicon.svg')).isFile(), 'favicon must be present')
assert(statSync(resolve(distRoot, 'icon-192.png')).isFile(), '192px icon must be present')
assert(statSync(resolve(distRoot, 'icon-512.png')).isFile(), '512px icon must be present')

const deployedAssetUrls = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map(
  ([, url]) => url,
)
deployedAssetUrls.forEach((url) => {
  if (url?.startsWith('/')) {
    assert(
      url.startsWith(base),
      `index.html URL is outside the configured base ${base}: ${url}`,
    )
  }
})

const serviceWorkerUrl = `${base}sw.js`
assert(
  assetBundle.includes(serviceWorkerUrl),
  `bundled registration must target ${serviceWorkerUrl}`,
)
assert(serviceWorker.includes('red-repeat-catalog-v1'), 'catalog cache route missing')
assert(serviceWorker.includes('red-repeat-runtime-v1'), 'runtime cache route missing')
assert(serviceWorker.includes('red-repeat-audio-v1'), 'audio cache route missing')
assert(serviceWorker.includes('RangeRequestsPlugin'), 'audio range route missing')
assert(serviceWorker.includes('NetworkFirst'), 'catalog Network First route missing')
assert(serviceWorker.includes('CacheFirst'), 'Cache First route missing')

const precacheSection = serviceWorker.slice(
  0,
  serviceWorker.indexOf('registerRoute'),
)
assert(
  !precacheSection.includes('library-runtime'),
  'Runtime resources must not enter the App Shell precache',
)
assert(
  statSync(resolve(distRoot, 'library-runtime/catalog.json')).isFile(),
  'compiled catalog must be present in the static artifact',
)

console.log(`PWA artifact contract passed for base ${base}`)

function readText(relativePath: string): string {
  return readFileSync(resolve(distRoot, relativePath), 'utf8')
}

function normalizeBase(value: string): string {
  if (value === '/') {
    return value
  }
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}
