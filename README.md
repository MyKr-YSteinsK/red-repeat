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
npm run build
```

`npm run library:validate` checks the optional production `library/` source packages;
an absent or empty Library is valid at this stage.

For deterministic CI installs, use `npm ci`.

Production hosting is not configured yet.
