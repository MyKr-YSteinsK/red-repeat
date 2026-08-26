# CURRENT_STATE

This is the adoption-time repository state. Current repo evidence supersedes
the external migration snapshot; archived Plans and forensics are historical
evidence only.

## Repository identity and worktree

- Repository/package: `red-repeat`
- Root: `D:\CS\red-repeat`
- Remote: `origin = https://github.com/MyKr-YSteinsK/red-repeat.git`
- Branch: `main`, tracking `origin/main`
- Current user version: `1.6.2`
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
- Timing repair/export with compatible local timing overrides; Timeline Debugger
  remains authoring/calibration tooling.

## Current public content

The tracked public source contains one Song Edition:
`library/work-millennium-parade/` (`Ｗ●ＲＫ`, millennium parade × 椎名林檎),
with 61 Segments/Occurrences, 13 Practice Units, 11 Sections, one canonical
MP3, one SVG cover and two Explain Markdown features. The incomplete
`.private/library-pending/senbonzakura/` intake remains private and excluded
from compiler input.

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

1. No maintained browser/E2E or real-device acceptance harness proves current
   iOS/PWA geometry, safe area, touch, scroll, perceived translucency or
   old-installed-client upgrade behavior.
2. `src/App.css`, Practice/Full Song workspaces and `src/pwa/update-manager.ts`
   are high-churn coupling surfaces. Refactoring them is separate work, not
   migration cleanup.
3. CI repeats some compile/typecheck work; optimization is deferred to a normal
   task.
4. `#timing=debug` remains production-routable in code; its long-term public
   exposure is a product decision still pending.

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

## Pending USER CHECK / UNKNOWN

- Decide whether `#timing=debug` remains publicly reachable.
- Decide whether `senbonzakura` continues, is re-intaken or is archived after
  source-rights/context review. Keep its private files untouched.
- Decide retention of the duplicate private `work-millennium-parade` mirror
  only after provenance comparison; migration authorizes no deletion.
- Complete later target-device Practice/Full Song/PWA acceptance, including old
  installed-client → current-build update behavior.
- Plan 31 is absent from retained historical Plans; this is a historical
  unknown, not active authority and not an adoption blocker.

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
- Next action: select the next unresolved Project State boundary; no timing
  correction task is implied.
