import { X, Undo2 } from "lucide-react";
import { IconButton } from "./UI";
export default function PremoveQueue({
  moves,
  undo,
  clear,
}: {
  moves: string[];
  undo: () => void;
  clear: () => void;
}) {
  if (!moves.length) return null;
  return (
    <div className="queued-moves" role="status">
      <span>
        Queued{" "}
        {moves
          .map((m) => m.replace(/^([a-h][1-8])([a-h][1-8])/, "$1–$2"))
          .join(" · ")}
      </span>
      <IconButton label="Undo last premove" onClick={undo}>
        <Undo2 size={16} />
      </IconButton>
      <IconButton label="Clear premoves" onClick={clear}>
        <X size={16} />
      </IconButton>
    </div>
  );
}
