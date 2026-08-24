# RED:REPEAT Agent Working Rules

These repository rules optimize development speed without weakening verification that can realistically catch the changed behavior.

## Instruction priority

- Follow the user's explicit request and explicit commands in a supplied Plan first.
- Treat supplied Plans and handoffs as read-only temporary inputs unless the user explicitly asks to edit them.
- Do not expand a focused task into a repository audit, refactor, release, or cleanup campaign.

## Default workflow

1. Inspect Git status and only the named or directly related implementation/test files.
2. Classify the change before choosing verification.
3. Implement the smallest coherent patch.
4. Run the smallest test that would have failed before the fix.
5. Broaden verification only when the changed boundary justifies it or a required check fails.
6. Inspect the final diff once, then report concise evidence.

Do not repeatedly read unchanged files, rerun successful commands after unrelated edits, or perform speculative reviews.

## Risk-proportional verification

### Documentation, copy, comments, and non-functional metadata

- Use `git diff --check` and direct inspection.
- Do not run tests, typecheck, builds, browser checks, library commands, or PWA checks unless the file is executable configuration or the user explicitly requires them.

### Focused bug or localized logic change

- Add or update a regression test that genuinely reproduces the old defect.
- Run only that test file or test name during development.
- Run `npm run typecheck` once when TypeScript behavior, interfaces, state, or data flow changed.
- Lint only changed source files with `npx eslint <files>` when practical. Use full `npm run lint` only for cross-cutting work or release verification.
- Do not run the full test suite by default. CI is the broad safety net for ordinary focused patches.

### Focused styling or component markup change

- Run the directly related component tests.
- Use browser testing only when layout, responsive behavior, browser-native behavior, or a visual interaction actually changed.
- For ordinary responsive checks, inspect one narrow mobile viewport (normally `375x812`) and one desktop viewport (`1280x800`).
- Add `393x852` and `430x932` only when the task changes a breakpoint, safe-area behavior, wrapping threshold, fixed bottom layer, or explicitly requires a size matrix.
- Capture one representative screenshot per materially different layout, not one per size. Prefer computed geometry for the remaining sizes.

### Library/content/compiler changes

- Run `npm run library:validate` only when source content, schema, validator behavior, or content contracts changed.
- Run `npm run library:compile` only when compiler behavior or runtime library artifacts changed.
- Do not run either command for unrelated UI or client-only bugs.

### PWA, build, routing, deployment, or release changes

- Run build/PWA checks only when the task affects bundling, service workers, cache/update behavior, base paths, deployment, release metadata, or when preparing an explicit release.
- `npm run build` already runs library compilation and TypeScript compilation. Treat those embedded checks as satisfied unless the user explicitly requires the standalone commands.
- Run the `/red-repeat/` base build and matching `pwa:inspect` only for base-path/deployment/PWA work or an explicit release, not for routine patches.
- Run `repo:hygiene` only when ignore rules, private/generated paths, content import, packaging, or release boundaries changed.
- Run `release:verify`, tag verification, and production `release:smoke` only for an explicit versioned release.

### High-risk changes

Broader verification remains required for changes involving content contracts, compiler output, persistence migrations, audio timing/playback semantics, service-worker update races, security/privacy boundaries, CI/release automation, or multiple subsystems. Do not use efficiency rules to skip checks capable of catching data loss, offline breakage, or incompatible runtime output.

## Avoid duplicated work

- Do not run the full suite after every intermediate edit. Use targeted checks while iterating and at most one justified broad pass at the end.
- Do not run both standalone compile/typecheck commands and a build that already embeds them unless a failure needs isolation or explicit acceptance criteria list each command.
- Do not repeat browser inspection after a code change that cannot affect the inspected page.
- Do not perform both automated and manual verification for the same invariant unless browser rendering or integration behavior is the invariant.
- Do not check ignored/generated tracking on every task; reserve it for content imports, hygiene changes, packaging, and releases.
- Stop after three identical external-state failures. Report the blocker instead of performing open-ended retries, except when an explicit bounded monitor or release smoke command is already handling retries.

## Reviews and exploration

- Do not scan the whole repository for a focused task.
- Do not perform accessibility, security, performance, dependency, responsive, or architecture audits unless requested or directly implicated by the change.
- Preserve known unrelated warnings and issues; report them only if they block the task.
- Inspect adjacent code only far enough to establish the real dependency boundary.

## Git and releases

- A normal small bug fix does not require a version bump, release-note entry, tag, deployment wait, or production probe.
- Batch ordinary fixes into the next requested release instead of publishing a new version for every patch.
- Create release metadata and a release tag only when the user or active Plan explicitly requests a release.
- For a planned phase, follow its delivery section. If it is silent, use one focused commit after appropriate verification; push only when requested or when the phase explicitly requires delivery.
- Never commit `.private/`, `public/library-runtime/`, `dist/`, supplied Plan files, or unrelated user changes.

## Reporting

Keep completion reports short. Include changed behavior, focused verification and result, unresolved risk, and commit/push details only when a commit or push occurred. Do not narrate every command or repeat the Plan.
