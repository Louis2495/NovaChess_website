import {parseResearchPGN} from './researchGames';
self.onmessage=({data}:{data:{id:number;pgns:string[];username:string}})=>{
 const games=data.pgns.map(pgn=>parseResearchPGN(pgn,data.username)).filter(game=>game!==null);
 self.postMessage({id:data.id,games});
};
