import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  Search,
  ScrollText,
  Sparkles,
  Cpu,
  Swords,
  Globe,
  Trophy,
} from "lucide-react";
import { Card, IconButton, Toggle } from "../../components/UI";
export type HistoryData = {
  coverageThrough: number;
  ratingNote: string;
  milestones: {
    id: string;
    year: number;
    title: string;
    detail: string;
    source: string;
  }[];
  champions: {
    id: string;
    name: string;
    start: number;
    end: number | null;
    track: string;
    elo: number | null;
    ratingYear: number | null;
    source: string;
    highlight: string;
  }[];
};
const eras = [
  { name: "All eras", from: 0, to: 9999, icon: Globe },
  { name: "Origins", from: 0, to: 1499, icon: ScrollText },
  { name: "Modern rules", from: 1500, to: 1849, icon: Sparkles },
  { name: "First champions", from: 1850, to: 1947, icon: Crown },
  { name: "Soviet era", from: 1948, to: 1971, icon: Trophy },
  { name: "Rivalries", from: 1972, to: 1999, icon: Swords },
  { name: "Digital era", from: 2000, to: 9999, icon: Cpu },
];
export default function History({ data }: { data: HistoryData }) {
  const [view, setView] = useState("Timeline"),
    [era, setEra] = useState(0),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [track, setTrack] = useState("main"),
    [ratings, setRatings] = useState(false);
  const milestones = useMemo(
    () =>
      data.milestones
        .filter(
          (m) =>
            m.year >= eras[era].from &&
            m.year <= eras[era].to &&
            (m.title + " " + m.year + " " + m.detail)
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) => a.year - b.year),
    [data, era, search],
  );
  const champions = data.champions
    .filter(
      (c) =>
        c.track === (track === "fide" ? "split" : track) &&
        (c.name + " " + c.start).toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.start - b.start);
  const active = milestones.find((m) => m.id === selected) || milestones[0],
    index = milestones.findIndex((m) => m.id === active?.id);
  return (
    <div className="history-explorer">
      <div className="section-toolbar">
        <div className="segmented" aria-label="History view">
          {["Timeline", "World champions"].map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                setSearch("");
              }}
              className={v === view ? "active" : ""}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="caption">Through {data.coverageThrough}</span>
      </div>
      <div className="search-field">
        <Search size={17} />
        <input
          aria-label="Search history"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            view === "Timeline" ? "Event or year" : "Champion or year"
          }
        />
      </div>
      {view === "Timeline" ? (
        <>
          <div className="era-picker" aria-label="History era">
            {eras.map(({ name, icon: Icon }, i) => (
              <button
                key={name}
                aria-pressed={era === i}
                onClick={() => {
                  setEra(i);
                  setSelected("");
                }}
              >
                <Icon size={19} />
                {name}
              </button>
            ))}
          </div>
          {active ? (
            <div className="history-explorer-layout">
              <div
                className="history-event-list"
                aria-label="Historical events"
              >
                {milestones.map((m) => (
                  <button
                    key={m.id}
                    className={active.id === m.id ? "active" : ""}
                    onClick={() => setSelected(m.id)}
                    aria-pressed={active.id === m.id}
                  >
                    <time>{m.year}</time>
                    <span>{m.title}</span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <Card className="history-detail">
                <div className="history-year-art" aria-hidden="true">
                  <span>{active.year}</span>
                  <ScrollText size={62} />
                </div>
                <span className="eyebrow">
                  {
                    eras.find(
                      (e, i) =>
                        i > 0 && active.year >= e.from && active.year <= e.to,
                    )?.name
                  }
                </span>
                <h2>{active.title}</h2>
                <p>{active.detail}</p>
                <a
                  className="external"
                  href={active.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                  <ArrowUpRight size={14} />
                </a>
                <div className="history-paging">
                  <IconButton
                    label="Previous event"
                    disabled={index <= 0}
                    onClick={() => setSelected(milestones[index - 1].id)}
                  >
                    <ChevronLeft size={18} />
                  </IconButton>
                  <span>
                    {index + 1} / {milestones.length}
                  </span>
                  <IconButton
                    label="Next event"
                    disabled={index >= milestones.length - 1}
                    onClick={() => setSelected(milestones[index + 1].id)}
                  >
                    <ChevronRight size={18} />
                  </IconButton>
                </div>
              </Card>
            </div>
          ) : (
            <p className="muted">No matching events.</p>
          )}
        </>
      ) : (
        <>
          <div className="section-toolbar">
            <label className="field">
              <span>Championship lineage</span>
              <select
                aria-label="Championship lineage"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
              >
                <option value="main">Classical / unified</option>
                <option value="fide">FIDE split, 1993–2006</option>
              </select>
            </label>
            <Toggle
              label="Show event ratings"
              checked={ratings}
              onChange={setRatings}
            />
          </div>
          {ratings && <p className="caption">{data.ratingNote}</p>}
          <div className="champion-timeline">
            {champions.map((c) => (
              <Card key={c.id}>
                <span className="champion-reign">
                  {c.start}
                  <span>{c.end ? `– ${c.end}` : "Title won"}</span>
                </span>
                <div>
                  <h2>{c.name}</h2>
                  <p className="caption">{c.highlight}</p>
                  {ratings && (
                    <span className="pill">
                      {c.elo
                        ? `${c.elo} · ${c.ratingYear}`
                        : "Before event ratings"}
                    </span>
                  )}
                </div>
                <a
                  className="external"
                  aria-label={`Source for ${c.name}`}
                  href={c.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ArrowUpRight size={18} />
                </a>
              </Card>
            ))}
          </div>
          {!champions.length && <p className="muted">No matching champions.</p>}
        </>
      )}
    </div>
  );
}
