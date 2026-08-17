# RED:REPEAT

A focused archive for returning to songs.

## Local development

Requires Node.js 24 LTS and npm.

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run library:validate
npm run library:compile
npm run build
```

`npm run library:validate` checks the optional production `library/` source packages;
an absent or empty Library is valid at this stage. `npm run library:compile`
generates the ignored `public/library-runtime/` deployable resources; production
builds run it automatically.

For deterministic CI installs, use `npm ci`.

Production hosting is not configured yet.
