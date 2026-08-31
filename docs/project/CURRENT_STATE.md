# CURRENT_STATE

This is the current repository state. Current repo evidence supersedes
the external migration snapshot; archived Plans and forensics are historical
evidence only.

## Repository identity and worktree

- Repository/package: `red-repeat`
- Root: `D:\CS\red-repeat`
- Remote: `origin = https://github.com/MyKr-YSteinsK/red-repeat.git`
- Branch: `main`, tracking `origin/main`
- Current user version: `1.13.1`
- Current lifecycle stage: `Production`
- Latest ledger/tag: `1.13.1` / `v1.13.1 -> 9bfd6ab`; existing
  `v1.13.0 -> e102189`,
  `v1.12.0 -> 650f9dc`, `v1.11.0 -> ad64c95`,
  `v1.10.0 -> 426069c`,
  `v1.9.2 -> 449e3ce`, `v1.9.1 -> 3cd207e`,
  `v1.9.0 -> a006304`, `v1.8.2 -> cbb3bd0`, `v1.8.1 -> 91b703a`, `v1.8.0 -> 01cdd64`,
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
- RED-Plan-61 adds the authorized public `shinkai-shoujo` Song Edition in a
  separate product-focused commit; its release metadata follows the same
  product-then-metadata boundary.

## Current product capabilities

- Local-first Catalog loading/search, metadata-focused Song Edition cards and
  explicit per-song identity-coherent offline snapshot install/removal.
- Practice as the default Song Edition mode: Practice Unit/Occurrence
  navigation, previous/current/next controls, Segment Picker, line playback,
  rate, continuous playback, repeat/ramp behavior and persisted progress/rate.
- Full Song continuous audio with timed lyric following, seek/progress and rate.
- Explain compiled Markdown features, lyric-reference playback and soft failure
  for unavailable optional content.
- Japanese lyric ruby/furigana rendering for position-verified Han/Katakana
  readings, with canonical original text retained for lyric semantics.
- Settings/update surface with build/version identity, release history, remote
  `version.json` probe and passive PWA background-update status. A prepared
  worker takes effect on a natural next launch; the current document has no
  updater-driven apply/reload action.
- Production-public Timeline/Timing Debugger and timing repair/export with
  compatible identity-bound local timing overrides. The public entry is
  Settings → 播放切口调试 → `#timing=debug`; it is a supporting capability, not
  a fourth Song Edition mode.

## Current public content

The tracked public source contains four Song Editions:
`library/work-millennium-parade/` (`Ｗ●ＲＫ`, 椎名林檎 × 常田大希) with
61 Segments/Occurrences, 10 Practice Units, 11 Sections, one canonical MP3,
one JPG cover and eight Explain Markdown features; and
`library/senbonzakura/` (`千本桜`, 黒うさP × 初音未来) with 30 unique
Segments, 45 Occurrences, 6 Practice Units, 10 Sections, one canonical MP3,
one JPG cover, six Explain Markdown features and 9 reviewed note targets.
`library/night-dancer-imase/` (`NIGHT DANCER`, imase) adds 34 unique Segments,
49 Occurrences, 11 Practice Units, 11 Sections, one canonical MP3, one JPG
cover, eight Explain Markdown features and 8 reviewed note targets.
`library/shinkai-shoujo/` (`深海少女`, `ゆうゆ × 初音未来`) adds 43 unique
Segments/Occurrences, 12 Practice Units, 12 Sections, one canonical MP3,
one JPG cover, eight Explain Markdown features and 8 reviewed note targets.
Japanese lyrics may carry
position-verifiable `ruby` spans for Hiragana furigana; canonical `lyrics`
text and existing `layers` remain separate source contracts. All four public
editions retain their canonical source layers; `senbonzakura` now has one
non-empty `Romaji` layer on each of its 30 Segments. The legacy
migration-era private `senbonzakura` intake was not reclassified; RED-Plan-45
uses the separately authorized task-input source package.

## Technical shape and active owners

- React 19 + TypeScript + Vite 8 + `vite-plugin-pwa`; npm and Node.js 24.x.
- Source flow: tracked library package → strict Zod/cross-reference/media
  validation → hash/media compiler → ignored `public/library-runtime/` → Vite
  artifact → runtime schema/client compatibility assembly.
- `localStorage` owns Practice resume/rate and identity-bound timing overrides;
  Cache Storage/Workbox owns local-first Catalog and manifest-bound Song
  Edition snapshots, including audio Range responses; no server persistence
  exists. Runtime contract version is 3.
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
- `Provisional Timing` remains the default first-import acceptance. Historically
  this section described independent actual/play intervals; RED-Plan-53
  supersedes that source/runtime shape with one authoritative `startMs/endMs`
  interval. The acceptance still requires verified canonical audio identity,
  LRC or lyric anchors, lightweight sanity checks, correct gross musical
  topology and no obvious neighbor leakage, but it does not claim human audible
  calibration or `PASS` for every Occurrence.
- `Calibrated Timing` is recorded only for the range covered by a user's actual
  listening and an identity-matched `Timing Correction Export` that Codex has
  focused-merged into canonical source. The current correction contract is the
  single `startMs/endMs` pair. Fixed padding and mechanical
  `end = next LRC timestamp` remain prohibited; D-012, D-016 and D-019 remain
  in force.
