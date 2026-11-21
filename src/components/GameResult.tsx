import { base } from "../lib/store";
import { Button } from "./UI";

export default function GameResult({ result, human, onReview }: {
  result: string;
  human?: "w" | "b" | null;
  onReview?: () => void;
}) {
  if (result === "*") return null;

  const draw = result === "1/2-1/2";
  const winner = result === "1-0" ? "w" : "b";
  const won = human === winner;
  const lost = !draw && human != null && !won;
  const title = draw ? "Draw" : won ? "You won!" : winner === "w" ? "White won" : "Black won";

  return (
    <div className={`game-result-banner ${draw ? "draw" : lost ? "loss" : "win"}`} role="status">
      {!draw && (
        <img className="game-result-king" src={`${base}${lost ? "sad-king.png" : "novachess-king.png"}`}
          alt={lost ? "Sad chess king" : "Happy chess king"} />
      )}
      <strong>{title}</strong>
      {onReview && <Button onClick={onReview}>Game review</Button>}
    </div>
  );
}
