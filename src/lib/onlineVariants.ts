import type {FairyStockfish} from 'ffish-es6';
import {chess960, customVariants, variantList} from './variantCatalog.ts';
export const onlineVariantIds=[...variantList.map(v=>v.id),'speedrun'];
export const specialVariants=['dropping','chaos','random'];
export const nativeVariant=(id:string)=>['blind','blindtext','chess960','speedrun'].includes(id)?'chess':id;
export type OnlinePosition={fen:string;initial:string;moves:string[];notation:string[];positions:string[];result:string;partner?:OnlinePosition;speedrun?:{elapsed:{w:number;b:number};startedAt:number|null};gameKey?:string;clock?:{incrementMs?:number;remaining:{w:number;b:number};startedAt:number|null}};
export function setupOnlineEngine(ff:FairyStockfish){ff.loadVariantConfig(customVariants);}
export function freshOnline(ff:FairyStockfish,id:string):OnlinePosition {
 const b=id==='chess960'?new ff.Board('chess',chess960(),true):new ff.Board(nativeVariant(id));
 try {const fen=b.fen();return {fen,initial:fen,moves:[],notation:[],positions:[fen],result:'*',...(id==='bughouse'?{partner:freshOnline(ff,'crazyhouse')}:{}),...(id==='speedrun'?{speedrun:{elapsed:{w:0,b:0},startedAt:null}}:{})};}finally{b.delete();}
}
function positionBoard(ff:FairyStockfish,id:string,pos:OnlinePosition){
 const b=new ff.Board(nativeVariant(id),id==='bughouse'?pos.fen:pos.initial||pos.positions[0],id==='chess960');
 if(id!=='bughouse')for(const move of pos.moves){if(!b.push(move)){b.delete();throw Error('Invalid game history.');}}
 return b;
}
export function onlineLegal(ff:FairyStockfish,id:string,state:OnlinePosition,board=0){
 const pos=board?state.partner!:state,b=positionBoard(ff,id,pos);
 try{return b.legalMoves().trim().split(/\s+/).filter(Boolean);}finally{b.delete();}
}
function pieceAt(fen:string,square:string){const rows=fen.split(' ')[0].replace(/\[.*\]/,'').split('/');let x=0;for(const p of rows[8-Number(square[1])]||''){if(/[1-8]/.test(p))x+=+p;else if(p!=='~'){if(x===square.charCodeAt(0)-97)return p;x++;}}return '';}
function promoted(fen:string,sq:string){const rows=fen.split(' ')[0].replace(/\[.*\]/,'').split('/');let x=0;const row=rows[8-Number(sq[1])]||'';for(let i=0;i<row.length;i++){if(/[1-8]/.test(row[i]))x+=+row[i];else if(row[i]!=='~'){if(x===sq.charCodeAt(0)-97)return row[i+1]==='~';x++;}}return false;}
function addPocket(fen:string,piece:string){const parts=fen.split(' ');if(parts[0].includes('['))parts[0]=parts[0].replace(']',piece+']');else parts[0]+='['+piece+']';return parts.join(' ');}
export function applyOnline(ff:FairyStockfish,id:string,state:OnlinePosition,move:string,board=0,now=Date.now()):OnlinePosition {
 if(board!==0 && !(id==='bughouse' && board===1))throw Error('Unknown board.');
 const pos=board?state.partner!:state,b=positionBoard(ff,id,pos);
 try {
  if(!b.legalMoves().split(/\s+/).includes(move))throw Error('Illegal move.');
  const color=b.turn()?'w':'b',san=b.sanMove(move),from=move.slice(0,2),to=move.slice(2,4);
  let captured=id==='bughouse'&&!move.includes('@')?pieceAt(pos.fen,to):'';
  if(id==='bughouse' && captured && promoted(pos.fen,to))captured=captured===captured.toUpperCase()?'P':'p';
  if(id==='bughouse' && !captured && !move.includes('@') && pieceAt(pos.fen,from).toLowerCase()==='p' && from[0]!==to[0])captured=pieceAt(pos.fen,to[0]+from[1]);
  b.push(move);const fen=b.fen(),result=b.isGameOver()?b.result():'*';
  const nextPos={...pos,fen,moves:[...pos.moves,move],notation:[...pos.notation,san],positions:[...pos.positions,fen],result};
  let next:OnlinePosition=board?{...state,partner:nextPos}:{...nextPos};
  if(id==='bughouse'){
   const other=board?next:next.partner!;
   if(captured){const updated=addPocket(other.fen,captured),positions=[...other.positions];positions[positions.length-1]=updated;if(board)next={...next,fen:updated,positions};else next={...next,partner:{...other,fen:updated,positions}};}
   if(result!=='*')next.result=board && result!=='1/2-1/2'?(result==='1-0'?'0-1':'1-0'):result;
  }
  if(state.speedrun)next.speedrun={elapsed:{...state.speedrun.elapsed,[color]:state.speedrun.elapsed[color]+(state.speedrun.startedAt===null?0:Math.max(0,now-state.speedrun.startedAt))},startedAt:next.result==='*'?now:null};
  return next;
 }finally{b.delete();}
}
