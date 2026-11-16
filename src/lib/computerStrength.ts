import type { EngineLine } from "./engine";
/** Below Stockfish's 1320 minimum, mix imperfect candidates with occasional oversights. */
export function weakComputerMove(legal: string[], lines: EngineLine[], side: string, rating: number, random = Math.random, baseline?: string) {
  const elo = Math.max(400, Math.min(1320, rating));
  if (!legal.length) return "";
  // Keep the engine's native 1320-strength choice near its supported minimum.
  // Lower targets introduce additional, increasingly frequent mistakes.
  const anchor = baseline && legal.includes(baseline) ? baseline : undefined;
  if (anchor && random() >= Math.min(.8, (1320-elo)/1200)) return anchor;
  const sign = side === "w" ? 1 : -1;
  const anchorScore = lines.find(l => l.moves[0] === anchor)?.score;
  const candidates = lines.filter(l => legal.includes(l.moves[0]) &&
    (!anchor || l.moves[0] !== anchor && (anchorScore === undefined || l.score*sign < anchorScore*sign)));
  if (!candidates.length || random() < (anchor ? .45 : Math.min(.45, (1320-elo)/2200)))
    return legal[Math.min(legal.length-1, Math.floor(random()*legal.length))];
  const best = Math.max(...candidates.map(l => l.score*sign));
  const temperature = 20 + (1320-elo)*.3;
  const weights = candidates.map(l => Math.exp(Math.max(-30,(l.score*sign-best)/temperature)));
  let pick = random()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<candidates.length;i++) { pick -= weights[i]; if(pick<=0) return candidates[i].moves[0]; }
  return candidates.at(-1)!.moves[0];
}
