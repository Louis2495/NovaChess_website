import {
  Crown,
  EyeOff,
  TextCursorInput,
  Backpack,
  Bird,
  Atom,
  CloudFog,
  ListChecks,
  Mountain,
  Users,
  ArrowDownUp,
  Sprout,
  Flag,
  Shuffle,
  PanelsTopLeft,
} from "lucide-react";
const icons: Record<string, typeof Crown> = {
  dropping: PanelsTopLeft,
  chaos: Shuffle,
  random: Shuffle,
  chess: Crown,
  blind: EyeOff,
  blindtext: TextCursorInput,
  crazyhouse: Backpack,
  duck: Bird,
  atomic: Atom,
  cvfog: CloudFog,
  "3check": ListChecks,
  kingofthehill: Mountain,
  horde: Users,
  antichess: ArrowDownUp,
  cvpawns: Sprout,
  cvpawnrace: Flag,
  chess960: Shuffle,
  bughouse: PanelsTopLeft,
};
export const variantSymbols: Record<string, string> = {
  dropping: "▧",
  chaos: "↯",
  random: "⚄",
  chess: "♔",
  blind: "◉",
  blindtext: "⌨",
  crazyhouse: "♙",
  duck: "♧",
  atomic: "⚛",
  cvfog: "☁",
  "3check": "☷",
  kingofthehill: "△",
  horde: "♟",
  antichess: "⇅",
  cvpawns: "♙",
  cvpawnrace: "⚑",
  chess960: "⤨",
  bughouse: "▦",
};
export default function VariantIcon({
  id,
  size = 18,
}: {
  id: string;
  size?: number;
}) {
  const Icon = icons[id] || Crown;
  return <Icon size={size} aria-hidden="true" />;
}
