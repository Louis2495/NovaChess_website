import { Chess } from "chess.js";
export type SpecialVariant = "dropping" | "chaos" | "random";
export type Side = "w" | "b";
export type SpecialState = {
  variant: SpecialVariant;
  fen: string;
  ply: number;
  blocked: string[];
  dropCount: number;
  seed: number;
  freezeUsed: Side[];
  swapUsed: Side[];
  frozen: { square: string; side: Side } | null;
  randomFrom: string;
  result: string;
  positions: string[];
  moves: string[];
  notation: string[];
};
const initial = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export function cells(fen: string) {
  const out: Record<string, string> = {};
  let i = 0;
  for (const c of fen.split(" ")[0]) {
    if (c === "/") continue;
    if (/\d/.test(c)) i += +c;
    else {
      out["abcdefgh"[i % 8] + (8 - Math.floor(i / 8))] = c;
      i++;
    }
  }
  return out;
}
const color = (p: string): Side => (p === p.toUpperCase() ? "w" : "b");
const other = (s: Side): Side => (s === "w" ? "b" : "w");
export const specialTurn = (s: SpecialState) => s.fen.split(" ")[1] as Side;
function rand(s: SpecialState) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function coord(sq: string) {
  return [sq.charCodeAt(0) - 97, +sq[1] - 1];
}
function sq(x: number, y: number) {
  return x < 0 || x > 7 || y < 0 || y > 7 ? "" : "abcdefgh"[x] + (y + 1);
}
function fen(
  p: Record<string, string>,
  turn: Side,
  rights: string,
  ep: string,
  half: number,
  full: number,
) {
  const rows = [];
  for (let y = 7; y >= 0; y--) {
    let line = "",
      empty = 0;
    for (let x = 0; x < 8; x++) {
      const v = p[sq(x, y)];
      if (v) {
        if (empty) line += empty;
        empty = 0;
        line += v;
      } else empty++;
    }
    if (empty) line += empty;
    rows.push(line);
  }
  return `${rows.join("/")} ${turn} ${rights || "-"} ${ep || "-"} ${half} ${full}`;
}
function pseudo(s: SpecialState, side: Side, attacks = false) {
  const p = cells(s.fen),
    out: string[] = [];
  for (const [from, piece] of Object.entries(p)) {
    if (
      color(piece) !== side ||
      (!attacks && s.frozen?.square === from && s.frozen.side === side)
    )
      continue;
    const [x, y] = coord(from),
      kind = piece.toLowerCase(),
      dir = side === "w" ? 1 : -1;
    const add = (to: string) => {
      if (!to || s.blocked.includes(to)) return false;
      if (!attacks && p[to] && color(p[to]) === side) return false;
      if (!attacks && p[to]?.toLowerCase() === "k") return false;
      if (kind === "p" && (to[1] === "1" || to[1] === "8") && !attacks) {
        for (const promote of ["q", "r", "b", "n"])
          out.push(from + to + promote);
      } else out.push(from + to);
      return !p[to];
    };
    if (kind === "p") {
      if (attacks) {
        for (const dx of [-1, 1]) add(sq(x + dx, y + dir));
      } else {
        const one = sq(x, y + dir),
          two = sq(x, y + dir * 2);
        if (one && !p[one] && !s.blocked.includes(one)) {
          add(one);
          if (
            (s.variant === "chaos" || y === (side === "w" ? 1 : 6)) &&
            two &&
            !p[two] &&
            !s.blocked.includes(two)
          )
            add(two);
        }
        for (const dx of [-1, 1]) {
          const to = sq(x + dx, y + dir);
          if (
            to &&
            ((p[to] && color(p[to]) !== side) || to === s.fen.split(" ")[3])
          )
            add(to);
        }
      }
    } else if (kind === "n") {
      for (const [dx, dy] of [
        [1, 2],
        [2, 1],
        [-1, 2],
        [-2, 1],
        [1, -2],
        [2, -1],
        [-1, -2],
        [-2, -1],
      ])
        add(sq(x + dx, y + dy));
    } else {
      const dirs =
        kind === "b"
          ? [
              [1, 1],
              [1, -1],
              [-1, 1],
              [-1, -1],
            ]
          : kind === "r"
            ? [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ]
            : [
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ];
      for (const [dx, dy] of dirs)
        for (let n = 1; n <= (kind === "k" ? 1 : 7); n++) {
          if (!add(sq(x + dx * n, y + dy * n))) break;
        }
    }
  }
  return out;
}
function checked(s: SpecialState, side: Side) {
  const p = cells(s.fen),
    king = Object.keys(p).find((k) => p[k] === (side === "w" ? "K" : "k"));
  return (
    !king || pseudo(s, other(side), true).some((m) => m.slice(2, 4) === king)
  );
}
function positionAfter(s: SpecialState, move: string) {
  const p = cells(s.fen),
    from = move.slice(0, 2),
    to = move.slice(2, 4),
    piece = p[from],
    parts = s.fen.split(" "),
    turn = specialTurn(s),
    captured = p[to];
  delete p[from];
  if (piece.toLowerCase() === "p" && from[0] !== to[0] && !captured)
    delete p[to[0] + from[1]];
  p[to] = move[4] ? (turn === "w" ? move[4].toUpperCase() : move[4]) : piece;
  if (
    piece.toLowerCase() === "k" &&
    Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2
  ) {
    const rf = (to[0] === "g" ? "h" : "a") + from[1],
      rt = (to[0] === "g" ? "f" : "d") + from[1];
    p[rt] = p[rf];
    delete p[rf];
  }
  let rights = parts[2].replace("-", "");
  for (const [square, right] of [
    ["h1", "K"],
    ["a1", "Q"],
    ["h8", "k"],
    ["a8", "q"],
  ])
    if (from === square || to === square) rights = rights.replace(right, "");
  if (piece === "K") rights = rights.replace(/[KQ]/g, "");
  if (piece === "k") rights = rights.replace(/[kq]/g, "");
  const [tx, ty] = coord(to);
  const ep =
    piece.toLowerCase() === "p" &&
    Math.abs(+from[1] - +to[1]) === 2 &&
    [-1, 1].some((dx) => p[sq(tx + dx, ty)] === (turn === "w" ? "p" : "P"))
      ? from[0] + (+from[1] + +to[1]) / 2
      : "-";
  return fen(
    p,
    other(turn),
    rights,
    ep,
    piece.toLowerCase() === "p" || captured ? 0 : +parts[4] + 1,
    +parts[5] + (turn === "b" ? 1 : 0),
  );
}
export function specialLegal(s: SpecialState, restrict = true) {
  if (s.result !== "*") return [];
  const turn = specialTurn(s),
    p = cells(s.fen);
  const ms = pseudo(s, turn).filter(
    (move) => !checked({ ...s, fen: positionAfter(s, move) }, turn),
  );
  const row = turn === "w" ? "1" : "8",
    king = "e" + row,
    enemy = pseudo(s, other(turn), true).map((m) => m.slice(2, 4));
  if (
    p[king] === (turn === "w" ? "K" : "k") &&
    !checked(s, turn) &&
    s.frozen?.square !== king
  ) {
    for (const [right, rook, through, target, empty] of [
      [turn === "w" ? "K" : "k", "h", "f", "g", ["f", "g"]],
      [turn === "w" ? "Q" : "q", "a", "d", "c", ["b", "c", "d"]],
    ] as [string, string, string, string, string[]][]) {
      if (
        s.fen.split(" ")[2].includes(right) &&
        p[rook + row] === (turn === "w" ? "R" : "r") &&
        empty.every((f) => !p[f + row] && !s.blocked.includes(f + row)) &&
        !enemy.includes(through + row) &&
        !enemy.includes(target + row)
      )
        ms.push(king + target + row);
    }
  }
  return restrict && s.variant === "random" && s.randomFrom
    ? ms.filter((m) => m.startsWith(s.randomFrom))
    : ms;
}
function nextRandom(s: SpecialState) {
  if (s.variant === "random") {
    const sources = [
      ...new Set(specialLegal(s, false).map((m) => m.slice(0, 2))),
    ];
    s.randomFrom = sources[Math.floor(rand(s) * sources.length)] || "";
  }
}
export function newSpecial(
  variant: SpecialVariant,
  dropCount = 2,
  seed = Math.floor(Math.random() * 4294967295),
): SpecialState {
  const s: SpecialState = {
    variant,
    fen: initial,
    ply: 0,
    blocked: [],
    dropCount,
    seed,
    freezeUsed: [],
    swapUsed: [],
    frozen: null,
    randomFrom: "",
    result: "*",
    positions: [initial],
    moves: [],
    notation: [],
  };
  nextRandom(s);
  return s;
}
export type SpecialAction =
  | { type: "move"; move: string }
  | { type: "freeze"; square: string }
  | { type: "swap"; from: string; to: string };
