import {Chess} from 'chess.js';
import type {FairyStockfish} from 'ffish-es6';
import {specialApply,type SpecialState} from './specialRules.ts';
import {applyOnline,specialVariants,type OnlinePosition} from './onlineVariants.ts';
export function previewRoomMove(ff:FairyStockfish|null,variant:string,state:OnlinePosition,move:string,board=0,specialAction?:unknown):OnlinePosition|null{
 try{
  if(specialVariants.includes(variant))return specialApply(state as unknown as SpecialState,(specialAction || {type:'move',move}) as Parameters<typeof specialApply>[1]) as unknown as OnlinePosition;
  if(variant!=='chess')return ff?applyOnline(ff,variant,state,move,board):null;
  const chess=new Chess(state.fen),side=chess.turn(),now=Date.now();
  const played=chess.move(move);if(!played)return null;
  return {...state,...(state.clock?{clock:{remaining:{...state.clock.remaining,[side]:Math.max(0,state.clock.remaining[side]-(state.clock.startedAt===null?0:Math.max(0,now-state.clock.startedAt)))},startedAt:now}}:{}),fen:chess.fen(),moves:[...state.moves,move],notation:[...state.notation,played.san],positions:[...state.positions,chess.fen()],result:chess.isCheckmate()?(chess.turn()==='w'?'0-1':'1-0'):chess.isDraw()?'1/2-1/2':'*'};
 }catch{return null;}
}
