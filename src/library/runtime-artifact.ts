import fs from 'node:fs'
import path from 'node:path'
import { hashFile, hashJson, stableJsonBuffer } from './hash'
import { CatalogSchema, RuntimeEditionSchema } from './runtime-schema'

export function rejectCompilerResidue(directory: string): void {
  if (!fs.existsSync(directory)) return
  const residue = fs.readdirSync(directory).find(name =>
    /^library-runtime[.-]|^\.red-repeat-compiler$/i.test(name),
  )
  if (residue) {
    throw new Error(`Move the compiler residue outside the delivery directory, then rebuild: ${path.join(directory, residue)}`)
  }
}

// Walk once, without following links. Resolve every reference against this
// inventory before reading it, and reject any unreferenced file or directory.
export function verifyRuntimeArtifact(root: string): void {
  const files = new Set<string>()
  const directories = new Set<string>()
  function visit(relative: string): void {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name)
      if (entry.isDirectory()) {
        directories.add(name)
        visit(name)
      } else if (entry.isFile()) {
        files.add(name)
      } else {
        throw new Error(`Unexpected Runtime entry: ${name}`)
      }
    }
  }
  if (!fs.lstatSync(root).isDirectory()) throw new Error(`Expected Runtime directory: ${root}`)
  visit('')
  const used = new Set<string>()
  function claim(file: string): string {
    if (!files.has(file)) throw new Error(`Missing Runtime file: ${file}`)
    used.add(file)
    let dir = path.posix.dirname(file)
    while (dir !== '.') {
      directories.delete(dir)
      dir = path.posix.dirname(dir)
    }
    return path.join(root, file)
  }
  function readJson(file: string) {
    const bytes = fs.readFileSync(claim(file))
    const value = JSON.parse(bytes.toString('utf8'))
    if (!bytes.equals(stableJsonBuffer(value))) throw new Error(`Noncanonical JSON: ${file}`)
    return value
  }
  const catalogJson = readJson('catalog.json')
  const catalog = CatalogSchema.parse(catalogJson)
  const { contentHash, ...catalogPayload } = catalogJson
  if (hashJson(catalogPayload) !== contentHash) throw new Error('Invalid Catalog hash')
  for (const song of catalog.editions) {
    const prefix = `/library-runtime/songs/${song.songId}/`
    function resource(url: string, kind: string, extension: string): { file: string; hash: string } {
      if (!url.startsWith(prefix)) throw new Error(`Unexpected Runtime URL: ${url}`)
      const relative = decodeURIComponent(url.slice(prefix.length))
      const file = `songs/${song.songId}/${relative}`
      const hash = relative.split('.').at(-2) ?? ''
      if (!/^[a-f0-9]{64}$/.test(hash) || relative !== `${kind}.${hash}.${extension}`) {
        throw new Error(`Unexpected Runtime resource: ${url}`)
      }
      return { file, hash }
    }
    const descriptor = resource(song.editionUrl, 'edition', 'json')
    const editionJson = readJson(descriptor.file)
    const edition = RuntimeEditionSchema.parse(editionJson)
    const { contentHash: editionHash, ...payload } = editionJson
    if (edition.song.songId !== song.songId || editionHash !== descriptor.hash || hashJson(payload) !== editionHash) {
      throw new Error(`Edition identity mismatch: ${descriptor.file}`)
    }
    function checkBytes(url: string, kind: string, extension: string): string {
      const { file, hash } = resource(url, kind, extension)
      if (hashFile(claim(file)) !== hash) throw new Error(`Invalid resource hash: ${file}`)
      return hash
    }
    for (const [kind, url] of [
      ['lyrics', edition.lyricsUrl], ['timeline', edition.timelineUrl], ['practice', edition.practiceUrl],
    ]) {
      const { file, hash } = resource(url, kind, 'json')
      const value = readJson(file)
      if (hashJson(value) !== hash || (kind === 'timeline' && value.audioSourceHash !== edition.audio.sourceHash)) {
        throw new Error(`Invalid document identity: ${file}`)
      }
    }
    if (checkBytes(edition.audio.url, 'audio', 'm4a') !== edition.audio.runtimeHash) throw new Error('Invalid audio identity')
    checkBytes(song.coverUrl, 'cover-small', 'webp')
    checkBytes(edition.artwork.coverSmallUrl, 'cover-small', 'webp')
    checkBytes(edition.artwork.coverLargeUrl, 'cover-large', 'webp')
    if (edition.artwork.heroLargeUrl) checkBytes(edition.artwork.heroLargeUrl, 'hero-large', 'webp')
    for (const feature of edition.features) checkBytes(feature.url, `features/${feature.id}`, 'md')
  }
  const extra = [...directories, ...[...files].filter(file => !used.has(file))]
  if (extra.length) throw new Error(`Unreferenced Runtime entries: ${extra.join(', ')}`)
}
