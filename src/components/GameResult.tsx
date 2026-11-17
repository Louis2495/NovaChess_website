import { Crown, Handshake } from "lucide-react";
export default function GameResult({ result, human }: { result: string; human?: "w" | "b" | null }) {
  if (result === "*") return null;
  return (
    <div
      className={`game-result-banner ${result === "1/2-1/2" ? "draw" : "win"}`}
      role="status"
    >
      {result === "1/2-1/2" ? <Handshake size={42} /> : <Crown size={42} />}
      <strong>
        {result === (human === "w" ? "1-0" : human === "b" ? "0-1" : "") ? "You won!" : result === "1-0" ? "White won" : result === "0-1" ? "Black won" : "Draw"}
      </strong>
    </div>
  );
}
