import {useEffect,useState} from "react";
import {Chess} from "chess.js";
import {search} from "../lib/engine";
import {Card} from "./UI";

export type PuzzleMistakePosition = {before:string; after:string; move:string};
export default function PuzzleMistake({position}:{position:PuzzleMistakePosition}) {
  const [explanation,setExplanation]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();
    const board=new Chess(position.after),side=new Chess(position.before).turn();
    setExplanation("");setLoading(true);
    if(board.isDraw()) {
      setExplanation(board.isStalemate()?`${position.move} leaves the opponent with no legal moves and no check: stalemate. The position is drawn instead of winning.`:`${position.move} leads to a drawn position instead of completing the puzzle.`);
      setLoading(false);return ()=>controller.abort();
    }
    void Promise.all([
      search(position.before,{time:900,signal:controller.signal}),
      search(position.after,{time:900,signal:controller.signal}),
    ]).then(([before,after])=>{
      if(controller.signal.aborted)return;
      const line=after.lines.find(l=>l.rank===1),baseline=before.lines.find(l=>l.rank===1);
      const moves:string[]=[];
      for(const uci of (line?.moves || [after.best]).slice(0,4)) {
        try {moves.push(board.move(uci).san);} catch {break;}
      }
      const opponent=side==='w'?'Black':'White',sign=side==='w'?1:-1;
      const reply=moves.length?`${opponent} can respond with ${moves.join(' → ')}. `:"";
      let reason="This move does not follow the puzzle’s intended winning continuation. Try finding a stronger forcing move.";
      if(line?.mate!==null && line?.mate!==undefined && line.mate*sign<0)
        reason=`This allows a forced checkmate against your king in ${Math.abs(line.mate)} moves.`;
      else if(line && baseline && baseline.mate===null && line.mate===null && (baseline.score-line.score)*sign>=75)
        reason=`The engine estimates that this gives up ${(((baseline.score-line.score)*sign)/100).toFixed(1)} pawns of advantage compared with the strongest continuation.`;
      else if(line && line.mate===null && line.score*sign < -150)
        reason=`The resulting position favors ${opponent} by about ${(Math.abs(line.score)/100).toFixed(1)} pawns.`;
      setExplanation(reply+reason);setLoading(false);
    }).catch(()=>{
      if(controller.signal.aborted)return;
      setExplanation("This move does not match the puzzle’s intended continuation. A detailed engine explanation is unavailable; try another move or use a hint.");setLoading(false);
    });
    return ()=>controller.abort();
  },[position]);
  return <Card className="puzzle-mistake"><h2>Why {position.move} didn’t work</h2><p role="status">{loading?"Checking the opponent’s response…":explanation}</p></Card>;
}
