import { useState } from "react";
import { useApp } from "../lib/context";
import Play from "./Play";
import Community from "./Community";
import {variantList,variantRank} from "../lib/variantCatalog";
import {base} from "../lib/store";
import VariantIcon from "../components/VariantIcon";
import MultiplayerPicture from "../components/MultiplayerPicture";

const onlineVariants = [
  ["throne", "Throne"], ["vote", "Vote Chess"], ["team", "Team Chess"],
  ...variantList.filter(v=>v.id!=="chess").map(v=>[v.id,v.name]),
  ["speedrun","Speedrun"],
].sort((a,b)=>variantRank(a[0])-variantRank(b[0]));
const teamModes = ["throne", "vote", "team"];
export default function PlayHub({ variants = false }: { variants?: boolean }) {
  const { detail } = useApp();
  const [opponent, setOpponent] = useState("online"),
    [mode, setMode] = useState("throne"),
    [playing, setPlaying] = useState(false),[timeControl,setTimeControl]=useState("180:0");
  const online = opponent === "online";
  if (detail.startsWith("online/")) return <Community />;
  if (detail === "resume") return <Play variantsOnly={variants} />;
  return <div className={`play-hub ${variants ? "variants-hub" : "standard-play-hub"} ${playing ? "match-active" : "setup-active"} ${online ? "online-opponent" : "computer-opponent"}`}>
    {!playing && <div className="play-hub-heading">
      {online ? <h1 className="sr-only">{variants ? "Variants" : "Play"}</h1> : <h2 className="sr-only">{variants ? "Variants" : "Play"}</h2>}
      <div className="play-opponent-toggle" role="group" aria-label="Opponent">
        {[["online", "Online"], ["computer", "Computer"]].map(([id, label]) =>
          <button key={id} aria-pressed={opponent === id} onClick={() => setOpponent(id)}>{label}</button>)}
      </div>
      {!variants && online && <div className="time-control-toggle" role="group" aria-label="Time control">{[["180:0","3"],["180:2","3|2"],["300:0","5"],["600:0","10"]].map(([id,label])=><button key={id} aria-pressed={timeControl===id} onClick={()=>setTimeControl(id)}>{label}</button>)}</div>}
    </div>}


    {online ? <Community key={variants ? mode : "standard"+timeControl}
      timeControlSeconds={+timeControl.split(":")[0]} incrementSeconds={+timeControl.split(":")[1]}
      presetMode={variants && teamModes.includes(mode) ? mode : "standard"}
      presetVariant={variants && !teamModes.includes(mode) ? mode : "chess"}>
    {variants && online && <div className="variant-gallery online-variant-gallery" role="group" aria-label="Online variants">
      {onlineVariants.map(([id, label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>
        {teamModes.includes(id) ? <MultiplayerPicture mode={id} /> : id === "speedrun" ? <img className="speedrun-picture" src={`${base}variants/speedrun.webp`} alt=""/> : <VariantIcon id={id} size={118} />}
        {label}
      </button>)}
    </div>}
    </Community>
      : <Play variantsOnly={variants} onPlayingChange={setPlaying} />}
  </div>;
}
