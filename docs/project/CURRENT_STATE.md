# CURRENT_STATE

This is the current repository state. Current repo evidence supersedes
the external migration snapshot; archived Plans and forensics are historical
evidence only.

## Repository identity and worktree

- Repository/package: `red-repeat`
- Root: `D:\CS\red-repeat`
- Remote: `origin = https://github.com/MyKr-YSteinsK/red-repeat.git`
- Branch: `main`, tracking `origin/main`
- Current user version: `1.6.2`
- Current lifecycle stage: `Production`
- Latest ledger/tag: `1.6.2` / `v1.6.2 -> c61f977`; existing
  `v1.6.1 -> 4cfe378` remains unchanged.
- `c61f9776f6dd9799f6befa598bb510c35d93e103` is the implementation commit for
  `1.6.2`. The later release-metadata commit on `main` is the independently
  deployed build identity; it is distinct from the implementation tag target.
- Adoption started with user-owned `AGENTS.md` changes and untracked
  `RED-REPEAT-Development-Forensics.md`. The former is reconciled into the
  canonical repo contract; the latter is preserved as a labeled archive at
  `docs/archive/migration/RED-REPEAT-Development-Forensics-2026-08-26.md`.
- Migration adoption and the RED-Plan-37 state closeout remain no-version
  commits after `c61f977`; they do not change the `1.6.2` implementation tag.
- Release finalization changes only package/lock version metadata, the release
  ledger, build-version fallback and this Project State; no new product
  behavior is introduced, and the private Handoff archive remains ignored.

## Current product capabilities

- Catalog loading/search, resume-aware “开始学唱 / 继续学唱” and explicit
  per-song offline install/removal.
- Practice as the default Song Edition mode: Practice Unit/Occurrence
  navigation, previous/current/next controls, Segment Picker, line playback,
  rate, continuous playback, repeat/ramp behavior and persisted progress/rate.
- Full Song continuous audio with timed lyric following, seek/progress and rate.
- Explain compiled Markdown features, lyric-reference playback and soft failure
  for unavailable optional content.
- Settings/update surface with build/version identity, release history, remote
  `version.json` probe and PWA apply/dismiss flow.
- Production-public Timeline/Timing Debugger and timing repair/export with
  compatible identity-bound local timing overrides. The public entry is
  Settings → 播放切口调试 → `#timing=debug`; it is a supporting capability, not
  a fourth Song Edition mode.

## Current public content

The tracked public source contains one Song Edition:
`library/work-millennium-parade/` (`Ｗ●ＲＫ`, millennium parade × 椎名林檎),
with 61 Segments/Occurrences, 13 Practice Units, 11 Sections, one canonical
MP3, one SVG cover and two Explain Markdown features. The migration-era private
`senbonzakura` intake has been removed; if the song is needed again, it must
start a new intake from zero under the current source/content contracts.

## Technical shape and active owners

- React 19 + TypeScript + Vite 8 + `vite-plugin-pwa`; npm and Node.js 24.x.
- Source flow: tracked library package → strict Zod/cross-reference/media
  validation → hash/media compiler → ignored `public/library-runtime/` → Vite
  artifact → runtime schema/client compatibility assembly.
- `localStorage` owns Practice resume/rate and identity-bound timing overrides;
  Cache Storage/Workbox owns explicit downloads and runtime caches; no server
  persistence exists. Runtime contract version is 3.
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

## Pending USER CHECK / UNKNOWN

- None currently identified for the current baseline. Future device-specific
  regressions or PWA update-manager behavior changes reopen the matching
  acceptance boundary.

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
  `1.6.2`, `v1.6.2` points to `c61f977`, and the latest successfully deployed
  `main` build is the later release-metadata commit with live version `1.6.2`.
  The tag target and deployed build SHA are intentionally distinct identities.
- `RED-Plan-39` is complete for this boundary with target-device checks
  explicitly closed from active debt by current-use evidence; the formal
  matrix is not claimed as a full PASS. Installed clients can stably obtain
  newer deployed versions in the current baseline; the previous update
  acceptance debt is closed without claiming event-by-event Service Worker
  observation.
- `RED-Plan-42` cleanup is complete for this boundary: the legacy private
  `senbonzakura` intake and duplicate private WORK library mirror were removed;
  `library/work-millennium-parade/` and
  `.private/research/work-millennium-parade/` were preserved. Historical
  migration archives were not rewritten. Future `senbonzakura` work starts
  from zero under the current source/content contract.
- No public product behavior, canonical timing, PWA/runtime code,
  release/version metadata or tag changed in this cleanup. Version
  classification remains `no-version`.
- `RED-Plan-40` is complete: D-017 formalizes the production-public Timing
  Debugger capability, the existing Settings entry and `#timing=debug` route
  were verified, and the public-intent UNKNOWN was closed without changing
  product code or canonical timing.
- Lifecycle checkpoint conclusion: `Production`. Migration/stabilization
  closeout is complete, with no active migration cleanup; current work proceeds
  as normal Production maintenance and feature evolution. Future boundary
  regressions reopen matching validation, but do not automatically downgrade
  lifecycle.
