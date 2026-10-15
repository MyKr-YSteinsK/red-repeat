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
| `src/App.tsx`, `src/navigation.ts`, `src/edition/SongEditionPage.tsx` | Catalog route/filter/download-task subscription UI and viewport restoration, recent-continue and queue-entry hrefs, manifest-confirmed warm-entry handoff, Song Edition mode selection and current UI dispatch | Active navigation and UI shell owners; the loader remains the snapshot identity authority, and the task manager survives route-level Catalog unmounts |
| `src/library/catalog-search.ts` | Unicode-normalized Catalog title/artist/album/songId search, explicit traceable title aliases, and identity-matched installed snapshot selection for offline results | Active pure Catalog search/selection owner; canonical fields remain the display/source authority |
| `src/runtime/runtime-client.ts`, `src/pwa/catalog-cache.ts` | Catalog local-first loading/cache plus Runtime fetch, parsed-document validation and compatibility handling | Active data-loading owners |
| `src/edition/SongEditionPage.tsx`, `src/edition/song-playback-session.ts`, `src/edition/song-playback-context.ts`, `src/edition/use-song-edition-playback.ts` | Validated Edition identity, one song-level command owner, preview recovery/cancellation, Practice ramp/pause-resume, mode-local view context and playback subscriptions | Active; mode unmount releases subscriptions, song exit pauses; one shared AudioEngine |
| `src/edition/PracticeWorkspace.tsx`, `src/edition/FullSongWorkspace.tsx`, `src/edition/ExplainWorkspace.tsx`, `src/edition/ExplainLyricQuote.tsx` | Current mode controls, selection/reading state and explicit playback intents | Active UI adapters; bounded commands/ramp and preview lifecycle belong to the song session |
| `src/edition/LyricDisplayPreferences.tsx` | Versioned local lyric display choices, display-only layer filtering and reading-anchor preservation | Active UI preference owner; translation/Romaji visibility and text size do not change canonical content or Practice progress |
| `src/practice/practice-state.ts`, `src/practice/practice-rate.ts` | Practice resume/progress and playback-rate normalization/local persistence | Active Practice persistence owners |
| `src/practice/resume-context.ts`, `src/practice/practice-queue.ts` | Identity-bound last-session context and versioned, ordered user-managed Practice queue persistence | Active local domain owners; queue completion is not a mastery or scoring record |
| `src/practice/PracticeQueuePanel.tsx` | Catalog queue rendering, current-edition target validation, and explicit queue navigation | Active Catalog UI owner; stale targets remain visible and are not silently remapped |
| `src/practice/personal-backup.ts`, `src/practice/validated-song-context.ts` | Whitelisted personal-backup schema, identity-aware preview/write planning, and validated current Edition context | Active local backup safety owners; compensation is verified per key, not an atomic localStorage transaction |
| `src/settings/SettingsPage.tsx` | Settings UI for Timing Correction Export and personal backup export/import preview/confirmation | Active local settings interface; imported data remains separate from canonical song source and offline download manifests |
| `src/audio/audio-engine.ts`, `src/timeline/resolver.ts`, `src/timeline/occurrence-timing.ts` | Shared media instance, current timeline resolution and canonical Occurrence timing-provider contract | Active shared playback/timing owners |
| `src/practice/practice-timing-overrides.ts` | Identity-bound local timing override validation, persistence and effective provider construction | Active sparse override owner; same-field `startMs/endMs` only |
| `src/pwa/song-download.ts` | Complete downloaded Song Edition snapshot install/removal, manifest validation, verified resource progress and abort-safe manifest-last replacement | Active offline snapshot transaction owner; v2 manifest unchanged |
| `src/pwa/song-download-tasks.ts` | Per-App-document single-flight ownership, subscription, cancellation and ordering of manual downloads, Catalog H1→H2 refreshes and removal | Active transient task owner; progress is memory-only and does not define installed/offline state |
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
  product requirements. Current Practice controls are owned by `src/edition/PracticeWorkspace.tsx`;
  ramp operations belong to `src/edition/song-playback-session.ts`, and compatible
  fixed-rate persistence remains in `src/practice/practice-rate.ts`.
- Proposed `SongRepository` and `ResourceScheduler` remain unimplemented review
  architecture. Plan-66 implements the concrete `SongPlaybackSession` owner above;
  the review report does not independently authorize broader session architecture.
- `docs/archive/` Plans, Handoffs, migration material and retrospectives are
  historical evidence, not active specifications or execution instructions.
- Historical Plans/Handoffs are not stored as active supporting specs. If any are
  recovered later, preserve them as labeled evidence and extract only durable
  rationale into the appropriate owner.
