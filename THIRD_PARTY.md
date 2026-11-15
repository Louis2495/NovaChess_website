# Third-party notices

## NovaChess artwork

App icon and mallard illustration originate in `Louis2495/ChessVision` commit `46004d96707c9957c0a126296efd0a6dc033e18d`:

- `NovaChess/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png`
- `NovaChess/Resources/Assets.xcassets/CartoonDuck.imageset/CartoonDuck.png`

The source project is AGPL-3.0-or-later. Website copies are resized/compressed as WebP, with a small PNG favicon. Artwork itself is unchanged.

## Chess pieces

Colin M. L. Burnett, CBurnett chess set. Original SVGs copied without shape/color changes from the app's `Vendor/CBurnett/`, sourced from [lichess-org/lila](https://github.com/lichess-org/lila), commit `a1590345c9c3a31b6f9c6705eefeeb7dab32a78e`. GPL-2.0-or-later, used here under GPL-3.0-or-later. Full GPL text: `public/licenses/chess-pieces-GPL-3.0.txt`.

## Puzzle data

Lichess public puzzle dataset: CC0. Example IDs `037ht`, `00XNY`, `05FtN`, copied from the app's `NovaChess/Core/Resources/Puzzles.json`. Data includes FEN, first/opponent move, intended solution, and original game URLs. Website titles/hints are authored here. Original games are linked in the interface. No Lichess server or application code is copied.

## Fonts

DM Sans: Colophon Foundry / DM Sans project authors. Manrope: Mikhail Sharanda / Manrope project authors. Both use SIL Open Font License 1.1, copied into `public/licenses/` from their Fontsource packages. Fonts are served locally.

## Libraries

React / React DOM (MIT), Vite (MIT), TypeScript (Apache-2.0), chess.js (BSD-2-Clause), Lucide (ISC), Playwright (Apache-2.0), axe-core (MPL-2.0), and Fontsource packages (font-specific OFL-1.1). Their notices accompany their installed package distributions.

Stockfish/Fairy-Stockfish run in the iPhone app, not in this website. Their source and license notices are available in the app repository.
