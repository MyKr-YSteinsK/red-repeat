# RED:REPEAT Repository Contract

This file owns RED:REPEAT-specific boundaries and durable constraints. Generic
Codex workflow, risk triage and verification habits are provided by the active
runtime Skills and should not be duplicated here.

## Authority and scope

- Follow the user's explicit request and the current active Plan. A supplied
  Plan, Handoff or ZIP is task input, not repository source, unless it is
  deliberately adopted.
- Treat the current repository, executable configuration and Git state as the
  implementation facts. `docs/project/` records durable product intent and
  state; historical material under `docs/archive/` is evidence, not authority.
- Keep migration/documentation work separate from product behavior. Do not use
  a documentation task to change product code, content, schema, PWA lifecycle,
  release behavior or deployment topology.

## Private, public and generated boundaries

- `.private/` is ignored private research, provenance and pending intake. Keep
  it out of normal prompts, packages and commits. Do not reclassify private or
  public content without explicit evidence and authorization.
- Approved public Song Edition source under tracked `library/<song-id>/` is the
  canonical content source; do not revive the obsolete blanket rule that all
  audio or complete lyrics must remain private.
- `public/library-runtime/`, `dist/`, `.cache/` and tool outputs are generated
  and reproducible. They are not source authority and must not be hand-edited
  or committed.

## Canonical owners

- `docs/歌曲内容生成规范.md` owns detailed source/content/timing authoring
  guidance; `src/library/schema.ts`, validator and compiler own the executable
  source contract and generated runtime behavior.
- `src/library/runtime-schema.ts` and `src/runtime/*` own the runtime contract,
  URL/fetch and compatibility behavior.
- `docs/版本发布规范.md` owns release-reference prose; `src/release/*` and
  release verification scripts own the executable ledger and identity checks;
  `.github/workflows/ci.yml` owns delivery ordering.
- Current UI behavior belongs to `src/App.tsx`, `src/edition/*`, `src/App.css`,
  `src/index.css` and their tests. Do not create a visual specification by
  reviving retired Theme or `visual.json` material.

## Product and data invariants

- The product shell is Practice (default), Full Song and Explain. The old
  multi-Theme runtime, body-level Practice map and native View Transition
  workspace mechanism are retired; old Plans cannot reintroduce them.
- Segment, Occurrence, Section and Practice Unit are distinct concepts.
  Editorial `startMs/endMs` and playback `playStartMs/playEndMs` are
  independently valid timing intervals; playback is not required to envelope
  editorial timing.
- Personal timing overrides are sparse local state bound to compatible song,
  content, audio and timeline identity. They do not mutate canonical source.
- Timing Debugger is an intentional production-public supporting capability;
  do not hide or remove it as generic debug cleanup without a new explicit
  user decision. New song intake may use `Provisional Timing` under D-020, but
  a `Timing Correction Export` may enter canonical source only after song,
  Edition, audio and Timeline identity validation.
- `Provisional Timing` is a usable first-import state, not an audible human
  `PASS`; future user calibration remains identity-bound and must not silently
  mutate canonical source through local overrides.
- Song workspaces use one coherent audio lifecycle owner. PWA update logic must
  preserve local business data and distinguish deployed build identity from an
  installed client's asynchronous worker activation state.
- Full Song's player-specific mobile baseline is protected from broad shared
  control styling. iOS/PWA geometry, scrolling, compositing, touch and audible
  timing require matching browser/device or human evidence when relevant.

## Boundary-specific verification

- Select checks for the changed boundary. `npm run build` already runs
  `library:compile`, `tsc -b` and the Vite build, so duplicate standalone checks
  are not ritual requirements.
- Source/content/schema/compiler changes use the matching library validation,
  audio-identity, compile and build oracles. PWA/build changes use artifact
  inspection; release/deployment changes use the matching identity checks.
- `npm run pwa:inspect` proves a static artifact, not installed-client worker
  activation. `npm run release:smoke` is an external live-deployment oracle and
  belongs at an authorized deployment/release boundary.
- Real-device and human checks remain explicit USER CHECK items when automation
  cannot prove browser-native, perceptual or installed-PWA behavior.

## USER CHECK classification

