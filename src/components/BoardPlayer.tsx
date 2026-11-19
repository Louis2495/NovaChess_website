import {useApp} from "../lib/context";
import {screenName} from "../lib/screenName";
import type {SavedGame} from "../lib/types";
export function GameScore({result,side}:{result?:string;side:'w'|'b'}) {
 if(!result || result==='*')return null;
 const score=result==='1/2-1/2'?'½':result===(side==='w'?'1-0':'0-1')?'1':'0';
 return <span className={`board-player-score score-${score==='1'?'win':score==='0'?'loss':'draw'}`}>{score}</span>;
}
export default function BoardPlayer({name,rating,side,result,placement}:{name:string;rating?:number;side:'w'|'b';result?:string;placement:'top'|'bottom'}) {
 return <div className={`board-player-label player-${placement}`} aria-label={`${side==='w'?'White':'Black'} player`}><GameScore result={result} side={side}/><b>{name}</b><span>({rating ?? '—'})</span></div>;
}

export function SavedBoardPlayer({game,side,placement}:{game:SavedGame;side:'w'|'b';placement:'top'|'bottom'}) {
 const {library}=useApp();const own=side===game.human;
 const name=(side==='w'?game.whiteName:game.blackName) || (own ? (game.origin==='archive'?'White':screenName(library.profile,'You')) : game.opponent || 'Computer');
 const rating=own ? game.humanRating ?? (game.origin==='archive'?undefined:library.localRating) : game.opponentRating ?? game.botRating;
 return <BoardPlayer name={name} rating={rating} side={side} placement={placement} result={game.result}/>;
}
