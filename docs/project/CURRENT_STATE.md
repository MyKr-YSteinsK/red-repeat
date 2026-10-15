# CURRENT_STATE

This is the current repository state. Current repo evidence supersedes
the external migration snapshot; archived Plans and forensics are historical
evidence only.

## Repository identity and worktree

- Repository/package: `red-repeat`
- Root: current local checkout; the filesystem path is machine-specific and is
  not part of the migration contract.
- Remote: `origin = https://github.com/MyKr-YSteinsK/red-repeat.git`
- Branch: `main`, tracking `origin/main`
- Current package/ledger user version: `1.25.0`. This source records repository
  release metadata; remote CI/Pages and Production identity remain separate
  delivery evidence.
- Current lifecycle stage: `Production`
- Latest ledger product target: `1.25.0` / `71d2bec` (product commit date
  `2026-10-15`); annotated `v1.25.0` identifies that product commit, while the
  following release-metadata commit is the independent build identity.
  Existing `v1.24.0 -> c0ac7a4`, `v1.23.0 -> 0974197`, `v1.22.0 -> 1a37d37`,
  `v1.21.0 -> b4d6bf2`,
  `v1.20.1 -> 19123e7`,
  `v1.20.0 -> dc2dc84`,
  `v1.19.1 -> 40b0b73`,
  `v1.19.0 -> d8f0d5f`,
  `v1.16.0 -> a863d57`,
  `v1.15.0 -> 19e45d1`,
  `v1.14.0 -> 123ad02`,
  `v1.13.1 -> 9bfd6ab`,
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
- RED-Plan-63 adds the authorized public `mousou-kanshou-daishou-renmei` Song
  Edition in a separate product-focused commit; release metadata records the
  `1.14.0` `MINOR` boundary, and the following Project State closeout remains
  documentation-only.
- The translation authoring rule now treats user translation as primary
  reference/evidence that must pass semantic and naturalness review before
  integration; Architect-reviewed corrections are integrated without changing
  the schema or translation provenance contract.
- RED-Plan-64 adds the authorized public `doushite-takase-toya` Song Edition in
  a separate product-focused commit; release metadata records the `1.15.0`
  `MINOR` boundary, and the following Project State closeout remains
  documentation-only.

## Current product capabilities

- Local-first Catalog loading, metadata-focused Song Edition cards and
  explicit per-song identity-coherent offline snapshot install/removal.
- Catalog download tasks expose verified resource-item progress and explicit
  cancellation. Manual downloads and automatic H1→H2 refreshes share one
  per-song task owner for the lifetime of the App document; leaving and
  returning to Catalog keeps the task observable. Cancel/failure keeps the
  last complete H1 active, while only a validated manifest defines offline
  availability. In-flight tasks are not restored after a hard reload or
  browser close.
- Catalog search normalizes Unicode width, case, whitespace and songId
  separators, AND-matches title/artist/album/songId terms, and includes only
  the two traceable simplified-title aliases recorded in the search owner.
  The session-local “仅显示离线可用” filter displays the identity-verified
  installed `snapshotEdition`, including H1 while Catalog H2 refresh is pending;
  pending, failed and unavailable verification are not reported as no matches.
- Practice-ready Core is independent of optional Explain articles. Warm Catalog
  navigation retains the mounted Catalog until the active manifest/core is
  confirmed, then hands that entry's result to the Song Edition page; cached
  Catalog H2 never outranks a complete active H1 snapshot.
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

The tracked public source contains six Song Editions:
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
`library/mousou-kanshou-daishou-renmei/` (`妄想感傷代償連盟`, `DECO*27 × 初音未来`)
adds 46 unique Segments, 57 Occurrences, 16 Sections, 16 Practice Units, one
canonical MP3, one JPG cover, eight Explain Markdown features and 14 reviewed
note targets.
`library/doushite-takase-toya/` (`どうして`, `高瀬統也 × 野田愛実`) adds 26
unique Segments, 33 Occurrences, 9 Sections, 9 Practice Units, one canonical
MP3, one JPG cover, eight Explain Markdown features and 11 reviewed note
targets.
Japanese lyrics may carry
position-verifiable `ruby` spans for Hiragana furigana; canonical `lyrics`
text and existing `layers` remain separate source contracts. All six public
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
- `src/pwa/song-download-tasks.ts` coordinates same-song manual downloads,
  automatic H1→H2 refreshes, cancellation and removal for one App document.
  `src/pwa/song-download.ts` remains the snapshot transaction and offline-state
  authority; transient task progress never marks a song installed.
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

## RED-Plan-63 《妄想感傷代償連盟》新曲正式导入与翻译质量审查状态

- Handoff manifest 的 23 个 entry 均已按 size 与 SHA-256 核验；候选 source
  package、research、raw LRC/translation、README、Plan 与 ZIP 未复制进
  产品 source。canonical audio、cover 与 LRC 的 exact SHA-256 分别为
  `419ab1b13e38781c7fb534c365de117d17cf821d8644a578e3e0203c9bf56358`、
  `5449a9e1b1a97fc14e6371b53398e96e42f8dc40734f490ee886a7f943d14b58` 与
  `fc8cd9e8b8dacd41827a3e01f77bdfbff5afaddfcb725e30ad99636e3fc175ec`。
  MP3 probe 为 `44.1 kHz`、stereo、`320 kbps`、约 `270.028 s`。
- `library/mousou-kanshou-daishou-renmei/` 已作为第五个公开 Song Edition
  导入，manifest identity 为 `songId=mousou-kanshou-daishou-renmei`、
  `妄想感傷代償連盟`、`DECO*27 × 初音未来`、`GHOST`、`2016`。Source
  contract 包含 46 个 canonical Segment、57 个 Occurrence、16 个
  Section、16 个 Practice Unit、8 个 Explain Feature 与 14 个 reviewed
  note target；46/46 Segment 有完整 Romaji 与位置核验通过的 ruby。16 个
  Practice Unit 覆盖全部 57 个 Occurrence。
- canonical normalization audit 已确认：`鬱雜い` → `鬱雑い`；嵌入式
  `掲（かか）げよう` → `掲げよう` 并保留 ruby reading；`•` → `・`；`随に`
  → `隨に`；`愛や厭...` → `愛や厭`；`怒ってる？…怒ってない` →
  `怒ってる？　…怒ってない。`。Japanese canonical lyrics、受保护标点、
  Segment/Occurrence identity 与 source structure 未被候选材料以外的内容
  改写。
