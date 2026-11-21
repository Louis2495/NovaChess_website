import { groupByOpening, openingFamily, repertoireFamilyLookup } from "../../lib/openingFamilies";
import { exportRepertoire, repertoirePaths } from "../../lib/repertoire";
import RepertoireEditor, { RepertoireImport } from "./RepertoireEditor";
import { usePremoves } from "../../lib/usePremoves";
import PremoveQueue from "../../components/PremoveQueue";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import {
  Plus,
  Trash2,
  GraduationCap,
  RotateCcw,
  Lightbulb,
  Download,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "../../lib/context";
import { download, dateLabel, initialFen, useData } from "../../lib/store";
import type { Opening, Repertoire as Line } from "../../lib/types";
import { Board } from "../../components/Board";
import {
  Card,
  ChoiceSelect,
  Button,
  Empty,
  Field,
  IconButton,
} from "../../components/UI";
function key(c: Chess) {
  return c.fen().split(" ").slice(0, 4).join(" ");
}
export default function Repertoire() {
  const { library, detail, navigate } = useApp();
  const [training, setTraining] = useState<Line | null>(null);
  const route = detail.slice("repertoire".length + 1);
  const back = () => navigate("learn", "repertoire");
  if (route === "new") return <RepertoireEditor onBack={back} />;
  if (route === "import") return <RepertoireImport onBack={back} />;
  if (route.startsWith("edit/")) {
    const line = library.repertoire.find(line => line.id === route.slice(5));
    return line ? <RepertoireEditor line={line} onBack={back} /> :
      <Card><p>That repertoire line is unavailable.</p><Button onClick={back}>Back to repertoire</Button></Card>;
  }
  const add = () => navigate("learn", "repertoire:new");
  if (training)
    return (
      <RepertoireTrainer line={training} onClose={() => setTraining(null)} />
    );
  return <RepertoireLines onTrain={setTraining} onAdd={add} />;
}

function RepertoireLines({ onTrain, onAdd }: { onTrain: (line: Line) => void; onAdd: () => void }) {
  const { library, setLibrary, navigate, notify } = useApp();
  const { data: openings } = useData<Opening[]>("openings");
  const groups = useMemo(() => groupByOpening(library.repertoire, repertoireFamilyLookup(openings ?? []))
    .sort((a, b) => (a.family === "Other lines" ? 1 : 0) - (b.family === "Other lines" ? 1 : 0) || a.family.localeCompare(b.family)),
    [library.repertoire, openings]);
  const { data: lessons } = useData<Opening[]>("lessons");
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("all");
  const [dueOnly, setDueOnly] = useState(false);
  const term = query.trim().toLowerCase();
  const now = Date.now();
  const reference = useMemo(() => new Map(groupByOpening(
    (lessons ?? []).filter(line => !line.continuation),
    line => openingFamily(line.name),
  ).map(({family, lines}) => [family, lines])), [lessons]);
  const matchesColor = (line: Line) => color === "all" || line.side === color;
  const start = initialFen.split(" ").slice(0, 4).join(" ");
  const coveredPaths = library.repertoire
    .filter(line => matchesColor(line) && line.initial.split(" ").slice(0, 4).join(" ") === start)
    .flatMap(repertoirePaths);
  const visible = groups.map(group => ({
    ...group,
    lines: group.lines.filter(line =>
      matchesColor(line) && (!dueOnly || line.due <= now) &&
      (!term || `${group.family} ${line.name}`.toLowerCase().includes(term)))
      .sort((a, b) => a.due - b.due || a.name.localeCompare(b.name)),
  })).filter(group => group.lines.length);
  return (
    <div className="repertoire-page">
      <div className="repertoire-color-toggle">
        <ChoiceSelect aria-label="Repertoire color" value={color} onChange={event => setColor(event.target.value)}>
          <option value="all">Both</option><option value="w">White</option><option value="b">Black</option>
        </ChoiceSelect>
      </div>
      <div className="section-toolbar">
        <p className="muted">
          {library.repertoire.length} lines ·{" "}
          {library.repertoire.filter((l) => l.due <= now).length} due
        </p>
        <div className="button-row">
          <Button className="secondary" onClick={() => navigate("learn", "repertoire:import")}>
            <Download size={16} /> Import
          </Button>
          <Button onClick={onAdd}><Plus size={16} /> Add line</Button>
        </div>
      </div>
      {!!library.repertoire.length && <div className="repertoire-filters">
        <Field label="Search repertoire"><input type="search" placeholder="Opening or line name" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <Field label="Review status"><ChoiceSelect value={dueOnly ? "due" : "all"} onChange={event => setDueOnly(event.target.value === "due")}>
          <option value="all">All lines</option><option value="due">Due for review</option>
        </ChoiceSelect></Field>
      </div>}
      {!library.repertoire.length ? (
        <Card>
          <Empty
            icon={<GraduationCap size={35} />}
            title="No saved lines"
            description="Build a line and train either color with spaced review."
          >
            <Button onClick={onAdd}>Build repertoire</Button>
          </Empty>
        </Card>
      ) : visible.length ? (
        <div className="repertoire-families">
          {visible.map(({ family, lines }) => (
            <section key={family} className="opening-family" aria-label={family}>
              <details open>
                <summary><span>{family}</span><small>{lines.length} {lines.length === 1 ? "line" : "lines"} · {lines.filter(line => line.due <= now).length} due</small><span className="repertoire-section-action" aria-hidden="true"><span>Show lines</span><span>Hide lines</span></span></summary>
                <div className="repertoire-grid">
                  {lines.map((line) => (
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
                        {line.due <= now
                          ? "Due now"
                          : `Due ${dateLabel(line.due)}`}
                      </p>
                      <div className="button-row">
                        <Button onClick={() => onTrain(line)}>
                          <GraduationCap size={15} />
                          Train
                        </Button>
                        <Button className="secondary" onClick={() => navigate("learn", "repertoire:edit/" + line.id)}>
                          Edit
                        </Button>
                        <IconButton
                          label={`Export ${line.name}`}
                          onClick={() => download("repertoire.pgn", exportRepertoire(line), "application/x-chess-pgn")}
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
                <RepertoireSuggestions
                  suggestions={reference.get(family) ?? []}
                  paths={coveredPaths}
                  onSelect={id => navigate("learn", "lessons:" + id)}
                />
              </details>
            </section>
          ))}
        </div>
      ) : <p className="muted">No repertoire lines match these filters.</p>}
    </div>
  );
}

function RepertoireSuggestions({ suggestions, paths, onSelect }: {
  suggestions: Opening[]; paths: string[][]; onSelect: (id: string) => void;
}) {
  if (!suggestions.length) return null;
  const missing = suggestions.filter(lesson =>
    !paths.some(path => lesson.moves.every((move, index) => path[index] === move)));
  if (!missing.length) return <p className="caption repertoire-coverage">You’ve saved all the suggested lines for this opening.</p>;
  return <details className="repertoire-coverage">
    <summary><span>Suggested lines to add ({missing.length})</span><span className="repertoire-section-action" aria-hidden="true"><span>Show</span><span>Hide</span></span></summary>
    <p className="caption">These lessons aren’t covered by the complete move sequences in your saved lines or sidelines.</p>
    <ul>{missing.map(lesson => <li key={lesson.id}>
      <button className="text-link" onClick={() => onSelect(lesson.id)}>{lesson.name}</button>
    </li>)}</ul>
  </details>;
}

export function RepertoireTrainer({
  line,
  onClose,
  lines,
}: {
  line: Line;
  onClose: () => void;
  lines?: Line[];
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
    for (const l of (lines || library.repertoire).filter(
      (v) => v.side === line.side,
    )) {
      for (const moves of repertoirePaths(l)) {
        const b = new Chess(l.initial);
        for (let i = 0; i < moves.length; i++) {
          if (key(b) === key(c)) result.push({ line: { ...l, moves }, index: i, move: moves[i] });
          b.move(moves[i]);
        }
      }
    }
    return result;
  }, [fen, library.repertoire, lines]);
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
      choices.find((v) => v.move === uci && v.line.moves === active.moves) ||
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
    <div className="chess-layout repertoire-training">
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
          onCancelPremoves={premove.cancelOnRightClick}
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
                choices.find((v) => v.line.moves === active.moves) || choices[0];
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
