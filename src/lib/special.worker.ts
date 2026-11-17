import {cells,specialApply,specialBot,specialTurn,type SpecialState} from './specialRules';
self.onmessage=({data}:{data:{state:SpecialState;side:'w'|'b'}})=>{
 try{
  let next=data.state;
  if(next.variant==='chaos' && !next.freezeUsed.includes(specialTurn(next)) && next.ply>8){
   const pieces=cells(next.fen),enemy=Object.keys(pieces).filter(square=>(pieces[square]===pieces[square].toUpperCase()?'w':'b')===data.side && pieces[square].toLowerCase()!=='k');
   if(enemy.length)next=specialApply(next,{type:'freeze',square:enemy[Math.floor(Math.random()*enemy.length)]});
  }
  const move=specialBot(next);self.postMessage({state:move?specialApply(next,{type:'move',move}):null});
 }catch(e){self.postMessage({error:(e as Error).message});}
};
