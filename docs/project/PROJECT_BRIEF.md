# PROJECT_BRIEF

## Product identity

RED:REPEAT is a personal Song Edition-centered learning/listening PWA. It is
for repeatedly returning to a song to learn it, listen to it in full and read
dense contextual explanations. The project owner is the primary user. Mobile
browser and installed PWA are primary; desktop browser is supported. Delivery
is a static site with no runtime backend, database, account service or server
API.

The lifecycle stage is not canonically declared. The repository has mature
capabilities and delivery machinery, but unresolved release identity,
real-device acceptance and installed-PWA upgrade evidence mean migration does
not promote it to `Production`.

## Core loop

```text
catalog → select/search a Song Edition → Practice (default)
→ choose a Practice Unit or lyric Occurrence
→ play/repeat at a controlled rate
→ persist local progress/rate → return through “继续学唱”
```

Supporting loops are Practice ↔ Full Song ↔ Explain, explicit per-song offline
download/removal, PWA update checking/application and timing calibration/export.

## Stable architecture boundary

- React + TypeScript browser SPA/PWA using native browser APIs.
- Tracked approved source lives under `library/<song-id>/`.
- Strict source schemas, cross-file validation, media hashing and the Library
  Compiler produce ignored, hash-addressed `public/library-runtime/` resources.
- Runtime content is same-origin static data validated again by runtime schemas
  and compatibility checks.
- Resume/rate/timing override state lives in browser persistence; explicit
  offline songs use Cache Storage. There is no server-side persistence.
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
- Editorial/display timing and playback timing are independent valid intervals.
  Personal timing corrections are identity-bound local overrides and invalidate
  when their Edition/audio/timeline identity is incompatible.
- PWA updates preserve Practice resume, timing overrides and downloaded-song
  state unless an explicitly safe migration says otherwise. Deployed identity
  and installed-client activation are separate questions.
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
