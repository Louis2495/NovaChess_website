import { useState } from "react";
import { Film } from "lucide-react";
import { useApp } from "../lib/context";
import { exportGIF } from "../lib/export";
import { Button } from "./UI";
export default function GameGIFButton({
  positions,
  flipped = false,
  delay = 650,
  blocked,
}: {
  positions: string[];
  flipped?: boolean;
  delay?: number;
  blocked?: string[];
}) {
  const { appearance, notify } = useApp();
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0);
  return (
    <Button
      className="secondary"
      disabled={busy || positions.length < 2}
      onClick={async () => {
        setBusy(true);
        setProgress(0);
        try {
          await exportGIF(positions, appearance, flipped, setProgress, {
            delay,
            blocked,
          });
          notify("GIF exported.");
        } catch (e) {
          notify((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Film size={16} />
      {busy ? `${progress}%` : "Game GIF"}
    </Button>
  );
}