export function specialApply(
  original: SpecialState,
  action: SpecialAction,
): SpecialState {
  const s = structuredClone(original),
    turn = specialTurn(s),
    p = cells(s.fen);
  if (s.result !== "*") throw new Error("Game finished.");
  if (action.type === "freeze") {
    if (
      s.variant !== "chaos" ||
      s.freezeUsed.includes(turn) ||
      !p[action.square] ||
      color(p[action.square]) === turn
    )
      throw new Error("Choose an opponent piece.");
    s.frozen = { square: action.square, side: other(turn) };
    s.freezeUsed.push(turn);
    return s;
  }
  let notation = "",
    key = "";
  if (action.type === "swap") {
    if (
      s.variant !== "chaos" ||
      s.swapUsed.includes(turn) ||
      action.from === action.to ||
      !p[action.from] ||
      !p[action.to] ||
      color(p[action.from]) !== turn ||
      color(p[action.to]) !== turn
    )
      throw new Error("Choose two of your pieces.");
    if (
      (p[action.from].toLowerCase() === "p" && /[18]/.test(action.to[1])) ||
      (p[action.to].toLowerCase() === "p" && /[18]/.test(action.from[1]))
    )
      throw new Error("A pawn cannot swap onto a promotion rank.");
    [p[action.from], p[action.to]] = [p[action.to], p[action.from]];
    const parts = s.fen.split(" ");
    let rights = parts[2];
    for (const x of [action.from, action.to]) {
      if (p[x].toLowerCase() === "k")
        rights = rights.replace(turn === "w" ? /[KQ]/g : /[kq]/g, "");
      const r: Record<string, string> = { a1: "Q", h1: "K", a8: "q", h8: "k" };
      if (r[x]) rights = rights.replace(r[x], "");
    }
    s.fen = fen(
      p,
      other(turn),
      rights,
      "-",
      +parts[4] + 1,
      +parts[5] + (turn === "b" ? 1 : 0),
    );
    if (checked(s, turn))
      throw new Error("That swap leaves your king in check.");
    s.swapUsed.push(turn);
    notation = `⇄ ${action.from}–${action.to}`;
    key = "swap:" + action.from + action.to;
  } else {
    if (!specialLegal(s).includes(action.move))
      throw new Error("Illegal move.");
    const move = action.move,
      from = move.slice(0, 2),
      to = move.slice(2, 4);
    try {
      notation = new Chess(s.fen).move(move).san;
    } catch {
      notation =
        (p[from].toLowerCase() === "p" ? "" : p[from].toUpperCase()) +
        from +
        (p[to] ? "×" : "–") +
        to +
        (move[4] ? "=" + move[4].toUpperCase() : "");
    }
    s.fen = positionAfter(s, move);
    key = move;
  }
  s.ply++;
  if (s.frozen?.side === turn) s.frozen = null;
  s.randomFrom = "";
  if (
    s.variant === "dropping" &&
    s.ply % 10 === 0 &&
    s.blocked.length < s.dropCount
  ) {
    const now = cells(s.fen),
      available = [];
    for (let rank = 3; rank <= 6; rank++)
      for (const file of "abcdefgh") {
        const square = file + rank;
        if (!now[square] && !s.blocked.includes(square)) available.push(square);
      }
    if (available.length)
      s.blocked.push(available[Math.floor(rand(s) * available.length)]);
  }
  if (!specialLegal(s, false).length)
    s.result = checked(s, other(turn))
      ? turn === "w"
        ? "1-0"
        : "0-1"
      : "1/2-1/2";
  else if (
    +s.fen.split(" ")[4] >= 100 ||
    Object.values(cells(s.fen)).every((p) => p.toLowerCase() === "k")
  )
    s.result = "1/2-1/2";
  const posKey = (f: string) => f.split(" ").slice(0, 4).join(" ");
  if (
    s.blocked.length === original.blocked.length &&
    s.positions.filter((f) => posKey(f) === posKey(s.fen)).length >= 2
  )
    s.result = "1/2-1/2";
  s.positions.push(s.fen);
  s.moves.push(key);
  s.notation.push(notation);
  nextRandom(s);
  return s;
}
export function specialBot(s: SpecialState) {
  const moves = specialLegal(s);
  if (!moves.length) return "";
  const turn = specialTurn(s),
    weights: Record<string, number> = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 0,
    };
  function evaluate(state: SpecialState) {
    if (state.result !== "*")
      return state.result === "1/2-1/2"
        ? 0
        : state.result === (turn === "w" ? "1-0" : "0-1")
          ? 1e6
          : -1e6;
    let n = 0;
    for (const [square, p] of Object.entries(cells(state.fen))) {
      const [x, y] = coord(square);
      n +=
        (color(p) === turn ? 1 : -1) *
        (weights[p.toLowerCase()] +
          (3.5 - Math.max(Math.abs(x - 3.5), Math.abs(y - 3.5))) * 4);
    }
    return n;
  }
  let best = -Infinity,
    bestMove = moves[0];
  for (const m of moves) {
    const next = specialApply(s, { type: "move", move: m });
    let score = evaluate(next);
    if (next.result === "*") {
      for (const reply of specialLegal(next))
        score = Math.min(
          score,
          evaluate(specialApply(next, { type: "move", move: reply })),
        );
    }
    score += Math.random() * 3;
    if (score > best) {
      best = score;
      bestMove = m;
    }
  }
  return bestMove;
}
