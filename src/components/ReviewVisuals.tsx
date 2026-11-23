import { BookOpen, Check, Star } from "lucide-react";
import { reviewQuality } from "../lib/gameReview";
import type { ReviewRow } from "../lib/types";
const moveLabels = ["Book", "Best", "Great", "Good", "Inaccuracy", "Mistake", "Blunder"] as const;
const moveSymbols = {
  book: <BookOpen aria-hidden="true" />,
  best: <Star aria-hidden="true" />,
  great: "!",
  good: <Check aria-hidden="true" />,
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

export function MoveBadge({ label, decorative = false }: { label: string; decorative?: boolean }) {
  const quality = reviewQuality(label);
  const name = quality === "great" ? "Great" : label;
  return <span className={`move-quality quality-${quality}`}
    role={decorative ? undefined : "img"} aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : name} title={decorative ? undefined : name}>
    {moveSymbols[quality]}
  </span>;
}

export function MoveBreakdown({ rows }: { rows: ReviewRow[] }) {
  const counts = { book: 0, best: 0, great: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  for (const row of rows) counts[reviewQuality(row.label)]++;
  return <dl className="review-move-breakdown" aria-label="Move breakdown">
    {moveLabels.map(label => <div key={label}>
      <dt><MoveBadge label={label} decorative /><span>{label}</span></dt>
      <dd>{counts[reviewQuality(label)]}</dd>
    </div>)}
  </dl>;
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