- translation review audit 已整合 Architect-reviewed candidate，并确认
  `帰ってね` 为“对不起，你回去吧”、`叶えた先` 为“愿望实现之后...” 、
  `スタッフロール` 为“片尾字幕”、`位相` 保留“相位”、
  `対人ローション` 保留人际间的“润滑剂”语义、`嘘を覚えて仕舞う` 为
  “学会了这种谎言”。这些是审查后的正式 translation，不是 Codex 独立
  重译；翻译审查边界已同步写入 `docs/歌曲内容生成规范.md`。
- 57 个 Occurrence 均使用唯一权威 `startMs/endMs` 的 `Provisional
  Timing`。timing 以 LRC onset anchor 配合 canonical MP3 的局部 RMS/
  release minima 选择；未使用 `end=next LRC` 或整曲固定 padding。重复钩子
  `愛や厭` 仅保留 `o026` 与 `o057` 两个 primary Occurrence，并保留
  `performanceNote`，没有虚构额外重复/处理后的 hook Occurrence。该 timing
  尚未获得人类听感 `PASS`，后续校准仍须通过 identity-bound Timing
  Debugger 流程。
- `npm run library:audio-hash -- mousou-kanshou-daishou-renmei`、
  `npm run library:validate`、`npm run library:compile`、custom content
  audit、媒体 probe、focused tests、最终 `npm run build --
  --base=/red-repeat/` 与 `npm run pwa:inspect -- /red-repeat/
  --require-production` 均通过。Validator 保留 5 个既有/新曲可选
  `NO_HERO_ARTWORK` warnings；没有 validation error。
- focused regression 为 9 个 test files / 70 个 tests，均通过。390×844 本地
  browser smoke 验证了第五首曲目、16 个 Practice Unit、57 个 Full Song
  Occurrence/16 个 Section、8 个 Explain Feature 与引用试听；browser
  error/warn 日志为空。该浏览器证据不替代真实 iPhone/Safari、installed
  PWA、主观听感或真实设备 geometry/touch 检查。
- 既有四个公开 Song Edition 的 source diff 均为空；本 Plan 未修改
  `schema/compiler/runtime`、UI/PWA 行为或既有歌曲 source。Product commit
  为 `123ad023b30c3a4bfcf7b2f5dd117a06e09682fb`，`1.14.0` 为 `MINOR`，
  annotated tag `v1.14.0` 指向该 product commit；release metadata/build
  identity commit 为 `9b467d23ac25aac367b9a5f64d847c0c03de2d3c`。
- 本 Plan 没有 blocking `USER CHECK`；新曲 57 个 timing 仍明确是
  `Provisional Timing`。真实设备/installed-PWA geometry、touch、standalone
  lifecycle 与主观听感未执行，按 `POST-DEPLOY OBSERVATION` 保留，不写成
  目标设备或 timing 人类 PASS。

## RED-Plan-64 《どうして》新曲正式导入状态

- Handoff manifest 的 23 个 entry 均已按 size 与 SHA-256 核验；raw audio、
  LRC、cover 与 translation-reference 的 exact SHA-256 分别为
  `4188d8d45621169cae7f3be03b63ed7e26ed423194f06e55bcbaf8a3b077cfdb`、
  `0aa1ce6772cadffa088011bd681f3c3e68dc9b6c06e4911db4a5ce3f907616f2`、
  `ee22ad277f7e796a7b45abeef062b827697679ef039e0c017947e14ca560714a` 与
  `c4d49ee5df252e57c4bd440a65432a506cad484b8a9093c5f319d2ca9929e8b9`。MP3
  probe 为 `48 kHz`、stereo、`320 kbps`、`181.128 s`；audio 与 cover
  均按原字节复制。
- `library/doushite-takase-toya/` 已作为第六个公开 Song Edition 导入，
  manifest identity 为 `songId=doushite-takase-toya`、`どうして`、
  `高瀬統也 × 野田愛実`、`13月1日`、`2022`。Source contract 包含 26 个
  canonical Segment、33 个 Occurrence、9 个 Section、9 个 Practice Unit、
  8 个 Explain Feature 与 11 个 reviewed lyric-note target；26/26 Segment
  有完整 Romaji 与位置核验通过的 ruby，9 个 Practice Unit 覆盖全部 33 个
  Occurrence。
- canonical lyric normalization 仅将 LRC 的 `会いたいな しか出ない` 统一
  为官方标点形式 `「会いたいな」しか出ない`；没有为风格原因改写其他
  Japanese lyric wording。`話せない` / `話さない` / `話してない`、
  `過ごせる` / `過ごせた` / `過ごせて` 与 `君よりもっと…` / `君以上…`
  的差异均保留。
- reviewed translation 已整合 Architect-authored candidate，没有机械采用
  raw user translation，也没有独立重译。审查保留了 `諦めきれない`、
  `うまい話`、`戯言` 等语义边界，以及三轮语法推进和两行比较结构；重复
  Segment 使用同一 reviewed translation。
- 33 个 Occurrence 使用 Handoff 提供的单一权威 `startMs/endMs`
  `Provisional Timing`；`timeline.json.audioSourceHash` 与 canonical MP3
  hash 一致。未转换为 `end=next LRC timestamp`，未加入全局 lead/tail
  padding；`71.800s` 与 `147.520s` blank anchors 保留，`o012`、`o026`、
  `o033` uncertainty notes 保留。没有声称人类听感 `PASS`。
- 8 个 Explain drafts 已原样整合，并保留 confirmed fact、creator statement
  与 RED:REPEAT editorial observation 的边界；研究未发现可靠的 ACGN
  tie-in，因此没有新增 ACGN feature。所有 19 个 `[[segment:...]]` 引用
  均可解析。
- `npm run library:audio-hash -- doushite-takase-toya`、
  `npm run library:validate`、`npm run library:compile`、custom source/
  timing/content audit、focused tests、`npm run build --
  --base=/red-repeat/` 与 `npm run pwa:inspect -- /red-repeat/
  --require-production` 均通过。Validator 保留 6 个可选
  `NO_HERO_ARTWORK` warnings，无 validation error；编译输出为 6 editions、
  89 runtime files。
- 390×844 本地 browser smoke 已验证 Catalog 第六首、9 个 Practice Unit、
  33 个 Full Song Occurrence / 9 个 Section、8 个 Explain 主题和 lyric-
  reference playback；browser error/warn 日志为空。该证据不替代真实
  iPhone/Safari、installed PWA、主观翻译偏好或真实设备 geometry/touch 检查。
