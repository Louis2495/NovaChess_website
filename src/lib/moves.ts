import { Chess } from "chess.js";
export type NamedMove = { uci: string; san: string };
const clean = (s: string) =>
  s
    .trim()
    .replace(/^\d+\.(?:\.\.)?\s*/, "")
    .replace(/[+#?!\s]/g, "")
    .replace(/0/g, "O");
export function matchTypedMove(input: string, moves: NamedMove[]) {
  const text = clean(input);
  const coordinate = moves.find(
    (m) => m.uci.toLowerCase() === text.toLowerCase(),
  );
  if (coordinate) return coordinate.uci;
  const exact = moves.find((m) => clean(m.san) === text);
  if (exact) return exact.uci;
  const matches = moves.filter(
    (m) => clean(m.san).toLowerCase() === text.toLowerCase(),
  );
  if (matches.length > 1 && /^[bB]/.test(text)) {
    const bishop = text[0] === "B";
    return matches.find((m) => (m.san[0] === "B") === bishop)?.uci;
  }
  return matches[0]?.uci;
}
export function parseTypedMove(chess: Chess, text: string) {
  const moves = chess.moves({ verbose: true });
  const uci = matchTypedMove(
    text,
    moves.map((m) => ({
      uci: m.from + m.to + (m.promotion || ""),
      san: m.san,
    })),
  );
  if (!uci) throw Error("Enter a legal move.");
  return moves.find((m) => m.from + m.to + (m.promotion || "") === uci)!;
}
export function moveCount(turns: number) {
  return Math.ceil(turns / 2);
}
export function humanTheme(theme: string) {
  return theme
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}
