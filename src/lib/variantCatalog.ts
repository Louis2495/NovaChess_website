export const customVariants = `[cvfog:chess]\n[cvpawns:chess]\nstartFen = 4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1\ncastling = false\n[cvpawnrace:chess]\nking = -\nstartFen = 8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1\ncastling = false\npromotionPieceTypes = -\nmandatoryPawnPromotion = false\nflagPiece = p\nflagRegionWhite = *8\nflagRegionBlack = *1\nextinctionValue = loss\nextinctionPieceTypes = *\nstalemateValue = loss`;
export const variantOrder = ["throne","vote","team","speedrun","bughouse","crazyhouse","chess960","horde","kingofthehill","atomic","antichess","cvfog","blind","blindtext","duck"];
export const variantRank = (id:string) => { const rank=variantOrder.indexOf(id); return rank<0?100:rank; };
export const variantList = [
  { id: "chess", name: "Standard", description: "" },
  {
    id: "dropping",
    name: "Dropping Squares",
    description:
      "A square drops every five full moves. Dropped squares block movement.",
  },
  {
    id: "chaos",
    name: "Chaos chess",
    description: "Two-step pawns, one freeze and one piece switch per player.",
  },
  {
    id: "random",
    name: "Random",
    description: "Each turn selects the piece you must move.",
  },
  {
    id: "blind",
    name: "Blindfold · board",
    description: "Hidden pieces. Legal moves by memory.",
  },
  {
    id: "blindtext",
    name: "Blindfold · text",
    description: "Notation only. No board.",
  },
  {
    id: "crazyhouse",
    name: "Crazyhouse",
    description: "Drop captured pieces from your pocket.",
  },
  {
    id: "duck",
    name: "Duck chess",
    description: "Move a piece, then place the duck. Capture the king.",
  },
  {
    id: "atomic",
    name: "Atomic",
    description: "Captures explode nearby non-pawns.",
  },
  {
    id: "cvfog",
    name: "Fog of War",
    description: "Limited visibility. Win by checkmate.",
  },
  {
    id: "3check",
    name: "3-Check",
    description: "Give three checks or checkmate.",
  },
  {
    id: "kingofthehill",
    name: "King of the Hill",
    description: "Safely move your king to a central square.",
  },
  {
    id: "horde",
    name: "Horde",
    description: "White’s pawns against Black’s army.",
  },
  {
    id: "antichess",
    name: "Antichess",
    description: "Captures are compulsory. Lose your army.",
  },
  {
    id: "cvpawns",
    name: "Pawn Wars",
    description: "Pawns and kings, with promotions.",
  },
  {
    id: "cvpawnrace",
    name: "Pawn race",
    description: "No kings. Reach the last rank.",
  },
  {
    id: "chess960",
    name: "Chess960",
    description: "Random back rank. Castle by moving king to rook.",
  },
  {
    id: "bughouse",
    name: "Bughouse",
    description: "Two boards. Captures supply your partner.",
  },
];
export function chess960() {
  const files = Array(8).fill("");
  const even = [0, 2, 4, 6][Math.floor(Math.random() * 4)],
    odd = [1, 3, 5, 7][Math.floor(Math.random() * 4)];
  files[even] = "B";
  files[odd] = "B";
  let empty = () => files.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
  files[empty()[Math.floor(Math.random() * 6)]] = "Q";
  for (let n = 0; n < 2; n++) {
    const e = empty();
    files[e[Math.floor(Math.random() * e.length)]] = "N";
  }
  const e = empty();
  e.forEach((v, i) => (files[v] = ["R", "K", "R"][i]));
  const rank = files.join("");
  const rights = e
    .filter((_, i) => i !== 1)
    .map((v) => "ABCDEFGH"[v])
    .join("");
  return `${rank.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${rank} w ${rights}${rights.toLowerCase()} - 0 1`;
}