- The current Production Timing Debugger / Settings export is identity-safe for
  its implemented correction scope. It carries `songId`, `editionContentHash`,
  `audioSourceHash`, `baseTimelineUrl`, target source, build identity and
  per-Occurrence correction data. RED-Plan-53 now makes the public export and
  the local override use the single authoritative `startMs` / `endMs` pair.
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
- Historical Plan49 record: `Calibrated Playback Timing` covered 45/45
  Occurrences and 82/82 playback fields (`45` `playStartMs` and `37`
  `playEndMs`). RED-Plan-53 migrated those exact values into the single
  `startMs`/`endMs` model; this migration is not a new human review claim.
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

## RED-Plan-51 implementation and release status

- Catalog cards now keep title, artist, metadata, cover, search, card-open and
  download behavior while removing `上次…`, `继续学唱` and `开始学唱` UI. The
  Catalog no longer performs eager resume-summary reads or Edition/lyrics/
  timeline/practice loading for card enrichment.
- Persisted Practice resume/rate state remains identity-bound and is restored
  after entering the Song Edition through the existing Practice owner; this
  Plan did not remove or rewrite persisted state.
- Explain article titles and internal Feature Markdown headings now use a
  smaller hierarchy. Lyric references retain original text, ruby,
  translation, repeated-occurrence selection and `试听这句`; the Explain-only
  `学习这一段 →` CTA, callback and Practice index plumbing were removed.
  Full Song's independent Practice transition remains unchanged.
- The Song Edition header cover is larger than the former 3.5rem baseline and
  remains separate from the title/artist flex sizing. Activating it opens a
  fixed backdrop using `coverLargeUrl`; the backdrop closes on backdrop click
  or `Escape`, image clicks remain open, focus returns to the trigger, body
  scrolling is locked, and no route/history or close-button control is added.
- Canonical timing, audio identity, lyrics, ruby, translation, Explain
  feature content, notes, schema, compiler, runtime, PWA lifecycle and other
  release behavior were not changed. No canonical timing correction was made.
- Focused evidence passed for Catalog, Explain and Song Edition cover behavior
  (4 test files / 41 tests); full regression passed at 49 test files / 331
  tests. `npm run typecheck`, `npm run lint` (no errors; two pre-existing
  warnings), `npm run build`, `npm run pwa:inspect` and `git diff --check`
  passed. Local browser probes covered desktop and 390×844 layout, overlay
  geometry, backdrop/Escape behavior and scroll locking; these are not
  real-device or installed-PWA human PASS evidence.
- Product-focused commit is `91b703a`; release metadata records `1.8.1` at
  `PATCH` level (`1.8.0 -> 1.8.1`), and `v1.8.1` targets the product commit.
  The later release-metadata commit is the independently deployed build
  identity.
- `USER CHECK` is `NONE` for this boundary. Cover size/overlay feel, Explain
  title hierarchy and Catalog simplicity remain `POST-DEPLOY OBSERVATION`,
  not a claimed real-device PASS or active blocking debt.

## RED-Plan-52 implementation and release status

- Mutation preflight passed for the Architect-authored Handoff: all 12 Feature
  files matched the supplied manifest, every `[[segment:...]]` reference maps
  to a real canonical Segment, no Occurrence ID was used as a Segment
  reference, and the corrected Feature 05 mapping is `s005/s006/s008/s009`.
- `senbonzakura` now has 6 Explain Features, with 9 reviewed note targets:
  existing `s002`/`s008` were replaced and 7 additional high-value notes were
  added at the listed targets. `work-millennium-parade` keeps 6 Explain
  Features, all replaced by the reviewed versions, and all 18 listed notes
  were replaced.
- The Handoff content was integrated without semantic re-authoring. User
  translations, canonical Japanese lyrics, ruby, layers, timing, Practice,
  Section data, artist/manifest, audio and audio identity are unchanged; no
  executable source, UI, schema, compiler, runtime or PWA behavior changed.
- Content-only evidence passed: `npm run library:audio-hash -- senbonzakura`
  reported `5c806cf0a1ea702d6a0e4d76b4df443ac999ffc9c1192b7a5d36ca9f3ff33e19`;
  `npm run library:audio-hash -- work-millennium-parade` reported
  `facc3031bda3d4c5588276fd33b46c9474d19af3364880f9ca1567cea4928083`.
  `npm run library:validate`, `npm run library:compile`, `npm run build`,
  `npm run pwa:inspect` and `git diff --check` passed. The compiler emitted
  27 runtime files for 2 editions. The full test suite was not rerun because
  no executable file or compiler/validator code changed, as allowed by this
  content-only Plan.
- Product-focused commit is `cbb3bd0`; release metadata records `1.8.2` at
  `PATCH` level (`1.8.1 -> 1.8.2`), and `v1.8.2` targets the product commit.
  The later release-metadata commit is the independently deployed build
  identity.
- `USER CHECK` is `NONE` for this boundary. Any future fact or wording issue
  found during ordinary reading remains a `POST-DEPLOY OBSERVATION`, not an
  active blocking debt.

## RED-Plan-53 implementation and release status

- The pre-mutation timing snapshot covered `106` public Occurrences:
  `senbonzakura` `45` and `work-millennium-parade` `61`. Every old playback
  interval was valid, IDs/source order were unique, and the snapshot oracle
  SHA-256 was `bf69b441576232078bd1cbbb33f849a53506a1c5de073afca88ab72e672022c4`.
