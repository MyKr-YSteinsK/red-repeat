# PROJECT_BRIEF

## Product identity

RED:REPEAT is a personal Song Edition-centered learning/listening PWA. It is
for repeatedly returning to a song to learn it, listen to it in full and read
dense contextual explanations. The project owner is the primary user. Mobile
browser and installed PWA are primary; desktop browser is supported. Delivery
is a static site with no runtime backend, database, account service or server
API.

Lifecycle stage: `Production`.

The repository has mature core capabilities and stable delivery machinery.
Release identity is reconciled. Historical timing acceptance is complete only
for the scopes recorded in `CURRENT_STATE.md`; this does not mean every Song
Edition has human-calibrated timing. Later-added editions may use D-020
`Provisional Timing`, a usable but explicitly uncalibrated state. When D-020's
audio-identity, gross-structure and obvious-leakage checks pass, Provisional
Timing alone does not block first Production use. Source validation, automated
timing checks and the D-021 field migration do not constitute a new human
audible `PASS`. The Timing Debugger is production-public. Current-use device and
installed-client update evidence has closed the previous active acceptance debt
for this baseline; this does not claim exhaustive device-matrix coverage. No
current `USER CHECK` / `UNKNOWN` blocks the baseline. `Production` means the
established product boundary can be used, deployed and maintained while future
behavior changes still require matching regression, device, human or production
evidence.

## Core loop

```text
catalog → select/search a Song Edition → Practice (default)
→ choose a Practice Unit or lyric Occurrence
→ play/repeat at a controlled rate
→ save Practice position/progress and rate locally
→ restore compatible Practice state on later use
```

Supporting capabilities include Practice, Full Song and Explain mode navigation,
explicit per-song local-first offline snapshot download/removal, background PWA
update preparation with natural next-launch adoption, and timing
calibration/export.

## Stable architecture boundary

- React + TypeScript browser SPA/PWA using native browser APIs.
- Tracked approved source lives under `library/<song-id>/`.
- Strict source schemas, cross-file validation, media hashing and the Library
  Compiler produce ignored, hash-addressed `public/library-runtime/` resources.
- Runtime content is same-origin static data validated again by runtime schemas
  and compatibility checks.
- Resume/rate/timing override state lives in browser persistence; explicit
  offline songs use identity-coherent Cache Storage snapshots, and a valid
  cached Catalog renders before background freshness work. There is no
  server-side persistence.
- GitHub Actions and GitHub Pages under `/red-repeat/` are the current delivery
  systems. The single workflow has a quality job and a dependent Pages deploy.

Detailed source, runtime, PWA and release contracts are linked from
[SUPPORTING_DOCS_MANIFEST.md](SUPPORTING_DOCS_MANIFEST.md), not copied here.

## Product invariants

- `library/` is canonical public source. Generated runtime and `dist/` are
  derived and never hand-edited as authority; `.private/` remains private.
- Segment (reusable lyric/content unit), Occurrence (timed performance),
  Section (musical structure) and Practice Unit (teachable grouping) remain
  distinct.
- Each Occurrence has one authoritative `startMs/endMs` interval used by both
  display/resolution and playback. Personal timing corrections are sparse,
  same-field identity-bound local overrides and invalidate when their
  Edition/audio/timeline identity is incompatible.
- PWA updates preserve Practice resume, timing overrides and downloaded-song
  state unless an explicitly safe migration says otherwise. The current document
  stays pinned to its startup build; a prepared waiting worker is adopted after
  old clients naturally finish, so deployed identity and installed-client
  activation remain separate questions.
- A downloaded Song Edition is one manifest-bound complete snapshot. Foreground
  reads are local-first; an H2 refresh may replace H1 only after complete
  validation and an atomic manifest switch, so partial remote content cannot
  create a mixed or unusable local Edition.
- Audio timing, browser-native behavior and perceived mobile/PWA correctness
  use matching human/device oracles; jsdom and static artifact checks cannot
  substitute for them.

## Canonical UX baseline

- Primary Song Edition modes are Practice (default), Full Song and Explain.
- Practice uses previous/current Segment Picker/next navigation. The picker is a
  controller-adjacent layer with its own scroll and does not push or drag body
  content.
- Full Song keeps a locally owned player-specific mobile baseline. Shared tokens
  may be reused, but generic control surfaces must not overwrite its structure,
  reachability or material behavior.
- Routine navigation should not produce black/white flashes, long visible
  programmatic scrolls, random landing positions or obsolete fixed reserve
  whitespace. Perceived translucency is judged on the target device.

## Stable non-goals

Unless a new explicit product decision changes the project, RED:REPEAT is not a
general language-learning platform, streaming service, media manager,
social/community product, account/cloud-sync system, multi-user collaboration
tool or complex backend. It does not restore the multi-Theme runtime, per-song
`visual.json` packs, body-level Practice map, complex Target × Method/Shadow/
arbitrary-repeat matrix, waveform requirement or native View Transition as a
default correctness mechanism.

## Optional modules and public capability boundary

The product includes per-song offline download/removal, Settings/release/update
surfaces, timing repair/export and Explain Markdown references. The
Timeline/Timing Debugger is an intentional production-public supporting
capability, reachable from Settings and the static-safe `#timing=debug` route.
It supports timing inspection, audio audition, identity-bound local overrides
and export without silently mutating canonical source. It remains a supporting
capability rather than a fourth Song Edition mode; Practice, Full Song and
Explain remain the primary Song Edition shell.
