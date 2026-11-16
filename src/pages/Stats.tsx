import { isStudy } from "../lib/library";
import Rankings from "./Rankings";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  Trophy,
  Flame,
  Puzzle,
  ArrowRight,
  BookOpen,
  Target,
  Plus,
  Minus,
  RotateCcw,
  Globe,
  Lock,
  Check,
  Flag,
} from "lucide-react";
import type { SavedGame } from "../lib/types";
import { useApp } from "../lib/context";
import { useData } from "../lib/store";
import {
  ChoiceSelect,
  PageTitle,
  Card,
  Button,
  IconButton,
} from "../components/UI";
type Country = { code: string; polygons: number[][][] };
export default function Stats() {
  const { library, detail } = useApp();
  const [tab, setTab] = useState(
    detail === "rankings" ? "Rankings" : "Overview",
  );
  const games = library.games.filter(
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
    .filter(([, v]) => v.correct)
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
  const badges = [
    ["Marathon", games.length, 1000],
    ["Five thousand", games.length, 5000],
    ["Victory archive", wins, 500],
    ["Unbroken twenty", bestRun, 20],
    ["Tactical endurance", library.progress.solved, 1000],
    ["No room for error", library.progress.streak, 100],
    ["Daily discipline", bestDaily, 90],
    ["Opening specialist", (library.progress.mastered || []).length, 60],
    ["Complete curriculum", library.progress.learned.length, 129],
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
      library.games.filter(
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
    "Complete curriculum": "Complete all 129 curated opening lessons",
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
  const concepts = new Map<string, number>();
  let reviewed = 0;
  for (const g of library.games) {
    if (g.review?.length) {
      reviewed++;
      for (const r of g.review)
        if (r.loss >= 100 || r.expected)
          concepts.set(r.concept, (concepts.get(r.concept) || 0) + 1);
    }
  }
  const visited = [
    ...new Set(
      library.games
        .filter(
          (g) => g.moves.length && g.country && /^[A-Z]{2}$/.test(g.country),
        )
        .map((g) => g.country!),
    ),
  ];
  return (
    <>
      <PageTitle title="Stats" />
      <div className="segmented page-segments">
        {["Overview", "Rankings", "Achievements", "World map"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Achievements" ? (
        <div className="achievement-grid">
          {badges.map(([name, value, goal]) => (
            <Card
              key={name}
              className={value >= goal ? "achievement unlocked" : "achievement"}
            >
              <span className="achievement-icon">
                {value >= goal ? <Trophy size={25} /> : <Lock size={23} />}
              </span>
              <h3>{name}</h3>
              <p className="caption">{requirements[name]}</p>
              <p>
                {Math.min(value, goal)} / {goal}
              </p>
              <div className="progress-track">
                <span
                  style={{ width: `${Math.min(100, (value / goal) * 100)}%` }}
                />
              </div>
              {value >= goal && (
                <span className="pill">
                  <Check size={12} />
                  Unlocked
                </span>
              )}
            </Card>
          ))}
        </div>
      ) : tab === "Rankings" ? (
        <Rankings embedded />
      ) : tab === "World map" ? (
        <WorldMap visited={visited} />
      ) : (
        <StatsOverview
          games={games}
          wins={wins}
          draws={draws}
          losses={losses}
          concepts={concepts}
          reviewed={reviewed}
        />
      )}
    </>
  );
}
function StatsOverview({
  games,
  wins,
  draws,
  losses,
  concepts,
  reviewed,
}: {
  games: SavedGame[];
  wins: number;
  draws: number;
  losses: number;
  concepts: Map<string, number>;
  reviewed: number;
}) {
  const { library, navigate } = useApp();
  const rate = games.length ? Math.round((wins / games.length) * 100) : null;
  const [dayRange, setDayRange] = useState(7),
    [customRange, setCustomRange] = useState(false);
  const completedByDay = new Map<number, number>();
  for (const game of games) {
    const d = new Date(game.created);
    d.setHours(0, 0, 0, 0);
    completedByDay.set(d.getTime(), (completedByDay.get(d.getTime()) || 0) + 1);
  }
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
          { icon: Trophy, label: "Games played", value: games.length },
          {
            icon: Target,
            label: "Local rating",
            value: Math.round(library.localRating),
          },
          {
            icon: Puzzle,
            label: "Puzzles solved",
            value: library.progress.solved,
          },
          {
            icon: Flame,
            label: "Puzzle streak",
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
          <h2>Results</h2>
          <div className="results-content">
            <div
              className="results-ring"
              role="img"
              aria-label={`${wins} wins, ${draws} draws, ${losses} losses`}
              style={{
                background: games.length
                  ? `conic-gradient(var(--accent) 0% ${winStop}%, #b2bec3 ${winStop}% ${drawStop}%, #d38b8d ${drawStop}% 100%)`
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
                ["Wins", wins, "var(--accent)"],
                ["Draws", draws, "#b2bec3"],
                ["Losses", losses, "#d38b8d"],
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
        <Card className="activity-card">
          <div className="card-heading">
            <h2>Activity</h2>
            <div className="activity-range">
              <ChoiceSelect
                aria-label="Activity period"
                value={customRange ? "custom" : dayRange}
                onChange={(e) => {
                  setCustomRange(e.target.value === "custom");
                  if (e.target.value !== "custom")
                    setDayRange(Number(e.target.value));
                }}
              >
                {[7, 14, 30, 90, 365].map((n) => (
                  <option value={n} key={n}>
                    Last {n} days
                  </option>
                ))}
                <option value="custom">Custom</option>
              </ChoiceSelect>
              {customRange && (
                <input
                  type="number"
                  aria-label="Activity days"
                  min={1}
                  max={3650}
                  value={dayRange}
                  onChange={(e) =>
                    setDayRange(
                      Math.max(1, Math.min(3650, Number(e.target.value) || 1)),
                    )
                  }
                />
              )}
            </div>
          </div>
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
                    title={`${d.range}: ${d.count} completed games`}
                    aria-label={`${d.range}: ${d.count} completed games`}
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
      <div className="stats-detail-grid">
        <Card>
          <div className="card-heading">
            <h2>Training</h2>
            <BookOpen size={18} />
          </div>
          <Bar
            label="Opening lessons"
            value={library.progress.learned.length}
            total={111}
          />
          <Bar
            label="Endgame Lessons"
            value={library.progress.endgames.length}
            total={17}
          />
          <div className="stats-training-footer">
            <span>{library.repertoire.length} repertoire lines</span>
          </div>
        </Card>
        <Card>
          <h2>Playing color</h2>
          <Bar
            label="White"
            value={games.filter((g) => g.human === "w").length}
            total={games.length}
          />
          <Bar
            label="Black"
            value={games.filter((g) => g.human === "b").length}
            total={games.length}
          />
          <p className="caption">Local ratings are training estimates.</p>
        </Card>
      </div>
      <section className="improvement-section">
        <div className="home-section-heading">
          <h2>Improvement areas</h2>
          <span className="caption">{reviewed} reviewed games</span>
        </div>
        {concepts.size ? (
          <div className="improvement-bars">
            {[...concepts]
              .sort((a, b) => b[1] - a[1])
              .map(([concept, count]) => (
                <Bar
                  key={concept}
                  label={concept}
                  value={count}
                  total={Math.max(...concepts.values())}
                />
              ))}
          </div>
        ) : (
          <p className="muted">
            Review a game to identify patterns in your play.
          </p>
        )}
        <button className="text-link" onClick={() => navigate("library")}>
          Review games
          <ArrowRight size={14} />
        </button>
        <details className="variant-breakdown">
          <summary>Variant breakdown</summary>
          {[...new Set(games.map((g) => g.variant))].map((v) => (
            <Bar
              key={v}
              label={v}
              value={games.filter((g) => g.variant === v).length}
              total={games.length}
            />
          ))}
          {!games.length && <p className="caption">No completed games.</p>}
        </details>
      </section>
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
              const rect = e.currentTarget.getBoundingClientRect();
              const dx = ((e.clientX - prev.x) * 720) / rect.width;
              const dy = ((e.clientY - prev.y) * 360) / rect.height;
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
      <div className="puzzle-themes">
        {visited.map((c) => (
          <span className="pill" key={c}>
            <Flag size={13} />
            {names.of(c) || c}
          </span>
        ))}
      </div>
    </Card>
  );
}
