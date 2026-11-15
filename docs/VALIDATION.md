# Validation

- TypeScript and Vite production build: passed.
- Full desktop/mobile Chromium suite: all 72 scenarios passed in one run, including the simplified Home, prominent New Game action, lesson links, dedicated Stats navigation, chart calculations and mobile tabs.
- Every move in 4,000 puzzles, 111 curated lessons and 3,865 opening lines: legally replayed through chess.js without failures.
- All 15 selectable play modes: real human move and local opponent reply, with resulting moves checked against Fairy-Stockfish rules.
- Additional rules checks: Crazyhouse drops, Bughouse capture transfer and promoted-piece reversion, King of the Hill victory, third-check victory and Antichess victory.
- Production `/NovaChess_website/` subpath: passed, including Stockfish worker/WASM and browser variant worker/WASM.
- Redesigned production Home and Stats: subpath and offline reload passed.
- Production offline reload: passed. Stockfish, puzzles, facts and actual variant play worked while networking was disabled.
- Optional piano: decoded and played the 400-second recording, obeyed pause/volume, and played again from cache after an offline reload.
- Default dark views and the customization dialog: automated WCAG A/AA checks passed in desktop and iPhone-sized Chromium. Arbitrary user-selected colors remain under the user’s control.
- Desktop/mobile previews were captured from the running production build.

Live Chess.com and Lichess requests were denied by this cloud environment’s outbound proxy. Public API/CORS availability is therefore not claimed as verified here. PGN imports, normalization and opening-frequency results passed browser checks. Native Apple services are represented by the explicitly described local/file-sharing browser alternatives; no native iPhone execution or live deployment is claimed.
