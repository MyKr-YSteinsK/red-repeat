# CURRENT_STATE

This is the current repository state. Current repo evidence supersedes
the external migration snapshot; archived Plans and forensics are historical
evidence only.

## Repository identity and worktree

- Repository/package: `red-repeat`
- Root: `D:\CS\red-repeat`
- Remote: `origin = https://github.com/MyKr-YSteinsK/red-repeat.git`
- Branch: `main`, tracking `origin/main`
- Current user version: `1.8.0`
- Current lifecycle stage: `Production`
- Latest ledger/tag: `1.8.0` / `v1.8.0 -> 01cdd64`; existing
  `v1.7.2 -> 50e7114`, `v1.7.1 -> a98e300`, `v1.7.0 -> 325d418` and
  `v1.6.2 -> c61f977` remain unchanged.
- `a98e30015b7e1ee03e850685f5eaca6f81922681` is the user-visible WORK
  content implementation commit for `1.7.1`; the later release-metadata commit
  on `main` is the independently deployed build identity and is distinct from
  the implementation tag target.
- `325d418adc96adfab89ac70ed9beade496e9f19a` is the implementation commit for
  `1.7.0`. The later release-metadata commit on `main` is the independently
  deployed build identity; it is distinct from the implementation tag target.
- Adoption started with user-owned `AGENTS.md` changes and untracked
  `RED-REPEAT-Development-Forensics.md`. The former is reconciled into the
  canonical repo contract; the latter is preserved as a labeled archive at
  `docs/archive/migration/RED-REPEAT-Development-Forensics-2026-08-26.md`.
- Migration adoption and the RED-Plan-37/44 state closeouts remain no-version
  commits after the `1.6.2` implementation tag. RED-Plan-45 adds the authorized
  public `senbonzakura` Song Edition in a separate product-focused commit.
- RED-Plan-45 release finalization updates package/lock version metadata, the
  release ledger, build-version fallback and this Project State after the
  product commit; the private Handoff archive remains ignored.

## Current product capabilities

- Catalog loading/search, resume-aware “开始学唱 / 继续学唱” and explicit
  per-song offline install/removal.
- Practice as the default Song Edition mode: Practice Unit/Occurrence
  navigation, previous/current/next controls, Segment Picker, line playback,
  rate, continuous playback, repeat/ramp behavior and persisted progress/rate.
- Full Song continuous audio with timed lyric following, seek/progress and rate.
- Explain compiled Markdown features, lyric-reference playback and soft failure
  for unavailable optional content.
- Japanese lyric ruby/furigana rendering for position-verified Han/Katakana
  readings, with canonical original text retained for lyric semantics.
- Settings/update surface with build/version identity, release history, remote
  `version.json` probe and PWA apply/dismiss flow.
- Production-public Timeline/Timing Debugger and timing repair/export with
  compatible identity-bound local timing overrides. The public entry is
  Settings → 播放切口调试 → `#timing=debug`; it is a supporting capability, not
  a fourth Song Edition mode.

## Current public content

The tracked public source contains two Song Editions:
`library/work-millennium-parade/` (`Ｗ●ＲＫ`, 椎名林檎 × 常田大希) with
61 Segments/Occurrences, 10 Practice Units, 11 Sections, one canonical MP3,
one JPG cover and six Explain Markdown features; and
`library/senbonzakura/` (`千本桜`, 黒うさP × 初音未来) with 30 unique
Segments, 45 Occurrences, 6 Practice Units, 10 Sections, one canonical MP3,
one JPG cover and four Explain Markdown features. Japanese lyrics may carry
position-verifiable `ruby` spans for Hiragana furigana; canonical `lyrics`
text and existing `layers` remain separate source contracts. The legacy
migration-era private `senbonzakura` intake was not reclassified; RED-Plan-45
uses the separately authorized task-input source package.

## Technical shape and active owners

- React 19 + TypeScript + Vite 8 + `vite-plugin-pwa`; npm and Node.js 24.x.
- Source flow: tracked library package → strict Zod/cross-reference/media
  validation → hash/media compiler → ignored `public/library-runtime/` → Vite
  artifact → runtime schema/client compatibility assembly.
