# iPhone app → web workspace

Source examined: `Louis2495/ChessVision`, commit `46004d96707c9957c0a126296efd0a6dc033e18d`, app version 0.30.0. Current Swift views, core models, data, appearance options, engine configuration, privacy and service documentation were reviewed. Historical README descriptions were checked against current source.

## Structure and useful equivalents

| App area                    | Web implementation                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home                        | Daily puzzle, resume computer game, real local counts, recent games and tool shortcuts.                                                                                                                                                    |
| Analysis                    | Playable board, local Stockfish 19 Lite, configurable candidate lines/search time, evaluation, material/check insights, navigation, FEN/PGN, position editor, variations, saved studies and sharing.                                       |
| Computer play               | Current/local strength, adaptive strength adjustments, custom strength target, the 17-line Developer book and requested openings. Local strength estimates are not official competitive ratings.                                           |
| Standard / blindfold        | Stockfish replies. Blindfold keeps pieces/hints concealed; text-only play accepts SAN/UCI and coordinate premoves.                                                                                                                         |
| Variants                    | Crazyhouse, Duck, Atomic, Fog of War, 3-Check, King of the Hill, Horde, Antichess, Pawn Wars, pawn race, Chess960 and Bughouse. Fairy-Stockfish WASM owns legality and victory rules. Variant opponents use a separate lightweight search. |
| Bughouse                    | Two boards, three local opponents, capture/pocket transfers, drops and saved positions. No clocks are included.                                                                                                                            |
| Puzzles                     | All 4,000 bundled puzzles, source difficulty, adaptive/unseen selection, multi-ply replies, hints, alternate mates, grading, streak and first-result daily records.                                                                        |
| Repertoire                  | Board/PGN editing, named White/Black lines, position-based saved branches/transpositions, automatic replies, hints, results and spaced-review due dates.                                                                                   |
| Opening lessons             | All 111 curated lessons, including the three authored additions. Walkthrough/practice, completion and saving to repertoire. All 3,865 source opening lines are searchable.                                                                 |
| Research                    | Public Chess.com archive import / Lichess NDJSON import with cancellation and error handling; independent PGN import; move frequencies, game counts and results for the first 40 half-moves.                                               |
| Endgames                    | All 17 source exercises, actual legal play, Stockfish replies, manual hints, technique tips, mate/promotion/draw goals and persistent completion.                                                                                          |
| Facts and history           | All 56 fact cards with categories/search/source links, movement diagrams, 22 milestones, main/split championship lineages and dated event ratings through 2024.                                                                            |
| Saved games                 | Folders, PGN imports, replay, exports, branches, title editing and standard engine reviews with pause/resume. Review also identifies deviations from saved repertoire. Variant reviews are explicitly material heuristics.                 |
| Statistics                  | Local results/colors/variants, training, repertoire review counts and improvement concepts from actual reviewed games. No fabricated sample stats.                                                                                         |
| Achievements                | The app’s 14 underlying game/win/promotion/mate/variant goals, with concise descriptive names and real progress.                                                                                                                           |
| World map                   | Source country geometry, opponent-selected countries from shared games, pinch/drag/zoom/reset. No countries invented for bots.                                                                                                             |
| Profiles / friends          | Local display name, downsampled avatar and optional country; local contacts, notes and profile import/export.                                                                                                                              |
| Correspondence / spectating | Browser alternatives: pass-and-play, game/PGN files, playable snapshot links and read-only shared replays. No live network broadcast or Game Center/CloudKit integration is claimed.                                                       |
| Appearance                  | Nine source themes, all 12 board palettes, six original piece sets, 12 background styles, uploaded backgrounds, individual colors, typography, layout, opacity/blur/dimming, display preferences, presets and import/export.               |
| Audio / moves               | Source piano compressed for delivery, opt-in playback/volume; move sounds; premoves; auto-queen; confirmation of resignation.                                                                                                              |
| Offline / persistence       | Local games, repertoire, progress and settings; production service worker caches the core app and data. Backups are explicit exports.                                                                                                      |
| Clock / camera              | Omitted by request, including photo recognition, board capture, live-camera recording and photo library. Custom background/avatar uploads are retained.                                                                                    |

## Material differences

- Browser Stockfish is version 19 Lite/single-threaded; it does not use the native app’s 98.5 MB default NNUE network.
- Variant move legality is genuine Fairy-Stockfish WASM. Variant search/review is lighter and is labeled accordingly; no full native-engine parity or calibrated Elo is implied.
- Source CloudKit profiles, friend routing, automatic public-board publication and Game Center transport require native Apple services. The browser counterparts use local records and portable snapshots/files. They provide no real-time synchronization, identity verification or public directory.
- Insights focus on material, check/mate, available legal moves and the live engine line; they do not reproduce every native tactical-insight classifier.
- Web game review exposes engine loss/alternatives and repertoire recall without inventing native human-performance rating estimates.
- Public endpoint access is not established by PGN-fixture tests. The cloud’s proxy denied live Chess.com/Lichess requests; PGN research remains available.
- Native iPhone execution/layout was not tested on Linux. All web validation uses real Chromium.

## Validation

The test suite covers desktop and iPhone-sized Chromium, all 15 selectable modes (including pawn-race as a separate option), real local opponent replies, drops, Bughouse transfers, variant victory conditions, stockfish output, editing/underpromotion, sharing/export, puzzle grading, daily replay, repertoire/lesson/endgame completion, research imports, profiles, presets/reload, uploaded backgrounds, navigation and automated accessibility checks.

Every move in all 4,000 puzzles, 111 curated lessons and 3,865 opening lines was independently replayed legally through chess.js. Production output is additionally checked under the repository subpath, with an offline reload, local Stockfish, puzzles, facts and an actual variant opponent reply.