- A `BLOCKING USER CHECK` remains required when the current Plan explicitly
  requires a human gate, the work is high-risk or destructive for data,
  persistence, identity or release state, audio identity is uncertain,
  `Calibrated Timing` or final audible timing is being claimed without credible
  audio evidence, the PWA update-manager or installed-client lifecycle itself
  changed with explicit lifecycle acceptance, or the issue cannot be safely
  discovered and corrected after deployment.
- A `POST-DEPLOY OBSERVATION` covers ordinary mobile visual behavior, ruby
  geometry or wrapping, general touch feel, low-risk content display, Practice
  grouping comfort and other low-cost follow-up observations. It is recorded
  honestly and does not itself block completion or normal delivery.
- Under D-020, `Provisional Timing` is not itself a blocking human gate when
  canonical audio identity, gross structure and obvious leakage checks pass;
  its state must remain explicitly uncalibrated.
- This classification changes the default delivery gate, not the evidence
  boundary: D-016 remains in force. Automated or static evidence must not be
  described as proof of real-device geometry, compositing, touch, audible
  timing, perception or installed-client lifecycle behavior.

## Version and delivery model

- Semantic user versions describe user-visible change, independently of Plan,
  Phase, commit and push counts. Documentation/tests/internal maintenance are
  normally `no-version`.
- The single CI workflow can deploy every successful push to `main`: its
  dependent Pages job checks out the exact tested SHA, builds `/red-repeat/` and
  verifies the deployed identity.
- At an authorized release boundary, package version, release ledger, build
  identity, tag and deployed identity must converge. New tags should point to
  the actual user-visible implementation commit. Historical tag inconsistencies
  are recorded, not rewritten.
- Release identity facts come from the executable release owners and
  `docs/project/CURRENT_STATE.md`; do not hardcode transient current versions
  or SHAs in this contract. A release tag identifies the implementation commit,
  while the deployed build SHA may be a later tested `main` metadata/source
  commit; these are distinct but must remain coherent.
- When a formal Plan's in-scope implementation is complete, matching
  automated/local verification passes, no Stop Condition or high-risk
  destructive/data/identity/release conflict applies, the Plan does not say
  `no push`, and no explicit `BLOCKING USER CHECK` remains, Codex must mark it
  COMPLETE, commit the authorized changes and normally push the current branch
  to its tracking remote without waiting for a separate push confirmation.
- This default auto-push rule is not blanket authorization for release/tag or
  other external operations. Do not auto-push when the Plan says `no push`, the
  Plan is PARTIAL or an explicit `BLOCKING USER CHECK` is incomplete, the
  worktree contains unowned or unclear changes, the remote diverged, branch
  ownership is unclear, a force operation would be needed, a tag conflicts, a
  new release/version/tag decision is not authorized, private/public rights or
  secrets are unclear, or required verification fails. An ordinary
  `POST-DEPLOY OBSERVATION` does not itself prevent COMPLETE or auto-push.
- A successful push to `main` enters the current CI quality and dependent Pages
  deployment boundary; `TASK_RESULT` must report resulting HEAD, worktree,
  branch/remote sync and push result when this occurs.
- Never force-push and never force-update release tags.

## Delivery and reporting conventions

- Delivery reports default to Chinese prose, including `TASK_RESULT`, Plan/Task
  summaries, changes, verification, risks, deviations, residual risks,
  recommendations and USER CHECK notes. Keep paths, branches, tags, SHAs,
  versions, commands, identifiers, APIs, URLs/routes, schema fields, test
  names, status enums, formal third-party names, original error messages and
  exact quotations in their precise original form.
  Formal report H1 and primary H2 headings default to
  `中文｜English`; new Plan filenames and numbering stay unchanged, while Plan
  H1 titles default to `# RED-Plan-<n> — 中文标题｜English Title`. Explicit user,
  Plan or quotation-format requirements take precedence.

## Stop conditions

Stop and record the blocker rather than guessing when migration edits overlap
user-owned work with unclear ownership, private/public status or rights are
unclear, audio identity contradicts timing assumptions, a requested tag already
points elsewhere, or satisfying documentation would require destructive cleanup.
Also stop if an adoption task would require executable product/config/schema/PWA
or release behavior changes; split that work into a separately authorized task.
