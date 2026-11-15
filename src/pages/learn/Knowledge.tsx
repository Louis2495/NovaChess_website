import { useMemo, useState } from "react";
import { Search, Lightbulb, ArrowUpRight, Trophy } from "lucide-react";
import { useData } from "../../lib/store";
import { Piece } from "../../components/Board";
import { Card, Loading, Field } from "../../components/UI";
type Fact = {
  id: string;
  title: string;
  detail: string;
  category: string;
  metric: string;
  source: string;
  diagram?: string;
};
type Milestone = {
  id: string;
  year: number;
  title: string;
  detail: string;
  source: string;
};
type Champion = {
  id: string;
  name: string;
  start: number;
  end: number | null;
  track: string;
  elo: number | null;
  ratingYear: number | null;
  source: string;
  highlight: string;
};
type Knowledge = {
  coverageThrough: number;
  ratingNote: string;
  facts: Fact[];
  milestones: Milestone[];
  champions: Champion[];
};
export default function KnowledgePage({ section }: { section: string }) {
  const { data, error } = useData<Knowledge>("learning");
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All"),
    [view, setView] = useState("Milestones"),
    [track, setTrack] = useState("main");
  const facts = useMemo(
    () =>
      data?.facts.filter(
        (f) =>
          (category === "All" || f.category === category) &&
          (f.title + " " + f.detail)
            .toLowerCase()
            .includes(search.toLowerCase()),
      ) || [],
    [data, category, search],
  );
  if (!data) return <Loading error={error} />;
  return section === "facts" ? (
    <>
      <div className="section-toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search facts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facts"
          />
        </div>
        <select
          aria-label="Fact category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>All</option>
          {[...new Set(data.facts.map((f) => f.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="facts-grid">
        {facts.map((f) => (
          <Card key={f.id}>
            <div className="card-heading">
              <span className="pill">{f.category}</span>
              <Lightbulb size={18} />
            </div>
            <span className="fact-metric">{f.metric}</span>
            <h3>{f.title}</h3>
            <p>{f.detail}</p>
            {f.diagram && <MovementDiagram piece={f.diagram} />}
            <a
              className="external"
              href={f.source}
              target="_blank"
              rel="noreferrer"
            >
              Source
              <ArrowUpRight size={14} />
            </a>
          </Card>
        ))}
      </div>
      {!facts.length && <p className="muted">No matching facts.</p>}
    </>
  ) : (
    <>
      <div className="section-toolbar">
        <div className="segmented">
          {["Milestones", "Champions", "Ratings"].map((v) => (
            <button
              className={view === v ? "active" : ""}
              key={v}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="pill">Coverage through {data.coverageThrough}</span>
      </div>
      {view === "Milestones" ? (
        <div className="history-timeline">
          {data.milestones.map((m) => (
            <Card key={m.id}>
              <span className="history-year">{m.year}</span>
              <div>
                <h3>{m.title}</h3>
                <p>{m.detail}</p>
                <a
                  className="external"
                  href={m.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <Field label="Championship lineage">
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="main">Main line</option>
              <option value="fide">FIDE split titles</option>
            </select>
          </Field>
          {view === "Ratings" && <p className="caption">{data.ratingNote}</p>}
          <div className="champions-grid">
            {data.champions
              .filter(
                (c) =>
                  c.track === track || (track === "fide" && c.track !== "main"),
              )
              .map((c) => (
                <Card key={c.id}>
                  <div className="card-heading">
                    <Trophy size={22} />
                    <span className="pill">
                      {c.end ? `${c.start}–${c.end}` : `Won ${c.start}`}
                    </span>
                  </div>
                  <h3>{c.name}</h3>
                  <p className="caption">{c.highlight}</p>
                  {view === "Ratings" && (
                    <>
                      <div className="rating-history">
                        <span
                          style={{
                            width: `${Math.min(100, ((c.elo || 0) / 3000) * 100)}%`,
                          }}
                        />
                      </div>
                      <b>
                        {c.elo
                          ? `${c.elo} · ${c.ratingYear}`
                          : "No recorded event rating"}
                      </b>
                    </>
                  )}
                  <a
                    className="external"
                    href={c.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source
                    <ArrowUpRight size={13} />
                  </a>
                </Card>
              ))}
          </div>
        </>
      )}
    </>
  );
}
function MovementDiagram({ piece }: { piece: string }) {
  const kind = piece
    .toLowerCase()
    .replace("knight", "n")
    .replace("bishop", "b")
    .replace("rook", "r")
    .replace("queen", "q")
    .replace("king", "k")
    .replace("pawn", "p");
  const squares = Array.from({ length: 64 }, (_, i) => {
    const x = i % 8,
      y = Math.floor(i / 8),
      dx = Math.abs(x - 3),
      dy = Math.abs(y - 4);
    const hit =
      kind === "n"
        ? dx * dy === 2
        : kind === "b"
          ? dx === dy
          : kind === "r"
            ? dx === 0 || dy === 0
            : kind === "q"
              ? dx === dy || dx === 0 || dy === 0
              : kind === "k"
                ? Math.max(dx, dy) === 1
                : kind === "p"
                  ? dy === 1 && y === 3 && dx <= 1
                  : false;
    return (
      <span key={i} className={(x + y) % 2 ? "dark" : "light"}>
        {x === 3 && y === 4 ? (
          <Piece symbol={kind.toUpperCase()} />
        ) : hit ? (
          <i />
        ) : null}
      </span>
    );
  });
  return (
    <div className="movement-diagram" aria-label={`${piece} movement diagram`}>
      {squares}
    </div>
  );
}
