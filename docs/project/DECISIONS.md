# DECISIONS

Durable decisions are recorded here when code alone cannot explain the product
boundary. Historical Plans and archived evidence do not override them.

## D-001｜Keep RED:REPEAT a focused personal Song Edition PWA

- Status: Accepted
- Source: `USER_DECISION`

RED:REPEAT centers on learning, listening, understanding and returning to songs.
It is not a general language-learning, streaming, media-management,
social/community, account/cloud-sync or multi-user platform. Static/local-first
architecture is intentional; a future server authority requires a new explicit
product goal.

## D-002｜Three Song Edition modes are the product shell

- Status: Accepted
- Source: `USER_DECISION` + `REPO_FACT`

Keep Practice (default), Full Song and Explain as separate surfaces for learning
controlled ranges, continuous listening and contextual understanding. They may
share Song Edition/audio/timing data, but each workspace retains a coherent UX
contract. This supersedes older Focus/Immersive/Shadow-like product modes.

## D-003｜Retire multi-Theme runtime and per-song visual packs

- Status: Accepted
- Source: `USER_DECISION` + historical reversal confirmed by current repo

Use one restrained product visual language. Do not restore Liner/Cinema/Nocturne,
ThemeSwitcher or `visual.json`-driven runtime themes. The system was implemented
and then deliberately removed because its contract and maintenance cost did not
support the core product. Old visual material is archive evidence only.

## D-004｜Simplify Practice training controls

- Status: Accepted
- Source: `USER_DECISION`

Keep controlled rate, normal line playback, continuous playback and ramp
behavior. Do not restore the older Target × Method, Shadow or arbitrary
repeat-count matrix as routine UI; high-frequency practice should remain
low-friction.

## D-005｜Replace the body-level Practice map with Segment Picker navigation

- Status: Accepted
- Source: `USER_DECISION` + historical reversal + current repo

Practice navigation is previous segment / current Segment Picker / next segment.
The picker is controller-adjacent and layered above content because the body map
consumed lyric space and created a fragile second scrolling model. Old map Plans
are archive-only unless new user evidence creates a new decision.

## D-006｜Protect Full Song as a player-specific visual baseline

- Status: Accepted
- Source: `USER_DECISION` + historical real-use acceptance

Full Song structure and material behavior are locally owned. Shared tokens are
allowed, but global control classes must not override its validated mobile
player geometry, primary action, reachability or translucency. Real-use evidence
outranks abstract global uniformity.

## D-007｜Do not use native View Transition as the default workspace switch

- Status: Accepted
- Source: `USER_DECISION` + target-device failure + current repo

Practice/Explain changes use deterministic state and scroll policy, not native
snapshot View Transition for correctness. It caused black/dark flashes on target
iOS/PWA behavior. Feature detection or desktop success is not enough to restore
it; new target-device evidence would be required.

## D-008｜Compiler owns generated runtime resources

- Status: Accepted
- Source: `REPO_FACT` + durable engineering rationale

Tracked `library/<song-id>/` is canonical public source. Validator/compiler
produces deterministic hash-addressed ignored `public/library-runtime/`, while
`dist/` is a build artifact. Generated files are replaceable outputs, never
hand-maintained authority.

## D-009｜Keep public source and private research as different domains

- Status: Accepted
- Source: `REPO_FACT` + historical reversal

Approved public source, including approved public audio/lyrics, may live in
tracked `library/`; `.private/` remains ignored private research, provenance and
pending intake. The earlier blanket rule that complete lyrics/audio could never
enter Git is superseded. Each intake requires an explicit domain decision.

## D-010｜Model Segment, Occurrence, Section and Practice Unit explicitly

- Status: Accepted
- Source: current source contract + durable engineering rationale

Segment is reusable lyric/content material; Occurrence is a timed performed
position; Section is musical structure; Practice Unit is a teachable grouping.
Keeping them separate avoids duplication and prevents musical structure from
being fragmented solely to fit a mobile practice page.

## D-011｜Editorial timing and playback timing are independent intervals

- Status: Accepted
- Source: `USER_DECISION` + HEAD `c61f977` source/schema change

`startMs/endMs` controls editorial/highlight timing and
`playStartMs/playEndMs` controls transport/practice timing. Each pair must be a
valid interval, but playback need not envelope editorial timing. Do not restore
fixed padding or infer timing from text, punctuation or line spans; human audio
evidence remains authoritative for perceptual boundaries.

## D-012｜Keep canonical timing and personal overrides separate

- Status: Accepted
- Source: `USER_DECISION` + current implementation

Canonical timing is compiled/distributed source. Personal corrections are sparse
local overrides bound to song/content/audio/timeline identity. Incompatible
overrides invalidate rather than mutate canonical source, keeping source changes
reviewable and preventing stale corrections from silently applying.

## D-013｜Treat PWA update as event ordering plus two identity questions

- Status: Accepted
- Source: `USER_DECISION` + incident/root-cause evidence + current repo

Update logic must model remote discovery, registration, installing/waiting worker,
activation request, controller takeover and reload with bounded behavior. A
production probe answers what was deployed; an installed-client check answers
whether an old client can discover/activate it. A single boolean is not enough,
and business data must survive updates.

## D-014｜User version is independent from Plan/commit count

- Status: Accepted
- Source: `USER_DECISION` + release docs/tooling + current workflow

Semantic user versions describe user-visible change. `src/release/releases.ts`
is the ledger, and a final release boundary requires package, ledger, build, tag
and deployed identity coherence. A successful `main` push can deploy through the
single workflow, so “batching” cannot be described as if `main` were non-
deploying. New tags should point to the user-visible implementation commit;
historical inconsistencies are recorded, not rewritten.

The former `c61f977` / `1.6.1` migration caveat was resolved by RED-Plan-38:
`1.6.2` / `v1.6.2 -> c61f977`, with deployed build identity tracked separately.

## D-015｜Use one audio lifecycle owner across song workspaces

- Status: Accepted
- Source: durable repository engineering rationale

Song workspaces share the intended audio-engine/playback ownership model. Local
UI changes should use the shared playback abstraction; competing media owners
would create rate, range, cleanup and cross-workspace race problems.

## D-016｜Real-device and human evidence are part of acceptance

- Status: Accepted
- Source: `USER_DECISION` + incident evidence + current risk model

Automated tests remain necessary but cannot prove iOS/PWA geometry, safe area,
touch, scroll, compositing/perceived translucency, installed Service Worker
lifecycle or audible timing cuts. Plans must choose a matching browser/device or
human oracle. More DOM assertions do not close a real-device or perceptual
failure. The forensic migration report's incident analysis was extracted into
these decisions and the current-state risk register before archival.

## D-017｜Make Timing Debugger a production-public supporting capability

- Status: Accepted
- Source: `USER_DECISION`

The Timeline/Timing Debugger is a formal RED:REPEAT product capability and may
be used in production. The current public product entry is the Settings
surface leading to the static-safe `#timing=debug` route; this is a supporting
capability alongside, not a fourth replacement for, the Practice, Full Song and
Explain Song Edition shell.

The capability covers timing inspection, audio audition, calibration through
identity-bound local timing overrides and export. Future routing cleanup,
production hardening or debug-code pruning must not hide or remove it merely
because its implementation is named `debugger`; that requires a new explicit
user decision. D-011 and D-016 remain in force: public access does not bypass
source validation, audio/timeline/Edition identity checks, canonical-source
review, or the required human/audio evidence.
