import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Lightbulb,
  Check,
  Save,
  FlipVertical2,
} from "lucide-react";
import { useApp } from "../../lib/context";
import { useData, initialFen, uid } from "../../lib/store";
import type { Opening } from "../../lib/types";
import { Board } from "../../components/Board";
import {
  Card,
  Button,
  Field,
  Toggle,
  Loading,
  IconButton,
  Modal,
} from "../../components/UI";
export default function Openings({
  mode,
  query = "",
  selectedId,
}: {
  mode: "train" | "lesson";
  query?: string;
  selectedId?: string;
}) {
  const { data: lessons, error } = useData<Opening[]>("lessons"),
    { data: all } = useData<Opening[]>("openings");
  if (!lessons) return <Loading error={error} />;
  return (
    <OpeningLibrary
      lessons={lessons}
      all={all || lessons}
      mode={mode}
      query={query}
      selectedId={selectedId}
    />
  );
}
function OpeningLibrary({
  lessons,
  all,
  mode,
  query,
  selectedId,
}: {
  lessons: Opening[];
  all: Opening[];
  mode: "train" | "lesson";
  query: string;
  selectedId?: string;
}) {
  const { library, setLibrary, notify } = useApp();
  const [search, setSearch] = useState(query),
    [selected, setSelected] = useState(
      lessons.find((l) => l.id === selectedId) || lessons[0],
    ),
    [step, setStep] = useState(0),
    [practice, setPractice] = useState(mode === "train"),
    [side, setSide] = useState<"w" | "b">("w"),
    [hint, setHint] = useState(false),
    [message, setMessage] = useState(""),
    [limit, setLimit] = useState(80),
    [flipped, setFlipped] = useState(false),
    [saving, setSaving] = useState(false),
    [name, setName] = useState("");
  const candidates = useMemo(
    () =>
      search.trim()
        ? all.filter((o) =>
            (o.name + " " + o.eco).toLowerCase().includes(search.toLowerCase()),
          )
        : lessons,
    [search, lessons, all],
  );
  const c = new Chess();
  for (const m of selected.moves.slice(0, step)) c.move(m);
  const fen = c.fen();
  const expected =
    step < selected.moves.length
      ? new Chess(fen).move(selected.moves[step])
      : null;
  function show(n: number) {
    setStep(n);
    setHint(false);
    setMessage("");
    if (n === selected.moves.length)
      setLibrary((l) => ({
        ...l,
        progress: {
          ...l.progress,
          learned: [...new Set([...l.progress.learned, selected.id])],
        },
      }));
  }
  useEffect(() => {
    if (mode !== "train" || !practice || c.turn() === side || !expected) return;
    const t = setTimeout(() => show(step + 1), 400);
    return () => clearTimeout(t);
  }, [step, selected, practice, side]);
  function play(from: string, to: string, promotion?: string) {
    try {
      const move = new Chess(fen).move({
        from,
        to,
        promotion: promotion || "q",
      });
      if (
        move.from + move.to + (move.promotion || "") !==
        selected.moves[step]
      ) {
        setMessage("Try another move, or use Hint.");
        return;
      }
      show(step + 1);
    } catch {
      notify("Illegal move.");
    }
  }
  let explanation = "";
  if (expected) {
    explanation =
      expected.flags.includes("k") || expected.flags.includes("q")
        ? "Castling develops the rook and shelters the king."
        : expected.captured
          ? "Compare the capture with the available recaptures."
          : expected.piece === "p"
            ? "Notice the change in pawn structure and central control."
            : ["n", "b"].includes(expected.piece)
              ? "Develop the piece and compare its activity."
              : expected.piece === "r"
                ? "Compare the rook’s file and activity."
                : "Check the piece’s threats and safety.";
  }
  return (
    <>
      <div className="learning-layout">
        <Card className="opening-list">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search openings"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(80);
              }}
              placeholder="Name or ECO code"
            />
          </div>
          <div className="list-summary">
            {search ? `${candidates.length} lines` : "111 curated lessons"}
          </div>
          <div className="scroll-list">
            {candidates.slice(0, limit).map((o) => (
              <button
                className={`opening-row ${selected.id === o.id ? "active" : ""}`}
                key={o.id}
                onClick={() => {
                  setSelected(o);
                  setStep(0);
                  setMessage("");
                  setHint(false);
                }}
              >
                <span className="eco">{o.eco}</span>
                <span>
                  {o.name}
                  <small>{Math.ceil(o.moves.length / 2)} moves</small>
                </span>
                {library.progress.learned.includes(o.id) && <Check size={15} />}
              </button>
            ))}
            {candidates.length > limit && (
              <Button
                className="secondary"
                onClick={() => setLimit(limit + 80)}
              >
                Show more
              </Button>
            )}
            {!candidates.length && (
              <p className="muted">No matching openings.</p>
            )}
          </div>
        </Card>
        <div className="board-column">
          <div className="card-heading">
            <div>
              <span className="eyebrow">{selected.eco}</span>
              <h2>{selected.name}</h2>
            </div>
            <IconButton label="Flip board" onClick={() => setFlipped(!flipped)}>
              <FlipVertical2 size={17} />
            </IconButton>
          </div>
          <Board
            fen={fen}
            onMove={play}
            disabled={
              !practice ||
              step >= selected.moves.length ||
              (mode === "train" && c.turn() !== side)
            }
            flipped={flipped}
            highlights={
              step
                ? [
                    selected.moves[step - 1].slice(0, 2),
                    selected.moves[step - 1].slice(2, 4),
                  ]
                : []
            }
            hint={hint ? expected?.from : undefined}
          />
          <div className="lesson-bar">
            <span
              style={{ width: `${(step / selected.moves.length) * 100}%` }}
            />
          </div>
          <Card className="lesson-controls">
            <div className="card-heading">
              <b>
                {step === selected.moves.length
                  ? "Lesson complete"
                  : practice && !hint
                    ? "Play the next move"
                    : `Next: ${expected?.san}`}
              </b>
              <span className="muted">
                {step} / {selected.moves.length}
              </span>
            </div>
            {(!practice || hint) && expected && (
              <p className="caption">{explanation}</p>
            )}
            {message && (
              <p className="feedback" role="status">
                {message}
              </p>
            )}
            <div className="button-row equal-buttons">
              <Button
                className="secondary"
                disabled={!step}
                onClick={() => show(step - 1)}
              >
                <ChevronLeft size={16} />
                Back
              </Button>
              {practice ? (
                <Button disabled={!expected} onClick={() => setHint(true)}>
                  <Lightbulb size={16} />
                  Hint
                </Button>
              ) : (
                <Button disabled={!expected} onClick={() => show(step + 1)}>
                  Next
                  <ChevronRight size={16} />
                </Button>
              )}
              <IconButton label="Restart lesson" onClick={() => show(0)}>
                <RotateCcw size={16} />
              </IconButton>
            </div>
            <Toggle
              label="Practice moves"
              checked={practice}
              onChange={(v) => {
                setPractice(v);
                show(0);
              }}
            />
            {mode === "train" && (
              <Field label="Train as">
                <select
                  value={side}
                  onChange={(e) => {
                    setSide(e.target.value as "w" | "b");
                    setFlipped(e.target.value === "b");
                    show(0);
                  }}
                >
                  <option value="w">White</option>
                  <option value="b">Black</option>
                </select>
              </Field>
            )}
            <Button
              className="text-button"
              onClick={() => {
                setName(selected.name);
                setSaving(true);
              }}
            >
              <Save size={15} />
              Save to repertoire
            </Button>
          </Card>
        </div>
      </div>
      {saving && (
        <Modal title="Save repertoire line" onClose={() => setSaving(false)}>
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field label="Train as">
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as "w" | "b")}
            >
              <option value="w">White</option>
              <option value="b">Black</option>
            </select>
          </Field>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              setLibrary((l) => ({
                ...l,
                repertoire: [
                  ...l.repertoire,
                  {
                    id: uid(),
                    name: name.trim(),
                    side,
                    initial: initialFen,
                    moves: selected.moves,
                    due: Date.now(),
                    trained: 0,
                    successes: 0,
                  },
                ],
              }));
              notify("Line added to your repertoire.");
              setSaving(false);
            }}
          >
            Save line
          </Button>
        </Modal>
      )}
    </>
  );
}
