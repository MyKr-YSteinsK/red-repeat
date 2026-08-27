# SUPPORTING_DOCS_MANIFEST

Project State summarizes durable context. The following paths remain the
detailed canonical owners for their respective contracts. Historical archives
are evidence and never active execution instructions.

| Path | Canonical role | Visibility / notes |
| --- | --- | --- |
| `docs/歌曲内容生成规范.md` | Content/source/timing authoring and QA contract | Active; detailed prose owner |
| `src/library/schema.ts`, `src/library/source-package.ts`, `src/library/validator.ts` | Executable public source schema, discovery and cross-file/media invariants | Active machine-enforced owner |
| `src/library/compiler.ts`, `src/library/media.ts`, `src/library/hash.ts`, `src/library/*cli.ts` | Deterministic runtime generation and media/hash outputs | Active compiler owner; generated output is ignored |
| `src/library/runtime-schema.ts`, `src/runtime/*` | Runtime document validation, URL/fetch, compatibility and assembly | Active runtime owner; contract version 3 |
| `docs/版本发布规范.md` | Release-reference prose and user-version semantics | Active; must agree with the current workflow |
| `src/release/releases.ts`, `src/release/semver.ts`, `src/release/release-grouping.ts`, `src/release/build-info.ts` | Executable release ledger, grouping and build identity | Active; not duplicated by a CHANGELOG |
| `scripts/verify-releases.ts` | Package/ledger/commit/tag integrity checks | Active release oracle |
| `scripts/verify-deployed-version.ts` | Live deployed version/commit convergence | External oracle at authorized deploy boundary |
| `scripts/verify-pwa-build.ts`, `vite.config.ts` | Static PWA artifact, base path, cache and version expectations | Active artifact owner; not installed-client proof |
| `.github/workflows/ci.yml` | Push/PR quality, exact-SHA Pages build/deploy and live probe ordering | Sole delivery workflow |
| `.gitignore`, `scripts/verify-gitignore.ts` | Private/generated/tool-output boundary | Active repository boundary owner |
| `library/<song-id>/` | Approved public Song Edition source | Tracked canonical content; current public packages are `work-millennium-parade` and `senbonzakura` |
| `.private/research/<song>/...` and `.private/library-pending/...` | Private provenance, research and pending intake | Human-only/private; do not expose or import wholesale |
| `src/App.tsx`, `src/navigation.ts`, `src/edition/*`, `src/settings/*`, `src/App.css`, `src/index.css`, co-located tests | Current detailed UI and interaction behavior | Active implementation owner; no standalone visual spec exists |
| `src/audio/*`, `src/timeline/*`, `src/practice/*` | Shared playback, timing and Practice domain behavior | Active executable domain owners |
| `src/pwa/*` | Offline/cache/update lifecycle and download state | Active executable PWA owner |
| `src/debugger/*`, `src/settings/timing-export.ts` | Timeline/Timing Debugger, timing repair and export surfaces | Active public product capability; detailed UI/behavior remains owned by code/tests |
| `docs/project/PROJECT_BRIEF.md`, `DECISIONS.md`, `CURRENT_STATE.md` | Durable product identity, decisions and adoption-time project state | Active summary layer; links to detail rather than copying it |
| `docs/archive/migration/*` | Historical migration evidence | Non-authoritative archive only |

## Intentionally absent from active ownership

- No `PROJECT_MAP.md` is needed for the current boundary; the manifest and
  Project State links are sufficient.
- No standalone visual specification is active. Retired Theme/`visual.json`
  materials must not be promoted into current requirements.
- Historical Plans/Handoffs are not stored as active supporting specs. If any are
  recovered later, preserve them as labeled evidence and extract only durable
  rationale into the appropriate owner.
