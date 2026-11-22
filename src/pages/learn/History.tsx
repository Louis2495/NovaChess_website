import { useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ChoiceSelect, Card, IconButton } from "../../components/UI";
import { useHistoryImages, type HistoryImage } from "../../lib/historyImages";
export type HistoryData = {
  milestones: {
    id: string;
    year: number;
    title: string;
    detail: string;
    imageArticle?: string;
    imageFallback?: string;
    source: string;
  }[];
  champions: {
    id: string;
    name: string;
    start: number;
    end: number | null;
    track: string;
    elo: number | null;
    peakElo?: number;
    ratingYear: number | null;
    source: string;
    highlight: string;
    imageArticle?: string;
  }[];
};
function Picture({ image, description, className, caption }: {
  image?: HistoryImage | null;
  description: string;
  className: string;
  caption?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return null;
  return <figure className={className}>
    <img src={image.url} alt={description} loading="lazy" onError={() => setFailed(true)} />
    <figcaption>{caption && <span>{caption} · </span>}<a href={image.credits} target="_blank" rel="noreferrer">Image credits</a></figcaption>
  </figure>;
}

export default function History({ data }: { data: HistoryData }) {
  const [view, setView] = useState("Timeline"),
    [selected, setSelected] = useState(""),
    [track, setTrack] = useState("main");
  const milestones = [...data.milestones].sort((a, b) => a.year - b.year);
  const champions = data.champions.filter(c => c.track === (track === "fide" ? "split" : track))
    .sort((a, b) => a.start - b.start);
  const images = useHistoryImages(view === "Timeline"
    ? milestones.flatMap(item => [item.imageArticle ?? "", item.imageFallback ?? ""])
    : champions.map(champion => champion.imageArticle ?? champion.name));
  const active = milestones.find((m) => m.id === selected) || milestones[0],
    index = milestones.findIndex((m) => m.id === active?.id);
  const imageArticle = active && (images.get(active.imageArticle ?? "")
    ? active.imageArticle : active.imageFallback);
  return (
    <div className="history-explorer">
      <div className="section-toolbar">
        <div className="segmented" aria-label="History view">
          {["Timeline", "World champions"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={v === view}
              className={v === view ? "active" : ""}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {view === "Timeline" ? (
        <>
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

                  </button>
                ))}
              </div>
              <Card className="history-detail">
                <time className="history-event-year">{active.year}</time>
                <h2>{active.title}</h2>
                <div className="history-event-explanation">
                  <Picture key={imageArticle} className="history-event-image" caption={imageArticle}
                    image={images.get(imageArticle ?? "")} description={imageArticle ?? active.title} />
                  <p>{active.detail}</p>
                </div>
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
            <p className="muted">No historical events available.</p>
          )}
        </>
      ) : (
        <>
          <div className="section-toolbar">
            <label className="field">
              <span>Championship lineage</span>
              <ChoiceSelect
                aria-label="Championship lineage"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
              >
                <option value="main">Classical / unified</option>
                <option value="fide">FIDE split, 1993–2006</option>
              </ChoiceSelect>
            </label>
          </div>
          <div className="champion-timeline">
            {champions.map((c) => (
              <Card key={c.id}>
                <Picture key={c.imageArticle ?? c.name} className="champion-portrait"
                  image={images.get(c.imageArticle ?? c.name)} description={c.name} />
                <span className="champion-reign">
                  {c.start}
                  <span>{c.end ? `– ${c.end}` : "Title won"}</span>
                </span>
                <div>
                  <h2>{c.name}</h2>
                  <p className="caption">{c.highlight}</p>
                  <div className="champion-ratings">
                    {c.elo && <span className="pill">Event {c.elo} · {c.ratingYear}</span>}
                    {c.peakElo && <a className="pill"
                      href={"https://en.wikipedia.org/wiki/" + encodeURIComponent((c.imageArticle ?? c.name).replaceAll(" ", "_"))}
                      target="_blank" rel="noreferrer">Peak FIDE {c.peakElo}</a>}
                  </div>
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