- 既有五个公开 Song Edition 的 source diff 均为空；本 Plan 未修改 schema、
  compiler、runtime、audio engine、Practice/Full Song UI、offline/PWA 或
  shared CSS。Product commit 为 `19e45d1c8cdee93b1e1895674637d93479cb55e4`，
  `1.15.0` 为 `MINOR`，annotated tag `v1.15.0` 指向该 product commit；
  release metadata/build identity commit 为
  `3ef0171f1d726b2a0042ddd1250a6c860683c0d3`。
- 本 Plan 没有 blocking `USER CHECK`；33 个新曲 timing 仍为
  `Provisional Timing`。真实设备/installed-PWA geometry、touch、standalone
  lifecycle 与 33 个 timing 的人类听感验收未执行，按
  `POST-DEPLOY OBSERVATION` 保留，不写成目标设备或 timing 人类 PASS。

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
  listening. Historical RED-Plan-49 identity-matched playback calibration for
  `senbonzakura` covered 45/45 Occurrences and 82/82 migration-era fields
  (45 `playStartMs`, 37 `playEndMs`). RED-Plan-53 migrated those values into
  the current single canonical `startMs`/`endMs` interval; the migration was
  not a new listening review and does not expand the historical calibrated
  evidence scope. Real-device and subjective-listening limits remain
  `POST-DEPLOY OBSERVATION`, not an active blocking gate under `D-019`; users
  can surface low-cost follow-up during normal Production use.
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
- `POST-DEPLOY OBSERVATION (RED-Plan-63)`: the 57 `mousou-kanshou-daishou-renmei`
  intervals are intentionally `Provisional Timing`; real-device/iOS/installed-
  PWA geometry, touch, standalone lifecycle and subjective audible timing were
  not executed. These remain residual risk and do not block this first public
  import.
- `POST-DEPLOY OBSERVATION (RED-Plan-64)`: the 33 `doushite-takase-toya`
  intervals are intentionally `Provisional Timing`; real-device/iOS/installed-
  PWA geometry, touch, standalone lifecycle, subjective translation preference
  and audible timing were not executed. These remain residual risk and do not
  block this first public import.
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
- No `BLOCKING USER CHECK` or current RED-Plan-44/45/50/51/52/54/55/56/57/58/60/61/62/63/64 `UNKNOWN` remains open.
  This
  does not promote automated regression evidence to a real-device, perceptual,
  audible-timing or installed-client lifecycle PASS.
- No new unresolved reading ambiguity was identified from the available Handoff
  material and candidate ruby/Romaji evidence. Existing future PWA/device risks
  remain governed by D-013/D-016 and are not reopened by this content change.

## Current work / Next action

- `RED-Plan-82 / R1` 的 WORK R3 内容集成、本地验收与 `1.24.0 MINOR` 发布源信息
  已收口；远端 CI、Pages 与 Production smoke 仍以对应交付回执和实际部署身份为准。
  详细源范围、H1/H2 浏览器证据及严格 identity 限制见本文件末尾的 Plan-82 记录。
  不自动启动下一项内容改写。
- `RED-Plan-79 / R1` 已完成 WORK 七篇候选／旧八篇、61 Segment 的独立审稿与来源复核，
  见 [WORK_CONTENT_REVIEW.md](WORK_CONTENT_REVIEW.md)。翻译处置为接受候选26／需修订20／
  保留现译7／待来源8；90处引用及27个章节目标结构有效，但候选语义／显示仍需修订。
  研究交付不等于原包获准集成；特殊读法、声部／对位未核听，完整制作名单未独立取得。
  建议七主题及旧03合入08，须用户／Architect采纳后另行冻结内容与身份／数据验收范围。
  Plan-79 当时仅研究文档和必要索引／状态／旧基线时效澄清；未改歌曲、代码或当时的
  `1.23.2` 版本。其 WORK 写作建议后来由独立 Plan-82 输入重新冻结；不授权跨 identity
  迁移。Git／CI／Pages 结果仍按各任务最终回执核验。
- `RED-Plan-78 / R1` 已按 D-028 完成 sparse v3 Timing 非破坏性保全与完整 identity
  选择。D-028 已 Accepted；路线 B 未批准。具体浏览器/测试证据与版本交付见本文件末尾
  的 Plan-78 记录。
- `RED-Plan-77 / R1` 的 P1 修复已形成 `1.23.1 PATCH` 产品提交；其当时身份风险分析
  保留在 [CONTENT_QUALITY_BASELINE.md](CONTENT_QUALITY_BASELINE.md) 中，并由 D-028 /
  Plan-78 后续更新当前处置状态。P2 不改变 Timing identity，也不授权下一轮内容改写。
- `RED-Plan-75` R1 已完成讲解文章内章节导航与真实歌词引用精确定位的
  局部实现和本地验证；`1.23.0 MINOR` 的产品 tag target 为 `0974197`，
  release metadata 单独提交。
  实施与浏览器证据见下方独立记录；CI、Pages、Production identity
  仍按最终准确 SHA 分别核验。
- `RED-Plan-74` R1 implements explicit Practice/Full Song Occurrence links to
  the production-public Timing Debugger, bounded session-local Undo/Redo and
  explicit identity-checked v3 override saving. Product commit `1a37d37` is
  the `1.22.0` MINOR tag target; release metadata is recorded separately.
  Focused/local browser evidence is recorded below; CI, Pages and Production
  identity remain separate delivery evidence.
- `RED-Plan-70` R1 was a read-only milestone checkpoint. `RED-Plan-71` R1
  completed Catalog search and offline-availability filtering as a `1.20.0`
  MINOR release; product commit `dc2dc841c6d1deb7835523123309cc03f39d3a0d`
  is its annotated tag target and its metadata commit is the independent build
  identity.
- `RED-Plan-76 / R1` 已完成六曲内容研究基线：46 篇 Feature、240 个 Segment
  的首轮筛查、逐篇处置、公开来源分级和内容身份传播分析，见
  [CONTENT_QUALITY_BASELINE.md](CONTENT_QUALITY_BASELINE.md)。
  仅新增研究文档、局部内容规范及 owner/状态索引；未修改歌曲、代码、timing或版本。
  文档 Git/CI/Pages 交付按最终回执的准确 SHA 分别核验，未新增真人/听感 PASS。
- 内容身份风险已按数据域区分：仅改 Feature 正文仍会改变 Edition hash；D-028 / Plan-78
  现在保全 sparse v3 Timing，但不会跨身份应用。最近会话、队列、普通进度/速度与备份
  仍按各自 owner 核验；导出普通备份不等于跨身份恢复，也不自动迁移这些数据。
  最近会话此前拒绝 46/46 中文 Feature id 的问题已由 RED-Plan-77 / R1 修复，未改名
  文章或放宽其他标识符。WORK 深写仍需独立授权；A–E 其余提议不因相关研究获批，
  未实施个人数据迁移或目标架构。
