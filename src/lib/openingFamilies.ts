import { Chess } from "chess.js";
import type { Opening, Repertoire } from "./types";

export const openingFamily = (name: string) => name.split(":", 1)[0].trim();

export function groupByOpening<T>(lines: T[], familyOf: (line: T) => string) {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    const family = familyOf(line);
    const group = groups.get(family);
    if (group) group.push(line);
    else groups.set(family, [line]);
  }
  return [...groups].map(([family, lines]) => ({ family, lines }));
}

export function repertoireFamilyLookup(openings: Opening[]) {
  const families = new Set<string>();
  const positions = new Map<string, string>();
  for (const opening of openings) {
    const family = openingFamily(opening.name);
    families.add(family);
    if (opening.key && !positions.has(opening.key)) positions.set(opening.key, family);
  }
  const lookup = (board: Chess) => positions.get(board.fen().split(" ").slice(0, 4).join(" "));
  return (line: Repertoire) => {
    let family: string | undefined;
    try {
      const board = new Chess(line.initial);
      family = lookup(board);
      for (const move of line.moves) {
        board.move(move);
        family = lookup(board) ?? family;
      }
    } catch {
      // Keep the last recognized opening for older or incomplete lines.
    }
    const named = openingFamily(line.name);
    return family ?? (families.has(named) ? named : "Other lines");
  };
}