- Every canonical `library/*/timeline.json` Occurrence now has only
  `startMs/endMs`; each new pair is exactly the pre-migration playback pair.
  Senbon values include `o001=32580/35550`, `o033=141260/145165` and
  `o045=209690/213750`; all `45/45` calibrated values are preserved.
- Section timing, Occurrence IDs/order, Practice grouping, lyrics/ruby,
  notes/Explain content, canonical audio files and audio identities are
  unchanged. Audio hashes remain `5c806cf0a1ea702d6a0e4d76b4df443ac999ffc9c1192b7a5d36ca9f3ff33e19`
  for `senbonzakura` and
  `facc3031bda3d4c5588276fd33b46c9474d19af3364880f9ca1567cea4928083` for
  `work-millennium-parade`.
- Source schema, validator, compiler and generated Runtime now reject/remove
  the former playback-only fields. Resolver, Practice, Full Song, Explain and
  both debugger paths consume the same effective `startMs/endMs` provider.
  Compatible local overrides are sparse same-field overlays; storage is schema
  `v3`, and old `v1`/`v2` documents are invalidated and cleared rather than
  applied as a playback-only fallback.
- Timing Correction Export is now a single-pair package using `startMs/endMs`.
  D-011 is `Superseded`, D-012 describes same-field sparse overrides, D-020
  describes the single-pair Provisional → Calibrated lifecycle, and accepted
  D-021 records the single authoritative Occurrence timing decision.
- No new audio/listening correction was performed. This Plan changed timing
  schema and shared semantics, not timing values, lyrics, content, Practice
  Units, Sections, CSS/UI design or PWA lifecycle. Blocking `USER CHECK` is
  `NONE`; post-deploy observation remains limited to perceived lyric boundaries
  and Full Song highlight/play alignment, and is not claimed as human `PASS`.
- Version classification is `MINOR`: `1.8.2 -> 1.9.0`.
- Product commit is `a006304`; `v1.9.0` targets the product commit. Release
  metadata commit and deployed build identity are recorded after metadata
  finalization.

## RED-Plan-55 implementation and release status

- Preflight passed for the canonical `senbonzakura` source: exactly 30 unique
  Segment IDs `s001`–`s030`, all lyrics non-empty, translations present and
  existing ruby spans valid.
- Every one of the 30 Segments now has exactly one non-empty `layers[id=romaji]`
  entry labeled `Romaji`. The completed text is lowercase ASCII except for the
  intentional Latin token `ICBM`; it contains no Han/Kana, macrons, repeated
  spaces or surrounding whitespace. Representative checked readings include
  `ukiyo no manimani`, `senbonzakura yoru ni magire`, `tokoyo no yami`,
  `oiran douchuu`, `wan tsuu san shii` and `saa kousenjuu o uchimakure`.
- Strict preservation audit confirmed that only the new `layers` field changed;
  canonical Japanese lyrics, ruby, translation, notes, timing, Occurrence,
  Practice, Section, audio and all other source fields remain unchanged. The
  `senbonzakura` audio identity remains
  `5c806cf0a1ea702d6a0e4d76b4df443ac999ffc9c1192b7a5d36ca9f3ff33e19`.
- `npm run library:validate`, `npm run library:compile`, `npm run build`,
  `npm run pwa:inspect`, `npm run pwa:inspect -- /red-repeat/` and
  `git diff --check` passed. Runtime spot-checks confirmed Romaji display in
  Practice, Full Song and Explain representative lyric paths. Existing
  optional `NO_HERO_ARTWORK` warnings remain unchanged.
- Product-focused commit is `449e3ce`; release metadata records `1.9.2` at
  `PATCH` level (`1.9.1 -> 1.9.2`), and `v1.9.2` targets that product commit.
  The following release-metadata commit is the independently deployed build
  identity.
- No executable source, timing, UI, PWA lifecycle or runtime contract change
  was made. `USER CHECK` is `NONE` for this content-only boundary; no new
  real-device or audible-timing gate was required.

## RED-Plan-56 implementation and release status

- Handoff integrity preflight passed: the 21 manifest entries, exact MP3/LRC/
  translation/JPEG hashes, MP3 metadata (`44.1 kHz`, stereo, `320 kbps`,
  `210.99102s`) and `800×800` JPEG metadata all matched the supplied package.
- The canonical source is `library/night-dancer-imase/`. It contains 34 unique
  Segments, 49 Occurrences, 11 Sections, 11 Practice Units, 6 Explain
  Features, 8 note targets and 34/34 non-empty `Romaji` layers. All feature
  references and cross-file references validate.
- Protected content was retained exactly: `乱れた部屋に 掠れたメロディー`
  remains unchanged, the sung lead-in `あぁ あぁ 愛して` remains present, and
  all Segment translations remain the first selected user-provided values for
  deduplicated Segments.
- Exact source assets are preserved: audio SHA-256
  `373393efa184640fab23dee91bc1a691094003f6ac42bb082bf21d0de29dc9e3`, LRC
  SHA-256 `ae91eae91bf407b89aa7f27e5d26bc275062390c0b0b8b59a2439d7615ae12ba`,
  translation SHA-256
  `e17a7e09c0f40e433b88a05738f5d3cfbb45662e87d28257f0fd06f55e44d39f`, and
  cover SHA-256 `6cfdb111e5c74972a561fb7156b9524645d2427a76faf65fc1a8d58ffd6e3d5e`.