- The RED-Plan-69 measurement details below remain historical evidence for
  `1.19.1`, not current work.
- `AGENTS.md` now defaults user-facing reports and Plan/report headings to
  Chinese, records the active `SongPlaybackSession` owner and current
  D-024/D-026 behavior, and preserves targeted verification with all matching
  high-risk gates. The proposed `SongRepository`/`ResourceScheduler` remain
  unimplemented; no broader architecture was adopted.
- E measurement used the Codex In-app Browser (`Chrome/155.0.0.0` UA) at
  `127.0.0.1:5174`, viewport `390×843`, without Service Worker control, on
  `night-dancer-imase`. Each measured action began after the same hashed audio
  asset was loaded in the current page; this was not a downloaded-snapshot or
  installed-PWA test. The temporary media counter muted the element, so no
  listening claim is made. The canonical source audio SHA-256 is
  `373393efa184640fab23dee91bc1a691094003f6ac42bb082bf21d0de29dc9e3`; its
  loaded runtime asset URL contains `f8d5760c50e4678052040445e395825cdd5739d641f73ec4378f9d89ea50c5b5`.
  Three baseline drags (two direct UI drags and one controlled CDP drag) each
  produced 8 `input` events and one final `change`, causing 9 seek/time writes
  and 9 pause/play calls. Three controlled after samples produced the same
  input events but only one seek/time write and one pause/play call; a further
  direct UI drag confirmed the same 9-to-1 reduction. Harness pointer timings
  varied and are not INP or perceptual latency evidence. Final position,
  playing/paused intent and `1.0x` rate were checked; keyboard step seeking
  remained immediate.
- `useAudioProgress` was not separately profiled: equal snapshots are
  suppressed, its subscription belongs to the compact player, and its focused
  test verifies the lyric tree does not rerender per playback frame. The
  loader checks the active downloaded snapshot before reusing a warm core, and
  Explain Features remain on-demand; source review found no reason to expand
  these candidates into separate measurements in this task.
- D-024/D-026 remain implemented; D-025 A–D are complete, E is partially
  implemented by this measured scrub change, and F3 remains excluded. Real
  iOS/Safari touch, human listening and installed-PWA adoption were not run and
  remain `POST-DEPLOY OBSERVATION`. The existing untracked documents and
  `public/library-runtime.tmp-11104/` remain untouched.

## Previous completion record (RED-Plan-68/R1)

The following entries describe the Plan-68 closeout and remain historical
evidence; current release identity and Plan status are recorded above.

- `RED-Plan-68` R1 implements D1–D5 on `main`, based on
  `e64571f708c51ed59094f6749116e1263455accb`. The focused product commit is
  `d8f0d5fa72f3694ca6fe557e7ee7cfa4888d6bdf`; the authorized `1.19.0` MINOR
  release and annotated `v1.19.0` target that commit. This metadata commit is
  the separate build identity; remote push, CI, Pages and production identity
  are reported at delivery rather than pre-asserted here.
- D1 adds explicit Occurrence-to-Practice and evidence-backed Explain navigation
  with return context. D2 adds identity-bound, paused-by-default recent resume;
  D3 adds a user-managed, identity-checked queue without mastery scoring. D4
  adds a whitelist-only local backup/preview/import path with per-domain
  conflict consent and verified compensating rollback. D5 records the integrated
  state; no E architecture or F3 learning assessment was introduced.
- Verification: 14 directly affected test files / 139 tests passed; one local
  candidate production build passed (6 editions / 89 runtime files, TypeScript
  and Vite) before a later dependency-array-only lint fix; exact-final-SHA build
  evidence is left to CI. Targeted lint had 0 errors and 6 React Fast Refresh
  warnings. An isolated
  browser exercised the 390×844 context/resume/queue route and personal-backup
  export, preview, explicit restore and reload. This is not iOS, human-listening
  or installed-PWA evidence.
- D-024 and D-026 are implemented; D-025 A–D are complete, E remains pending,
  and F3 remains excluded. No E implementation has started; it needs a separate
  approved scope after the current `1.19.0` delivery boundary.
- Real iOS/device, human listening and installed-PWA adoption were not executed.
  The two existing user documents remain untouched. The build-created
  untracked `public/library-runtime.tmp-11104/` is excluded from staging.

## Previous completion record (RED-Plan-67/R1)

The following statements describe the Plan-67 closeout and remain historical
evidence; current release identity and Plan status are recorded above.

- `RED-Plan-67` completes C1–C5 on `main`. Product implementation commit is
  `dfa5e085417a6fa85fd232d4de3e3059925d50d5`; its authorized `1.18.0` MINOR
  release and annotated `v1.18.0` targeted that product commit. The release
  metadata commit was the independent build identity.
- Plan-67 introduced a compact song header and sticky three-mode navigation,
  a collapsed Practice dock with on-demand secondary controls, local
  display-only translation/Romaji/text-size preferences, and Full Song lyric
  following that yields to manual browsing. These changes do not alter the
  shared audio/session owner, canonical content/schema, timing, offline
  snapshot, PWA update or learning-progress contracts.
- Verification: targeted UI tests passed (3 files / 39 tests); Library compile
  generated 6 editions / 89 runtime files; TypeScript and Vite production-build
  boundaries passed. Edge `155.0.4283.45` at `390×844`, `768×1024` and
  `1365×900` confirmed sticky navigation, reachable expanded controls, display
  filtering with Ruby retained, and readable-area follow/manual pause/resume.
  This is desktop-browser evidence, not iOS/device or installed-PWA evidence.
- At the Plan-67 closeout, D-024 and D-026 were implemented; D-025 A–C were
  complete, D–E remained pending, and F3 remained excluded. The next action then
  was release-delivery verification for `1.18.0`.
- Real iOS/device, human listening and installed-PWA adoption were not executed.
  At that time, the two existing user documents and the unrelated detached
  Plan-65 worktree were left untouched; `public/library-runtime.tmp-11104/` was
  excluded from staging.

## Previous completion record (RED-Plan-66/R1)

These statements describe the Plan-66 closeout; its version, decisions and
validation counts are historical evidence, superseded above where Plan-67 applies.

- `RED-Plan-66` R1 implements B1–B5 and D-024 / D-026 F2 on `main`, based on
  `2a12cbbbee4faac53279198112f19aff221bd353`. Product implementation is
  `7456a0d658d98b592ff706ae09d62bef8ee88fc9` (including feature ancestor `aba90b7`); validation is complete. This metadata
  prepares `1.17.0` and its annotated product tag. Exact metadata build SHA,
  push/CI/Pages/smoke are independently verified in the final delivery receipt;
  this source entry does not pre-claim a deployed version.
