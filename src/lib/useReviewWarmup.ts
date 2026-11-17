import {useEffect} from 'react';
import {search} from './engine';
import {cachedReview,cacheReview} from './reviewCache';
import {base} from './store';
import type {SavedGame} from './types';
// Only use spare time on the human's turn; abort before the opponent searches.
export function useReviewWarmup(game:SavedGame|null|undefined,enabled:boolean){
 useEffect(()=>{if(!enabled || !game || !['chess','blind','blindtext'].includes(game.variant))return;
 const controller=new AbortController(),worker=new Worker(new URL(`${base}engine/stockfish-19-lite-single.js`,document.baseURI));
 void (async()=>{try{for(const fen of game.positions){if(controller.signal.aborted)break;if(cachedReview(fen))continue;const result=await search(fen,{worker,signal:controller.signal,time:350,depth:18});if(!controller.signal.aborted)cacheReview(fen,result);}}catch{}finally{worker.terminate();}})();
 return()=>{controller.abort();worker.terminate();};
 },[game?.id,game?.moves.length,enabled]);
}
