import {
  Chess,
  type Color,
  type Square,
  type PieceSymbol,
  type Move,
} from "chess.js";
type Evaluation = { depth: number; moves: string[]; mate?: number | null };
type Insight = { theme: string; priority: number; text: string };
const names: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
const sideName = (side: Color) => (side === "w" ? "White" : "Black");
const other = (side: Color): Color => (side === "w" ? "b" : "w");
const file = (square: string) => square.charCodeAt(0) - 97;
const rank = (square: string) => Number(square[1]);
const center = ["d4", "e4", "d5", "e5"] as Square[];
const distance = (a: string, b: string) =>
  Math.max(Math.abs(file(a) - file(b)), Math.abs(rank(a) - rank(b)));
function doubled(c: Chess, side: Color) {
  const counts = new Map<string, number>();
  for (const p of c.board().flat())
    if (p?.color === side && p.type === "p")
      counts.set(p.square[0], (counts.get(p.square[0]) || 0) + 1);
  return [...counts].filter(([, n]) => n > 1).map(([f]) => f);
}
function moveIdea(c: Chess, line?: Evaluation): Insight | null {
  if (!line || line.depth < 8 || !line.moves[0]) return null;
  let m: Move;
  const after = new Chess(c.fen());
  try {
    m = after.move(line.moves[0]);
  } catch {
    return null;
  }
  const side = m.color,
    opponent = other(side),
    who = sideName(side),
    enemy = sideName(opponent),
    verb = m.san;
  const answer = (text: string, theme = "plan"): Insight => ({
    theme,
    priority: 95,
    text,
  });
  if (after.isCheckmate())
    return answer(
      `${verb} completes the mating net: ${enemy} cannot capture the attacker, block the check or escape.`,
      "tactics",
    );
  if (m.promotion)
    return answer(
      `${verb} converts the advanced pawn into a ${names[m.promotion]}, changing the balance of the endgame.`,
    );
  if (c.isCheck()) {
    const king = c
      .board()
      .flat()
      .find((p) => p?.type === "k" && p.color === side)!;
    const checker = c.attackers(king.square, opponent)[0];
    if (m.captured && c.attackers(king.square, opponent).includes(m.to))
      return answer(
        `${verb} removes the checking ${names[m.captured]}, resolving the immediate threat to ${who}’s king.`,
        "tactics",
      );
    if (m.piece !== "k" && checker)
      return answer(
        `${verb} blocks the ${checker}–${king.square} line of check, keeping ${who}’s king in place.`,
        "tactics",
      );
    return answer(
      `${verb} takes the king out of the checking line; king safety takes priority over pawn or piece improvements.`,
      "tactics",
    );
  }
  if (m.isKingsideCastle() || m.isQueensideCastle())
    return answer(
      `${verb} moves the king away from the center and brings the rook into play before the position opens.`,
      "king",
    );
  // A concrete structural consequence in the engine's expected recapture.
  if (m.captured && line.moves[1]) {
    const beforeDoubled = doubled(c, opponent);
    try {
      const reply = after.move(line.moves[1]);
      const newlyDoubled = doubled(after, opponent).find(
        (f) => !beforeDoubled.includes(f),
      );
      if (reply.captured && newlyDoubled)
        return answer(
          `${verb} ${reply.san} leaves ${enemy} with doubled ${newlyDoubled}-pawns, creating a lasting structural target.`,
          "structure",
        );
      after.undo();
    } catch {}
  }
  if (m.piece === "p") {
    const pawnThreats = after
      .board()
      .flat()
      .filter(
        (p) =>
          p &&
          p.color === opponent &&
          p.type !== "p" &&
          p.type !== "k" &&
          after.attackers(p.square, side).includes(m.to),
      );
    if (pawnThreats.length) {
      const target = pawnThreats[0]!;
      return answer(
        `${verb} gains space with tempo against the ${names[target.type]} on ${target.square}.`,
      );
    }
    if (m.captured) {
      const f = m.from[0],
        pawns = after
          .board()
          .flat()
          .filter((p) => p?.type === "p" && p.square[0] === f);
      if (!pawns.some((p) => p!.color === side))
        return answer(
          `${verb} resolves the pawn tension and gives ${who} ${pawns.length ? "a semi-open" : "an open"} ${f}-file for rook activity.`,
          "structure",
        );
    }
    if (center.includes(m.to)) {
      const bishops = c
        .board()
        .flat()
        .filter((p) => p?.type === "b" && p.color === side);
      const freed = bishops.find(
        (p) =>
          Math.abs(file(p!.square) - file(m.from)) === 1 &&
          Math.abs(rank(p!.square) - rank(m.from)) === 1,
      );
      return answer(
        `${verb} takes central space${freed ? ` and frees the ${freed.square}-bishop` : ", giving the pieces more room to develop"}.`,
        "center",
      );
    }
    if (
      ["f", "g", "h"].includes(m.from[0]) &&
      rank(m.from) === (side === "w" ? 2 : 7)
    )
      return answer(
        `${verb} gains kingside space, but the advanced pawn leaves fewer squares covered around ${who}’s king.`,
        "king",
      );
    const support = Array.from(
      { length: 8 },
      (_, f) => "abcdefgh"[f] + (rank(m.to) + (side === "w" ? 1 : -1)),
    ).filter(
      (s) =>
        Number(s[1]) >= 1 &&
        Number(s[1]) <= 8 &&
        Math.abs(file(s) - file(m.to)) === 1,
    );
    if (support.length)
      return answer(
        `${verb} adds pawn support for ${support.join(" and ")}, giving ${who} a foothold for ${"abc".includes(m.to[0]) ? "queenside" : "fgh".includes(m.to[0]) ? "kingside" : "central"} play.`,
        "space",
      );
  }
  if (m.piece === "r") {
    if (rank(m.to) === (side === "w" ? 7 : 2))
      return answer(
        `${verb} activates the rook on the ${side === "w" ? "seventh" : "second"} rank, where it can attack pawns from the side.`,
      );
    const pawns = after
      .board()
      .flat()
      .filter((p) => p?.type === "p" && p.square[0] === m.to[0]);
    if (!pawns.some((p) => p!.color === side))
      return answer(
        `${verb} places the rook on ${pawns.length ? "a semi-open" : "an open"} ${m.to[0]}-file, giving it a route into ${enemy}’s position.`,
        "files",
      );
  }
  if (m.piece === "b" && ["b2", "g2", "b7", "g7"].includes(m.to))
    return answer(
      `${verb} completes a fianchetto, aiming the bishop toward the center along the long diagonal.`,
    );
  const targets = after
    .board()
    .flat()
    .filter(
      (p) =>
        p &&
        p.color === opponent &&
        ["q", "r", "k"].includes(p.type) &&
        after.attackers(p.square, side).includes(m.to),
    );
  if (m.piece === "n" && targets.length >= 2)
    return answer(
      `${verb} attacks the ${names[targets[0]!.type]} on ${targets[0]!.square} and ${names[targets[1]!.type]} on ${targets[1]!.square} at once.`,
      "tactics",
    );
  if (m.captured)
    return answer(
      `${verb} removes ${enemy}’s ${names[m.captured]} on ${m.to}${m.san.includes("+") ? " with check, keeping the initiative" : ", reducing its influence on the position"}.`,
      "tactics",
    );
  if (m.piece === "k") {
    const pawns = c
      .board()
      .flat()
      .filter((p) => p?.type === "p" && p.color === opponent)
      .sort((a, b) => distance(m.to, a!.square) - distance(m.to, b!.square));
    const target = pawns.find(
      (p) => distance(m.to, p!.square) < distance(m.from, p!.square),
    );
    const queens = c
      .board()
      .flat()
      .some((p) => p?.type === "q");
    if (!queens && target)
      return answer(
        `${verb} brings ${who}’s king closer to the ${target.square}-pawn, making the king an active endgame piece.`,
      );
  }
  const controlled = center.filter((s) =>
    after.attackers(s, side).includes(m.to),
  );
  if (controlled.length) {
    const developing =
      ["n", "b"].includes(m.piece) && rank(m.from) === (side === "w" ? 1 : 8);
    return answer(
      `${verb} ${developing ? "develops" : "improves"} the ${names[m.piece]} while adding control of ${controlled.slice(0, 2).join(" and ")}.`,
      "center",
    );
  }
  return null;
}
/** Observable positional features, plus a legal engine-backed plan; never engine evaluation dressed up as prose. */
export function positionInsights(fen: string, line?: Evaluation): string[] {
  const c = new Chess(fen),
    pieces = c
      .board()
      .flat()
      .filter((p) => p !== null),
    turn = c.turn();
  const insights: Insight[] = [];
  const add = (theme: string, priority: number, text: string) =>
    insights.push({ theme, priority, text });
  const king = pieces.find((p) => p.type === "k" && p.color === turn)!;
  if (c.isCheckmate()) {
    const checker = c.attackers(king.square, other(turn))[0];
    return [
      `${sideName(turn)}’s king on ${king.square} is trapped${checker ? ` by the ${names[c.get(checker)!.type]} on ${checker}` : ""}; no escape, block or capture can remove the check.`,
    ];
  }
  if (c.isStalemate())
    return [
      `${sideName(turn)} has no move but is not in check. The lack of a waiting move makes this position a stalemate.`,
    ];
  if (c.isInsufficientMaterial())
    return [
      "Neither side has enough mating material; the remaining pieces cannot build a mating net.",
    ];
  const idea = moveIdea(c, line);
  if (idea) insights.push(idea);
  if (c.isCheck()) {
    const checkers = c.attackers(king.square, other(turn));
    add(
      "check",
      110,
      checkers.length > 1
        ? `${sideName(turn)} faces a double check from ${checkers.join(" and ")}; only a king move can answer both threats.`
        : `The ${names[c.get(checkers[0])!.type]} on ${checkers[0]} checks ${sideName(turn)}’s king on ${king.square}, forcing an immediate response.`,
    );
  }
  const fullMove = Number(fen.split(" ")[5]);
  for (const side of ["w", "b"] as Color[]) {
    const own = pieces.filter((p) => p.color === side),
      enemy = pieces.filter((p) => p.color !== side),
      pawns = own.filter((p) => p.type === "p"),
      enemyPawns = enemy.filter((p) => p.type === "p"),
      who = sideName(side),
      opponent = sideName(other(side)),
      ownKing = own.find((p) => p.type === "k")!;
    // Absolute pins are found directly along the king's eight rays.
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      let shield: typeof king | undefined;
      for (let n = 1; n < 8; n++) {
        const x = file(ownKing.square) + n * dx,
          y = rank(ownKing.square) + n * dy;
        if (x < 0 || x > 7 || y < 1 || y > 8) break;
        const p = c.get(("abcdefgh"[x] + y) as Square);
        if (!p) continue;
        if (!shield) {
          if (p.color !== side) break;
          shield = { ...p, square: ("abcdefgh"[x] + y) as Square };
        } else {
          if (
            p.color !== side &&
            (p.type === "q" || p.type === (dx && dy ? "b" : "r"))
          )
            add(
              "pin",
              87,
              `${who}’s ${names[shield.type]} on ${shield.square} is pinned to its king by the ${names[p.type]} on ${"abcdefgh"[x] + y}, restricting its movement.`,
            );
          break;
        }
      }
    }
    for (const p of pawns) {
      const advance = side === "w" ? rank(p.square) : 9 - rank(p.square);
      const passed = !enemyPawns.some(
        (e) =>
          Math.abs(file(e.square) - file(p.square)) <= 1 &&
          (side === "w"
            ? rank(e.square) > rank(p.square)
            : rank(e.square) < rank(p.square)),
      );
      if (passed && advance >= 5)
        add(
          "passed",
          90 + advance,
          `${who}’s passed pawn on ${p.square} gives a clear plan: support its advance and force ${opponent} to blockade it.`,
        );
      const isolated = !pawns.some(
        (q) => Math.abs(file(q.square) - file(p.square)) === 1,
      );
      if (isolated && "cdef".includes(p.square[0]) && advance >= 4)
        add(
          "structure",
          65,
          `${who}’s isolated ${p.square}-pawn has no neighboring pawn support; active pieces must compensate for its long-term vulnerability.`,
        );
    }
    const doubledFiles = doubled(c, side);
    if (doubledFiles.length)
      add(
        "structure",
        58,
        `${who}’s doubled ${doubledFiles[0]}-pawns cannot defend each other; the front pawn may need piece support.`,
      );
    for (const n of own.filter((p) => p.type === "n")) {
      const advance = side === "w" ? rank(n.square) : 9 - rank(n.square);
      if (
        advance >= 5 &&
        "cdef".includes(n.square[0]) &&
        !enemyPawns.some(
          (p) =>
            Math.abs(file(p.square) - file(n.square)) === 1 &&
            (side === "w"
              ? rank(p.square) > rank(n.square)
              : rank(p.square) < rank(n.square)),
        ) &&
        c.attackers(n.square, side).some((s) => c.get(s)?.type === "p")
      )
        add(
          "outpost",
          82,
          `${who}’s pawn-supported knight on ${n.square} is a stable outpost; ${opponent} has no nearby pawn to chase it away.`,
        );
    }
    for (const r of own.filter((p) => p.type === "r"))
      if (!pieces.some((p) => p.type === "p" && p.square[0] === r.square[0]))
        add(
          "files",
          70,
          `${who}’s rook on ${r.square} occupies the open ${r.square[0]}-file, offering an entry route into ${opponent}’s position.`,
        );
    if (
      enemy.some((p) => p.type === "q") &&
      ["g", "h", "a", "b"].includes(ownKing.square[0])
    ) {
      const shield = pawns.filter(
        (p) =>
          Math.abs(file(p.square) - file(ownKing.square)) <= 1 &&
          (side === "w"
            ? [1, 2].includes(rank(p.square) - rank(ownKing.square))
            : [1, 2].includes(rank(ownKing.square) - rank(p.square))),
      );
      if (shield.length <= 1)
        add(
          "king",
          78,
          `${who}’s king on ${ownKing.square} has little pawn cover; ${opponent}’s queen can exploit the open approach squares.`,
        );
    }
    for (const front of pawns.filter((p) => "de".includes(p.square[0]))) {
      const back = pawns.find(
        (p) =>
          Math.abs(file(p.square) - file(front.square)) === 1 &&
          rank(p.square) === rank(front.square) + (side === "w" ? -1 : 1),
      );
      if (
        back &&
        (side === "w" ? rank(front.square) >= 4 : rank(front.square) <= 5)
      )
        add(
          "chain",
          55,
          `${who}’s ${back.square}–${front.square} pawn chain gains central space; attacking ${back.square} would undermine support for ${front.square}.`,
        );
    }
    if (fullMove >= 6)
      for (const b of own.filter((p) => p.type === "b")) {
        let mobility = 0;
        const blockers: Square[] = [];
        for (const [dx, dy] of [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ])
          for (let step = 1; step < 8; step++) {
            const x = file(b.square) + dx * step,
              y = rank(b.square) + dy * step;
            if (x < 0 || x > 7 || y < 1 || y > 8) break;
            const s = ("abcdefgh"[x] + y) as Square,
              target = c.get(s);
            if (target) {
              if (target.color !== side) mobility++;
              else if (target.type === "p") blockers.push(s);
              break;
            }
            mobility++;
          }
        if (mobility <= 2 && blockers.length)
          add(
            "bishop",
            60,
            `${who}’s bishop on ${b.square} is restricted by its own ${blockers.slice(0, 2).join(" and ")} pawns; opening a diagonal would improve it.`,
          );
      }
  }
  if (fullMove <= 5) {
    if (center.every((s) => !c.get(s)))
      add(
        "center",
        45,
        "The center is still unclaimed; a central pawn advance gains space and opens a bishop’s diagonal.",
      );
    const undeveloped = pieces.filter(
      (p) =>
        ["n", "b"].includes(p.type) &&
        rank(p.square) === (p.color === "w" ? 1 : 8),
    );
    if (undeveloped.length >= 6)
      add(
        "development",
        35,
        "Most minor pieces remain on their starting squares; development and king safety matter more than flank pawn moves.",
      );
  }
  const used = new Set<string>();
  return insights
    .sort((a, b) => b.priority - a.priority)
    .filter((i) => {
      if (used.has(i.theme)) return false;
      used.add(i.theme);
      return true;
    })
    .slice(0, 3)
    .map((i) => i.text);
}
