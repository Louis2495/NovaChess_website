import type { EngineLine } from './engine';
type Evaluation={best:string;lines:EngineLine[]};
const positions=new Map<string,Evaluation>();
export function cachedReview(fen:string,depth=14){const entry=positions.get(fen);return entry && (entry.lines[0]?.depth>=depth || entry.lines[0]?.mate!==null && entry.lines[0]?.mate!==undefined)?entry:undefined;}
export function cacheReview(fen:string,entry:Evaluation){if(!entry.lines[0] || entry.lines[0].depth<(positions.get(fen)?.lines[0]?.depth||0))return;positions.delete(fen);positions.set(fen,entry);while(positions.size>512)positions.delete(positions.keys().next().value!);}