- All 49 timing intervals remain the supplied single-pair `startMs/endMs`
  `Provisional Timing`. Blank/instrumental anchors at `9180ms` and `91960ms`,
  intro/interlude/outro structure and repeated chorus Segment references were
  preserved; no human audible `PASS` is claimed.
- `npm run library:audio-hash -- night-dancer-imase`,
  `npm run library:validate`, `npm run library:compile`, `npm run build --
  --base=/red-repeat/`, `npm run pwa:inspect -- /red-repeat/` and the final
  browser/runtime smoke passed. The browser smoke covered the third Catalog
  card, Song Edition/cover, all 11 Practice Units, Full Song repeated chorus
  and instrumental markers, 34/34 ruby/Romaji/translation displays, and all 6
  Explain topics with 22 valid lyric references. Runtime error log was empty.
- Product-focused commit is `426069c`; release metadata records `1.10.0` at
  `MINOR` level (`1.9.2 -> 1.10.0`), and `v1.10.0` targets that product
  commit. The following release-metadata commit is the independently deployed
  build identity.
- No schema, compiler architecture, runtime contract, UI, CSS, PWA lifecycle
  or existing-song source behavior was changed. `USER CHECK` is `NONE` for
  import completion; post-deploy timing listening/calibration remains an
  explicit user follow-up and is not a reason to mark this Plan partial.

## RED-Plan-57 implementation and release status

- Product commit `ad64c95` changes downloaded-song semantics from
  network-first fallback to local-first complete snapshots. Release metadata
  records `1.11.0` at `MINOR` level (`1.10.0 -> 1.11.0`), and `v1.11.0`
  targets the product commit; the following metadata commit is the independently
  deployed build identity.
- Download manifest schema v2 binds `songId`, `contentHash`, exact
  `CatalogEdition`, exact resource URLs and `installedAt`. Complete v1 manifests
  migrate in place after cached Runtime Edition and resource-set validation;
  malformed or incomplete state is not reported as installed.
- Foreground Runtime reads resolve the active complete snapshot before network.
  Catalog uses a valid local entry immediately and refreshes in the background;
  malformed cached Catalog data is discarded and recovered online. Version
  probes, runtime warmup and song refresh remain non-blocking.
- H1 remains the active, coherent fallback when the current Catalog points to
  unavailable/partial H2. H2 staging validates every required resource before
  a manifest-last switch; failed staging removes only newly added song resources
  and preserves the complete H1. Explicit removal clears the manifest and all
  current/inactive resources for that song without deleting other songs or the
  app shell.
- Workbox now covers `practice.<hash>.json` alongside Edition, Lyrics, Timeline,
  Feature and artwork resources. Immutable Runtime and audio use the snapshot
  cache owner; audio retains `CacheFirst` plus Range Requests. Catalog changes
  from `NetworkFirst` with a 3-second timeout to `StaleWhileRevalidate`.
- Focused verification passed for 8 files / 95 tests; the full suite passed for
  49 files / 342 tests. `npm run lint` has 0 errors and only the two pre-existing
  Fast Refresh warnings. `npm run build -- --base=/red-repeat/`,
  `npm run pwa:inspect -- /red-repeat/` and `git diff --check` passed.
- Browser evidence used fresh origins and a real compiled public WORK Edition:
  first online load and download succeeded; with the server stopped, cached
  Catalog, Practice (including all Units), Full Song, Explain, cover and audio
  playback all remained usable. A fake newer H2 Catalog plus failed H2 refresh
  still opened coherent H1 offline. Under a controlled 3-second Runtime delay,
  cached Catalog rendered in 278ms and server logs showed only background
  Catalog/H2 freshness requests, with no H1 foreground resource request.
- No canonical song source, timing, Practice grouping, Explain content, audio,
  artwork, schema/compiler contract, CSS/layout or Service Worker
  activation/reload behavior changed. Existing UI surfaces now use the active
  snapshot cover and distinguish not-downloaded offline, incomplete download
  and Runtime schema/parse failures. Blocking `USER CHECK` is `NONE`.

## RED-Plan-58 PWA update lifecycle status

- The update event graph is now passive: remote `version.json` discovery and
  `registration.update()` run as background maintenance; an `installing` worker
  can become `waiting`, Settings reports `ready-next-launch`, and the current
  document remains pinned to its startup build.
- The old updater-driven `applyUpdate()`/activation timer/reload path was
  removed. No normal update path calls `window.location.reload()`, sends
  `SKIP_WAITING`, resets the route or takes over an active client. The existing
  `registerType: 'prompt'` and `clientsClaim: true` artifact settings remain
  compatible with the browser's waiting lifecycle because the app does not
  request active-session takeover.
- The global `UpdatePrompt` was removed. Settings remains the visible update
  surface with current identity, remote version/SHA/release notes, manual
  background check and the statuses `尚未检查`, `正在后台检查`, `installing`,
  `ready-next-launch`, `当前已是最新版本` and `检查失败（当前 App 不受影响）`.
- Real browser integration used two freshly built same-version fixtures with
  distinct build identities (`plan58-b1` and `plan58-b2`). B1 established a
  downloaded `Ｗ●ＲＫ` snapshot; after switching the server to B2, two B1
  clients remained on their original routes and UI, and Settings showed the
  prepared-next-launch state without a global prompt. Closing client A did not
  let B2 take over client B; after all B1 clients closed, the next launch
  reported `plan58-b2` and retained the downloaded `Ｗ●ＲＫ` state. Browser error
  logs were empty.
