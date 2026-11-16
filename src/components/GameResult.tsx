import { Crown, Handshake } from "lucide-react";
export default function GameResult({ result }: { result: string }) {
  if (result === "*") return null;
  return (
    <div
      className={`game-result-banner ${result === "1/2-1/2" ? "draw" : "win"}`}
      role="status"
    >
      {result === "1/2-1/2" ? <Handshake size={42} /> : <Crown size={42} />}
      <strong>
        {result === "1-0"
          ? "White wins"
          : result === "0-1"
            ? "Black wins"
            : "Draw"}
      </strong>
    </div>
  );
}
