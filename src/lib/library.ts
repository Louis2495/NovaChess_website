import type { SavedGame } from "./types";
export function isStudy(g: SavedGame) {
  return g.kind
    ? g.kind === "study"
    : !g.id.startsWith("famous-") &&
        (g.folder === "Studies" || !!g.branches?.length);
}
export function isMatein4Game(g: SavedGame) {
  return g.origin
    ? g.origin === "novachess"
    : !isStudy(g) &&
        !!(
          g.special ||
          g.opponent === "Computer" ||
          g.opponentChoice ||
          g.botRating
        );
}
export function libraryKind(g: SavedGame) {
  return isStudy(g)
    ? "Studies"
    : isMatein4Game(g)
      ? "Matein4"
      : "Games";
}
