import { base } from "../lib/store";
export default function MultiplayerPicture({ mode }: { mode: string }) {
  const panel = { throne: "0%", vote: "50%", team: "100%" }[mode] || "0%";
  return <span className="multiplayer-picture" aria-hidden="true" style={{ backgroundImage: `url("${base}variants/multiplayer.png")`, backgroundPosition: `${panel} center` }} />;
}
