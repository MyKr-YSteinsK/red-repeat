# RED:REPEAT

A focused archive for returning to songs.

Project context and canonical ownership: [docs/project/README.md](docs/project/README.md).

## Local development

Requires Git, Node.js 24 LTS and npm. The repository has no runtime backend,
database or required checked-out environment file.

```bash
npm ci
npm run dev
```

## Verification

Choose checks for the boundary you changed. For example:

```bash
npm run lint
npm test
npm run build
```

For source/content changes, run `npm run library:validate` and
`npm run library:compile` as needed. `npm run build` already runs library
compilation and TypeScript compilation; `npm run pwa:inspect` checks an existing
static artifact. Release, deployment and real-device checks belong to their
matching boundaries rather than every local change.

`library/` is the production Song Edition source root. Every public song package
under this directory is validated and compiled into the ignored
`public/library-runtime/` deployable resources; production builds run the
compiler automatically.

The CLI flag and `RED_REPEAT_LIBRARY_ROOT` environment variable remain available
for local or advanced workflows. The CLI flag takes precedence over the
environment variable, and both take precedence over the default `library/` root:

```bash
npm run library:validate -- --source-root ./another-library
npm run library:compile -- --source-root ./another-library

RED_REPEAT_LIBRARY_ROOT=./another-library npm run library:validate
RED_REPEAT_LIBRARY_ROOT=./another-library npm run library:compile
```

PowerShell:

```powershell
$env:RED_REPEAT_LIBRARY_ROOT = ".\another-library"
npm run library:validate
npm run library:compile
Remove-Item Env:RED_REPEAT_LIBRARY_ROOT
```

To add a song, place its validated source package under `library/<song-id>/`,
run the verification commands above, then commit the source package. Do not
commit generated `public/library-runtime/` or `dist/` output.

For deterministic CI installs, use `npm ci`.

## Fresh machine and computer switching

The clone is the source of truth for the project. A new computer can restore
the development environment with:

```bash
git clone https://github.com/MyKr-YSteinsK/red-repeat.git
cd red-repeat
npm ci
npm run library:validate
npm test
npm run build -- --base=/red-repeat/
```

The tracked recovery boundary is:

- `library/`, `src/`, tracked static assets under `public/`, docs, scripts,
  `.github/`, `package.json` and `package-lock.json` are committed
  source/configuration.
- `node_modules/`, `public/library-runtime/`, `dist/` and `.cache/` are
  ignored and reproducible. Regenerate them with `npm ci` and the relevant
  validation/build commands; do not copy or commit them.
- `.private/` contains private research/provenance and pending intake. It is
  deliberately not part of a public clone. External Plan/Handoff files and
  local untracked archives (for example `docs/archive/retrospectives/`) are
  also not synchronized by Git; preserve them through a separate private
  backup or attach the required task input again, and never commit sensitive
  or rights-unclear material.
- There is no server-side database or account data. Practice resume/rate,
  timing overrides and downloaded Song Edition snapshots live in browser
  `localStorage`/`Cache Storage`; they do not migrate through Git. On a new
  computer, reinstall the PWA if desired, re-download offline songs and
  re-establish any personal local calibration/state.

Before leaving a computer, finish or explicitly preserve owned work, review
the paths, then commit and push the intended source changes:

```bash
git status --short
git add <intended-files>
git commit -m "<focused message>"
git push
git status --short --branch
```

On the next computer, use one writer at a time and fast-forward the checkout
before continuing:

```bash
git fetch origin
git switch main
git pull --ff-only
npm ci  # run when package.json or package-lock.json changed, or dependencies are absent
```

For the next development boundary such as `RED-Plan-65`, first synchronize
`main`, run the setup/verification above, and then provide the Plan or
Structured Song Handoff input package separately. Plan attachments and browser
state are not supplied by a Git clone, even when the Codex conversation is
available on the new computer. Codex should preflight `AGENTS.md`,
`docs/project/README.md`, `docs/project/PROJECT_BRIEF.md`,
`docs/project/DECISIONS.md` and `docs/project/CURRENT_STATE.md` against the
actual checkout before changing anything.

Production hosting uses GitHub Pages:

https://mykr-ysteinsk.github.io/red-repeat/

After the repository's Pages publishing source is set to `GitHub Actions`, a
push to `main` runs the single `CI` workflow. Its `quality` job validates and
builds the repository; a successful push to `main` then enables the dependent
`deploy` job, which checks out the exact tested commit, builds with the
`/red-repeat/` base path, verifies the PWA artifact, and publishes `dist/`.

The deploy workflow checks out the exact commit tested by CI, so the published
site and the successful quality gate refer to the same source revision.

Production builds are provider-agnostic and support both the site root and a
static subpath:

```bash
npm run build
npm run pwa:inspect

npm run build -- --base=/red-repeat/
npm run pwa:inspect -- /red-repeat/
```

The PWA precaches the App Shell, serves a valid local Catalog first while
refreshing freshness in the background, and caches hash-named Song Edition
resources Cache First.
After a controlled Service Worker is available, catalog-driven warmup fetches
current editions and complete audio in the background; cache failures never
block online playback. A later audio range request can be served from the
cached complete response.

PWA updates are also prepared in the background. The current document remains
pinned to its startup build without an updater-driven reload or `SKIP_WAITING`
takeover; a waiting worker is adopted naturally after old clients close, and
the next launch uses the prepared build. Practice state, timing overrides and
downloaded Song Edition snapshots remain in their existing browser storage.

Runtime content remains generated by the Library Compiler; no hosting provider
or backend is required at runtime. The GitHub Pages deploy workflow publishes
the generated runtime after the quality workflow passes. The catalog's
song-level download action stores that song's runtime resources in browser
Cache Storage for later offline use; it does not install a system-level copy.