- Focused update-manager, registration-options, Settings and App tests passed;
  the Plan57 downloaded-snapshot/offline boundary remains unchanged. The
  real-browser evidence is not an iOS installed-PWA result. D-013 was corrected
  to remove reload as a normal phase and D-023 records the durable update
  decision.
- Real iOS Safari/installed-PWA update timing, standalone activation and
  long-lived background behavior remain `NOT_TESTED` and are retained as
  `POST-DEPLOY OBSERVATION`, not a blocking gate or claimed device PASS.

## RED-Plan-59 播放控制台稳定性与移动端底栏一致性状态

- Full Song fixed player no longer renders the dynamic `当前句` lyric subtree
  or its `lineSegment` plumbing. It retains current Section, current/total
  time, progress, speed, play/pause, scroll-to-top and reset controls;正文
  active/highlight/follow behavior is unchanged.
- Practice mobile dock is an edge-to-edge bottom sheet at the mobile
  breakpoint with `left/right/bottom: 0`, `width: 100%`, top-only sheet radius,
  and safe-area insets inside its padding. Plan54's measured
  `--practice-dock-reachability-reserve` remains the final-row boundary.
- Shared glass tokens moved from `30%/38%` to `38%/46%` for panel/control,
  with matching CSS fallbacks and the existing `blur(2px) saturate(108%)`.
  Practice, Full Song and Timing Debugger remain one visual family; no
  Timing Debugger DOM or timing behavior was changed.
- Browser evidence passed at `390×844`, `390×1000`, `768×1024` and
  `1280×900`: Practice has no layout horizontal overflow; mobile dock edge
  gaps are `0px` against the layout viewport; Full Song player height stayed
  `184.225px` across short/long ruby/Romaji, section and instrumental switches
  at `390×844`; the final-row gap was `16.074px` with a `95px` measured reserve.
  Computed panel/control backgrounds are `38%/46%`, and screenshots retain
  lyric contours beneath the translucent player surface.
- Focused Practice/Full Song/layout evidence passed at 32 tests, the shared
  Timing Debugger regression passed at 7 tests, and the full suite passed at
  48 files / 338 tests. Product commit `a5951d6` carries the UI correction;
  release metadata records `1.12.1` at `PATCH` level (`1.12.0 -> 1.12.1`),
  and `v1.12.1` targets the product commit. The following release-metadata
  commit is the independently deployed build identity.
- No canonical timing, lyrics, Practice/Section source, audio, schema,
  compiler, runtime, PWA lifecycle or release topology behavior changed.
  Blocking `USER CHECK` is `NONE`; real iPhone/Safari/installed-PWA visual
  perception remains `NOT_TESTED` as `POST-DEPLOY OBSERVATION`, not a claimed
  device PASS.

## RED-Plan-60 动画关联歌曲的 ACGN 知识规范与现有内容增强状态

- Handoff manifest 的 8 个 entry 均已按大小与 SHA-256 核验；research
  provenance 仅用于验证，没有复制进仓库。
- `docs/歌曲内容生成规范.md` 已加入 ACGN/tie-in 研究规则，明确区分
  `commissioned / written-for-work`、`retrospective adoption / licensing` 与
  `unofficial promotion / fan use`，并要求分开记录 official fact、creator
  statement、media analysis 与 `RED:REPEAT 编辑观察`。该规则不增加 schema，
  也不规定固定 Feature 数量。
- WORK Explain 从 6 篇扩展为 8 篇，新增的两篇均已通过 61 个真实 Segment
  的引用校验，补充《地狱乐》的画眉丸/佐切两极主题和死罪人任务的 WORK 读法。
- NIGHT DANCER Explain 从 6 篇扩展为 8 篇，新增的两篇均已通过 34 个真实
  Segment 的引用校验；明确 `2022 existing song -> 2026 ABEMA advance/pre-release
  anime ED`，并与为电视版动画创作的《Fiction》分开，未倒推原曲的创作意图。
- WORK、NIGHT DANCER 与 `senbonzakura` 的 lyrics、translation、ruby、Romaji、
  notes、Practice、Section、Occurrence、canonical audio、timeline 与 timing
  均未修改；没有改动 schema/compiler/runtime、UI/PWA 或其他 release topology。
- `library:validate`、`library:compile`、`build --base=/red-repeat/`、Explain
  focused tests（5 files / 45 tests）和本地浏览器 Explain smoke 均通过；
  `390×844` 下 NIGHT DANCER 的移动主题 selector 可用且无横向溢出。生产身份
  的最终 `pwa:inspect --require-production` 已通过。CI #67 的 quality 与
  Pages `deploy` 均 succeeded；`release:smoke` 已确认线上 `1.12.2` 与
  build SHA `013c437eda3d984e2b41cc802e5e10a1d4119a27` 一致，线上 WORK 与
  NIGHT DANCER Explain smoke 也已通过且无浏览器 error。
- 本 Plan 没有 blocking `USER CHECK`；普通阅读中可能出现的事实或措辞反馈
  保留为 `POST-DEPLOY OBSERVATION`，不作为当前完成阻塞。

## RED-Plan-61 《深海少女》新曲正式导入状态

