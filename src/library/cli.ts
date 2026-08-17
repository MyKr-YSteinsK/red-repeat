import path from 'node:path'
import { validateLibrary } from './validator'

const sourceRoot = path.resolve(process.cwd(), 'library')
const result = validateLibrary(sourceRoot)

for (const diagnostic of result.diagnostics) {
  const location = [
    diagnostic.songId,
    diagnostic.sourcePath,
    diagnostic.fieldPath,
  ]
    .filter(Boolean)
    .join(' ')

  console.log(
    `${diagnostic.severity.toUpperCase()} ${diagnostic.code}${
      location ? ` [${location}]` : ''
    }: ${diagnostic.message}`,
  )
}

if (result.valid) {
  const warningSummary = result.warnings > 0 ? `, ${result.warnings} warning(s)` : ''
  console.log(
    `Library validation passed: ${result.songCount} edition(s)${warningSummary}.`,
  )
} else {
  console.log(
    `Library validation failed: ${result.errors} error(s), ${result.warnings} warning(s).`,
  )
  process.exitCode = 1
}
