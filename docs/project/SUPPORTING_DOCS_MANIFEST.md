# SUPPORTING_DOCS_MANIFEST

Project State summarizes durable context. The following paths remain the
detailed canonical owners for their respective contracts. Historical archives
are evidence and never active execution instructions.

| Path | Canonical role | Visibility / notes |
| --- | --- | --- |
| `docs/歌曲内容生成规范.md` | Content/source/timing authoring and QA contract | Active; detailed prose owner |
| `src/library/schema.ts`, `src/library/source-package.ts`, `src/library/validator.ts` | Executable public source schema, discovery and cross-file/media invariants | Active machine-enforced owner |
| `src/library/compiler.ts`, `src/library/media.ts`, `src/library/hash.ts`, `src/library/*cli.ts` | Deterministic runtime generation and media/hash outputs | Active compiler owner; generated output is ignored |
| `src/library/runtime-schema.ts`, `src/runtime/runtime-client.ts`, `src/runtime/song-edition-loader.ts`, `src/runtime/song-edition.ts`, `src/edition/use-song-edition-core.ts` | Runtime document schemas; Catalog/Runtime fetch and validation; Song Edition loading, downloaded-snapshot selection, core document assembly and optional Feature loading | Active loader/assembly owners; contract version 3 |
| `docs/版本发布规范.md` | Release-reference prose and user-version semantics | Active; must agree with the current workflow |
| `src/release/releases.ts`, `src/release/semver.ts`, `src/release/release-grouping.ts`, `src/release/build-info.ts` | Executable release ledger, grouping and build identity | Active; not duplicated by a CHANGELOG |
| `scripts/verify-releases.ts` | Package/ledger/commit/tag integrity checks | Active release oracle |
| `scripts/verify-deployed-version.ts` | Live deployed version/commit convergence | External oracle at authorized deploy boundary |
| `scripts/verify-pwa-build.ts`, `vite.config.ts` | Static PWA artifact, base path, cache and version expectations | Active artifact owner; not installed-client proof |
| `.github/workflows/ci.yml` | Push/PR quality, exact-SHA Pages build/deploy and live probe ordering | Sole delivery workflow |
| `.gitignore`, `scripts/verify-gitignore.ts` | Private/generated/tool-output boundary | Active repository boundary owner |
| `library/<song-id>/` | Approved public Song Edition source | Tracked canonical content; current public packages are `work-millennium-parade`, `senbonzakura`, `night-dancer-imase`, `shinkai-shoujo`, `mousou-kanshou-daishou-renmei` and `doushite-takase-toya` |
| `.private/research/<song>/...` and `.private/library-pending/...` | Private provenance, research and pending intake | Human-only/private; do not expose or import wholesale |
| `src/App.tsx`, `src/navigation.ts`, `src/edition/SongEditionPage.tsx` | Catalog route, route parsing/hrefs, Song Edition mode selection and current UI dispatch | Active navigation and UI shell owners |
| `src/runtime/runtime-client.ts`, `src/pwa/catalog-cache.ts` | Catalog local-first loading/cache plus Runtime fetch, parsed-document validation and compatibility handling | Active data-loading owners |
| `src/edition/PracticeWorkspace.tsx`, `src/edition/use-song-edition-playback.ts` | Current Practice controls and workspace playback integration with the shared engine | Active Practice UI/playback path; current rate ramp is implemented in `PracticeWorkspace.tsx` |
| `src/practice/practice-state.ts`, `src/practice/practice-rate.ts` | Practice resume/progress and playback-rate normalization/local persistence | Active Practice persistence owners |
| `src/audio/audio-engine.ts`, `src/timeline/resolver.ts`, `src/timeline/occurrence-timing.ts` | Shared media instance, current timeline resolution and canonical Occurrence timing-provider contract | Active shared playback/timing owners |
| `src/practice/practice-timing-overrides.ts` | Identity-bound local timing override validation, persistence and effective provider construction | Active sparse override owner; same-field `startMs/endMs` only |
| `src/pwa/song-download.ts` | Complete downloaded Song Edition snapshot install/removal, manifest validation and manifest-last replacement | Active offline snapshot transaction owner |
| `src/pwa/runtime-cache.ts`, `src/pwa/cache-routes.ts`, `src/pwa/catalog-cache.ts` | Runtime warmup and Workbox/Catalog cache routes and persistence | Active cache owners; warmup is not the downloaded-snapshot manifest |
| `src/pwa/update-manager.ts`, `src/pwa/register-service-worker-options.ts`, `src/pwa/version-probe.ts`, `vite.config.ts` | Background version probe, Service Worker registration/update preparation and build configuration | Active passive-update owners; current document remains on its startup build |
| `src/debugger/TimingDebuggerPage.tsx`, `src/debugger/use-timeline-debugger-playback.ts`, `src/settings/timing-export.ts` | Production-public Timing Debugger UI/playback and identity-bearing Markdown correction export | Active supporting capability; override storage remains owned by `src/practice/practice-timing-overrides.ts` |
| `docs/project/PROJECT_BRIEF.md`, `DECISIONS.md`, `CURRENT_STATE.md` | Durable product identity, decisions and adoption-time project state | Active summary layer; links to detail rather than copying it |
| `docs/archive/migration/*`, `docs/archive/retrospectives/*` | Historical migration and retrospective evidence | Non-authoritative archive only |

## Intentionally absent from active ownership

- No `PROJECT_MAP.md` is needed for the current boundary; the manifest and
  Project State links are sufficient.
- No standalone visual specification is active. Retired Theme/`visual.json`
  materials must not be promoted into current requirements.
- `src/practice/practice-controller.ts`,
  `src/practice/practice-playback-session.ts` and
  `src/edition/use-practice-controller.ts` are retained code, not the current
  Practice UI execution path; their legacy ramp parameters are not current
  product requirements. Current Practice controls and ramp behavior are owned
  by `src/edition/PracticeWorkspace.tsx` and `src/practice/practice-rate.ts`.
- Proposed `SongRepository`, `PlaybackSession` and `ResourceScheduler` names
  describe unimplemented review architecture, not active repository owners.
- `docs/archive/` Plans, Handoffs, migration material and retrospectives are
  historical evidence, not active specifications or execution instructions.
- Historical Plans/Handoffs are not stored as active supporting specs. If any are
  recovered later, preserve them as labeled evidence and extract only durable
  rationale into the appropriate owner.
