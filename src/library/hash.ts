import crypto from 'node:crypto'
import fs from 'node:fs'

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value)) ?? 'null'
}

export function hashText(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

export function hashBytes(value: Uint8Array): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function hashJson(value: unknown): string {
  return hashText(stableStringify(value))
}

export function hashFile(filePath: string): string {
  return hashBytes(fs.readFileSync(filePath))
}

export function stableJsonBuffer(value: unknown): Buffer {
  return Buffer.from(`${stableStringify(value)}\n`, 'utf8')
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        if (record[key] !== undefined) {
          result[key] = canonicalize(record[key])
        }
        return result
      }, {})
  }

  return value
}
