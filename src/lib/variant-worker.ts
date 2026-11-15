import { fairy, makeBoard, legal, squares } from "./variants";
const values: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};
self.onmessage = async (e: MessageEvent) => {
  const { variant, initial, moves, budget } = e.data;
  let b;
  try {
    const ff = await fairy();
    b = makeBoard(ff, variant, initial, moves);
    const root = b.turn() ? "w" : "b",
      start = performance.now(),
      maxDepth = variant === "duck" ? 1 : budget > 600 ? 3 : 2;
    let nodes = 0;
    const evaluate = () => {
      if (b!.isGameOver()) {
        const result = b!.result();
        return result === "1-0"
          ? root === "w"
            ? 100000
            : -100000
          : result === "0-1"
            ? root === "b"
              ? 100000
              : -100000
            : 0;
      }
      let score = 0;
      for (const [sq, p] of Object.entries(squares(b!.fen()))) {
        if (p === "*") continue;
        const side = p === p.toUpperCase() ? "w" : "b";
        let v = values[p.toLowerCase()] || 100;
        const center =
          3.5 -
          Math.max(
            Math.abs(sq.charCodeAt(0) - 97 - 3.5),
            Math.abs(Number(sq[1]) - 1 - 3.5),
          );
        v += center * 5;
        if (variant === "kingofthehill" && p.toLowerCase() === "k")
          v += center * 120;
        score += (side === root ? 1 : -1) * v;
      }
      return variant === "antichess" ? -score : score;
    };
    const minimax = (
      depth: number,
      alpha: number,
      beta: number,
      max: boolean,
    ): number => {
      nodes++;
      if (depth === 0 || performance.now() - start > budget || b!.isGameOver())
        return evaluate();
      const ms = legal(b!).sort(
        (a, z) => Number(b!.isCapture(z)) - Number(b!.isCapture(a)),
      );
      let best = max ? -Infinity : Infinity;
      for (const m of ms.slice(0, variant === "duck" ? 40 : 80)) {
        b!.push(m);
        const val = minimax(depth - 1, alpha, beta, !max);
        b!.pop();
        best = max ? Math.max(best, val) : Math.min(best, val);
        if (max) alpha = Math.max(alpha, best);
        else beta = Math.min(beta, best);
        if (beta <= alpha || performance.now() - start > budget) break;
      }
      return best;
    };
    let bestMove = "",
      best = -Infinity;
    const candidates = legal(b)
      .sort(() => Math.random() - 0.5)
      .sort((a, z) => Number(b!.isCapture(z)) - Number(b!.isCapture(a)));
    for (const move of candidates) {
      b.push(move);
      const value = minimax(maxDepth - 1, -Infinity, Infinity, false);
      b.pop();
      if (value > best) {
        best = value;
        bestMove = move;
      }
      if (bestMove && performance.now() - start > budget) break;
    }
    self.postMessage({ move: bestMove, nodes });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Variant opponent failed.",
    });
  } finally {
    b?.delete();
  }
};
