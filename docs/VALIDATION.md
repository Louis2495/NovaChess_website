# Validation

- TypeScript and Vite production build: passed. The offline cache contains 407 local assets.
- Full desktop/mobile Chromium suite: all 102 scenarios passed in one run. Focused follow-up checks passed for the final compact lesson layout, encyclopedia deep links, promotion/drag/flip behavior and custom-variant resume/restart behavior.
- Node rules/content/database suite: all 19 tests passed.
- New rules: ordinary positions were cross-checked against chess.js; dropped-square timing/caps/path blocking, extended pawn moves, freeze expiration, swap king safety, Random selection, castling, en passant, underpromotion and actual bot replies were checked.
- Online logic: the actual Edge Function handler and SQL migration were exercised against embedded PostgreSQL (PGlite). Authentication rejection, legal/out-of-turn moves, Throne queue transitions, atomic winner replacement, balanced Vote Chess teams, one-day deadlines, first-vote tie breaking, team actions, shared annotations, bot replies, rating idempotency, percentiles, row-level permissions and chat rate limits/deletion passed.
- Content: all 129 curated opening lines, all 84 guide branches and all 12 master-game scores replay legally. Stored master-game SAN/positions and PGNs agree; GIF exports include every frame. The 380 daily meme captions are unique. Quiz moves are legal and trivia answer sets are distinct.
- All 15 original selectable modes still accept a human move and produce a legal local reply. Existing Crazyhouse, Bughouse, King of the Hill, 3-Check and Antichess rule checks pass.
- Automated WCAG A/AA checks passed on the main views and customization dialog in desktop and iPhone-sized Chromium. Additional controls, profile, archive, history, lessons, encyclopedia, quizzes, trivia, rankings and Guess the Eval views were checked at 390px and 1440px with no violations. The final compact lesson’s scroll region is keyboard-focusable.
- Responsive checks found no horizontal overflow. Lessons fit a 1440×1000 desktop and a 390×844 full-height phone viewport; smaller phone viewports retain a readable stacked layout.
- Production `/NovaChess_website/` subpath: passed. Final offline checks passed for Stockfish analysis and the master archive; lesson and encyclopedia offline navigation also passed. Country-flag assets are bundled locally.
- Updated desktop/mobile previews were captured from the production build.

Live Supabase credentials were not supplied, so no live project, email delivery, deployed Realtime connection or public deployment is claimed. The remaining owner setup and smoke test are in [ONLINE_SETUP.md](ONLINE_SETUP.md).

Public Chess.com/Lichess access is subject to the source’s CORS/rate limits and this environment’s outbound proxy. Research parsing and frequency calculations were tested using representative API-response fixtures. Federation lookup links to official records; it does not claim to ingest verified FIDE/US Chess statistics. Arbitrary user-selected appearance colors remain under the user’s control.