- Handoff manifest 的 20 个 entry 均已按 size 与 SHA-256 核验；候选 source
  package 的 12 个文件与 4 个用户资产均与 Handoff 原始字节一致。research、
  raw LRC/translation、README、Plan 与 ZIP 未复制进产品 source。
- `library/shinkai-shoujo/` 已作为第四个公开 Song Edition 导入，身份为
  `songId=shinkai-shoujo`、`深海少女`、`ゆうゆ × 初音未来`、`2010`。
  Exact audio SHA-256 为
  `41c513556401f1b75f2accfd44cb955ed44a845b3e7dbab18a13e72d0fd308d7`；
  cover SHA-256 为
  `663d583a182e44da5534883ef35065eaea59b1265e02f8860576a63c39789b47`。
- Source contract 包含 43 个 canonical Segment、43 个 Occurrence、12 个
  Section、12 个 Practice Unit、8 个 Explain Feature 与 8 个 reviewed
  lyric note target；43/43 Segment 有 Romaji，ruby 覆盖完整且位置核验通过。
  12 个 Practice Unit 覆盖全部 43 个 Occurrence；`intro`、两个
  `interlude` 与 `outro` 保持为无歌词 Section。
- 重复副歌保留为两个独立 Segment identity：第一次译为“因为发现了那个令人
  心动的对象”，第二次译为“因为终于寻见了那个令人倾心的对象”；43/43
  用户翻译与 raw translation 逐条一致，canonical Japanese 与受保护标点/读法
  未被改写。
- 新曲 Occurrence 仅采用 single-pair `startMs/endMs` `Provisional Timing`；
  四个空白/器乐 LRC anchor 已保留。该 timing 尚未获得人类听感 `PASS`，
  后续校准仍通过 Production Timing Debugger 的 identity-bound 流程进行。
- `npm run library:audio-hash -- shinkai-shoujo`、`npm run library:validate`、
  `npm run library:compile` 与 9 个 focused test files / 79 个 tests 均通过。
  最终 `npm run build -- --base=/red-repeat/`、`npm run pwa:inspect --
  /red-repeat/ --require-production` 与 `npm run release:verify --
  --require-tags` 也均通过。
  本地浏览器 smoke 已验证第四首曲目、封面预览、12 个 Practice Unit、Full
  Song 器乐段与歌词、ruby/Romaji/translation、8 个 Explain 主题和 8 个代表性
  引用试听；browser error/warn 日志为空。没有改动既有三首歌曲或
  schema/compiler/runtime/UI/PWA/release topology。
- Product commit 为 `e102189`，`1.13.0` 为 `MINOR`，annotated tag
  `v1.13.0` 已指向该 product commit；release metadata/build identity
  commit 为 `3002ee9`。CI #69 的 `quality` 与依赖的 `deploy` 均
  `completed successfully`，Pages 已发布；`release:smoke` 已确认线上
  `1.13.0` 与 `3002ee9ead2685f32ab1c7294e27bf8b7795c412` 一致。线上自然
  reload 后的浏览器 smoke 已确认 4 首歌曲、《深海少女》Practice、43 条
  Full Song 歌词入口、4 个器乐段、8 个 Explain 主题与引用试听，且
  browser error/warn 日志为空。
- 本 Plan 没有 blocking `USER CHECK`；真实设备/installed-PWA geometry、触控、
  standalone 生命周期与 43 个 timing 的人类听感验收未执行，按
  `POST-DEPLOY OBSERVATION` 与后续正常使用保留，不写成目标设备或听感 PASS。

## RED-Plan-62 连续播放歌词高亮切句闪回修复状态

- 已确认根因在 playback-follow visual projection：Practice 在 resolver 合法
  歌词间隔中回退到 Learning State 的手动选择，Full Song 则把旧的
  `selectedOccurrenceId` 暴露为播放高亮；没有证据表明 `AudioEngine.currentTimeMs`
  发生回跳，也没有修改 `startMs/endMs` 或 resolver 的 timing 语义。
- Practice 现在仅在同一 `Practice Unit` 内、且 Resolver 给出前后相邻
  Occurrence 时保留上一句高亮；Full Song 仅在同一有歌词 `Section` 内桥接合法
  间隔。零 Occurrence 器乐 Section 不会继承歌词高亮；手动浏览、暂停、overlap
  起播和 Section 播放行为保持分离且不被覆盖。
- automated regression evidence 已通过：focused workspace/resolver/audio tests
  为 4 个 test files / 77 个 tests，完整 `npm test` 为 48 个 test files / 341
  个 tests；`typecheck`、`lint`、`build -- --base=/red-repeat/` 与后续
  `pwa:inspect --require-production` 均通过。
- `390×844` 本地浏览器 evidence 使用真实 Production Song Edition
  `shinkai-shoujo`：Practice 观察到 `o002 -> gap (audible primary 消失、
  visible/current 保持 o002) -> o003 -> o004`；Full Song 观察到
  `o002 -> primary=null/selected=o002 -> o003 -> o004`，browser
  `error/warn` 日志为空。该证据不替代真实 iPhone/Safari/installed-PWA 验收。
- Product commit 为 `9bfd6ab`，`1.13.1` 为 `PATCH`；本 Plan 不修改 canonical
  timing、歌词/练习/source data、schema/compiler/runtime、PWA 或 layout。
  annotated tag `v1.13.1` 已指向该 product commit；release metadata/build
  identity commit 为 `6ccce167372567ee28f7c489a6f5f51b50d8c53e`，与产品提交
  保持独立。
