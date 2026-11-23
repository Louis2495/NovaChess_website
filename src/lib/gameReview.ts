import { Chess } from "chess.js";
import type { ReviewRow, SavedGame } from "./types";
export function classifyMove(best: boolean, loss: number, book: boolean) {
  return book && loss < 30 ? "Book" : best ? "Best" : loss < 15 ? "Great" : loss < 40 ? "Good" : loss < 100 ? "Inaccuracy" : loss < 250 ? "Mistake" : "Blunder";
}
export function reviewQuality(label: string) {
  const key = label.toLowerCase();
  return key === "book" ? "book" : key.includes("blunder") ? "blunder" : key.includes("mistake") ? "mistake" : key.includes("inaccuracy") ? "inaccuracy" : key.includes("best") || key.includes("top") ? "best" : (key === "excellent" || key === "great") ? "great" : "good";
}
export function performanceRating(rows: ReviewRow[]) {
  const moves = rows.filter(r => r.label !== "Book");
  // Short opening fragments cannot support a useful performance estimate.
  if (moves.length < 8) return null;
  const loss = moves.reduce((s,r)=>s+Math.min(1000,r.loss),0)/moves.length;
  return Math.round(Math.max(400, Math.min(3000, 2800-750*Math.log1p(loss/12)))/25)*25;
}

export function restoreReviewHistory(game: SavedGame): SavedGame {
  if (!["chess", "blind", "blindtext"].includes(game.variant) ||
    game.positions.length === game.moves.length + 1) return game;
  try {
    const board = new Chess(game.initial);
    const positions = [board.fen()];
    const notation = game.moves.map(move => {
      const played = board.move(move);
      positions.push(board.fen());
      return played.san;
    });
    return { ...game, positions, notation, review: undefined };
  } catch {
    return game;
  }
}
