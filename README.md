# NovaChess website

A visual, responsive prelaunch website for [NovaChess for iPhone](https://github.com/Louis2495/ChessVision). Built with React, TypeScript and Vite. All fonts and artwork are served locally; no account, backend, API keys or analytics are required.

![NovaChess desktop preview](docs/preview-desktop.jpg)

## Run

Use Node.js 22.12+ (Node 24 is verified).

```sh
npm ci
npm run dev
```

## Verify

```sh
npm run build
# Uses /usr/bin/chromium when available. Otherwise install Playwright's browser:
npx playwright install chromium
npm test
npm run preview
```

Validation in the cloud environment: production build passed; all 18 desktop/mobile browser tests passed, including axe WCAG A/AA checks of the demos and dialogs. The production output was also tested under `/NovaChess_website/`, including a solved puzzle and all local assets. This does not claim native iPhone execution or hosted deployment.

Set `CHROMIUM_PATH` to use another installed Chromium executable. Tests cover desktop and iPhone-sized Chromium, legal/illegal puzzle moves, hints, local progress, every opening walkthrough, sandbox undo/reset, palette/variant previews, dialogs, navigation, assets and overflow.

## What’s included

- Illustrated iPhone preview and feature cards using the app’s actual icon, duck and piece artwork.
- Legal-move analysis sandbox (not a browser chess engine).
- Three checkmate puzzles from the app's Lichess dataset, with hints, keyboard notation and browser-local completion.
- Three opening walkthroughs, five variant previews and five live board palettes.
- Accessible native dialogs, responsive navigation, reduced-motion support, privacy information and credits.
- Honest prelaunch calls to action. No fake App Store links, testimonials, ratings, email subscriptions or live online services.

See [the app review](docs/APP_REVIEW.md) for source references, feature coverage and limitations.

## Deploy

The production output is `dist/`. It can be hosted on any static host. Relative asset paths support a GitHub Pages repository subpath.

For GitHub Pages:

1. In the repository, choose **Settings → Pages → Source → GitHub Actions**.
2. Open **Actions → Deploy website → Run workflow**, selecting `main`.

The manual deployment workflow builds and publishes the site. The separate CI workflow builds and runs browser tests on pushes and pull requests. Pushing source alone does not enable Pages or publish the website.

When a release exists, replace the prelaunch dialog's `APP_SOURCE` destination/wording in `src/main.tsx` with the official App Store or TestFlight link. The current site intentionally describes NovaChess as in development.

## Privacy & attribution

The website saves only completed demo puzzle IDs in `localStorage` under `novachess-web-puzzles-v1`. **Reset progress** clears it. It collects no email or analytics; static hosts may retain standard request logs. Optional online behavior of the iPhone app is explained separately in the privacy dialog.

Chess pieces are Colin M. L. Burnett’s CBurnett set, used under GPL-3.0-or-later. Their complete license is in `public/licenses/`. Puzzle facts are from the Lichess CC0 dataset; original games are linked in the preview. App artwork is from NovaChess. Font licenses, data provenance and other notices are in [THIRD_PARTY.md](THIRD_PARTY.md). This website is AGPL-3.0-or-later; see [LICENSE](LICENSE).
