import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  Trophy,
  Flame,
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
import { useApp } from "../lib/context";
import { useData } from "../lib/store";
import { PageTitle, Card, Button, IconButton } from "../components/UI";
type Country = { code: string; polygons: number[][][] };
export default function Stats() {
  const { library, navigate } = useApp();
  const [tab, setTab] = useState("Statistics");
  const games = library.games.filter((g) => g.result !== "*"),
    wins = games.filter(
      (g) => g.result === (g.human === "w" ? "1-0" : "0-1"),
    ).length,
    draws = games.filter((g) => g.result === "1/2-1/2").length,
    losses = games.length - wins - draws;
  const variants = new Set(games.map((g) => g.variant));
  let promoted = false,
    pawnMate = false,
    knightMate = false;
  for (const g of games) {
    if (!["chess", "blind", "blindtext"].includes(g.variant)) continue;
    try {
      const c = new Chess(g.initial);
      for (const m of g.moves) {
        const move = c.move(m);
        if (move.color === g.human && move.promotion) promoted = true;
        if (c.isCheckmate() && move.color === g.human) {
          if (move.piece === "p" && !move.promotion) pawnMate = true;
          if (move.piece === "n") knightMate = true;
        }
      }
    } catch {}
  }
  const badges = [
    ["First game", games.length, 1],
    ["Ten games", games.length, 10],
    ["Fifty games", games.length, 50],
    ["100 games", games.length, 100],
    ["500 games", games.length, 500],
    ["1,000 games", games.length, 1000],
    ["10,000 games", games.length, 10000],
    ["First win", wins, 1],
    ["100 wins", wins, 100],
    ["1,000 wins", wins, 1000],
    ["Pawn checkmate", Number(pawnMate), 1],
    ["Knight checkmate", Number(knightMate), 1],
    ["Promotion", Number(promoted), 1],
    ["Eight variants", variants.size, 8],
  ] as const;
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
      <PageTitle title="Progress" subtitle="Local games and training results" />
      <div className="segmented page-segments">
        {["Statistics", "Achievements", "World map"].map((t) => (
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
      ) : tab === "World map" ? (
        <WorldMap visited={visited} />
      ) : (
        <>
          <div className="stats-strip">
            {[
              { icon: Trophy, label: "Games completed", value: games.length },
              {
                icon: Target,
                label: "Win rate",
                value: games.length
                  ? `${Math.round((wins / games.length) * 100)}%`
                  : "—",
              },
              {
                icon: Flame,
                label: "Puzzle streak",
                value: library.progress.streak,
              },
              {
                icon: BookOpen,
                label: "Lessons completed",
                value: library.progress.learned.length,
              },
            ].map(({ icon: Icon, label, value }) => (
              <Card className="stat-tile" key={label}>
                <Icon size={20} />
                <span>
                  <b>{value}</b>
                  <small>{label}</small>
                </span>
              </Card>
            ))}
          </div>
          <div className="stats-grid">
            <Card>
              <h2>Results</h2>
              <Bar label="Wins" value={wins} total={games.length} />
              <Bar label="Draws" value={draws} total={games.length} />
              <Bar label="Losses" value={losses} total={games.length} />
            </Card>
            <Card>
              <h2>Color</h2>
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
              <p className="caption">
                Local rating estimate: {Math.round(library.localRating)}. Not an
                official competitive rating.
              </p>
            </Card>
            <Card>
              <h2>Training</h2>
              <Bar
                label="Puzzles solved"
                value={library.progress.solved}
                total={Math.max(1, library.progress.attempts)}
              />
              <Bar
                label="Lessons"
                value={library.progress.learned.length}
                total={111}
              />
              <Bar
                label="Endgames"
                value={library.progress.endgames.length}
                total={17}
              />
              <p className="caption">
                Puzzle estimate: {Math.round(library.progress.rating)}
              </p>
            </Card>
            <Card>
              <h2>Improvement areas</h2>
              <p className="caption">From {reviewed} reviewed games.</p>
              {concepts.size ? (
                [...concepts]
                  .sort((a, b) => b[1] - a[1])
                  .map(([concept, count]) => (
                    <Bar
                      key={concept}
                      label={concept}
                      value={count}
                      total={Math.max(...concepts.values())}
                    />
                  ))
              ) : (
                <p className="muted">
                  Review a saved game to identify recurring patterns.
                </p>
              )}
              <Button
                className="text-button"
                onClick={() => navigate("library")}
              >
                Review games
              </Button>
            </Card>
            <Card>
              <h2>Variants</h2>
              {variants.size ? (
                [...variants].map((v) => (
                  <Bar
                    key={v}
                    label={v}
                    value={games.filter((g) => g.variant === v).length}
                    total={games.length}
                  />
                ))
              ) : (
                <p className="muted">Completed variant games appear here.</p>
              )}
            </Card>
            <Card>
              <h2>Repertoire</h2>
              <div className="large-metric">
                {library.repertoire.length}
                <span>Saved lines</span>
              </div>
              <p className="caption">
                {library.repertoire.filter((r) => r.due <= Date.now()).length}{" "}
                due · {library.repertoire.reduce((s, r) => s + r.trained, 0)}{" "}
                reviews completed
              </p>
              <Button
                className="secondary"
                onClick={() => navigate("learn", "repertoire")}
              >
                Train repertoire
              </Button>
            </Card>
          </div>
        </>
      )}
    </>
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