- `localStorage` owns Practice resume/rate and identity-bound timing overrides;
  Cache Storage/Workbox owns explicit downloads and runtime caches; no server
  persistence exists. Runtime contract version is 3.
- The strict source schema validates ruby spans against canonical lyric
  positions and carries them through the compiler into Runtime. User-facing
  lyric surfaces use the shared semantic ruby renderer; pure English lines may
  omit ruby. Existing persisted Practice resume is rebound by stable Occurrence
  ID when Unit boundaries are regrouped, so stale Unit IDs do not silently select
  the wrong new group.
- `.github/workflows/ci.yml` is the sole workflow. A quality job runs on push/
  PR; successful `main` pushes enable its dependent Pages deploy, which checks
  out the exact SHA, builds `/red-repeat/`, publishes `dist` and probes live
  version/commit identity.
- `npm run build` embeds library compilation and TypeScript compilation.
- Detailed ownership is maintained in
  [SUPPORTING_DOCS_MANIFEST.md](SUPPORTING_DOCS_MANIFEST.md).

## Known limitations and risks

1. `src/App.css`, Practice/Full Song workspaces and `src/pwa/update-manager.ts`
   are high-churn coupling surfaces. Refactoring them is separate work, not
   migration cleanup.
2. CI repeats some compile/typecheck work; optimization is deferred to a normal
   task.

## Completed acceptance

- `RED-Plan-37` / `PLAN-001` human listening acceptance is complete for all 40
  bounded `work-millennium-parade` timing review units: `o001`, `o009`–`o020`,
  `o029`–`o037`, `o042`–`o057`, `o061`, and the `instrumental` Section boundary.
  Result: `PASS 40`, `NEEDS_CORRECTION 0`, `STILL_UNCERTAIN 0`.
- Canonical audio identity is verified: `library/work-millennium-parade/audio/source.mp3`
  SHA-256 is `facc3031bda3d4c5588276fd33b46c9474d19af3364880f9ca1567cea4928083`
  and matches `timeline.json.audioSourceHash`.
- This closeout made no canonical timing correction; `timeline.json` and the
  lyrics/practice/source data remain unchanged.

## RED-Plan-39 acceptance status

- Automated regression evidence: `PASS` for 37 focused UI contract tests
  covering Practice, Segment Picker, Full Song, Song Edition navigation and
  player layout.
- Current-use baseline: user reports no material target-device / installed-PWA
  geometry or interaction issue. The previously deferred formal matrix is not
  represented as a full PASS and is no longer tracked as active debt; future
  device-specific regressions reopen the matching acceptance boundary.
- Current-use verification confirms installed clients can stably obtain newer
  deployed versions. The previous old-installed-client acceptance debt is
  closed for the current baseline; this does not claim event-by-event Service
  Worker observation, and D-013 remains in force.
- This Plan made no product behavior change; only repository governance and
  Project State documentation were updated.

## RED-Plan-40 acceptance status

- `D-017` records the user decision that the Timeline/Timing Debugger is a
  formal production-public supporting capability.
- Current discoverable entry: open Settings, choose `播放切口调试`, then use
  the static-safe `#timing=debug` route; an optional `&edition=<song-id>`
  selects a Song Edition directly.
- The production route is parsed without a dev-mode gate and is served by the
  existing `TimingDebuggerPage`. Settings and route tests cover the entry and
  route semantics; the existing dev-only `#debug=timeline` working-copy route
  remains separate from this public product entry.
- The debugger loads compiled catalog, Edition, lyrics, Timeline, Practice and
  audio resources through the existing runtime client and shared playback
  ownership. No `.private/` or dev-server-only resource is required.
- The existing public entry was already discoverable, so no product/navigation
  code was changed and no fourth Song Edition mode was introduced.
- Version classification is `no-version`: this closeout reconciles durable
  product/governance documents only.

## RED-Plan-44 implementation status

- Source contract: accepted `ruby` spans use exact canonical positions and
  Hiragana readings; Validator coverage includes Han/Katakana, base alignment,
  overlap/range errors, pure English omission and special readings.
- WORK source backfill: all 61 Segments with Han/Katakana characters have
  validated ruby coverage. The canonical `lyrics` strings, all 61 Occurrence
  references, Section IDs and timing values remain unchanged.
