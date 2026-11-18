import type { SavedGame } from './types';
export function duration(ms: number, omitZeroMinutes = false) {
 const seconds=Math.floor(Math.max(0,ms)/1000);
 if(omitZeroMinutes && seconds<60)return `${seconds}.${Math.floor(Math.max(0,ms)%1000/100)}`;
 return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}.${Math.floor(ms%1000/100)}`;
}
export function speedrunBests(games: SavedGame[]) {
 const best=new Map<number,SavedGame>();
 for(const g of games){if(!g.speedrun || g.speedrun.invalid || g.result!==(g.human==='w'?'1-0':'0-1'))continue;const elo=g.botRating||0,old=best.get(elo);if(!old || old.speedrun!.elapsedMs>g.speedrun.elapsedMs)best.set(elo,g);}
 return [...best.entries()].sort((a,b)=>a[0]-b[0]);
}

export function throneDuration(ms:number) {
 const seconds=Math.floor(Math.max(0,ms)/1000);
 return `${Math.floor(seconds/3600)}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
