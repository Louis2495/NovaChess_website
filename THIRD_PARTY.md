# Third-party notices

## NovaChess assets and content

App artwork and authored content originate in `Louis2495/ChessVision`, commit `46004d96707c9957c0a126296efd0a6dc033e18d` (AGPL-3.0-or-later).

- App icon: `NovaChess/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png`.
- Duck: `NovaChess/Resources/Assets.xcassets/CartoonDuck.imageset/CartoonDuck.png`.
- Puzzles, openings, learning content and countries: `NovaChess/Core/Resources/`.
- Curated lesson selection/additions: `Core/TrainingFeatures.swift`.
- Seventeen endgame exercises: `Core/EndgameTraining.swift`.
- Seventeen Developer-book lines: `Core/DeveloperOpeningBook.swift`.

Artwork is resized/compressed for the web; designs are unchanged. Puzzle facts and the Lichess opening catalog are CC0. Original data/history/piece/music provenance is retained under `public/licenses/`. Country geometry is the app’s bundled geographic data. Fact, history and rating reference links remain accessible in the interface.

## Chess pieces

Original SVGs are copied without shape/color changes from the app’s pinned `Vendor/CBurnett` and `Vendor/PieceStyles` assets, sourced from [lichess-org/lila](https://github.com/lichess-org/lila), commit `a1590345c9c3a31b6f9c6705eefeeb7dab32a78e`.

| Set                                 | Creator                     | License                                       |
| ----------------------------------- | --------------------------- | --------------------------------------------- |
| Illustrated / CBurnett              | Colin M. L. Burnett         | GPL-2.0-or-later, used under GPL-3.0-or-later |
| Merida                              | Armando Hernandez Marroquin | GPL-2.0-or-later, used under GPL-3.0-or-later |
| Spatial / Sculpted, Fantasy, Celtic | Maurizio Monge              | MIT                                           |
| Chessnut                            | Alexis Luengas              | Apache-2.0                                    |

Complete texts and original source hashes are in `public/licenses/`.

## Browser engines

**Stockfish 19 Lite**, npm `stockfish@19.0.1`, by the Stockfish contributors, Nathan Rugg and Chess.com: GPL-3.0. `postinstall` copies the single-threaded lite JS/WASM unchanged. Source, networks, build scripts and instructions: [stockfish.js release v19.0.1](https://github.com/nmrugg/stockfish.js/tree/v19.0.1); release tag commit `8d9ca57043594a8fa6ae0b73fb685d9105bf51df`. The smaller lite network differs from the native app’s full network. Complete license: `public/licenses/Stockfish-GPL-3.0.txt`.

**ffish-es6 0.7.10**, by Fabian Fichter, Johannes Czech and the Fairy-Stockfish contributors: GPL-3.0. The package’s variant-rule JS/WASM is unchanged. Source/build instructions: [Fairy-Stockfish JavaScript library](https://github.com/ianfab/Fairy-Stockfish/tree/43b66c8abfebfcab893a3a4c349aa790d18df148/tests/js). Package integrity is pinned in `package-lock.json`. Website custom variant definitions and opponent search are supplied in `src/lib/variants.ts` and `variant-worker.ts`. The complete GPL text accompanies the engine notices.

## Piano

`public/piano.mp3` is the app’s synthesized Field/Burgmüller collection, transcoded from `ClassicalPrelude.wav` to 96 kbps MP3 with FFmpeg, without musical edits.

- John Field, Nocturne No. 5, H.37: Mutopia edition/typesetting by Alex Schreiber, CC BY-SA 4.0.
- Friedrich Burgmüller, Consolation and Douce plainte, Op.100 Nos.13 and 16: Mutopia editions/typesetting by Bas Wassink, public domain.
- Synthesized performance/adaptation: NovaChess contributors, CC BY-SA 4.0.

Full credits, pinned source links and license: `public/licenses/Piano-provenance.md`, `Piano-provenance.json` and `Piano-CC-BY-SA-4.0.txt`. No modern recording or third-party soundfont is used. Music is optional and loads only when enabled.

## Fonts and libraries

Nunito Sans (Vernon Adams, Cyreal and Jacques Le Bailly), DM Sans (Colophon Foundry / DM Sans authors), and Manrope (Mikhail Sharanda / Manrope authors): SIL Open Font License 1.1. Font licenses are in `public/licenses/`. Fonts are served locally.

React / React DOM (MIT), Vite (MIT), TypeScript (Apache-2.0), chess.js (BSD-2-Clause), Lucide (ISC), gifenc by Matt DesLauriers (MIT), Playwright (Apache-2.0), axe-core (MPL-2.0), and Fontsource packages (font-specific OFL-1.1). Installed package distributions retain their notices. Exact dependency versions/integrity are recorded in the lockfile.

The website source is AGPL-3.0-or-later. The music and individual third-party components retain their respective licenses.

## Country flags

Country-flag SVGs in `public/flags/` come from [lipis/flag-icons](https://github.com/lipis/flag-icons), commit `ac7e0eb3259eb62aa6100c435607e2fe03896a97`. MIT license: [public/licenses/flag-icons-LICENSE.txt](public/licenses/flag-icons-LICENSE.txt).

The new master-game introductions/annotations, opening-family instructional text, and trivia wording are original. Historical game scores are factual records; the game archive and knowledge entries include external reference links. No Disney artwork is bundled; the named personality quiz is an unofficial entertainment quiz.

## Online client and database tests

- Supabase JavaScript client: MIT, [license](public/licenses/supabase-js-LICENSE.txt).
- PGlite (development/test dependency): Apache-2.0, [license](public/licenses/pglite-LICENSE.txt). Used to exercise the SQL migration and Edge Function behavior locally; it is not part of the browser application.

## Homepage memes

The 22 homepage images were supplied by the owner in `Chess_Memes.zip`. Original files and visible creator credits are preserved unchanged in `public/memes/`.
