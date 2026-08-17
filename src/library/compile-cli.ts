import { compileLibrary } from './compiler'

try {
  const result = await compileLibrary()

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
    console.log(
      `Library compile passed: ${result.songCount} edition(s), ${result.emittedFiles.length} runtime file(s).`,
    )
  } else {
    console.log(
      `Library compile failed: ${result.errors} error(s), ${result.warnings} warning(s).`,
    )
    process.exitCode = 1
  }
} catch (error) {
  console.error(
    `Library compile failed: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
}
