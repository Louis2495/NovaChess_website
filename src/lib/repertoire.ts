import { Chess, type Move } from "chess.js";
import { parseGames, type ParseTree } from "@mliebelt/pgn-parser";
import type { Repertoire } from "./types";

export const uci = (move: Move) => move.from + move.to + (move.promotion || "");
export const repertoirePaths = (line: Pick<Repertoire, "moves" | "branches">) =>
  [line.moves, ...(line.branches ?? [])];

export type RepertoireMove = {
  move: Move;
  number: number;
  children: RepertoireMove[];
};

export function repertoireTree(initial: string, paths: string[][]) {
  const root: RepertoireMove[] = [];
  for (const path of paths) {
    let siblings = root;
    const board = new Chess(initial);
    for (const id of path) {
      const number = board.moveNumber();
      const move = board.move(id);
      let node = siblings.find(child => uci(child.move) === id);
      if (!node) {
        node = { move, number, children: [] };
        siblings.push(node);
      }
      siblings = node.children;
    }
  }
  return root;
}

export function exportRepertoire(line: Repertoire) {
  function render(nodes: RepertoireMove[], withAlternatives = true): string {
    if (!nodes.length) return "";
    const [main, ...alternatives] = nodes;
    const move = `${main.number}${main.move.color === "w" ? "." : "..."} ${main.move.san}`;
    return [move, ...(withAlternatives ? alternatives.map(node => `(${render([node], false)})`) : []),
      render(main.children)].filter(Boolean).join(" ");
  }
  const board = new Chess(line.initial);
  board.setHeader("Event", line.name);
  board.setHeader("Orientation", line.side === "b" ? "Black" : "White");
  const headers = board.pgn().split("\n").filter(line => line.startsWith("[")).join("\n");
  return `${headers}\n\n${render(repertoireTree(line.initial, repertoirePaths(line)))} *\n`;
}

export function parseRepertoireStudy(pgn: string) {
  return parseGames(pgn).flatMap(({ tags, moves }, index) => {
    if (!moves.length) return [];
    const initial = new Chess(tags?.FEN).fen();
    const metadata = tags as Record<string, unknown> | undefined;
    const paths: string[][] = [];
    function visit(sequence: ParseTree["moves"], fen: string, prefix: string[]) {
      const board = new Chess(fen);
      const line = [...prefix];
      const sidelines: { sequence: ParseTree["moves"]; fen: string; prefix: string[] }[] = [];
      for (const item of sequence) {
        for (const variation of item.variations) {
          sidelines.push({ sequence: variation, fen: board.fen(), prefix: [...line] });
        }
        line.push(uci(board.move(item.notation.notation)));
      }
      paths.push(line);
      for (const sideline of sidelines) visit(sideline.sequence, sideline.fen, sideline.prefix);
    }
    visit(moves, initial, []);
    const [main, ...branches] = paths;
    const name = metadata?.ChapterName || metadata?.Chapter || tags?.Event;
    return [{
      name: typeof name === "string" && name !== "?" ? name.slice(0, 100) : `Chapter ${index + 1}`,
      initial, moves: main, branches,
      side: String(metadata?.Orientation).toLowerCase() === "black" ? "b" as const : "w" as const,
    }];
  });
}

export function lichessStudyExport(value: string) {
  const url = new URL(value.trim());
  const id = /^\/study\/([a-z0-9]{8})(?:\/|$)/i.exec(url.pathname)?.[1];
  if (url.protocol !== "https:" || url.hostname !== "lichess.org" || !id)
    throw Error("Enter a Lichess study link.");
  return `https://lichess.org/api/study/${id}.pgn?clocks=false`;
}