- `SongPlaybackSession` owns commands for the validated song/content/audio/
  timeline identity and the existing single AudioEngine. Mode mounts only
  subscribe; Full Song → Explain/passive Practice keeps media time/source/rate.
  Explicit line/Unit actions create bounded Practice; Catalog/song exit cancels
  operations and pauses. Compatible reopen retains position without autoplay.
- Preview replacement inherits the original context. Only valid natural completion
  restores its position/rate/playing or paused intent, including the interrupted
  Practice ramp stage. Cancel/new command/mode exit/song or Edition replacement/
  media error/timing revision invalidation cannot revive old callbacks. The
  AudioEngine checks generations before queued media play calls and resets the
  media source/clock before its first new-source notification.
- Practice keeps `0.6/0.8/1` ramp, fixed-speed preference and existing persistence.
  Pause resumes the unfinished pass from its position; explicit replay restarts.
  Changing Unit or Practice mode cancels an old Practice operation; passive
  browsing does not stop Full Song. Fixed-rate selection during a ramp updates
  its final fixed preference without changing the current ramp stage.
- Mode-local selection, control preference, loaded Explain topic and reading
  position survive mode unmount in the current Edition. No hidden workspace DOM,
  new learning/persistence schema, SongRepository or ResourceScheduler was added.
- Evidence: 49 test files / 381 tests passed; root and `/red-repeat/` builds and
  PWA artifact inspections passed; lint passed with only two existing Fast Refresh
  warnings using CLI exclusions for ignored `.cache/` probes and `.private/`.
  Source/download regression preserves D-021/D-022/D-023 and existing data.
- Edge `155.0.4283.45` with real public audio and SW blocked passed continuous
  media events/time/source at 390/768/1365 widths, playing/paused preview recovery,
  explicit cancel/mode exit/media resource failure, bounded takeover/pause-resume/
  replay and all three ramp rates, reading/topic recovery, F1 in all three modes
  and source replacement. Plan-65's browser harness passed 20 warm/conflict entries
  with zero loading frames, including downloaded offline H1 and cached H2/active H1.
  Traces/results are ignored local evidence under `.cache/plan66-*` and
  `.cache/plan65-r2-plan66-regression/`, not canonical source.
- D-024 and D-026 F2 are implemented; D-025 A/B are complete, C–E remain pending.
  F3 remains excluded. Further C–E work needs a separately scoped task; no next
  Plan starts here. D-027 keeps ordinary development on `main`.
- Real iOS/device, human listening and installed-PWA adoption were not executed.
  The PWA update/activation and snapshot transaction code were unchanged; these
  real-use limits remain separate post-deploy observations, not automated PASS.
  The two existing user documents and the old detached worktree's blocked
  `public/library-runtime.tmp-24684/` residue remain untouched and excluded.

## Previous completion record (RED-Plan-65/R2)

These statements describe the Plan-65 closeout; its version, decisions and
validation counts are historical evidence, superseded above where Plan-66 applies.

- `RED-Plan-65` R2 completes A1–A5 and the warm-reopen acceptance supplement.
  Product implementation `a863d577086d69e3bb3588850db13971db555f5a` is integrated
  into local `main` by fast-forward from `634a65b`. This metadata prepares the
  authorized `1.16.0` MINOR release and annotated `v1.16.0` at that product
  commit. Final push/CI/Pages/smoke evidence belongs to the delivery receipt;
  this source update does not pre-claim a successful deployment.
- The implementation separates core Song Edition readiness from optional
  Explain article loading, preserves Catalog query/anchor across same-document
  navigation, reuses validated immutable runtime resources and compatible
  Edition cores, removes automatic whole-library warmup from Catalog, and
  restores reachable Full Song navigation at intermediate widths.
- Product-candidate evidence: `npm test` passed (48 files / 354 tests),
  typecheck passed, and lint passed with two existing Fast Refresh warnings.
  The `/red-repeat/` build passed in the existing main checkout; exact-SHA PR
  quality for `a863d57` passed both builds and PWA artifact checks. The original
  isolated worktree's `public/library-runtime.tmp-24684/` remains untracked and
  excluded; its earlier EPERM cleanup rejection was not bypassed.
- R2 browser evidence used Edge `155.0.4283.45`, a production subpath build and
  isolated profiles with SW blocked to test loader/CacheStorage behavior.
  Before the fix, warm reopen painted one whole-page loading frame. After the
  fix, 20 warm/conflict entries painted zero such frames, including undownloaded,
  downloaded/offline, history forward and cached H2 / active H1 cases. Catalog
  query/scroll stayed stable, no wrong H2 was committed, and entry never started
  audio. Real browser F1 paused on Catalog return and preserved the pause/position
  on reopening. Mode-button hit targets passed at `390×844`, `768×1024` and
  `1365×900`. This is desktop-browser evidence, not iOS, human listening or
  installed-PWA update evidence. Download tests retain complete snapshots,
  H1 fallback, failed H2 staging, manifest-last switching and v1 compatibility.
- `D-024` remains Accepted with implementation Pending; Plan-65 does not add
  cross-mode continuous playback. `D-025` is partially implemented (A complete;
  B–E pending). `D-026` is partially implemented (Catalog-return F1 validated;
  Explain-preview F2 pending). F3 mastery/automatic proficiency evaluation
  remains explicitly excluded.
- Under D-027, subsequent ordinary development defaults to `main`; a Plan does
  not automatically require a new branch or PR. Release delivery still requires
  the authorized version/tag boundary and matching CI/production verification.
- Next product work: any later B–E or F2 implementation must stay within the approved
  product goals and receive its own execution scope; no new architecture or
  behavior is implied by this status entry.

## Historical completion record (RED-Plan-37–64)

The following closeout records retain their original evidence and semantics;
versions, commits, test counts and acceptance statements describe the time of
each historical task and do not replace the current repository identity above.

- `RED-Plan-37` / `PLAN-001` is complete; there is no active timing acceptance
  work for `work-millennium-parade`.
- Human listening result is `PASS 40`, `NEEDS_CORRECTION 0`,
  `STILL_UNCERTAIN 0`. Canonical audio identity remains verified against the
  source hash above.
- No canonical timing source, schema, compiler, playback, or UI change was
  made in this closeout. The remaining by-ear timing acceptance debt is closed;
  any future timing change still requires a separate evidence-backed correction
  boundary.
