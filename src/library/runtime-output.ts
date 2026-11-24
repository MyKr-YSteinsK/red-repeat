import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { hashText } from './hash'
import { rejectCompilerResidue, verifyRuntimeArtifact } from './runtime-artifact'

function removeOwnedTree(directory: string): void {
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}

// SQLite holds the OS file lock across async media compilation. Closing the
// connection (including process death) releases it without a stale-PID race.
export async function withRuntimeOutput<T>(
  output: string,
  generate: (stage: string, publish: () => void) => Promise<T>,
): Promise<T> {
  const parent = path.dirname(output)
  fs.mkdirSync(parent, { recursive: true })
  const realParent = fs.realpathSync.native(parent)
  const publicPath = path.resolve('public')
  const publicRoot = fs.existsSync(publicPath) ? fs.realpathSync.native(publicPath) : publicPath
  let stateParent = realParent
  // The same target must use the same lock even when invoked from another cwd.
  for (let dir = realParent; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    if (path.basename(dir).toLowerCase() === 'public' || dir === publicRoot) {
      stateParent = path.dirname(dir)
    }
  }
  const target = path.join(realParent, path.basename(output))
  if (target === publicRoot || target === path.parse(target).root || path.basename(target).toLowerCase() === 'public') {
    throw new Error('Expected a dedicated Runtime output directory')
  }
  const key = hashText(process.platform === 'win32' ? target.toLowerCase() : target)
  const state = path.join(stateParent, '.red-repeat-compiler')
  fs.mkdirSync(state, { recursive: true })
  if (fs.statSync(state).dev !== fs.statSync(realParent).dev) throw new Error('Runtime staging and destination must share a filesystem')
  const db = new DatabaseSync(path.join(state, key + '.sqlite'))
  try {
    let token: unknown
    try {
      db.exec('CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, token TEXT NOT NULL)')
      db.prepare('INSERT OR IGNORE INTO workspace VALUES (1, ?)').run(randomUUID())
      db.exec('BEGIN IMMEDIATE')
      token = db.prepare('SELECT token FROM workspace WHERE id = 1').get()?.token
    } catch (cause) {
      if ((cause as { errcode?: number }).errcode === 5) throw new Error(`Runtime output is busy: ${target}`, { cause })
      throw cause
    }
    if (typeof token !== 'string' || !/^[a-f0-9-]{36}$/.test(token)) throw new Error('Invalid compiler workspace identity')
    const work = path.join(state, token)
    fs.mkdirSync(work, { recursive: true })
    const stage = path.join(work, 'stage')
    const backup = path.join(work, 'previous')

    // Only complete, verified trees reach the final name. If interrupted
    // between renames, restore the previous tree before even validating input.
    if (fs.existsSync(backup)) {
      if (!fs.existsSync(target)) fs.renameSync(backup, target)
      else {
        verifyRuntimeArtifact(target)
        removeOwnedTree(backup)
      }
    }
    removeOwnedTree(stage)
    if (target === path.join(publicRoot, 'library-runtime')) rejectCompilerResidue(publicRoot)
    fs.mkdirSync(stage)
    try {
      return await generate(stage, () => {
        verifyRuntimeArtifact(stage)
        if (fs.existsSync(target)) {
          // Preserve unknown/user files instead of replacing an unrelated directory.
          if (!fs.lstatSync(target).isDirectory()) throw new Error(`Expected Runtime directory: ${target}`)
          if (fs.readdirSync(target).length) verifyRuntimeArtifact(target)
          fs.renameSync(target, backup)
        }
        try {
          fs.renameSync(stage, target)
        } catch (cause) {
          if (fs.existsSync(backup)) fs.renameSync(backup, target)
          throw cause
        }
        removeOwnedTree(backup)
      })
    } finally {
      removeOwnedTree(stage)
    }
  } finally {
    db.close()
  }
}