- 本 Plan 没有 blocking `USER CHECK`。真实 iPhone/Safari/installed-PWA 的
  audible perception、geometry 与 touch behavior 未执行，保留为
  `POST-DEPLOY OBSERVATION`，不写成设备 PASS。
- release metadata commit 已通过 CI #71：`quality` 与依赖的 `deploy` 均
  `completed successfully`；`release:smoke` 已确认线上 `1.13.1` 与
  `6ccce1673725` 一致，`builtAt=2026-08-31T13:50:52.214Z`。

## Remaining USER CHECK / UNKNOWN / POST-DEPLOY OBSERVATION

- `POST-DEPLOY OBSERVATION (RED-Plan-50/54)`: actual target-device/iOS
  installed-PWA dock/glass feel, continuous-focus perception and short/long
  lyric wrapping still require ordinary production observation. RED-Plan-54
  verified final-row reachability and narrow browser geometry, but did not
  execute real-device, Safari or installed-client evidence.
- `POST-DEPLOY OBSERVATION (RED-Plan-44/45)`: mobile/iOS/PWA ruby geometry,
  wrapping, touch and perceived readability were not separately executed. The
  three former Practice merge boundaries (`o012`→`o013`, `o033`→`o034` and
  `o049`→`o050`) were also not separately verified by subjective continuous
  listening; `senbonzakura` now has identity-matched `Calibrated Playback
  Timing` for 45/45 Occurrences covering only `playStartMs`/`playEndMs`.
  `startMs`/`endMs` were not changed or claimed as human-reviewed. These are not claimed as human PASS
  and are not active blocking debt under `D-019`; users can surface any
  low-cost follow-up during normal Production use.
- `POST-DEPLOY OBSERVATION (RED-Plan-51)`: actual target-device/iOS/PWA
  cover sizing, backdrop feel, Explain hierarchy and simplified Catalog cards
  should be observed in normal Production use. Local browser evidence does not
  claim true-device, perceptual or installed-client lifecycle acceptance; this
  remains residual risk and is not active blocking work.
- `POST-DEPLOY OBSERVATION (RED-Plan-52)`: ordinary reading may still surface
  a fact or wording issue in the new Explain Features or lyric notes. No
  additional human gate was required for this content-only integration.
- `POST-DEPLOY OBSERVATION (RED-Plan-60)`: ordinary reading may still surface
  a fact or wording issue in the new ACGN-linked Explain Features. The supplied
  evidence classes and commissioned/adoption boundary are recorded; no
  additional human gate was required for this content-only integration.
- `POST-DEPLOY OBSERVATION (RED-Plan-61)`: the 43 `shinkai-shoujo` intervals are
  intentionally `Provisional Timing`; users may listen and calibrate them later
  in the Production Timing Debugger. Real-device/installed-PWA geometry, touch,
  standalone lifecycle and subjective audible timing were not executed. These
  remain residual risk and do not block this first public import.
- `POST-DEPLOY OBSERVATION (RED-Plan-62)`: real iPhone/Safari/installed-PWA
  audible perception and geometry/touch behavior were not executed. Automated
  tests and `390×844` browser transition evidence passed; this does not claim
  real-device evidence and remains non-blocking.
- `POST-DEPLOY OBSERVATION (RED-Plan-55)`: ordinary learning use may still
  surface a preferred Romaji segmentation or spelling convention. The 30
  source layers are complete and validated; this is residual observation, not
  a blocking acceptance gate.
- `POST-DEPLOY OBSERVATION (RED-Plan-56)`: the 49 `NIGHT DANCER` intervals are
  intentionally `Provisional Timing`; users may listen and calibrate them later
  in the Production Timing Debugger. This is the normal post-import lifecycle,
  not an import blocker or human timing PASS.
- `POST-DEPLOY OBSERVATION (RED-Plan-57)`: real iOS installed-PWA flying-mode
  startup for all three downloaded songs and long-term Safari Cache Storage
  quota/eviction behavior are `NOT_TESTED`. They remain explicit residual risk,
  not a claimed device PASS or active blocking item. Service Worker
  activation/reload UX is covered by the built-browser evidence in RED-Plan-58;
  installed-PWA behavior remains separately untested.
- `POST-DEPLOY OBSERVATION (RED-Plan-58)`: real iOS Safari/installed-PWA
  background installation, waiting-worker activation and standalone relaunch
  behavior are `NOT_TESTED`. The desktop real-browser lifecycle passed, but it
  does not substitute for iOS/device evidence; this remains residual risk and
  is not active blocking work.
- No `BLOCKING USER CHECK` or current RED-Plan-44/45/50/51/52/54/55/56/57/58/60/61/62 `UNKNOWN` remains open.
  This
  does not promote automated regression evidence to a real-device, perceptual,
  audible-timing or installed-client lifecycle PASS.
- No new unresolved reading ambiguity was identified from the available Handoff
  material and candidate ruby/Romaji evidence. Existing future PWA/device risks
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
- `RED-Plan-51` is complete: Catalog resume enrichment was removed, Explain
  lyric references were kept listening-focused, and Song Edition cover viewing
  was enlarged and formalized with a fixed high-quality overlay. The product
  commit is `91b703a`, `v1.8.1` targets it, and remaining real-use observations
  are explicitly non-blocking.
