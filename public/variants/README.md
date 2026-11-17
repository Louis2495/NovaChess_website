# Variant artwork

`illustrations.webp` is the original illustrated sprite sheet used by `VariantIcon.tsx`: six columns, three rows, with square tiles.

- Row 1: Standard, Dropping Squares, Chaos, Random, Blindfold board, Blindfold text.
- Row 2: Crazyhouse, Duck, Atomic, Fog of War, 3-Check, King of the Hill.
- Row 3: Horde, Antichess, Pawn Wars, Pawn race, Chess960, Bughouse.

The sheet is encoded as WebP at its original resolution. Each picture has a distinct visual motif; only Atomic uses a board as part of its illustration.

Pawns use traditional pedestal bodies with no legs or feet. Dropping Squares, Random, Fog of War, 3-Check, Antichess, Bughouse and Pawn race were revised to preserve that rule, clarify the cubic die and show three plus signs.

`horde.webp` overrides only the Horde tile. Its two front pawns have faces aligned with the row behind them; the other 17 illustrations continue to use the original sheet.

`multiplayer.png` contains three square panels in one horizontal sheet (Throne, Vote Chess, Team Chess). Each scene uses open, expressive eyes and traditional chess-piece bases. `MultiplayerPicture.tsx` selects the panels without cropping the source file.

`speedrun.webp` is a standalone Speedrun illustration: a caped king racing beside a gold stopwatch, with mint/gold motion streaks and a traditional pedestal base.
