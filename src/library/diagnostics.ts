export type DiagnosticSeverity = 'error' | 'warning'

export type DiagnosticCode =
  | 'MISSING_SOURCE_FILE'
  | 'JSON_PARSE_ERROR'
  | 'SCHEMA_INVALID'
  | 'SONG_ID_DIRECTORY_MISMATCH'
  | 'MISSING_AUDIO_SOURCE'
  | 'AMBIGUOUS_AUDIO_SOURCE'
  | 'MISSING_COVER_ARTWORK'
  | 'AMBIGUOUS_COVER_ARTWORK'
  | 'NO_HERO_ARTWORK'
  | 'AMBIGUOUS_HERO_ARTWORK'
  | 'TIMELINE_EXCEEDS_AUDIO_DURATION'
  | 'MEDIA_TOOL_ERROR'
  | 'MEDIA_TRANSFORM_ERROR'
  | 'SECTION_OUT_OF_ORDER'
  | 'SECTION_OVERLAP'
  | 'OCCURRENCE_OUTSIDE_SECTION'
  | 'UNKNOWN_SEGMENT_REFERENCE'
  | 'UNKNOWN_SECTION_REFERENCE'
  | 'UNKNOWN_FEATURE_SEGMENT_REFERENCE'
  | 'SOURCE_READ_ERROR'

export interface Diagnostic {
  severity: DiagnosticSeverity
  code: DiagnosticCode
  message: string
  songId?: string
  sourcePath?: string
  fieldPath?: string
}

export interface ValidationResult {
  diagnostics: Diagnostic[]
  songCount: number
  errors: number
  warnings: number
  valid: boolean
}

export function createValidationResult(
  diagnostics: Diagnostic[],
  songCount: number,
): ValidationResult {
  const errors = diagnostics.filter(({ severity }) => severity === 'error').length
  const warnings = diagnostics.filter(
    ({ severity }) => severity === 'warning',
  ).length

  return {
    diagnostics,
    songCount,
    errors,
    warnings,
    valid: errors === 0,
  }
}
