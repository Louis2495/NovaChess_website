import load, { type FairyStockfish, type Board } from "ffish-es6";
import wasm from "ffish-es6/ffish.wasm?url";
let promise: Promise<FairyStockfish> | null = null;
import { customVariants } from "./variantCatalog";
export {customVariants, variantList, chess960} from "./variantCatalog";
export function fairy() {
  if (!promise)
    promise = load({
      locateFile: () => wasm,
      print: () => {},
      printErr: () => {},
    })
      .then((ff) => {
        ff.loadVariantConfig(customVariants);
        return ff;
      })
      .catch((e) => {
        promise = null;
        throw e;
      });
  return promise;
}
export function makeBoard(
  ff: FairyStockfish,
  variant: string,
  initial?: string,
  moves: string[] = [],
) {
  const id = ["blind", "blindtext", "chess960"].includes(variant)
    ? "chess"
    : variant;
  // Reject unsupported rules before entering the native WASM constructor.
  if (!ff.variants().split(/\s+/).includes(id)) {
    throw new Error(`The local engine does not support variant: ${variant}`);
  }
  const b = new ff.Board(id, initial || undefined, variant === "chess960");
  for (const move of moves) {
    if (!b.push(move)) {
      b.delete();
      throw new Error("The saved game contains an illegal move.");
    }
  }
  return b;
}
export function legal(b: Board) {
  return b.legalMoves().trim().split(/\s+/).filter(Boolean);
}
export function squares(fen: string) {
  const row = fen
    .split(" ")[0]
    .replace(/\[.*\]/, "")
    .replace(/~/g, "");
  const out: Record<string, string> = {};
  let i = 0;
  for (const ch of row) {
    if (ch === "/") continue;
    if (/\d/.test(ch)) i += Number(ch);
    else {
      out[`${"abcdefgh"[i % 8]}${8 - Math.floor(i / 8)}`] = ch;
      i++;
    }
  }
  return out;
}
export function fog(fen: string, side: "w" | "b") {
  const p = squares(fen),
    visible = new Set<string>();
  const dirs: Record<string, number[][]> = {
    b: [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ],
    r: [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ],
  };
  for (const [sq, piece] of Object.entries(p)) {
    if ((piece === piece.toUpperCase() ? "w" : "b") !== side) continue;
    visible.add(sq);
    const x = sq.charCodeAt(0) - 97,
      y = Number(sq[1]) - 1;
    const kind = piece.toLowerCase();
    let ds =
      kind === "n"
        ? [
            [1, 2],
            [2, 1],
            [-1, 2],
            [-2, 1],
            [1, -2],
            [2, -1],
            [-1, -2],
            [-2, -1],
          ]
        : kind === "b"
          ? dirs.b
          : kind === "r"
            ? dirs.r
            : [...dirs.b, ...dirs.r];
    if (kind === "p")
      ds = [
        [-1, side === "w" ? 1 : -1],
        [1, side === "w" ? 1 : -1],
      ];
    for (const [dx, dy] of ds)
      for (let n = 1; n <= (["p", "k", "n"].includes(kind) ? 1 : 7); n++) {
        const a = x + dx * n,
          b = y + dy * n;
        if (a < 0 || a > 7 || b < 0 || b > 7) break;
        const to = `${"abcdefgh"[a]}${b + 1}`;
        visible.add(to);
        if (p[to]) break;
      }
  }
  return visible;
}

/** FEN promotion markers belong to the immediately preceding square. */
export function promotedAt(fen: string, square: string) {
  let index = 0,
    previous = "";
  for (const ch of fen.split(" ")[0].replace(/\[.*\]/, "")) {
    if (ch === "/") continue;
    if (/\d/.test(ch)) {
      index += Number(ch);
      continue;
    }
    if (ch === "~") {
      if (previous === square) return true;
      continue;
    }
    previous = "abcdefgh"[index % 8] + (8 - Math.floor(index / 8));
    index++;
  }
  return false;
}
