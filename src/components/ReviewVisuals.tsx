import { BookOpen, Star, Check, ThumbsUp, TriangleAlert, X, CircleAlert } from "lucide-react";
import { reviewQuality } from "../lib/gameReview";
import type { ReviewRow } from "../lib/types";
export function MoveBadge({label}: {label:string}) {
  const quality=reviewQuality(label), Icon={book:BookOpen,best:Star,excellent:Check,good:ThumbsUp,inaccuracy:CircleAlert,mistake:TriangleAlert,blunder:X}[quality];
  return <span className={`move-quality quality-${quality}`} role="img" aria-label={label} title={label}><Icon size={13} strokeWidth={2.7}/></span>;
}
export function EvaluationGraph({rows,total,cursor,onSelect}:{rows:ReviewRow[];total:number;cursor:number;onSelect:(n:number)=>void}) {
  const samples=rows.length?[{index:0,score:rows[0].score},...rows.filter(r=>r.afterScore!==undefined).map(r=>({index:r.ply+1,score:r.afterScore!}))]:[];
  const x=(n:number)=>12+n/Math.max(1,total)*576, y=(s:number)=>75-Math.tanh(s/500)*61;
  return <div className="evaluation-graph">
    <svg viewBox="0 0 600 150" role="img" aria-label="Game evaluation, White above the center and Black below">
      <rect x="12" y="10" width="576" height="65" fill="var(--text)" opacity=".07"/>
      <rect x="12" y="75" width="576" height="65" fill="#000" opacity=".15"/>
      <path d="M12 75H588" stroke="var(--muted)" strokeDasharray="4 5" opacity=".6"/>
      {samples.length>0 && <polyline points={samples.map(s=>`${x(s.index)},${y(s.score)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round"/>}
      <line x1={x(cursor)} x2={x(cursor)} y1="10" y2="140" stroke="var(--text)" opacity=".55"/>
      {samples.filter(s=>s.index===cursor).map(s=><circle key={s.index} cx={x(s.index)} cy={y(s.score)} r="5" fill="var(--accent)"/>)}
    </svg>
    <input type="range" min={0} max={total} value={cursor} aria-label="Replay position" onChange={e=>onSelect(+e.target.value)}/>
    <div className="graph-labels"><span>0</span><span>{Math.ceil(total/4)}</span><span>{Math.ceil(total/2)} moves</span></div>
  </div>;
}
