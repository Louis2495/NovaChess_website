import "./stats-dashboard.css";
import { variantList } from "../lib/variantCatalog";
import { duration, speedrunBests, speedrunMaxRating, speedrunMinRating, speedrunRatingStep, throneDuration } from "../lib/speedrun";
import { online, useOnlineSession } from "../lib/online";
import { isStudy } from "../lib/library";
import Rankings from "./Rankings";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  Crown,
  Timer,
  Trophy,
  Flame,
  Puzzle,
  Target,
  Plus,
  Minus,
  RotateCcw,
  Globe,
  Lock,
} from "lucide-react";
import type { Opening, SavedGame } from "../lib/types";
import { useApp } from "../lib/context";
import { useData } from "../lib/store";
import {
  ChoiceSelect,
  Card,
  Button,
  IconButton,
} from "../components/UI";
type Country = { code: string; polygons: number[][][] };
export default function Stats() {
  const { library, detail } = useApp();
  const { data: lessons } = useData<Opening[]>("lessons");
  const [tab, setTab] = useState(
    detail === "rankings" ? "Rankings" : "Overview",
  );
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [period, setPeriod] = useState("all");
  const [customDays, setCustomDays] = useState(7);
  const dayRange = period === "all" ? null : period === "custom" ? customDays : Number(period);
  const sinceDate = new Date();
  sinceDate.setHours(0, 0, 0, 0);
  if (dayRange !== null) sinceDate.setDate(sinceDate.getDate() - dayRange + 1);
  const since = dayRange === null ? null : sinceDate.getTime();
  const inPeriod = (g: SavedGame) => since === null || g.created >= since;
  const periodGames = library.games.filter(inPeriod);
  const games = periodGames.filter(
      (g) =>
        g.result !== "*" &&
        g.folder !== "Studies" &&
        !isStudy(g) &&
        g.origin !== "archive",
    ),
    wins = games.filter(
      (g) => g.result === (g.human === "w" ? "1-0" : "0-1"),
    ).length,
    draws = games.filter((g) => g.result === "1/2-1/2").length,
    losses = games.length - wins - draws;
  const winsByVariant = new Map<string, number>();
  for (const g of games.filter(
    (g) => g.result === (g.human === "w" ? "1-0" : "0-1"),
  ))
    winsByVariant.set(g.variant, (winsByVariant.get(g.variant) || 0) + 1);
  let run = 0,
    bestRun = 0;
  for (const g of [...games].sort((a, b) => a.created - b.created)) {
    run = g.result === (g.human === "w" ? "1-0" : "0-1") ? run + 1 : 0;
    bestRun = Math.max(bestRun, run);
  }
  let underpromotionMates = 0;
  for (const g of games.filter(
    (g) =>
      g.result === (g.human === "w" ? "1-0" : "0-1") &&
      ["chess", "blind", "blindtext"].includes(g.variant),
  )) {
    try {
      const c = new Chess(g.initial);
      for (const m of g.moves) {
        const move = c.move(m);
        if (
          move.color === g.human &&
          move.promotion &&
          move.promotion !== "q" &&
          c.isCheckmate()
        )
          underpromotionMates++;
      }
    } catch {}
  }
  const days = Object.entries(library.progress.daily)
    .filter(([d, v]) => v.correct && (since === null || Date.parse(d + "T00:00:00") >= since))
    .map(([d]) => d)
    .sort();
  let dailyRun = 0,
    bestDaily = 0,
    previous = 0;
  for (const day of days) {
    const time = Date.parse(day + "T12:00:00Z");
    dailyRun = previous && time - previous === 86400000 ? dailyRun + 1 : 1;
    bestDaily = Math.max(bestDaily, dailyRun);
    previous = time;
  }
  const learned = new Set(library.progress.learned);
  const completedLessons = lessons?.filter(lesson => learned.has(lesson.id)).length ?? 0;
  const badges = [
    ["Marathon", games.length, 1000],
    ["Five thousand", games.length, 5000],
    ["Victory archive", wins, 500],
    ["Unbroken twenty", bestRun, 20],
    ["Tactical endurance", library.progress.solved, 1000],
    ["No room for error", library.progress.streak, 100],
    ["Daily discipline", bestDaily, 90],
    ["Opening specialist", (library.progress.mastered || []).length, 60],
    ["Complete curriculum", completedLessons, lessons?.length || 129],
    ["Endgame mastery", library.progress.endgames.length, 17],
    [
      "Deep repertoire",
      library.repertoire.filter((r) => r.successes >= 10).length,
      25,
    ],
    [
      "Across the board",
      [...winsByVariant.values()].filter((n) => n >= 10).length,
      12,
    ],
    [
      "Engine challenger",
      games.filter(
        (g) =>
          g.rated &&
          (g.botRating || 0) >= 2000 &&
          g.result === (g.human === "w" ? "1-0" : "0-1"),
      ).length,
      50,
    ],
    [
      "Blindfold hundred",
      games.filter(
        (g) =>
          ["blind", "blindtext"].includes(g.variant) &&
          g.result === (g.human === "w" ? "1-0" : "0-1"),
      ).length,
      100,
    ],
    ["Underpromotion artist", underpromotionMates, 5],
    [
      "Study the evidence",
      periodGames.filter(
        (g) =>
          g.review && g.review.length >= g.moves.length && g.moves.length >= 40,
      ).length,
      100,
    ],
    ["Trivia scholar", library.progress.triviaCorrect || 0, 500],
    ["Evaluation instinct", library.progress.evalPerfect || 0, 100],
  ] as const;
  const requirements: Record<string, string> = {
    Marathon: "Finish 1,000 games",
    "Five thousand": "Finish 5,000 games",
    "Victory archive": "Win 500 games",
    "Unbroken twenty": "Win 20 consecutive finished games",
    "Tactical endurance": "Solve 1,000 puzzles without assistance",
    "No room for error": "Reach a 100-puzzle correct streak",
    "Daily discipline":
      "Solve the daily puzzle first try for 90 consecutive days",
    "Opening specialist":
      "Recall 60 lesson variations without hints or mistakes",
    "Complete curriculum": "Complete every curated opening lesson",
    "Endgame mastery": "Complete all 17 Endgame Lessons",
    "Deep repertoire":
      "Train 25 repertoire lines correctly at least 10 times each",
    "Across the board": "Win 10 games in each of 12 variants",
    "Engine challenger": "Win 50 locally rated games against 2000+ bots",
    "Blindfold hundred": "Win 100 blindfold games",
    "Underpromotion artist": "Deliver checkmate by underpromotion five times",
    "Study the evidence": "Fully review 100 games of at least 20 moves",
    "Trivia scholar": "Answer 500 trivia questions correctly",
    "Evaluation instinct": "Guess 100 engine evaluations within 0.25 pawns",
  };
  const visited = [
    ...new Set(
      periodGames
        .filter(
          (g) => g.moves.length && g.country && /^[A-Z]{2}$/.test(g.country),
        )
        .map((g) => g.country!),
    ),
  ];
  return (
    <div className={`stats-page stats-dashboard${tab === "World map" ? " stats-map-active" : ""}`}>
      <header className="stats-header">
        <h1>Stats</h1>
        <div className="activity-range">
          <ChoiceSelect aria-label="Stats period" value={period} onChange={event => setPeriod(event.target.value)}>
            <option value="all">All time</option>
            {[7, 14, 30, 90, 365].map(n => <option value={n} key={n}>Last {n} days</option>)}
            <option value="custom">Custom</option>
          </ChoiceSelect>
          {period === "custom" && <input type="number" aria-label="Stats days" min={1} max={3650}
            value={customDays} onChange={event => setCustomDays(Math.max(1, Math.min(3650, Number(event.target.value) || 1)))} />}
        </div>
      </header>
      <div className="stats-tabs" role="group" aria-label="Stats sections">
        {["Overview", "Variants", "Rankings", "Achievements", "World map"].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Achievements" ? (
        <section className="stats-achievements" aria-labelledby="achievement-title">
          <header className="stats-section-heading">
            <div><h2 id="achievement-title">Achievements</h2><p className="caption">
              {badges.filter(([, value, goal]) => value >= goal).length} of {badges.length} unlocked{since !== null && " · Undated progress shows lifetime totals"}
            </p></div>
            <Button className="secondary" aria-pressed={onlyUnlocked} onClick={() => setOnlyUnlocked(value => !value)}>
              Unlocked only
            </Button>
          </header>
          <ul className="stats-achievement-list">
            {badges.filter(([, value, goal]) => !onlyUnlocked || value >= goal).map(([name, value, goal]) => (
              <li key={name}>
                <span className="stats-achievement-icon" aria-hidden="true">
                  {value >= goal ? <Trophy size={19} /> : <Lock size={17} />}
                </span>
                <div><h3>{name}</h3><p className="caption">{requirements[name]}</p></div>
                <div className="stats-achievement-progress">
                  <span>{value >= goal ? "Unlocked" : `${value} / ${goal}`}</span>
                  <progress aria-label={name} value={Math.min(value, goal)} max={goal} />
                </div>
              </li>
            ))}
          </ul>
          {onlyUnlocked && !badges.some(([, value, goal]) => value >= goal) && <p>No achievements unlocked yet.</p>}
        </section>
      ) : tab === "Variants" ? (
        <VariantStats games={games} speedrunGames={periodGames} since={since} />
      ) : tab === "Rankings" ? (
        <>
          {since !== null && <p className="caption">Rankings show current standings.</p>}
          <Rankings embedded />
        </>
      ) : tab === "World map" ? (
        <WorldMap visited={visited} />
      ) : (
        <StatsOverview
          games={games}
          wins={wins}
          draws={draws}
          losses={losses}
          daysSelected={dayRange}
        />
      )}
    </div>
  );
}
function VariantStats({games, speedrunGames, since}: {games:SavedGame[]; speedrunGames:SavedGame[]; since:number|null}) {
 const {navigate}=useApp(), {session}=useOnlineSession();
 const [total,setTotal]=useState(0),[throneGames,setThroneGames]=useState(0),[metric,setMetric]=useState("Time"),[error,setError]=useState("");
 useEffect(()=>{setTotal(0);setThroneGames(0);setError("");if(!online || !session)return;let active=true;const load=async()=>{const r=await online!.rpc("throne_stats", since === null ? {} : {p_since:new Date(since).toISOString()});if(active){setTotal(Number(r.data?.timeMs)||0);setThroneGames(Number(r.data?.games)||0);setError(r.error?"Throne stats unavailable":"");}};void load();const t=setInterval(()=>void load(),30000);return()=>{active=false;clearInterval(t);};},[session?.user.id,since]);
 const bests=new Map(speedrunBests(speedrunGames));
 const ratings = Array.from({length:(speedrunMaxRating - speedrunMinRating) / speedrunRatingStep + 1}, (_, i) => speedrunMinRating + i * speedrunRatingStep);
 return <div className="stats-competition">
      <Card className="variant-breakdown-card">
        <div className="variant-breakdown">
          <h2>Variant breakdown</h2>
          {[...new Set(games.map((g) => g.variant))].map((v) => (
            <Bar
              key={v}
              label={variantList.find(variant=>variant.id===v)?.name || ({throne:"Throne",vote:"Vote Chess",team:"Team Chess",speedrun:"Speedrun"} as Record<string,string>)[v] || v}
              value={games.filter((g) => g.variant === v).length}
              total={games.length}
            />
          ))}
          {!games.length && <p className="caption">No completed games.</p>}
        </div>
      </Card>
  <Card className="throne-stat"><div className="card-heading"><h2><Crown size={21}/>On the Throne</h2><div className="segmented" role="group" aria-label="Throne metric">{["Time","Games"].map(m=><button key={m} aria-pressed={metric===m} className={metric===m?"active":""} onClick={()=>setMetric(m)}>{m}</button>)}</div></div><strong className="competition-total">{metric==="Time" ? throneDuration(total) : throneGames}</strong>{error && <p className="caption">{error}</p>}</Card>
  <Card className="speedrun-stats"><div className="stats-section-heading"><h2><Timer size={21}/>Speedrun</h2></div><div className="speedrun-rating-grid" role="list" aria-label="Fastest wins by computer rating">{ratings.map(elo=>{const game=bests.get(elo);return <div role="listitem" key={elo}><button type="button" className={`speedrun-rating ${game?"has-record":""}`} aria-label={`Play Speedrun at ${elo} Elo${game?`, best ${duration(game.speedrun!.elapsedMs,true)}`:""}`} onClick={()=>navigate("play",`speedrun/${elo}`)}><span>{elo}</span><strong>{game?duration(game.speedrun!.elapsedMs,true):"—"}</strong></button></div>;})}</div></Card>
 </div>;
}