- At `RED-Plan-38` closeout, the package/release ledger recorded historical
  version `1.6.2`; `v1.6.2` points to `c61f977`, and its later
  release-metadata `main` build carried live version `1.6.2`.
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
- `RED-Plan-63` is complete: `library/mousou-kanshou-daishou-renmei/` is the
  fifth public Song Edition with exact user audio/cover identity, validated
  source structure, complete ruby/Romaji coverage, reviewed translation
  corrections and eight Explain Features. Product commit `123ad02` is tagged
  as `v1.14.0` at `MINOR` level; release metadata/build identity is
  `9b467d2`. New timing remains explicitly `Provisional Timing`; no human
  audible PASS or real-device PASS is claimed, and no existing Song Edition was
  changed.
- `RED-Plan-64` is complete: `library/doushite-takase-toya/` is the sixth public
  Song Edition with exact user audio/cover identity, validated source
  structure, complete ruby/Romaji coverage, reviewed translation and eight
  Explain Features. Product commit `19e45d1` is tagged as `v1.15.0` at `MINOR`
  level; release metadata/build identity is `3ef0171`. New timing remains
  explicitly `Provisional Timing`; no human audible PASS or real-device PASS is
  claimed, and no existing Song Edition was changed.
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

## RED-Plan-71 implementation and release status

- `src/library/catalog-search.ts` owns NFKC/lowercase/whitespace normalization,
  multi-token AND matching over canonical Catalog fields and songId tokens,
  and two documented simplified-title aliases. No guessed Chinese translation
  aliases or canonical Song Edition source changes were introduced.
- Catalog's “仅显示离线可用” filter includes only `installed` states with a
  same-song `snapshotEdition` returned by the offline snapshot owner. It shows
  the installed edition itself, keeps H1 available during an H2 background
  refresh, preserves Continue and queue surfaces, and distinguishes checking,
  unverifiable and confirmed-empty results. Filter/search state remains in App
  memory across same-document navigation.
- Product commit `dc2dc841c6d1deb7835523123309cc03f39d3a0d` is the annotated
  `v1.20.0` MINOR tag target. Release metadata is committed separately; this
  source records the package/ledger release identity, while push, exact-SHA CI,
  Pages deployment and live identity remain separate delivery observations.
- Verification: Catalog/App tests `28/28` passed; existing
  `src/pwa/song-download.test.ts` tests `8/8` passed; targeted ESLint passed;
  one candidate `npm run build` passed for six editions and 89 runtime files.
  Build emitted only the existing optional `NO_HERO_ARTWORK` warnings. A local
  390×844 browser path confirmed slug Romaji and simplified-title alias search,
  filter empty-state wording and readable layout. Real iOS/Safari and installed
  PWA remain `POST-DEPLOY OBSERVATION`, not claimed as PASS.

## RED-Plan-72 implementation and release status

- P1 makes `SettingsPage` and the production-public `TimingDebuggerPage`
  route-level dynamic imports with a local accessible loading state and a
  retryable error state. Catalog and default Practice do not load either page
  module; the DEV-only Timeline Debugger remains separate. Both direct hash
  routes and the existing Settings entry remain available.
- P2 compiles a distinct 256px Catalog thumbnail from each canonical cover and
  changes only `CatalogEdition.coverUrl`. `RuntimeEdition.artwork.coverSmallUrl`
  remains 640px and the large Edition image remains unchanged. The existing
  hash-addressed `cover-small` URL class is reused, so no schema, cache-route,
  snapshot-owner or PWA lifecycle change was needed. Complete download tests
  cover both Catalog and Edition image URLs, H1/H2 replacement, H1 fallback
  and legacy manifest migration.
- Same-config production build comparison: baseline `3d40b890` / `1.20.0`
  entry was `476,124 B` (`140,547 B` local gzip level 9); the candidate
  implementation source for `19123e7` entry was `406,732 B` (`117,274 B`), a
  `69,392 B` / `14.6%` raw and `23,273 B` / `16.6%` gzip reduction. Settings
  is a separate `63,786 B` (`22,453 B` gzip) chunk and Timing Debugger is
  `8,254 B` (`2,757 B` gzip); these figures are local gzip measurements, not
  observed HTTP `Content-Encoding` or transfer timings. All JavaScript chunks
  together changed from `481,777 B` / `142,746 B` gzip to `484,425 B` /
  `144,683 B` gzip, a small total increase while reducing Catalog/Practice
  entry cost.
- Six 640×640 Catalog covers totaled `368,806 B`; six generated 256×256
  thumbnails total `79,154 B`, saving `289,652 B` / `78.5%`. Original 640px
  Edition covers and 1600px large images remain available.
- Verification: candidate `npm run build` passed for six editions and 95
  generated runtime files; 41 focused App/compiler/download tests passed;
  touched-file ESLint and `npm run pwa:inspect` passed. A desktop Codex
  in-app browser exercised Catalog → Settings → Catalog → Timing Debugger →
  Catalog → default Practice and direct refresh of both auxiliary routes.
  Browser Network timing, real iOS/Safari, installed-PWA and user-perceived
  performance were not measured; they remain separate observations, not a
  claimed PASS.

## RED-Plan-73 implementation status

- Catalog downloads now report an indeterminate preparation phase, then
  verified resource-item counts, snapshot verification and manifest commit.
  The progress total is resources, not bytes or a time estimate. Only the
  validated manifest defines offline availability.
- A per-App-document task owner coalesces same-target work and rejects a
  competing Edition for the same song. Manual downloads, Catalog H1→H2 refresh
  and removal share the owner; Catalog route unmount does not end the task.
  Task progress is transient and is not restored after document reload/close.
- Cancellation checks stop newly staged work at safe boundaries and clean up
  only resources added by that attempt. The last complete H1 remains readable
  until all H2 resources and identities validate and its manifest commits; a
  manifest put that succeeds after cancellation is reported as completed.
  Download manifest v2, runtime schema and PWA update lifecycle are unchanged.
- Verification: the focused download/task/App set passed `42/42`; the full
  Vitest suite passed `433/433` before a final test-only refinement, and the
  focused set passed again afterward. Touched-file ESLint passed. The final
  candidate `npm run build` passed for six editions and 95 runtime files,
  including TypeScript and Vite; `npm run pwa:inspect` passed the static
  artifact contract. The first build attempt hit a Windows `EPERM` at generated
  directory rename; a retry passed, and the initial cause was not established.
- A desktop Codex in-app browser with real local Cache Storage showed 7/15
  verified resource items, then navigated Catalog → Settings → Catalog while
  the task continued and completed; the downloaded-only filter and hard reload
  retained the complete snapshot. Automated tests cover cancellation and H1
  fallback. iOS/Safari touch feel and installed-PWA behavior were not tested;
  they remain `POST-DEPLOY OBSERVATION`, not a blocking gate for this unchanged
  PWA lifecycle.
