import { useMemo, useState } from "react";
import { Search, ArrowUpRight, BookOpen, ChevronRight } from "lucide-react";
import { useData } from "../../lib/store";
import { useApp } from "../../lib/context";
import { ChoiceSelect, Card, Button, Loading } from "../../components/UI";
type Entry = {
  id: string;
  title: string;
  body: string;
  category: string;
  aliases: string[];
  source: string;
  lesson?: string;
};
export default function Encyclopedia() {
  const { data, error } = useData<Entry[]>("encyclopedia"),
    { navigate } = useApp();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [id, setId] = useState(""),
    [limit, setLimit] = useState(100);
  const filtered = useMemo(
    () =>
      data
        ?.filter(
          (e) =>
            (category === "All" || e.category === category) &&
            (e.title + " " + e.body + " " + e.aliases.join(" "))
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => a.title.localeCompare(b.title)) || [],
    [data, query, category],
  );
  if (!data) return <Loading error={error} />;
  const selected = filtered.find((e) => e.id === id) || filtered[0];
  return (
    <>
      <div className="section-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search encyclopedia"
            placeholder="Motif, player, event, opening…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(100);
            }}
          />
        </div>
        <ChoiceSelect
          aria-label="Encyclopedia category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLimit(100);
          }}
        >
          <option>All</option>
          {[...new Set(data.map((e) => e.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </ChoiceSelect>
      </div>
      <div className="encyclopedia-layout">
        <div className="encyclopedia-index card">
          {filtered.slice(0, limit).map((e) => (
            <button
              key={e.id}
              className={e.id === selected?.id ? "active" : ""}
              onClick={() => setId(e.id)}
            >
              <span>
                {e.title}
                <small>{e.category}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
          {filtered.length > limit && (
            <Button
              className="text-button"
              onClick={() => setLimit((n) => n + 100)}
            >
              Show more
            </Button>
          )}
          {!filtered.length && <p className="caption">No matching entries.</p>}
        </div>
        {selected ? (
          <Card className="encyclopedia-entry">
            <span className="pill">{selected.category}</span>
            <BookOpen size={38} />
            <h2>{selected.title}</h2>
            <p>{selected.body}</p>
            <div className="button-row">
              {selected.aliases.map((a) => (
                <span className="pill" key={a}>
                  {a}
                </span>
              ))}
            </div>
            {selected.lesson && (
              <Button
                onClick={() => navigate("learn", "lessons:" + selected.lesson!)}
              >
                Study opening
              </Button>
            )}
            <a
              className="external"
              href={selected.source}
              target="_blank"
              rel="noreferrer"
            >
              Read more
              <ArrowUpRight size={15} />
            </a>
          </Card>
        ) : (
          <Card>
            <a
              className="external"
              href={
                "https://en.wikipedia.org/w/index.php?search=" +
                encodeURIComponent(query + " chess")
              }
              target="_blank"
              rel="noreferrer"
            >
              Search further
              <ArrowUpRight size={16} />
            </a>
          </Card>
        )}
      </div>
    </>
  );
}
