import type { CSSProperties } from "react";
import { base } from "../lib/store";
// Row-major tile order in the illustration sheet.
const tiles = [
  "chess",
  "dropping",
  "chaos",
  "random",
  "blind",
  "blindtext",
  "crazyhouse",
  "duck",
  "atomic",
  "cvfog",
  "3check",
  "kingofthehill",
  "horde",
  "antichess",
  "cvpawns",
  "cvpawnrace",
  "chess960",
  "bughouse",
];
export default function VariantIcon({
  id,
  size = 24,
}: {
  id: string;
  size?: number;
}) {
  const index = Math.max(0, tiles.indexOf(id));
  return (
    <span
      className="variant-picture"
      aria-hidden="true"
      style={
        {
          "--variant-size": `${size}px`,
          backgroundImage: `url("${base}variants/${id === "horde" ? "horde.webp" : "illustrations.webp"}")`,
          backgroundSize: id === "horde" ? "100% 100%" : undefined,
          backgroundPosition:
            id === "horde"
              ? "center"
              : `${(index % 6) * 20}% ${Math.floor(index / 6) * 50}%`,
        } as CSSProperties
      }
    />
  );
}