- Serial resource processing remains in place. No timing comparison showed a
  measured benefit that would justify concurrent writes and additional cancel/
  rollback races (`NO_MEASURED_BENEFIT`). The broader A–E proposal is not
  approved by this implementation.

## RED-Plan-74 implementation and release status

- Practice's current row and Full Song's selected row now open the public
  Timing Debugger with the exact `songId` and `OccurrenceId`. The debugger
  validates the target after the current Edition loads; an invalid or empty
  target shows an error without selecting a substitute row or enabling edits.
  A song-context link returns to that same Edition through the existing
  compatible resume route, which remains paused on entry.
- Valid `startMs/endMs` edits create a bounded 40-entry in-session history.
  Undo/Redo updates the effective timing provider and displayed interval
  together; invalid adjustments do not enter history. Draft state is visible,
  and only explicit save writes through the existing identity-bound sparse v3
  override owner. Saving rejects an existing value changed during the editing
  session and verifies the persisted result; failure keeps the draft.
- Verification: six focused test files passed `91/91`, including an assertion
  that preview receives the same effective timing range shown after edit,
  Undo and Redo; `tsc -b`, touched-file ESLint and `git diff --check` passed. A
  desktop browser at a 390×844 viewport
  exercised the Full Song selected-row link, exact `o002` deep link, timing
  adjustment, Undo/Redo, explicit save, refresh persistence and return to the
  same Full Song selection paused. The test then saved the canonical `9820 ms`
  start back through the Debugger. The Practice entry and same-song paused
  return were also exercised. No real-device, audible-calibration or
  installed-PWA PASS is claimed.
- Local `npm run build` was not run because the compiler removes its
  PID-specific `public/library-runtime.tmp-${process.pid}` directory, and the
  worktree contains protected untracked temp directories. The final exact-SHA
  CI build is the build/release oracle; the protected directories remain
  untouched.

## RED-Plan-75 实施与发布状态

- `1.23.0 MINOR` 产品提交为 `097419785905e57f39689d7aeb2451760140c3a9`
  （`2026-10-15`）；annotated `v1.23.0` 指向该实现，package / lock、ledger
  与 build-info 同步于后续独立 metadata commit。发布是否完成仍以最终
  exact-SHA CI、Pages 与 Production identity / smoke 的实际证据为准。
- Practice / Full Song 的“看相关讲解”依据当前 Feature 顺序、文章 block
  顺序选取首个真实 Segment 引用，并保留来源 preferred Occurrence。
  引用节点 ready 后只定位一次，焦点与克制的边框提示指向该引用块。
  无精确引用、加载失败仍显示非破坏性状态，普通入歌不会加载全部讲解。
- 已加载文章含正文 Heading 时提供折叠的“本篇章节”；目标 id 由编码后的
  Feature id 与原 block index 派生，重复标题、中文/日文及符号可独立定位。
  没有正文 Heading 时不显示目录。2026-10-15 核对的 46 篇公开 Feature
  均只有文章标题，因此现有原文下该目录保持隐藏；未为展示目录改写内容。
- 查找与 Edition content hash、Segment / Occurrence 及当前请求绑定。
  已取消读取不复用为新请求，旧响应不能覆盖新上下文；用户手动切文章、
  章节或回到顶部会结束自动定位。StrictMode 重放挂载 effect 时会释放旧
  查找标记，避免取消后永远停在加载状态。没有新增持久化字段或播放 owner。
- 本地验证：四个相关 Vitest 文件合计 `55/55`，覆盖引用块顺序、重复标题、
  preferred Occurrence、StrictMode、取消重启、跨 Edition 晚到响应、手动导航、
  重复入句、无关联及 Practice / Full Song 返回与 preview 回归。
  `tsc -b`、触及文件 ESLint 和 `git diff --check` 通过；ESLint 仍有该模块
  原有的两条 Fast Refresh 非组件导出 warning。
- Codex In-app Browser / Chromium 155 在独立本地 origin 走过真实深海少女
  `o001` → 相关讲解 → 引用焦点 → 返回同句。配置 `390×844`，宿主实际
  CSS 视口为 `390×845`；引用顶部约 `112px`，sticky 导航底部约 `48px`。
  因正式文章无正文 Heading，章节浏览额外使用仅限当前浏览器响应的、明确
  标为“测试数据”的临时 Heading，核对折叠目录、两级章节、焦点和可读区，
  随后解除拦截、重载并关闭测试标签；未写入 canonical 或 generated 文件。
  整条路径音频保持 `paused`、`0ms`、`1.0x`，路由与来源 `o001` 保留。
- 未执行 iOS/Safari 真机、installed-PWA 或人工听感；这些仍是当前未改变
  lifecycle / identity 边界下的 `POST-DEPLOY OBSERVATION`。本地 build 未运行，
  避免触及已有受保护的 `public/library-runtime.tmp-*`；最终准确 SHA 的完整
  CI build / Pages / Production smoke 是发布门禁，实际结果由本任务最终回传记录。

## RED-Plan-77 实施与发布状态

- `1.23.1 PATCH` 产品提交为 `2d000adf177a874587ab060e7ee5037ee197ffc3`
  （`2026-10-15`）；annotated `v1.23.1` 指向该修复，release metadata 独立提交。
- 最近会话的 `featureId` 现在接受受控的可打印 Unicode（最多 256 UTF-16 code units），
  并保持输入字形；song、Occurrence、Practice Unit 的 ASCII 校验和 schema v1 不变。
  全部 46 个 tracked Feature basename 经真实保存、解析与读取逐字往返。对未知目标、
  不兼容 Edition 仍安全回退；同 Edition 文章恢复路径不会自动播放。
- 三个定向测试文件 `50/50`、全量 Vitest `477/477`、`npm run typecheck`、触及文件
  ESLint 与 `git diff --check` 均通过。独立本地 browser origin 完成打开中文 Feature、
  返回 Catalog、继续上次并恢复原文章的路径。未声称真机、听感或 installed-PWA PASS。
- 未本地运行 build，因为它会触及可能清理 PID 专属 `public/library-runtime.tmp-*`
  路径；该目录存在受保护未跟踪资料。release metadata 提交
  `35990ca8efd0be6c831273c1ba6c3090281bb563` 的 CI run `38702445897`
  quality、Pages deploy 和 workflow production identity 均成功；本地
  `npm run release:smoke` 也确认 `1.23.1 / 35990ca8efd0`，`builtAt` 为
  `2026-10-15T08:02:00.255Z`。这些仍是该准确 SHA 的部署证据，不声称真机、听感或
  installed-PWA PASS。