- Practice source now has the requested 10 continuous learning Units covering
  `o001`–`o061` exactly once. Old persisted Practice resume metadata is resolved
  by Occurrence identity when the old Unit boundary no longer matches.
- Renderer coverage includes Practice, Full Song, Explain lyric references,
  production Timing Debugger and the legacy Timeline Debugger surface. Existing
  `layers` were retained for backward compatibility.
- Automated regression evidence: `PASS` for 49 test files / 330 tests,
  `npm run typecheck`, `npm run library:validate` and `npm run build`; `lint`
  completed with no errors and only the two pre-existing Fast Refresh warnings
  in `src/edition/FeatureMarkdown.tsx`.
- Manifest artist is now the user-authorized `椎名林檎 × 常田大希`. No 千本桜
  source, translation, Explain expansion, Timeline or audio change was made.
- At the RED-Plan-44 boundary, `千本桜` import, cover/translation intake and
  Explain expansion remained separate follow-up scope; RED-Plan-45 now
  completes that follow-up from its authorized public task input. No private
  material was reclassified in either Plan.
- `RED-Plan-44` is `COMPLETE` under `D-019`: matching automated/local evidence
  passed and the implementation is ready for Production delivery. Dedicated
  human/browser and real-device checks are recorded below as
  `POST-DEPLOY OBSERVATION`; they are not claimed as human PASS.
- Version classification is `no-version`.

## RED-Plan-45 implementation and release status

- `library/senbonzakura/` is the second tracked public Song Edition. Its
  manifest identity is `songId=senbonzakura`, title `千本桜`, artist
  `黒うさP × 初音未来`, album `千本桜`, year `2011`.
- The canonical audio is
  `library/senbonzakura/audio/source.mp3` with SHA-256
  `5c806cf0a1ea702d6a0e4d76b4df443ac999ffc9c1192b7a5d36ca9f3ff33e19`; it
  matches `timeline.json.audioSourceHash` and the supplied task-input hash.
  The supplied cover is copied byte-for-byte to
  `library/senbonzakura/artwork/cover.jpg`.
- The content contract contains 30 unique Segments and 45 Occurrences with
  exact repeated-Segment mapping and translation pairing from the task input.
  All Han/Katakana characters in all 30 Segments have position-verified
  Hiragana `ruby` coverage. Four Explain Markdown features use validated
  lyric references.
- At the RED-Plan-45 import boundary, timing was established against the canonical MP3 using local source-audio
  acoustic/spectral evidence, with LRC timestamps used only as search anchors.
  All 45 Occurrences have independently chosen actual timing and playback
  ranges; lead/tail values are variable, with explicit notes for the long
  instrumental breaks, count-in, reprise, final chorus and outro release.
  No fixed-padding rule was used, and no `STILL_UNCERTAIN` timing item remains
  for this import.
- Practice source contains 6 natural melodic Units covering `o001`–`o045`
  exactly once. Instrumental passages and the outro remain represented by
  Sections without fabricated lyric Occurrences.
- Focused/local evidence passed: audio hash, `npm run library:validate`,
  `npm run library:compile` through `npm run build`, `npm run typecheck`,
  49 test files / 330 tests, `npm run lint` with no errors, and
  `npm run pwa:inspect`. The only lint output is the two pre-existing
  Fast Refresh warnings in `src/edition/FeatureMarkdown.tsx`; validation
  retains the expected optional `NO_HERO_ARTWORK` warnings.
- Product-focused commit is `325d418` and `v1.7.0` points to that commit.
  Release metadata records user version `1.7.0` with level `minor`. The later
  release-metadata commit is the deployed build identity and is kept distinct
  from the implementation tag target.
- Version classification is `MINOR`: `1.6.2 -> 1.7.0`.

## RED-Plan-46 workflow decision status

- `D-020` is accepted: future new Song Editions use a two-stage timing
  lifecycle, `Provisional Timing` → `Calibrated Timing`.
- `Provisional Timing` is the default first-import acceptance. It requires
  verified canonical audio identity, valid independent actual/play intervals,
  LRC or lyric anchors, lightweight sanity checks, correct gross musical
  topology and no obvious neighbor leakage, but it does not claim human audible
  calibration or `PASS` for every Occurrence.
