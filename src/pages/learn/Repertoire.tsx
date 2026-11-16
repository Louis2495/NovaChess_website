import { usePremoves } from "../../lib/usePremoves";
import PremoveQueue from "../../components/PremoveQueue";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import {
  Plus,
  Trash2,
  GraduationCap,
  RotateCcw,
  Save,
  Lightbulb,
  Download,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "../../lib/context";
import { initialFen, uid, download, dateLabel } from "../../lib/store";
import type { Repertoire as Line } from "../../lib/types";
import { Board } from "../../components/Board";
import {
  Card,
  Button,
  Field,
  Modal,
  Empty,
  IconButton,
} from "../../components/UI";
function key(c: Chess) {
  return c.fen().split(" ").slice(0, 4).join(" ");
}
export default function Repertoire() {
  const { library, setLibrary, notify } = useApp();
  const [editing, setEditing] = useState<Line | null | false>(false),
    [training, setTraining] = useState<Line | null>(null),
    [name, setName] = useState(""),
    [side, setSide] = useState<"w" | "b">("w"),
    [moves, setMoves] = useState<string[]>([]),
    [initial, setInitial] = useState(initialFen),
    [error, setError] = useState("");
  const c = new Chess(initial);
  for (const m of moves) c.move(m);
  function edit(line: Line | null) {
    setEditing(line);
    setName(line?.name || "");
    setSide(line?.side || "w");
    setMoves(line?.moves || []);
    setInitial(line?.initial || initialFen);
    setError("");
  }
  function save() {
    if (!name.trim() || !moves.length) {
      setError("Add a name and at least one move.");
      return;
    }
    const line: Line = {
      id: editing ? editing.id : uid(),
      name: name.trim(),
      side,
      initial,
      moves,
      due: Date.now(),
      trained: editing ? editing.trained : 0,
      successes: editing ? editing.successes : 0,
    };
    setLibrary((l) => ({
      ...l,
      repertoire: editing
        ? l.repertoire.map((v) => (v.id === editing.id ? line : v))
        : [...l.repertoire, line],
    }));
    setEditing(false);
    notify("Repertoire saved.");
  }
  if (training)
    return (
      <RepertoireTrainer line={training} onClose={() => setTraining(null)} />
    );
  return (
    <>
      <div className="section-toolbar">
        <p className="muted">
          {library.repertoire.length} lines ·{" "}
          {library.repertoire.filter((l) => l.due <= Date.now()).length} due
        </p>
        <Button onClick={() => edit(null)}>
          <Plus size={16} />
          Add line
        </Button>
      </div>
      {!library.repertoire.length ? (
        <Card>
          <Empty
            icon={<GraduationCap size={35} />}
            title="No saved lines"
            description="Build a line and train either color with spaced review."
          >
            <Button onClick={() => edit(null)}>Build repertoire</Button>
          </Empty>
        </Card>
      ) : (
        <div className="repertoire-grid">
          {library.repertoire.map((line) => (
            <Card key={line.id}>
              <div className="card-heading">
                <h3>{line.name}</h3>
                <span className="pill">
                  {line.side === "w" ? "White" : "Black"}
                </span>
              </div>
              <p className="caption">
                {Math.ceil(line.moves.length / 2)} moves · {line.trained}{" "}
                reviews ·{" "}
                {line.due <= Date.now()
                  ? "Due now"
                  : `Due ${dateLabel(line.due)}`}
              </p>
              <div className="button-row">
                <Button onClick={() => setTraining(line)}>
                  <GraduationCap size={15} />
                  Train
                </Button>
                <Button className="secondary" onClick={() => edit(line)}>
                  Edit
                </Button>
                <IconButton
                  label={`Export ${line.name}`}
                  onClick={() => {
                    const ch = new Chess(line.initial);
                    line.moves.forEach((m) => ch.move(m));
                    download(
                      "repertoire.pgn",
                      ch.pgn(),
                      "application/x-chess-pgn",
                    );
                  }}
                >
                  <Download size={16} />
                </IconButton>
                <IconButton
                  label={`Delete ${line.name}`}
                  onClick={() => {
                    setLibrary((l) => ({
                      ...l,
                      repertoire: l.repertoire.filter((v) => v.id !== line.id),
                    }));
                    notify("Line deleted.");
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing !== false && (
        <Modal
          title={editing ? "Edit line" : "Add repertoire line"}
          onClose={() => setEditing(false)}
          wide
        >
          <div className="editor-layout">
            <div>
              <Board
                fen={c.fen()}
                onMove={(from, to, promotion) => {
                  try {
                    const move = new Chess(c.fen()).move({
                      from,
                      to,
                      promotion: promotion || "q",
                    });
                    setMoves((v) => [
                      ...v,
                      move.from + move.to + (move.promotion || ""),
                    ]);
                  } catch {
                    notify("Illegal move.");
                  }
                }}
              />
              <div className="move-chips">
                {c.history().map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
              <div className="button-row">
                <Button
                  className="secondary"
                  disabled={!moves.length}
                  onClick={() => setMoves((v) => v.slice(0, -1))}
                >
                  <RotateCcw size={15} />
                  Undo
                </Button>
              </div>
            </div>
            <div>
              <Field label="Line name">
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
              <p className="caption">
                Play both sides to build the line. Add separate lines for
                branches. Training accepts saved continuations at matching
                positions.
              </p>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <Button disabled={!moves.length || !name.trim()} onClick={save}>
                <Save size={16} />
                Save line
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function RepertoireTrainer({
  line,
  onClose,
}: {
  line: Line;
  onClose: () => void;
}) {
  const { library, setLibrary, appearance } = useApp();
  const [fen, setFen] = useState(line.initial),
    [active, setActive] = useState(line),
    [cursor, setCursor] = useState(0),
    [assisted, setAssisted] = useState(false),
    [done, setDone] = useState(false),
    [message, setMessage] = useState(""),
    [hint, setHint] = useState("");
  const c = new Chess(fen);
  const choices = useMemo(() => {
    const result: { line: Line; index: number; move: string }[] = [];
    for (const l of library.repertoire.filter((v) => v.side === line.side)) {
      const b = new Chess(l.initial);
      for (let i = 0; i < l.moves.length; i++) {
        if (key(b) === key(c))
          result.push({ line: l, index: i, move: l.moves[i] });
        b.move(l.moves[i]);
      }
    }
    return result;
  }, [fen, library.repertoire]);
  function finish(helped: boolean) {
    if (done) return;
    setDone(true);
    setMessage(
      helped ? "Completed with help. Review again soon." : "Line completed.",
    );
    setLibrary((l) => ({
      ...l,
      repertoire: l.repertoire.map((r) =>
        r.id === line.id
          ? {
              ...r,
              trained: r.trained + 1,
              successes: r.successes + (helped ? 0 : 1),
              due:
                Date.now() +
                (helped ? 0 : Math.min(30, (r.successes + 1) * 2) * 86400000),
            }
          : r,
      ),
    }));
  }
  function apply(uci: string, l = active, index = cursor) {
    const b = new Chess(fen);
    b.move(uci);
    setFen(b.fen());
    setCursor(index + 1);
    setHint("");
    if (index + 1 >= l.moves.length) finish(assisted);
  }
  useEffect(() => {
    if (done || c.turn() === line.side) return;
    const move = active.moves[cursor];
    if (!move) {
      finish(assisted);
      return;
    }
    const t = setTimeout(() => apply(move), 400);
    return () => clearTimeout(t);
  }, [fen, done]);
  function attempt(uci: string) {
    const match =
      choices.find((v) => v.move === uci && v.line.id === active.id) ||
      choices.find((v) => v.move === uci);
    if (!match) {
      setAssisted(true);
      setMessage("Not a saved continuation. Try again.");
      return;
    }
    setActive(match.line);
    setMessage("Correct.");
    apply(uci, match.line, match.index);
  }
  const premove = usePremoves({
    fen,
    side: line.side,
    legal: c
      .moves({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion || "")),
    active: !done,
    identity: line.id,
    execute: attempt,
  });
  function restart() {
    setFen(line.initial);
    setActive(line);
    setCursor(0);
    setAssisted(false);
    setDone(false);
    setMessage("");
    setHint("");
  }
  return (
    <div className="chess-layout">
      <div className="board-column">
        <div className="card-heading">
          <h2>{line.name}</h2>
          <Button className="secondary" onClick={onClose}>
            <ArrowLeft size={15} />
            Lines
          </Button>
        </div>
        <Board
          fen={premove.preview}
          materialFen={fen}
          disabled={done || (c.turn() !== line.side && !appearance.premoves)}
          legalMoves={c.turn() === line.side ? undefined : premove.options}
          flipped={line.side === "b"}
          hint={hint}
          onMove={(from, to, promotion) =>
            c.turn() === line.side
              ? attempt(from + to + (promotion || ""))
              : premove.enqueue(from + to + (promotion || ""))
          }
        />
        <PremoveQueue
          moves={premove.queue}
          undo={() => premove.setQueue((q) => q.slice(0, -1))}
          clear={premove.clear}
        />
        <p className="feedback" role="status">
          {message ||
            (c.turn() === line.side
              ? "Play your next move."
              : "Playing reply…")}
        </p>
        <div className="button-row">
          <Button
            disabled={done || (c.turn() !== line.side && !appearance.premoves)}
            onClick={() => {
              const expected =
                choices.find((v) => v.line.id === active.id) || choices[0];
              if (expected) {
                const m = new Chess(fen).move(expected.move);
                setHint(m.from);
                setMessage(`Try ${m.san}.`);
                setAssisted(true);
              }
            }}
          >
            <Lightbulb size={16} />
            Hint
          </Button>
          <Button className="secondary" onClick={restart}>
            <RotateCcw size={16} />
            Restart
          </Button>
        </div>
      </div>
      <Card>
        <h2>Training</h2>
        <p className="caption">
          {line.side === "w" ? "White" : "Black"} · {Math.ceil(cursor / 2)} /{" "}
          {Math.ceil(active.moves.length / 2)} moves
        </p>
        <p className="muted">{active.name}</p>
        <p className="caption">
          Saved branches and transpositions are accepted. Opponent replies play
          automatically.
        </p>
        <div className="large-metric">
          {line.successes}
          <span>Unassisted reviews</span>
        </div>
      </Card>
    </div>
  );
}
