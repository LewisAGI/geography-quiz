# Meridian

A static geography quiz. Questions come from Shisui's geography pack in `data/`, unpacked byte for byte from `pack/pack-geography-quiz-v1.tgz`. The app filters that data in code. Disputed capitals (Israel, Palestine, Western Sahara) are skipped. Nothing in `data/` should be edited.

The interface is a daily typed quiz, plus practice, flags, choices, a timed blitz, spaced review, pass-and-play, and a map-click mode on the OpenFreeMap Liberty basemap (no API key). Place names are stripped from that basemap so the map does not give away the answer. Progress, streaks, and mistakes stay in `localStorage` on this device.

The app is marked beta.

## Develop

```bash
npm install
npm run dev
```

`npm test` runs Vitest. `npm run e2e` builds the site and runs Playwright on desktop Chrome, iPhone, iPhone landscape, and desktop WebKit.

## Deploy

`npm run build` writes a Cloudflare Pages static site to `dist/`, including `_headers` (Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`). Publish that directory. There is no deploy workflow.

The factbook cache inside the pack contains a nested `.git` directory, which git cannot store. `scripts/ensure-data.mjs` restores any missing pack files from the tarball before tests and builds.
