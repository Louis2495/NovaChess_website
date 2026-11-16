import load, { type FairyStockfish, type Board } from "ffish-es6";
import wasm from "ffish-es6/ffish.wasm?url";
let promise: Promise<FairyStockfish> | null = null;
export const customVariants = `[cvfog:chess]\n[cvpawns:chess]\nstartFen = 4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1\ncastling = false\n[cvpawnrace:chess]\nking = -\nstartFen = 8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1\ncastling = false\npromotionPieceTypes = -\nmandatoryPawnPromotion = false\nflagPiece = p\nflagRegionWhite = *8\nflagRegionBlack = *1\nextinctionValue = loss\nextinctionPieceTypes = *\nstalemateValue = loss`;
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
export const variantList = [
  { id: "chess", name: "Standard", description: "" },
  {
    id: "dropping",
    name: "Dropping Squares",
    description:
      "A square drops every five full moves. Dropped squares block movement.",
  },
  {
    id: "chaos",
    name: "Chaos chess",
    description: "Two-step pawns, one freeze and one piece switch per player.",
  },
  {
    id: "random",
    name: "Random",
    description: "Each turn selects the piece you must move.",
  },
  {
    id: "blind",
    name: "Blindfold · board",
    description: "Hidden pieces. Legal moves by memory.",
  },
  {
    id: "blindtext",
    name: "Blindfold · text",
    description: "Notation only. No board.",
  },
  {
    id: "crazyhouse",
    name: "Crazyhouse",
    description: "Drop captured pieces from your pocket.",
  },
  {
    id: "duck",
    name: "Duck chess",
    description: "Move a piece, then place the duck. Capture the king.",
  },
  {
    id: "atomic",
    name: "Atomic",
    description: "Captures explode nearby non-pawns.",
  },
  {
    id: "cvfog",
    name: "Fog of War",
    description: "Limited visibility. Win by checkmate.",
  },
  {
    id: "3check",
    name: "3-Check",
    description: "Give three checks or checkmate.",
  },
  {
    id: "kingofthehill",
    name: "King of the Hill",
    description: "Safely move your king to a central square.",
  },
  {
    id: "horde",
    name: "Horde",
    description: "White’s pawns against Black’s army.",
  },
  {
    id: "antichess",
    name: "Antichess",
    description: "Captures are compulsory. Lose your army.",
  },
  {
    id: "cvpawns",
    name: "Pawn Wars",
    description: "Pawns and kings, with promotions.",
  },
  {
    id: "cvpawnrace",
    name: "Pawn race",
    description: "No kings. Reach the last rank.",
  },
  {
    id: "chess960",
    name: "Chess960",
    description: "Random back rank. Castle by moving king to rook.",
  },
  {
    id: "bughouse",
    name: "Bughouse",
    description: "Two boards. Captures supply your partner.",
  },
];
export function chess960() {
  const files = Array(8).fill("");
  const even = [0, 2, 4, 6][Math.floor(Math.random() * 4)],
    odd = [1, 3, 5, 7][Math.floor(Math.random() * 4)];
  files[even] = "B";
  files[odd] = "B";
  let empty = () => files.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
  files[empty()[Math.floor(Math.random() * 6)]] = "Q";
  for (let n = 0; n < 2; n++) {
    const e = empty();
    files[e[Math.floor(Math.random() * e.length)]] = "N";
  }
  const e = empty();
  e.forEach((v, i) => (files[v] = ["R", "K", "R"][i]));
  const rank = files.join("");
  const rights = e
    .filter((_, i) => i !== 1)
    .map((v) => "ABCDEFGH"[v])
    .join("");
  return `${rank.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${rank} w ${rights}${rights.toLowerCase()} - 0 1`;
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