function StatsOverview({
  games,
  wins,
  draws,
  losses,
  daysSelected,
}: {
  games: SavedGame[];
  wins: number;
  draws: number;
  losses: number;
  daysSelected: number | null;
}) {
  const { library } = useApp();
  const rate = games.length ? Math.round((wins / games.length) * 100) : null;

  const completedByDay = new Map<number, number>();
  for (const game of games) {
    const d = new Date(game.created);
    d.setHours(0, 0, 0, 0);
    completedByDay.set(d.getTime(), (completedByDay.get(d.getTime()) || 0) + 1);
  }
  const oldest = Math.min(Date.now(), ...completedByDay.keys());
  const dayRange = daysSelected ?? Math.max(7, Math.round((Date.now() - oldest) / 86400000) + 1);
  const dayFormatter = new Intl.DateTimeFormat(
    undefined,
    dayRange <= 7
      ? { weekday: "short" }
      : dayRange > 365
        ? { month: "short", year: "2-digit" }
        : { month: "short", day: "numeric" },
  );
  const days = Array.from({ length: dayRange }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - dayRange + 1 + i);
    return {
      label: dayFormatter.format(d),
      count: completedByDay.get(d.getTime()) || 0,
    };
  });
  const bucketSize = Math.max(1, Math.ceil(dayRange / 30));
  const activity = Array.from(
    { length: Math.ceil(days.length / bucketSize) },
    (_, i) => {
      const group = days.slice(i * bucketSize, (i + 1) * bucketSize);
      return {
        label: group[0].label,
        range:
          group.length > 1
            ? `${group[0].label} – ${group.at(-1)!.label}`
            : group[0].label,
        count: group.reduce((n, d) => n + d.count, 0),
      };
    },
  );
  const max = Math.max(1, ...activity.map((d) => d.count));
  const winStop = games.length ? (wins / games.length) * 100 : 0,
    drawStop = games.length ? ((wins + draws) / games.length) * 100 : 0;
  return (
    <div className="stats-overview">
      <section className="stats-metrics" aria-label="Your statistics">
        {[
          {
            icon: Target,
            label: daysSelected === null ? "Rating" : "Current rating",
            value: Math.round(library.localRating),
          },
          { icon: Trophy, label: "Games played", value: games.length },
          {
            icon: Puzzle,
            label: daysSelected === null ? "Puzzles solved" : "Lifetime puzzles solved",
            value: library.progress.solved,
          },
          {
            icon: Flame,
            label: daysSelected === null ? "Puzzle streak" : "Current puzzle streak",
            value: library.progress.streak,
          },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label}>
            <span className="stat-metric-label">
              <Icon size={16} />
              {label}
            </span>
            <b>{value}</b>
          </div>
        ))}
      </section>
      <div className="stats-visual-grid">
        <Card className="results-card">
          <h2>Game results</h2>
          <div className="results-content">
            <div
              className="results-ring"
              role="img"
              aria-label={`${wins} wins, ${draws} draws, ${losses} losses`}
              style={{
                background: games.length
                  ? `conic-gradient(var(--stat-win) 0% ${winStop}%, var(--stat-draw) ${winStop}% ${drawStop}%, var(--stat-loss) ${drawStop}% 100%)`
                  : "var(--border)",
              }}
            >
              <div>
                <strong>{rate === null ? "—" : `${rate}%`}</strong>
                <span>Win rate</span>
              </div>
            </div>
            <div className="results-legend">
              {[
                ["Wins", wins, "var(--stat-win)"],
                ["Draws", draws, "var(--stat-draw)"],
                ["Losses", losses, "var(--stat-loss)"],
              ].map(([label, value, color]) => (
                <div key={label}>
                  <i style={{ background: String(color) }} />
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="playing-color-stat">
          <h2>Playing color</h2>
          {["w","b"].map(side=>{
            const chosen=games.filter(g=>g.human===side),win=chosen.filter(g=>g.result===(side==="w"?"1-0":"0-1")).length,draw=chosen.filter(g=>g.result==="1/2-1/2").length,loss=chosen.length-win-draw;
            return <div className="playing-color-row" key={side}><div className="playing-color-label"><span>{side==="w"?"White":"Black"}</span><b>{chosen.length}</b></div><div className="playing-color-stack" role="img" aria-label={`${side==="w"?"White":"Black"}: ${win} wins, ${loss} losses, ${draw} draws`}>{[["win",win],["loss",loss],["draw",draw]].map(([kind,count])=><span key={kind} className={`outcome-${kind}`} style={{width:`${Number(count)/Math.max(1,chosen.length)*100}%`}} title={`${count} ${kind === "win"?"wins":kind === "loss"?"losses":"draws"}`}>{Number(count)>0?count:""}</span>)}</div></div>;
          })}
        </Card>
      </div>
      <Card className="activity-card">
        <h2>Activity</h2>
        <div
          className="activity-chart"
          style={{
            gap: activity.length > 14 ? 4 : 12,
            gridTemplateColumns: `repeat(${activity.length},minmax(6px,1fr))`,
          }}
        >
          {activity.map((d, i) => (
            <div className="activity-day" key={i}>
              <div className="activity-track">
                <span
                  role="img"
                  title={`${d.range}: ${d.count} completed game${d.count === 1 ? "" : "s"}`}
                  aria-label={`${d.range}: ${d.count} completed game${d.count === 1 ? "" : "s"}`}
                  style={{ height: `${(d.count / max) * 100}%` }}
                >
                  {d.count > 0 && activity.length <= 14 && <b>{d.count}</b>}
                </span>
              </div>
              <small>
                {i % Math.ceil(activity.length / 7) === 0 ||
                i === activity.length - 1
                  ? d.label
                  : ""}
              </small>
            </div>
          ))}
        </div>
        {!days.some((d) => d.count) && (
          <p className="activity-empty">No completed games in this period.</p>
        )}
      </Card>
    </div>
  );
}
function Bar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div className="stat-bar">
      <span>
        {label}
        <b>{value}</b>
      </span>
      <div>
        <i
          style={{
            width: `${Math.min(100, (value / Math.max(1, total)) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
function WorldMap({ visited }: { visited: string[] }) {
  const { data, error } = useData<Country[]>("countries");
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [selected, setSelected] = useState("");
  const pointers = useRef(new Map<number, { x: number; y: number }>()),
    distance = useRef(0);
  const names = new Intl.DisplayNames(undefined, { type: "region" });
  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  function clampPan(x: number, y: number, z = zoom) {
    return {
      x: Math.max(-360 * (z - 1), Math.min(360 * (z - 1), x)),
      y: Math.max(-180 * (z - 1), Math.min(180 * (z - 1), y)),
    };
  }
  useEffect(() => {
    setPan((p) => clampPan(p.x, p.y, zoom));
  }, [zoom]);
  return (
    <div className="stats-map-layout">
    <Card className="world-map-card">
      <div className="card-heading">
        <h2>Countries played</h2>
        <span className="pill">
          <Globe size={14} />
          {visited.length}
        </span>
      </div>
      <p className="caption">
        Countries are added from shared games with an opponent’s selected
        country. Bots do not add countries.
      </p>
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <svg
          className="world-map"
          viewBox="0 0 720 360"
          role="img"
          aria-label={`World map, ${visited.length} countries played`}
          onDoubleClick={reset}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) {
              const [a, b] = [...pointers.current.values()];
              distance.current = Math.hypot(a.x - b.x, a.y - b.y);
            }
          }}
          onPointerMove={(e) => {
            const prev = pointers.current.get(e.pointerId);
            if (!prev) return;
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) {
              const [a, b] = [...pointers.current.values()],
                d = Math.hypot(a.x - b.x, a.y - b.y);
              const ratio = distance.current ? d / distance.current : 1;
              distance.current = d;
              setZoom((z) => Math.max(1, Math.min(6, z * ratio)));
            } else if (zoom > 1) {
              const transform = e.currentTarget.getScreenCTM();
              if (!transform) return;
              const dx = (e.clientX - prev.x) / transform.a;
              const dy = (e.clientY - prev.y) / transform.d;
              setPan((p) => clampPan(p.x + dx, p.y + dy));
            }
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            distance.current = 0;
          }}
          onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        >
          <g
            transform={`translate(${360 + pan.x} ${180 + pan.y}) scale(${zoom}) translate(-360 -180)`}
          >
            {data
              ?.filter((c) => c.code.length === 2)
              .map((c) => (
                <g
                  key={c.code}
                  className={visited.includes(c.code) ? "visited" : ""}
                  onClick={() => setSelected(c.code)}
                >
                  {c.polygons.map((polygon, i) => (
                    <path
                      key={i}
                      d={
                        polygon
                          .map(
                            ([x, y], j) =>
                              `${j ? "L" : "M"}${(x + 180) * 2},${(90 - y) * 2}`,
                          )
                          .join(" ") + "Z"
                      }
                    >
                      <title>
                        {names.of(c.code) || c.code}
                        {visited.includes(c.code) ? " · Played" : ""}
                      </title>
                    </path>
                  ))}
                </g>
              ))}
          </g>
        </svg>
      )}
      <div className="map-controls">
        <IconButton
          label="Zoom out"
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
        >
          <Minus size={18} />
        </IconButton>
        <span>{zoom.toFixed(1)}×</span>
        <IconButton
          label="Zoom in"
          onClick={() => setZoom((z) => Math.min(6, z + 0.5))}
        >
          <Plus size={18} />
        </IconButton>
        <Button className="text-button" onClick={reset}>
          <RotateCcw size={14} />
          Reset
        </Button>
      </div>
      <p className="caption">
        {selected
          ? `${names.of(selected) || selected}${visited.includes(selected) ? " · Played" : ""}`
          : "Pinch to zoom. Drag to pan. Double-tap to reset."}
      </p>
    </Card>
    </div>
  );
}
