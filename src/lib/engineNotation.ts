import { Chess } from "chess.js";
export function engineMoveRows(fen: string, moves: string[], limit = 12) {
  const board = new Chess(fen),
    rows: { number: number; white?: string; black?: string }[] = [];
  for (const uci of moves.slice(0, limit)) {
    try {
      const number = Number(board.fen().split(" ")[5]) || 1;
      const move = board.move(uci);
      let row = rows.at(-1);
      if (!row || row.number !== number) {
        row = { number };
        rows.push(row);
      }
      row[move.color === "w" ? "white" : "black"] = move.san;
    } catch {
      break;
    }
  }
  return rows;
}
