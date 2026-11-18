import { base } from "../lib/store";
import { Button } from "./UI";
export default function GameResult({ result, human, onReview }: { result: string; human?: "w" | "b" | null; onReview?: () => void }) {
  if (result === "*") return null;
  return (
    <div className={`game-result-banner ${result === "1/2-1/2" ? "draw" : "win"}`} role="status">
      <img className="sad-king-picture" src={`${base}sad-king.svg`} alt="Sad chess king" />
      <strong>
        {result === (human === "w" ? "1-0" : human === "b" ? "0-1" : "") ? "You won!" : result === "1-0" ? "White won" : result === "0-1" ? "Black won" : "Draw"}
      </strong>
      {onReview && <Button onClick={onReview}>Game review</Button>}
    </div>
  );
}