- P2 的 A/B 身份保护路线仅作为待批准提案记录在
  [CONTENT_QUALITY_BASELINE.md](CONTENT_QUALITY_BASELINE.md)。没有迁移、重绑定或清理
  用户 timing override；D-012/D-021、D-022 与 D-023 行为保持。后续内容重构前仍需用户
  明确个人数据保全与跨 Edition 兼容边界。

## RED-Plan-78 实施与发布状态

- `1.23.2 PATCH` 产品提交为 `b020b4a4501fbe33d114a4171429b52523efc58c`
  （`2026-10-15`）；annotated `v1.23.2` 指向该产品提交，版本元数据与产品实现
  分开提交。D-028 仅批准路线 A；没有跨 Edition 自动重绑定。
- 有效 sparse v3 Timing 记录按 `songId`、Edition content hash、audio source hash 和
  base Timeline URL 完整 identity 保全。原单槽值在 archive 写后读核验前不被覆盖；归档
  仅在完整 identity 匹配、Occurrence 校验通过时参与有效 timing。不同身份并存，失败、
  冲突或存储不可用时 fail closed，不设静默 TTL/淘汰。Settings 提供独立查看/导出；常规
  个人状态备份明确不包含该历史归档。resume、queue、progress/rate、下载及其他数据域
  仍依各自原身份合同处理。
- 隔离浏览器使用合成 H1/H2 与浏览器原生 localStorage/CacheStorage：H1 原始 v3 字节可核验
  保留；完整 H2 提交后不使用 H1 override；重新激活 H1 并硬刷新后按原 identity 恢复；
  H2 staging 失败保留 H1；Settings 导出包含 H1 完整 identity 和稀疏值；两标签同一时点
  保存为一成功、一冲突，未覆盖原值。此证据不代表真实用户资料迁移、installed-PWA、
  iOS 真机或人工听感验收。
- 8 个受影响测试文件 `89/89`、`npm run typecheck`、触及文件 ESLint 与
  `git diff --check` 通过。未在主工作树运行 `npm run build`，以免触及受保护的
  `public/library-runtime.tmp-*`；最终精确 SHA 的 CI build、Pages 与 Production identity
  由本次交付回执分别核验。没有修改歌曲 source、Compiler/schema、PWA lifecycle 或生成产物。

## RED-Plan-82 实施与发布状态

- `1.24.0 MINOR` 的产品提交为 `c0ac7a454f3d2db726450a296fa88d3cc5487148`
  （`2026-10-15`）；annotated `v1.24.0` 指向该内容提交，release metadata 独立提交。
  七篇已批准 R3 Feature 按原 basename 集成，旧 W03 删除；61 个 Segment 中仅 46 条
  `translation` 更新，其余 15 条及 Ruby、Romaji、Occurrence timing、Practice、Timeline、音频与 artwork 未改。
- Work Edition identity 从 `f6078978…` 更新为 `19b42331…`；audio source SHA-256
  仍为 `facc3031bda3d4c5588276fd33b46c9474d19af3364880f9ca1567cea4928083`，Timeline 与
  Practice runtime URL 不变。D-028 / Plan-78 的 sparse v3 保全与严格选择证据继续适用：旧
  override 不会跨 Edition 自动应用，resume、queue、progress/rate 与个人备份仍按原身份合同处理；没有迁移或重绑定。
- 隔离浏览器的 H1 CacheStorage manifest 起始绑定旧 Edition 与 16 个快照 URL。对 H2 W08
  注入 HTTP 503 后，应用显示更新失败、保留原离线版本，且旧 W03 可继续打开；恢复服务后
  H2 以七篇目录和新译文呈现。manifest-last 事务由当前下载实现及定向测试核验；未将 UI
  观察夸大为直接检查提交后的 manifest 字节。
- `library:validate`、音频身份核验、`/red-repeat/` build 与 `pwa:inspect` 通过；Feature
  parser 接受七篇文章、61 个合法引用及 24 个章节目标。9 个相关测试文件 `99/99`，release
  ledger 测试 `1/1`。未运行真机、人工听感或 installed-PWA 验收；没有修改 timing、音频或 PWA lifecycle。

## RED-Plan-84 实施与发布状态

- `1.25.0 MINOR` 产品提交为 `71d2becde685d6cfde5d78936c311db6ecab8726`
  （`2026-10-15`）；annotated `v1.25.0` 指向该产品提交，版本元数据采用独立提交。
- NIGHT DANCER Explain 从八篇调整为七篇，按 R3 定稿更新七篇文章并删除已由新 N07
  承接的旧 N08。34 个 Segment 中仅 25 条 `translation` 改动；5 条 KEEP、4 条 HOLD，
  其余歌词字段、Ruby、Romaji、Occurrence timing、Practice、Timeline、音频与 artwork 均保留。
- Edition content hash 从 H1 `3229711e723d0028607a48dc98a7561cf1787cb57c8798c45f6b98602f948ba3`
  更新为 H2 `3732e41df623b7df8291d6734dee509434ad7a902531d3cf758757356e4b3bcd`；
  audio SHA-256 `373393efa184640fab23dee91bc1a691094003f6ac42bb082bf21d0de29dc9e3` 不变，
  Timeline 与 Practice runtime URL 不变。D-028 H1 sparse v3 记录仍按完整身份归档；H2 不应用
  H1 override，重新激活 H1 后原值可恢复。
- 在隔离浏览器的原生 CacheStorage/localStorage 中验证 H1 离线快照、H1→H2 成功更新、
  唯一新 Feature 请求失败时保留完整 H1，以及恢复网络后成功切换至完整 H2。H1 有 8 篇/16 个
  快照资源，H2 有 7 篇/15 个资源；离线打开 H1 内容成功。合成的 `o001` +20 ms 仅为身份测试，
  不是人工校准或听感 PASS。
- 六曲 `library:validate`、NIGHT DANCER 音频身份检查、八个受影响测试文件 `70/70`、
  H1/H2 `npm run build`、`/red-repeat/` build 与对应 `pwa:inspect` 均通过。真实 Feature parser
  接受 7 篇文章、34 个引用、21 个章节目标，引用均可解析，引用卡连续密度最多为 2；本地浏览器
  验证了 Catalog、Practice、Explain 与 Full Song 导航。静态与本地证据不代表真实设备、人工听感
  或 installed-PWA PASS；远端 CI、Pages 与 Production identity 仍分别以实际交付核验为准。