- `Calibrated Timing` is recorded only for the range covered by a user's actual
  listening and an identity-matched `Timing Correction Export` that Codex has
  focused-merged into canonical source. Fixed padding and mechanical
  `end = next LRC timestamp` remain prohibited; D-011, D-012, D-016 and D-019
  remain in force.
- The current Production Timing Debugger / Settings export is identity-safe for
  its implemented correction scope. It carries `songId`, `editionContentHash`,
  `audioSourceHash`, `baseTimelineUrl`, target source, build identity and
  per-Occurrence correction data; stale or incompatible local overrides are not
  exported as compatible corrections. The current public export covers
  `playStartMs` / `playEndMs`; `startMs` / `endMs` remain canonical editorial
  fields and were not expanded in this governance Plan.
- Existing `work-millennium-parade` and `senbonzakura` timing history is not
  downgraded or reclassified by D-020: WORK retains its historical `PASS 40`
  human acceptance, and `senbonzakura` retains the RED-Plan-45 source-audio
  evidence recorded above.
- This Plan changed only future authoring/delivery semantics and Project State;
  no timeline, audio, lyrics, Practice, schema, compiler, runtime, UI or PWA
  behavior was changed. Version classification is `no-version`, and
  `USER CHECK` is `NONE` for this governance boundary.

## RED-Plan-47 implementation and release status

- The WORK artwork replacement is complete: the old
  `library/work-millennium-parade/artwork/cover.svg` was removed and
  `library/work-millennium-parade/artwork/cover.jpg` is the exact supplied
  1280×1280 JPEG (`SHA-256`
  `8ee6dd18a5ed7c840babb321ed9566cd8cfc1b1119d11d37f62d2a755d9545ba`). The
  canonical artwork directory contains exactly one `cover.*` and no hero.
- The supplied WORK translation input was verified as
  `SHA-256 74687c7dd333b43cbb4c4f361333654bfe4a03e21ad87d692283a79ff0d4ca23`.
  It contains 122 non-empty lines and maps 61/61, in source order, to the
  current Segments. Five evidence lines use conservative unique orthographic,
  spacing or abbreviated-form matches; none replaced canonical Japanese
  `lyrics`. All 61 `translation` values are copied from the input, while
  Segment IDs, ruby, layers and notes remain unchanged.
- WORK Explain now contains six features:
  `01-作品背景.md`, `02-佛教语汇与二元结构.md`, `03-双主创与制作阵容.md`,
  `04-劳动债务肉身与欲望.md`, `05-日英混杂与高密度歌词.md` and
  `06-对位段与结构高潮.md`. Their lyric references validate against the
  canonical Segment set; fact and `RED:REPEAT 编辑观察` are explicitly
  distinguished, with official anime, release and official MV sources used.
- The canonical audio identity remains
  `facc3031bda3d4c5588276fd33b46c9474d19af3364880f9ca1567cea4928083` and
  still matches `timeline.json.audioSourceHash`. `timeline.json`,
  `practice.json`, all Section/Occurrence/timing identities, Japanese lyrics,
  ruby, artist metadata and `library/senbonzakura/` remain unchanged.
- Product-focused commit `a98e300` carries the source/content change. Release
  metadata moves the user version from `1.7.0` to `1.7.1` at PATCH level;
  `v1.7.1` targets the product commit, while the later metadata commit remains
  the deployed build identity. This Plan does not change executable product
  behavior, timing, schema, compiler, runtime, UI or PWA logic.
- No pre-publish human gate was required. New cover display, translation
  wording, Explain factual phrasing and ordinary mobile readability remain
  `POST-DEPLOY OBSERVATION`; they are not represented as human `PASS`.
- Version classification is `PATCH`: `1.7.0 -> 1.7.1`.

## RED-Plan-48 workflow contract status

- Future new-song work may arrive as pre-authored `Structured Song Handoff`
  packages containing research, complete Explain drafts, approved content/assets,
  mappings and Provisional candidates. The Handoff remains task input, not
  canonical source.
- Codex's default boundary is repo-contract validation and source integration;
  it does not independently re-author approved upstream content or exact assets
  without a validation conflict. The executable repo contract wins conflicts,
  and `D-020`'s `Provisional Timing` → `Calibrated Timing` lifecycle is unchanged.
- This closeout is `no-version`; no song source, executable product, release or
  deployment behavior is changed.