- `RED-Plan-52` is complete: the two public Song Editions now carry the
  Architect-reviewed Explain Feature and lyric-note content, with 6 Features
  each, 9 reviewed Senbon note targets and 18 reviewed WORK replacements.
  The product commit is `cbb3bd0`, `v1.8.2` targets it, and ordinary reading
  follow-up remains non-blocking.
- `RED-Plan-53` is complete: the Occurrence timing migration is in product
  commit `a006304`, with `v1.9.0` / `MINOR` release metadata finalized in the
  following metadata commit. The tag target remains the product commit and
  the metadata commit is the deployed build identity.
- `RED-Plan-54` is complete: Practice and Full Song lyric clusters use a stable
  left reading axis; Practice uses a measured minimum final-row reachability
  reserve; Practice, Full Song and Timing Debugger use the lighter shared glass
  surface; and the mobile Timing Debugger is an edge-to-edge safe-area sheet.
  At `390×844`, the pre-fix `176px` computed Practice padding and `88.457px`
  max-scroll final-row gap became a `104px` measured reserve and `16.175px`
  final-row-to-dock gap; the same gap held at `390×1000`. Browser stacking
  probes placed real lyric elements beneath the dock/player. Product commit
  `3cd207e` carries the UI fix, `1.9.1` is `PATCH`, and `v1.9.1` targets that
  product commit; the following metadata commit is the independently deployed
  build identity. No canonical timing, audio, content, schema, compiler,
  runtime or PWA lifecycle behavior changed. Real-device/Safari/installed-PWA
  perception remains `POST-DEPLOY OBSERVATION`, not a claimed human PASS.
- `RED-Plan-55` is complete: all 30 canonical `senbonzakura` Segments carry a
  validated Romaji layer, with source timing, audio, structure and runtime
  behavior preserved. Product commit `449e3ce` is tagged as `v1.9.2` at PATCH
  level; the following metadata commit is the independently deployed build
  identity. Any future Romaji preference refinement remains a separate
  content boundary.
- `RED-Plan-56` is complete: `library/night-dancer-imase/` is the third public
  Song Edition with exact user assets, validated source structure, complete
  ruby/Romaji/content coverage, preserved user translation and `Provisional
  Timing`. Product commit `426069c` is tagged as `v1.10.0` at MINOR level;
  the following metadata commit is the independently deployed build identity.
  Future audible timing calibration remains a separate focused correction
  boundary.
- `RED-Plan-57` is complete: product commit `ad64c95` implements local-first
  Catalog and downloaded-song snapshots, manifest v2 migration, coherent H1
  fallback, transactional H2 refresh, complete removal and Practice/Range route
  coverage. `1.11.0` is a MINOR release and `v1.11.0` targets the product
  commit. Real iOS installed-PWA and quota/eviction observations remain
  non-blocking residual risk; Service Worker activation/reload UX is closed for
  the built-browser boundary by RED-Plan-58, with installed-PWA behavior still
  retained as observation.
- `RED-Plan-58` is complete for the PWA update-lifecycle boundary: background
  discovery/install, waiting-worker next-launch adoption, current-session
  no-reload/no-takeover behavior, Settings semantics, multi-client safety and
  downloaded-snapshot preservation are covered by the real built-browser
  evidence above. The user-visible release and tag are recorded at the final
  release boundary; real iOS installed-PWA behavior remains `NOT_TESTED`.
- `RED-Plan-59` is complete: Full Song's dynamic current-lyric player subtree
  was removed to stabilize fixed-player geometry; Practice's mobile dock is
  now edge-to-edge with internal safe-area padding; controller typography and
  shared glass alpha were raised slightly while Plan54 reserve and Timing
  Debugger visual-family contracts remained intact. Product commit `a5951d6`
  carries the correction, `1.12.1` is `PATCH`, and `v1.12.1` targets the
  product commit; the following metadata commit is the deployed build
  identity. Real-device visual observation remains `NOT_TESTED` and
  non-blocking.
- `RED-Plan-60` is complete: the ACGN/tie-in Explain authoring rule is recorded,
  WORK and NIGHT DANCER each have 8 validated Explain Features, and the
  commissioned-versus-retrospective-adoption boundary is explicit. Product
  commit `97efe45` carries the content, `1.12.2` is `PATCH`, and `v1.12.2`
  targets that product commit; the following release-metadata commit is the
  independently deployed build identity. No lyric, timing, source-data,
  schema, compiler, runtime, UI or PWA behavior changed.
- `RED-Plan-61` is complete: `library/shinkai-shoujo/` is the fourth public Song
  Edition with exact user audio/cover, 43 canonical Segments and Occurrences,
  12 Sections, 12 Practice Units, 8 Explain Features, 8 reviewed note targets,
  complete ruby and 43/43 Romaji. Product commit `e102189` is tagged as
  `v1.13.0` at `MINOR` level; the following release-metadata commit is the
  independently deployed build identity. New timing remains explicitly
  `Provisional Timing`; no human audible PASS or real-device PASS is claimed,
  and no schema/compiler/runtime/UI/PWA behavior changed.
- `RED-Plan-62` is complete: Practice and Full Song no longer expose the old
  manual/selected lyric during a resolver-adjacent playback gap. Product commit
  `9bfd6ab` is recorded as `1.13.1` `PATCH` and is tagged by `v1.13.1`; the
  following release-metadata commit is the independently deployed build
  identity. Canonical timing and all song source data remain unchanged.
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
