import { Chess } from "chess.js";
export type PremoveSide = "w" | "b";
function squares(fen: string) {
  const p: Record<string, string> = {};
  let i = 0;
  for (const ch of fen
    .split(" ")[0]
    .replace(/\[.*\]/, "")
    .replace(/~/g, "")) {
    if (ch === "/") continue;
    if (/\d/.test(ch)) i += +ch;
    else {
      p["abcdefgh"[i % 8] + (8 - Math.floor(i / 8))] = ch;
      i++;
    }
  }
  return p;
}
function encode(
  p: Record<string, string>,
  fields: string[],
  side: PremoveSide,
  promoted = new Set<string>(),
) {
  let board = "";
  for (let r = 8; r >= 1; r--) {
    let empty = 0;
    for (const f of "abcdefgh") {
      const v = p[f + r];
      if (v) {
        if (empty) board += empty;
        empty = 0;
        board += v + (promoted.has(f+r)?"~":"");
      } else empty++;
    }
    if (empty) board += empty;
    if (r > 1) board += "/";
  }
  const pocket = fields[0].match(/\[.*\]/)?.[0] || "";
  return [board + pocket, side, ...fields.slice(2)].join(" ");
}
export function previewPremoves(
  fen: string,
  moves: string[],
  side: PremoveSide,
  variant = "chess",
  destinations?: Set<string>,
) {
  const p = squares(fen),
    fields = fen.split(" ");
  let pocket = fields[0].match(/\[([^\]]*)\]/)?.[1] || "";
  const hasPockets = /\[/.test(fields[0]);
  const promoted = new Set<string>();
  let squareIndex=0;
  for(const ch of fields[0].replace(/\[.*\]/,"")) {
    if(ch==="~")promoted.add("abcdefgh"[(squareIndex-1)%8]+(8-Math.floor((squareIndex-1)/8)));
    else if(ch!=="/")squareIndex+=/\d/.test(ch)?Number(ch):1;
  }
  const pocketPiece = (piece: string) => side === "w" ? piece.toUpperCase() : piece.toLowerCase();
  for (const move of moves) {
    const main = move.split(",")[0];
    if (main.includes("@")) {
      const to = main.slice(-2);
      if (p[to]) continue;
      const piece = pocketPiece(main[0]), index = pocket.indexOf(piece);
      if (index < 0) continue;
      pocket = pocket.slice(0,index) + pocket.slice(index+1);
      p[to] = piece;
      destinations?.add(to);
    } else {
      const from = main.slice(0, 2),
        to = main.slice(2, 4),
        piece = p[from];
      if (!piece || (piece === piece.toUpperCase() ? "w" : "b") !== side)
        continue;
      if (
        piece.toLowerCase() === "k" &&
        p[to]?.toLowerCase() === "r" &&
        (p[to] === p[to].toUpperCase() ? "w" : "b") === side
      ) {
        const kingTo = (to[0] > from[0] ? "g" : "c") + from[1],
          rookTo = (to[0] > from[0] ? "f" : "d") + from[1],
          rook = p[to];
        delete p[from];
        delete p[to];
        p[kingTo] = piece;
        p[rookTo] = rook;
        destinations?.add(kingTo);
        destinations?.add(rookTo);
        continue;
      }
      const captured = p[to] || (piece.toLowerCase() === "p" && from[0] !== to[0] ? p[to[0] + from[1]] : undefined);
      if (variant === "crazyhouse" && captured && captured !== "*" && captured.toLowerCase() !== "k") pocket += pocketPiece(promoted.has(to)?"p":captured);
      const wasPromoted=promoted.has(from);
      promoted.delete(from);promoted.delete(to);
      if(wasPromoted || (main[4] && hasPockets))promoted.add(to);
      delete p[from];
      if (piece.toLowerCase() === "p" && from[0] !== to[0] && !p[to])
        delete p[to[0] + from[1]];
      p[to] = main[4]
        ? side === "w"
          ? main[4].toUpperCase()
          : main[4].toLowerCase()
        : piece;
      destinations?.add(to);
      if (
        piece.toLowerCase() === "k" &&
        Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2
      ) {
        const rook = (to[0] === "g" ? "h" : "a") + from[1],
          target = (to[0] === "g" ? "f" : "d") + from[1];
        p[target] = p[rook];
        delete p[rook];
        destinations?.add(target);
      }
    }
    if (move.includes(",")) {
      for (const s of Object.keys(p)) if (p[s] === "*") delete p[s];
      const duckTo = move.slice(-2);
      p[duckTo] = "*";
      destinations?.add(duckTo);
    }
  }
  if (hasPockets) fields[0] = fields[0].replace(/\[[^\]]*\]/, "["+pocket+"]");
  return encode(p, fields, side, promoted);
}
export function premoveOptions(
  fen: string,
  side: PremoveSide,
  chaos = false,
  blocked: string[] = [],
  variant = "chess",
) {
  const p = squares(fen),
    out: string[] = [];
  for (const [from, piece] of Object.entries(p)) {
    if (piece === "*" || (piece === piece.toUpperCase() ? "w" : "b") !== side)
      continue;
    const x = from.charCodeAt(0) - 97,
      y = +from[1] - 1,
      kind = piece.toLowerCase(),
      dir = side === "w" ? 1 : -1;
    for (let tx = 0; tx < 8; tx++)
      for (let ty = 0; ty < 8; ty++) {
        const to = "abcdefgh"[tx] + (ty + 1),
          dx = tx - x,
          dy = ty - y;
        if (
          to === from ||
          blocked.includes(to) ||
          (p[to] &&
            p[to] !== "*" &&
            (p[to] === p[to].toUpperCase() ? "w" : "b") === side &&
            !(
              kind === "k" &&
              p[to].toLowerCase() === "r" &&
              dy === 0 &&
              fen.split(" ")[2] !== "-"
            ))
        )
          continue;
        let possible =
          kind === "n"
            ? Math.abs(dx * dy) === 2
            : kind === "k"
              ? Math.max(Math.abs(dx), Math.abs(dy)) === 1
              : kind === "p"
                ? dy === dir && Math.abs(dx) <= 1
                : kind === "b"
                  ? Math.abs(dx) === Math.abs(dy)
                  : kind === "r"
                    ? dx === 0 || dy === 0
                    : kind === "q"
                      ? dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)
                      : false;
        if (
          kind === "p" &&
          dx === 0 &&
          dy === dir * 2 &&
          (chaos || y === (side === "w" ? 1 : 6) || (variant === "horde" && side === "w" && y === 0))
        ) {
          const mid = from[0] + (y + dir + 1);
          possible = !p[mid] && !blocked.includes(mid);
        }
        if (
          kind === "k" &&
          dy === 0 &&
          (Math.abs(dx) === 2 || p[to]?.toLowerCase() === "r") &&
          fen.split(" ")[2] !== "-"
        )
          possible = true;
        if (kind === "p" && dx === 0 && p[to]) possible = false;
        if (!possible) continue;
        if (["b", "r", "q"].includes(kind)) {
          let clear = true;
          for (
            let step = 1;
            step < Math.max(Math.abs(dx), Math.abs(dy));
            step++
          ) {
            const sq =
              "abcdefgh"[x + Math.sign(dx) * step] +
              (y + Math.sign(dy) * step + 1);
            if (p[sq] || blocked.includes(sq)) {
              clear = false;
              break;
            }
          }
          if (!clear) continue;
        }
        if (kind === "p" && (ty === 0 || ty === 7) && variant !== "cvpawnrace")
          for (const promotion of variant === "antichess" ? ["q", "r", "b", "n", "k"] : ["q", "r", "b", "n"])
            out.push(from + to + promotion);
        else out.push(from + to);
      }
  }
  return out;
}
export function namedMoves(fen: string, legal: string[]) {
  let c: Chess | null = null;
  try {
    c = new Chess(fen);
  } catch {}
  return legal.map((uci) => {
    let san = uci;
    try {
      san = new Chess(c!.fen()).move(uci).san;
    } catch {}
    return { uci, san };
  });
}