## RED-Plan-49 implementation and release status

- `senbonzakura` canonical playback timing is calibrated from the supplied
  identity-matched Timing Correction Export. Product-focused commit `50e7114`
  carries the sole canonical source change; `v1.7.2` targets that commit.
- `Calibrated Playback Timing`: 45/45 Occurrences user-reviewed, with 82/82
  playback fields applied (`45` `playStartMs` and `37` `playEndMs`). This
  statement covers only playback fields; it does not claim human review of
  `startMs`/`endMs`.
- `startMs`/`endMs`, Section data, Practice data, Occurrence IDs/order, lyrics,
  audio and `audioSourceHash` are unchanged. The compiler produced the matching
  canonical runtime timeline and no UI, schema, compiler or PWA behavior changed.
- Release metadata records `1.7.2` at PATCH level (`1.7.1 -> 1.7.2`); the
  later release-metadata commit remains the independently deployed build
  identity and is distinct from the implementation tag target.
- `USER CHECK` is `NONE` for this correction because the values came from the
  user's real Production Timing Debugger listening. Ordinary Production use
  remains observation only.

## RED-Plan-50 implementation and release status

- Timing Debugger mobile control is now a compact bottom-fixed dock. It keeps
  Chinese 起点/终点 labels, millisecond values, ±20/±100 adjustments,
  `播放` and `保存本机微调`; enlarged lyric, current-position, use-current,
  restore-default and `试听当前句` controls were removed. Dock occlusion is
  measured from the actual fixed element and includes its bottom safe-area/
  spacing, rather than a half-screen reserve.
- Practice continuous/ramp playback now derives the visible current row from
  Resolver `primaryOccurrence` while the audio is playing. It does not write
  persisted Practice resume state on audio frames; selection remains the
  separate resume anchor.
- Practice's obsolete responsive grid no longer creates empty `map`/`controls`
  tracks. Practice and Full Song lyric content uses an overall centered cluster
  with left-aligned original/ruby/translation/note layers. Full Song's
  instrumental marker styles only its dedicated visual signal span; Section
  text remains normal and Section click/play semantics are unchanged.
- No canonical timing, audio identity, lyrics, ruby, Practice grouping,
  Section grouping, schema, compiler, runtime, PWA lifecycle or release
  behavior was changed by the product implementation.
- Focused evidence passed for Timing Debugger, Practice and Full Song (29/29);
  full regression passed at 49 test files / 331 tests. `npm run typecheck`,
  `npm run lint` (no errors; two pre-existing warnings), `npm run build`,
  `npm run pwa:inspect` and `git diff --check` passed. Browser-level checks
  covered a 390×844 narrow viewport and desktop/tablet styling probes; the
  narrow dock was additionally checked by actual geometry and tail-content
  scrolling.
- Product-focused commit is `01cdd64`; release metadata records `1.8.0` at
  `MINOR` level (`1.7.2 -> 1.8.0`), and `v1.8.0` targets the product commit.
  The metadata commit is the independently deployed build identity.
- `USER CHECK` is `NONE` for this boundary. Real target-device/iOS installed-
  PWA perception remains a `POST-DEPLOY OBSERVATION`, not a claimed human PASS.

## Remaining USER CHECK / UNKNOWN / POST-DEPLOY OBSERVATION

- `POST-DEPLOY OBSERVATION (RED-Plan-50)`: actual target-device/iOS installed-
  PWA dock feel, continuous-focus perception, short/long lyric wrapping and
  final-row spacing still require ordinary production observation; this Plan's
  narrow browser geometry and static behavior checks do not claim true-device
  or installed-client evidence.
- `POST-DEPLOY OBSERVATION (RED-Plan-44/45)`: mobile/iOS/PWA ruby geometry,
  wrapping, touch and perceived readability were not separately executed. The
  three former Practice merge boundaries (`o012`→`o013`, `o033`→`o034` and
  `o049`→`o050`) were also not separately verified by subjective continuous
  listening; `senbonzakura` now has identity-matched `Calibrated Playback
  Timing` for 45/45 Occurrences covering only `playStartMs`/`playEndMs`.
  `startMs`/`endMs` were not changed or claimed as human-reviewed. These are not claimed as human PASS
  and are not active blocking debt under `D-019`; users can surface any
  low-cost follow-up during normal Production use.
