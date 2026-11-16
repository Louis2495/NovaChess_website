# NovaChess web workspace

A dark, customizable chess workspace following the iPhone app’s **Home, Analysis, Play, Puzzles and Learn** structure, with a dedicated **Stats** page. Clock and camera features are intentionally omitted.

![Desktop workspace](docs/preview-home-desktop.jpg)

## Use

Node.js 22.12+; Node 24 is verified.

```sh
npm ci
npm run dev
```

`postinstall` prepares the local Stockfish worker and WASM from the locked npm package. No credentials, account or backend are required.

```sh
npm run build
npm run preview
# Uses /usr/bin/chromium when present; otherwise install Playwright Chromium:
npx playwright install chromium
npm test
```

Set `CHROMIUM_PATH` to use another Chromium binary. The build creates static files in `dist/`, including an offline service worker. Core tools and bundled data are cached after the first successful online load. Piano loads only when enabled and is then cached; public game imports need internet access.

## Features

- **Home:** one large New Game action, a fully clickable daily puzzle, opening suggestions and recent games. A daily meme rotates through [public/memes](public/memes/README.md), where images and captions can be reviewed manually.
- **Boards:** forgiving piece-centered dragging, positive material surplus on the leading side (hidden when balanced), cursor-positioned promotion, configurable right-click marks/arrows, and keyboard controls (`f` flips; `z` enters board-only focus mode). Consecutive premoves preview future piece positions and are checked for legality before execution. Right-click cancels queued moves; Up/Down jump to the first/last position.
- **Play:** all 15 original app modes plus Dropping Squares, Chaos chess and Random. Distinct cartoon illustrations identify each variant, with Standard first and a prominent Start game button. Games include persistent state, legal moves, local opponents and a large result banner.
- **Puzzles:** 4,000 adaptive positions and Guess the Eval, a five-round game scored against an actual local Stockfish search.
- **Learn:** 129 opening lessons, 32 family guides and 84 playable branches; plans, pawn structures, mistakes, review questions and unassisted recall. The catalog collapses into a compact lesson desk beside the board. Another 32 middlegame workbooks add 176 position-specific annotations and 32 decision exercises. Opening traps has 20 playable trap/refutation pairs and defense exercises.
- **Knowledge:** 75 selected facts, an era-based historical explorer, championship timelines with dated ratings, 3,330 searchable encyclopedia entries, 125 trivia questions, and chess-choice personality quizzes.
- **Famous games:** 12 complete annotated master games, key-moment jumps, move-by-move replay, adjustable autoplay, analysis links, saving and full-game GIF export. Saved games also export GIFs.
- **Analysis / Research:** live Stockfish depth/evaluation, a separate positional-insights section, branches, studies, position editor, PGN/image/GIF exports inside Share, a dedicated public-game research tab with frequency-weighted arrows. Loading continues when you switch sections; progress and results remain intact.
- **Profile / Controls:** username, bio, default pawn or uploaded avatar, country, personal settings, configurable shortcuts and annotation colors. Auto-queen defaults off; premoves default on. Profile opens from the bottom account button; Controls and Customize are inside it.
- **Appearance:** nine themes, 12 palettes, six piece sets, custom colors/background images, bundled country flags, typography, layout, audio and personal presets. Defaults use a dark blue-gray background, dark panels and mint accents.
- **Stats:** results, activity, training, 18 harder achievements, a country map and improvement patterns. Endgame Lessons use the same name throughout the site.
- **Online, when connected:** Supabase accounts, persistent Throne queues, one-day Vote Chess, team rooms versus friends/bots, shared annotations, global chat, and real global/country rankings and percentiles.

Manual file/PGN/settings import controls have been removed as requested. Existing saved data remains readable. Public-game Research loads a named player’s available games through the source API.

## Online setup and browser differences

The local tools work without an account. Online multiplayer, chat and rankings need a Supabase project; the app shows a disconnected state until configured. Follow [the budget-conscious setup guide](docs/ONLINE_SETUP.md), then set the two public Vite variables in `.env.local` or GitHub Actions. A service-role key must never be exposed to the browser.

Federation lookup opens the official FIDE/US Chess record by member ID; official rating/stat ingestion is not claimed. Public-game research depends on the source’s availability and CORS policy. Clock and camera features remain excluded.

## Deploy

Host `dist/` on a static host. The Vite base path is `/NovaChess_website/` for GitHub Pages; hash routes keep navigation within that path. Change the base if hosting at another path. Workers/WASM are included locally and need no cross-origin-isolation headers.

For GitHub Pages, select **Settings → Pages → Source → GitHub Actions**, then run **Actions → Deploy website → Run workflow** on `main`. The CI workflow builds and runs browser tests on pushes and pull requests. Source pushes alone do not publish the website.

## Privacy and licenses

There are no analytics, ads or advertising cookies. Local games, profiles, backgrounds, presets and progress use browser storage. With Supabase connected, accounts, public profiles, multiplayer games, votes, chat and rankings use that project’s database. Service-worker caches hold static application assets. Static hosts and Supabase may retain request logs.

[THIRD_PARTY.md](THIRD_PARTY.md) records artwork, data, fonts, engine source references and music attribution. The source is AGPL-3.0-or-later; see [LICENSE](LICENSE). Piano has its separate CC BY-SA 4.0 license. Full third-party license texts are under `public/licenses/`.
