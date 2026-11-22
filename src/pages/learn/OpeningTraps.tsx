import { useMemo, useState, type ReactNode } from "react";
import { Chess } from "chess.js";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
} from "lucide-react";
import { Board } from "../../components/Board";
import { useData } from "../../lib/store";
import { useLessonViewport } from "../../lib/useLessonViewport";
import { useControl } from "../../lib/controls";
import { Card, Button, Loading, Modal } from "../../components/UI";
type Trap = {
  id: string;
  name: string;
  opening: string;
  setup: string[];
  trap: string[];
  refutation: string[];
  why: string;
  defense: string;
  lesson: string;
};
export default function OpeningTraps({ sectionTabs }: { sectionTabs: ReactNode }) {
  const { data, error } = useData<Trap[]>("opening-traps");
  if (!data) return <>{sectionTabs}<Loading error={error} /></>;
  return <TrapArchive traps={data} sectionTabs={sectionTabs} />;
}
function TrapArchive({ traps, sectionTabs }: { traps: Trap[]; sectionTabs: ReactNode }) {
  const layout = useLessonViewport();
  const [browsing, setBrowsing] = useState(false);
  const [query, setQuery] = useState(""),
    [id, setId] = useState(traps[0].id),
    [branch, setBranch] = useState<"trap" | "refutation">("trap"),
    [cursor, setCursor] = useState(traps[0].setup.length),
    [drill, setDrill] = useState(false),
    [feedback, setFeedback] = useState(""),
    [solved, setSolved] = useState<string[]>([]);
  const trap = traps.find((t) => t.id === id)!,
    moves = trap[branch],
    c = new Chess(),
    notation: string[] = [];
  for (const m of moves.slice(0, cursor)) notation.push(c.move(m).san);
  const fen = c.fen(),
    filtered = useMemo(
      () =>
        traps.filter((t) =>
          (t.name + " " + t.opening)
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
      [traps, query],
    );
  function seek(n: number) {
    setCursor(Math.max(0, Math.min(moves.length, n)));
    setDrill(false);
    setFeedback("");
  }
  function select(t: Trap) {
    setBrowsing(false);
    setId(t.id);
    setCursor(t.setup.length);
    setBranch("trap");
    setDrill(false);
    setFeedback("");
  }
  useControl("next", () => {
    if (!drill) seek(cursor + 1);
  });
  useControl("previous", () => seek(cursor - 1));
  useControl("first", () => seek(0));
  useControl("last", () => {
    if (!drill) seek(moves.length);
  });
  function practice() {
    setBranch("refutation");
    setCursor(trap.setup.length);
    setDrill(true);
    setFeedback("");
  }
  return (
    <>
      <div className="viewport-lesson lesson-workspace trap-workspace" ref={layout}>
        <div className="lesson-board-area trap-board">
          <div className="card-heading">
            <h2>{trap.name}</h2>
            <Button className="secondary" aria-haspopup="dialog" onClick={() => setBrowsing(true)}>
              <Search size={15} /> Browse traps
            </Button>
          </div>
          <div className="lesson-board-slot">
            <Board
              fen={fen}
              disabled={!drill}
              flipped={
                new Chess(
                  (() => {
                    const b = new Chess();
                    for (const m of trap.setup) b.move(m);
                    return b.fen();
                  })(),
                ).turn() === "b"
              }
              highlights={
                cursor
                  ? [moves[cursor - 1].slice(0, 2), moves[cursor - 1].slice(2, 4)]
                  : []
              }
              onMove={(from, to, promotion) => {
                const move = from + to + (promotion || "");
                if (move !== trap.refutation[trap.setup.length]) {
                  setFeedback("That is not the defense in this lesson. Try again.");
                  return;
                }
                setSolved((v) => [...new Set([...v, trap.id])]);
                setCursor(trap.setup.length + 1);
                setDrill(false);
                setFeedback("Correct. " + trap.defense);
              }}
            />
          </div>
          <div className="lesson-bar" aria-hidden="true">
            <span style={{ width: `${(cursor / moves.length) * 100}%` }} />
          </div>
          <div className="lesson-step-controls">
            <Button className="secondary" onClick={() => seek(trap.setup.length)}>
              <RotateCcw size={15} />
              Position
            </Button>
            <Button
              className="secondary"
              disabled={!cursor}
              onClick={() => seek(cursor - 1)}
            >
              <ChevronLeft size={15} />
              Back
            </Button>
            <Button
              disabled={drill || cursor === moves.length}
              onClick={() => seek(cursor + 1)}
            >
              Next
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
        <div className="lesson-sidebar opening-lesson-panels trap-panels">
          {sectionTabs}
          <Card className="trap-playback">
            <div className="segmented trap-branches" role="group" aria-label="Trap variation">
              {["trap", "refutation"].map((v) => (
                <button
                  key={v}
                  className={branch === v ? "active" : ""}
                aria-pressed={branch === v}
                  onClick={() => {
                    setBranch(v as "trap" | "refutation");
                    setCursor(trap.setup.length);
                    setDrill(false);
                    setFeedback("");
                  }}
                >
                  {v === "trap" ? "Trap line" : "Refutation"}
                </button>
              ))}
            </div>
            <div className="move-chips trap-score">
              {notation.map((m, i) => (
                <span key={i}>
                  {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}
                  {m}
                </span>
              ))}
            </div>
          </Card>
          <Card className="trap-coach">
            <span className="pill">
              {drill
                ? "Find the defense"
                : branch === "trap"
                  ? "Why it works"
                  : "How to refute it"}
            </span>
            <p>{branch === "trap" ? trap.why : trap.defense}</p>
            <h3>Remember</h3>
            <p>{trap.lesson}</p>
            <Button onClick={practice}>
              Find the defense
            </Button>
            {feedback && (
              <p className="feedback" role="status">
                {feedback}
              </p>
            )}
          </Card>
        </div>
      </div>
      {browsing && <Modal title="Browse traps" wide onClose={() => setBrowsing(false)}>
          <Card className="trap-catalog">
            <div className="search-field">
              <Search size={16} />
              <input
                aria-label="Search opening traps"
                placeholder="Trap or opening"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="trap-list">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  className={id === t.id ? "active" : ""}
                  onClick={() => select(t)}
                >
                  <span>
                    <b>{t.name}</b>
                    {t.opening.toLowerCase() !== "open games" && <small>{t.opening}</small>}
                  </span>
                  {solved.includes(t.id) ? (
                    <Check size={15} />
                  ) : (
                    null
                  )}
                </button>
              ))}
            </div>
          </Card>
      </Modal>}
    </>
  );
}