- No `BLOCKING USER CHECK` or current RED-Plan-44/45/50 `UNKNOWN` remains open.
  This
  does not promote automated regression evidence to a real-device, perceptual,
  audible-timing or installed-client lifecycle PASS.
- No new unresolved reading ambiguity was identified from the available user
  material and existing Kana/romaji evidence. Existing future PWA/device risks
  remain governed by D-013/D-016 and are not reopened by this content change.

## Active work and next lifecycle action

- `RED-Plan-37` / `PLAN-001` is complete; there is no active timing acceptance
  work for `work-millennium-parade`.
- Human listening result is `PASS 40`, `NEEDS_CORRECTION 0`,
  `STILL_UNCERTAIN 0`. Canonical audio identity remains verified against the
  source hash above.
- No canonical timing source, schema, compiler, playback, or UI change was
  made in this closeout. The remaining by-ear timing acceptance debt is closed;
  any future timing change still requires a separate evidence-backed correction
  boundary.
- `RED-Plan-38` release identity is complete: package/latest ledger are
  `1.6.2`, `v1.6.2` points to `c61f977`, and its later release-metadata
  `main` build carried live version `1.6.2`.
  The tag target and deployed build SHA are intentionally distinct identities.
- `RED-Plan-39` is complete for this boundary with target-device checks
  explicitly closed from active debt by current-use evidence; the formal
  matrix is not claimed as a full PASS. Installed clients can stably obtain
  newer deployed versions in the current baseline; the previous update
  acceptance debt is closed without claiming event-by-event Service Worker
  observation.
- `RED-Plan-42` cleanup is complete for its boundary: the legacy private
  `senbonzakura` intake and duplicate private WORK library mirror were removed;
  `library/work-millennium-parade/` and
  `.private/research/work-millennium-parade/` were preserved. Historical
  migration archives were not rewritten. RED-Plan-45 imports a new authorized
  public source package and does not revive that private intake.
- `RED-Plan-45` is complete for its boundary: the second public Song Edition,
  exact content/ruby contract, source-audio-backed timing, Explain features
  and Practice grouping are recorded above. The canonical source was unchanged
  within that Plan; RED-Plan-49 later merged a playback-only correction under
  `1.7.2` / `v1.7.2`.
- `RED-Plan-50` is complete: the mobile Timing Debugger dock, Practice
  continuous-focus behavior, Practice bottom-space reserve, Full Song
  instrumental marker and Practice/Full Song lyric cluster alignment were
  corrected without changing canonical timing or song source data. The
  product commit is `01cdd64`, `v1.8.0` targets it, and residual true-device
  observations remain explicitly non-blocking.
- `RED-Plan-40` is complete: D-017 formalizes the production-public Timing
  Debugger capability, the existing Settings entry and `#timing=debug` route
  were verified, and the public-intent UNKNOWN was closed without changing
  product code or canonical timing.
- `RED-Plan-44` is complete under `D-019`: the source/runtime/UI ruby contract,
  61-segment WORK backfill, artist correction and 13→10 Practice regroup are
  in the no-version commit boundary; `timeline.json`, canonical audio identity
  and playback timing are unchanged. The unexecuted device geometry/touch
  checks and subjective listening across the three former merge boundaries are
  retained as `POST-DEPLOY OBSERVATION`, not as a claimed human PASS or active
  blocking debt.
- `D-019` establishes the default delivery model: ordinary in-scope UI,
  content, song-source, interaction and low-risk maintenance work with passing
  matching automated/local verification may enter Production after focused
  commit and normal push. Explicit or high-risk `BLOCKING USER CHECK` items
  remain release gates; other real-use evidence is observed after deployment.
- `RED-Plan-47` is complete for this boundary: the authorized WORK cover,
  translation and Explain refresh is recorded above, with canonical timing and
  structure preserved. The next normal product work begins at a separately
  authorized Plan boundary; this state does not implement any subsequent Plan.
- Lifecycle checkpoint conclusion: `Production`. Migration/stabilization
  closeout is complete, with no active migration cleanup; current work proceeds
  as normal Production maintenance and feature evolution. Future boundary
  regressions reopen matching validation, but do not automatically downgrade
  lifecycle.
