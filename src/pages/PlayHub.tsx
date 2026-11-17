import { useState } from "react";
import { useApp } from "../lib/context";
import Play from "./Play";
import Community from "./Community";
import VariantIcon from "../components/VariantIcon";
import MultiplayerPicture from "../components/MultiplayerPicture";

const onlineVariants = [
  ["throne", "Throne"], ["vote", "Vote Chess"], ["team", "Team Chess"],
  ["dropping", "Dropping Squares"], ["chaos", "Chaos chess"], ["random", "Random"],
];
const teamModes = ["throne", "vote", "team"];
export default function PlayHub({ variants = false }: { variants?: boolean }) {
  const { detail } = useApp();
  const [opponent, setOpponent] = useState("computer"),
    [mode, setMode] = useState("throne"),
    [playing, setPlaying] = useState(false);
  const online = opponent === "online";
  if (detail.startsWith("online/")) return <Community />;
  if (detail === "resume") return <Play variantsOnly={variants} />;
  return <>
    {!playing && <div className="play-hub-heading">
      {online ? <h1 className={variants ? "" : "sr-only"}>{variants ? "Variants" : "Play"}</h1> : <h2 className={variants ? "" : "sr-only"}>{variants ? "Variants" : "Play"}</h2>}
      <div className="play-opponent-toggle" role="group" aria-label="Opponent">
        {[["computer", "Computer"], ["online", "Online"]].map(([id, label]) =>
          <button key={id} aria-pressed={opponent === id} onClick={() => setOpponent(id)}>{label}</button>)}
      </div>
    </div>}
    {variants && online && <div className="multiplayer-modes" role="group" aria-label="Online variants">
      {onlineVariants.map(([id, label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>
        {teamModes.includes(id) ? <MultiplayerPicture mode={id} /> : <VariantIcon id={id} size={118} />}
        {label}
      </button>)}
    </div>}
    {online ? <Community key={variants ? mode : "standard"}
      presetMode={variants && teamModes.includes(mode) ? mode : "standard"}
      presetVariant={variants && !teamModes.includes(mode) ? mode : "chess"} />
      : <Play variantsOnly={variants} onPlayingChange={setPlaying} />}
  </>;
}
