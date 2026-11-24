// @vitest-environment node
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { rejectCompilerResidue, verifyRuntimeArtifact } from './runtime-artifact'

const require = createRequire(import.meta.url)
const cli = ['--import', pathToFileURL(require.resolve('tsx')).href, path.resolve('src/library/compile-cli.ts')]
let root: string
let output: string
let hook: string
function compile(extra: string[] = []) {
  return spawnSync(process.execPath, [...extra, ...cli], { cwd: root, encoding: 'utf8', timeout: 15000 })
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-publication-'))
  output = path.join(root, 'public/library-runtime')
  hook = path.join(root, 'fault.cjs')
  expect(compile().status).toBe(0)
})
afterEach(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))

it.each(['stage', 'previous', 'published'])('recovers after process death at %s and excludes concurrent writers', async point => {
  const before = fs.readFileSync(path.join(output, 'catalog.json'))
  fs.writeFileSync(hook, `
    const fs = require('node:fs')
    const path = require('node:path')
    function stop(point) {
      if (point === ${JSON.stringify(point)}) {
        fs.writeSync(1, 'checkpoint\\n')
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30000)
      }
    }
    const mkdir = fs.mkdirSync
    fs.mkdirSync = (...args) => {
      const result = mkdir(...args)
      if (path.basename(String(args[0])) === 'stage') stop('stage')
      return result
    }
    const rename = fs.renameSync
    fs.renameSync = (src, dst) => {
      rename(src, dst)
      if (path.basename(dst) === 'previous') stop('previous')
      if (path.basename(src) === 'stage') stop('published')
    }
  `)
  const child = spawn(process.execPath, ['--require', hook, ...cli], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] })
  const exited = once(child, 'exit')
  try {
    const [signal] = await Promise.race([
      once(child.stdout, 'data'),
      exited.then(() => { throw new Error('Compiler exited before checkpoint') }),
    ])
    expect(String(signal)).toContain('checkpoint')
    const contender = compile()
    expect(contender.status).toBe(1)
    expect(contender.stderr).toContain('Runtime output is busy')
    expect(fs.existsSync(output)).toBe(point !== 'previous')
  } finally {
    child.kill('SIGKILL')
    await exited
  }
  // Invalid input prevents a new publish: only recovery can restore the old tree.
  fs.mkdirSync(path.join(root, 'library', 'invalid'), { recursive: true })
  expect(compile().status).toBe(1)
  expect(fs.readFileSync(path.join(output, 'catalog.json'))).toEqual(before)
  fs.rmdirSync(path.join(root, 'library', 'invalid'))
  expect(compile().status).toBe(0)
  verifyRuntimeArtifact(output)
}, 30000)

it('rolls back a failing final rename and allows a normal retry', () => {
  const old = fs.readFileSync(path.join(output, 'catalog.json'))
  fs.writeFileSync(hook, `
    const fs = require('node:fs')
    const rename = fs.renameSync
    fs.renameSync = (src, dst) => {
      if (require('node:path').basename(src) === 'stage') throw new Error('injected rename failure')
      rename(src, dst)
    }
  `)
  const failed = compile(['--require', hook])
  expect(failed.stderr).toContain('injected rename failure')
  expect(failed.status).toBe(1)
  expect(fs.readFileSync(path.join(output, 'catalog.json'))).toEqual(old)
  expect(compile().status).toBe(0)
}, 15000)

it('rejects legacy staging, extra files and damaged Catalog identity', () => {
  const residue = path.join(root, 'public/library-runtime.tmp-123')
  fs.mkdirSync(residue)
  expect(compile().stderr).toContain('Move the compiler residue')
  expect(() => rejectCompilerResidue(path.dirname(output))).toThrow('library-runtime.tmp-123')
  expect(fs.existsSync(residue)).toBe(true)
  fs.writeFileSync(path.join(output, 'extra'), 'unexpected')
  expect(() => verifyRuntimeArtifact(output)).toThrow('Unreferenced Runtime entries')
  fs.unlinkSync(path.join(output, 'extra'))
  const catalog = path.join(output, 'catalog.json')
  fs.writeFileSync(catalog, fs.readFileSync(catalog, 'utf8').replace(/[a-f0-9]{64}/, '0'.repeat(64)))
  expect(() => verifyRuntimeArtifact(output)).toThrow('Invalid Catalog hash')
})
