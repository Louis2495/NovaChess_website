import {Chess} from 'chess.js';
export type ResearchGame={moves:string[];result:string;color:string;pgn:string};
const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// Research explores the first 20 full moves. Keep the original PGN for export,
// but never replay the rest of a long game just to build its opening prefix.
export function parseResearchPGN(pgn:string,username=''):ResearchGame|null {
 try{
  const headers:Record<string,string>={};
  const body=pgn.replace(/^\s*\[(\w+)\s+"((?:\\.|[^"\\])*)"\]\s*$/gm,(_,key,value)=>{headers[key]=value.replace(/\\([\\"])/g,'$1');return '';});
  if(headers.Variant&&!['standard','chess'].includes(headers.Variant.toLowerCase()))return null;
  if(headers.FEN&&headers.FEN!==initial)return null;
  const board=new Chess(),moves:string[]=[];let token='',comment=false,lineComment=false,variation=0,result=headers.Result||'*';
  const consume=()=>{
   const san=token.replace(/^\d+\.(?:\.\.)?/,'').replace(/\$\d+/g,'').replace(/[!?]+$/,'');token='';
   if(!san||/^\.+$/.test(san)||san==='e.p.')return;
   if(['1-0','0-1','1/2-1/2','*'].includes(san)){if(!headers.Result)result=san;return;}
   const m=board.move(san);moves.push(m.from+m.to+(m.promotion||''));
  };
  for(let i=0;i<=body.length&&moves.length<40;i++){
   const ch=body[i]||' ';
   if(lineComment){if(ch==='\n')lineComment=false;continue;}
   if(comment){if(ch==='}')comment=false;continue;}
   if(ch==='{'){consume();comment=true;continue;}
   if(ch===';'||(ch==='%'&&(i===0||body[i-1]==='\n'))){consume();lineComment=true;continue;}
   if(ch==='('){consume();variation++;continue;}
   if(ch===')'){variation=Math.max(0,variation-1);continue;}
   if(variation)continue;
   if(/\s/.test(ch))consume();else token+=ch;
  }
  return moves.length?{moves,result,color:username?(headers.White||'').toLowerCase()===username.toLowerCase()?'w':'b':'both',pgn}:null;
 }catch{return null;}
}
