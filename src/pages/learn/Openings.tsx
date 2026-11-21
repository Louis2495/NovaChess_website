import { groupByOpening, openingFamily } from "../../lib/openingFamilies";
import { usePremoves } from "../../lib/usePremoves";
import PremoveQueue from "../../components/PremoveQueue";
import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Lightbulb,
  Check,
  Save,
  RotateCcw,
  Play,
  Square,
} from "lucide-react";
import { useApp } from "../../lib/context";
import { useData, initialFen, uid } from "../../lib/store";
import { useControl } from "../../lib/controls";
import type { Opening } from "../../lib/types";
import { Board } from "../../components/Board";
import {
  ChoiceSelect,
  Card,
  Button,
  Field,
  Toggle,
  Loading,
  IconButton,
  Modal,
} from "../../components/UI";
type Guide = {
  id: string;
  family: string;
  idea: string;
  structure: string;
  white: string[];
  black: string[];
  breaks: string[];
  avoid: string;
  quiz: {
    question: string;
    answers: string[];
    correct: number;
    explanation: string;
  };
  lines: { name: string; moves: string[] }[];
};
type Workbook = {
  family: string;
  title: string;
  summary: string;
  question: string;
  moves: string[];
  notes: { ply: number; san: string; text: string }[];
  challenge: number;
  answers: { uci: string; san: string }[];
};
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
    { data: all, error: allError } = useData<Opening[]>("openings"),
    { data: guides } = useData<Guide[]>("opening-guides"),
    { data: workbooks, error: workbookError } =
      useData<Workbook[]>("opening-workbooks");
  if (
    !lessons ||
    !guides ||
    !workbooks ||
    (selectedId && !lessons.some((l) => l.id === selectedId) && !all)
  )
    return <Loading error={error || allError || workbookError} />;
  return (
    <LessonWorkspace
      lessons={lessons}
      all={all || lessons}
      guides={guides}
      workbooks={workbooks}
      mode={mode}
      query={query}
      selectedId={selectedId}
    />
  );
}
function LessonWorkspace({
  lessons,
  all,
  guides,
  workbooks,
  mode,
  query,
  selectedId,
}: {
  lessons: Opening[];
  all: Opening[];
  guides: Guide[];
  workbooks: Workbook[];
  mode: "train" | "lesson";
  query: string;
  selectedId?: string;
}) {
  const { library, setLibrary, notify, appearance } = useApp();
  const [search, setSearch] = useState(query),
    [familyFilter, setFamilyFilter] = useState(""),
    [selected, setSelected] = useState(
      lessons.find((l) => l.id === selectedId) ||
        all.find((l) => l.id === selectedId) ||
        lessons[0],
    ),
    [catalog, setCatalog] = useState(!selectedId),
    [branch, setBranch] = useState(0),
    [step, setStep] = useState(0),
    [practice, setPractice] = useState(mode === "train"),
    [side, setSide] = useState<"w" | "b">("w"),
    [hint, setHint] = useState(false),
    [message, setMessage] = useState(""),
    [perfect, setPerfect] = useState(true),
    [limit, setLimit] = useState(80),
    [saving, setSaving] = useState(false),
    [name, setName] = useState(""),
    [info, setInfo] = useState("Study"),
    [decisionActive, setDecisionActive] = useState(false),
    [answer, setAnswer] = useState<number | null>(null),
    [autoplay, setAutoplay] = useState(false);
  const family = openingFamily(selected.name),
    guide =
      guides.find((g) => g.family === family) ||
      guides.find((g) => selected.name.startsWith(g.family))!;
  const workbook = workbooks.find((w) => w.family === guide?.family);
  const lines = useMemo<{ name: string; moves: string[]; continuation?: Opening["continuation"]; id?: string }[]>(
    () => [
      {
        name: selected.name.includes("Core plans")
          ? "Main line"
          : selected.name.split(":").slice(1).join(":") || "Selected line",
        moves: selected.moves,
        continuation: selected.continuation,
      },
      ...(guide?.lines || []).filter(
        (l) => l.moves.join(" ") !== selected.moves.join(" "),
      ),
      ...lessons
        .filter(line => line.continuation && line.id !== selected.id && openingFamily(line.name) === family)
        .map(line => ({ name: line.name.split(": ").slice(1).join(": "), moves: line.moves, continuation: line.continuation, id: line.id })),
      ...(workbook
        ? [{ name: "Study: " + workbook.title, moves: workbook.moves }]
        : []),
    ],
    [family, guide, lessons, selected, workbook],
  );
  const lessonId = lines[branch]?.id ?? selected.id;
  const moves = lines[branch]?.moves || selected.moves,
    c = new Chess();
  for (const m of moves.slice(0, step)) c.move(m);
  const fen = c.fen(),
    expected = step < moves.length ? new Chess(fen).move(moves[step]) : null;
  const families = useMemo(() => [...new Set(lessons.map(line => openingFamily(line.name)))].sort(), [lessons]);
  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    const lessonIds = new Set(lessons.map(line => line.id));
    const source = term ? [...lessons, ...all.filter(line => !lessonIds.has(line.id))] : lessons;
    return source.filter(line =>
      (!familyFilter || openingFamily(line.name) === familyFilter) &&
      (!term || `${line.name} ${line.eco}`.toLowerCase().includes(term)));
  }, [all, lessons, search, familyFilter]);
  const openingGroups = useMemo(() => groupByOpening(candidates, opening => openingFamily(opening.name)), [candidates]);
  let remaining = limit;
  const visibleGroups = openingGroups.flatMap(group => {
    const lines = group.lines.slice(0, remaining);
    remaining -= lines.length;
    return lines.length ? [{ family: group.family, lines }] : [];
  });
  function studyPosition(ply: number, decision = false) {
    const index = lines.findIndex(
      (l) => l.name === "Study: " + workbook?.title,
    );
    if (index < 0) return;
    setBranch(index);
    setStep(ply);
    setCatalog(false);
    setPractice(false);
    setAutoplay(false);
    setDecisionActive(decision);
    setMessage("");
    setHint(false);
    setInfo(decision ? "Decisions" : "Study");
  }
  function show(n: number) {
    setStep(Math.max(0, Math.min(moves.length, n)));
    setHint(false);
    setMessage("");
    setDecisionActive(false);
  }
  useEffect(() => {
    if (step !== moves.length) return;
    setAutoplay(false);
    setLibrary((l) => ({
      ...l,
      progress: {
        ...l.progress,
        learned: [...new Set([...l.progress.learned, lessonId])],
        mastered:
          practice && perfect
            ? [
                ...new Set([
                  ...(l.progress.mastered || []),
                  lessonId + ":" + branch,
                ]),
              ]
            : l.progress.mastered || [],
      },
    }));
  }, [step]);
  useEffect(() => {
    if (!practice || c.turn() === side || !expected) return;
    const t = setTimeout(() => show(step + 1), 500);
    return () => clearTimeout(t);
  }, [step, selected, practice, side, branch]);
  useEffect(() => {
    if (!autoplay || practice || !expected) return;
    const t = setTimeout(() => show(step + 1), 1500);
    return () => clearTimeout(t);
  }, [autoplay, practice, step, branch]);
  useControl("next", () => {
    if (!practice) show(step + 1);
  });
  useControl("previous", () => show(step - 1));
  useControl("first", () => show(0));
  useControl("last", () => {
    if (!practice) show(moves.length);
  });
  useControl("autoplay", () => {
    if (!practice) setAutoplay((v) => !v);
  });
  function choose(o: Opening) {
    setSelected(o);
    setBranch(0);
    show(0);
    setPerfect(true);
    setAnswer(null);
    setInfo("Study");
    setCatalog(false);
    setAutoplay(false);
  }
  function play(from: string, to: string, promotion?: string) {
    try {
      const m = new Chess(fen).move({ from, to, promotion: promotion || "q" });
      if (decisionActive && workbook) {
        if (m.from + m.to + (m.promotion || "") !== workbook.answers[0].uci) {
          setMessage(
            "That is legal, but this exercise asks for a different plan. " +
              workbook.question,
          );
          return;
        }
        show(step + 1);
        setMessage(
          "Correct. " +
            workbook.notes.find((n) => n.ply === workbook.challenge + 1)?.text,
        );
        return;
      }
      if (m.from + m.to + (m.promotion || "") !== moves[step]) {
        setPerfect(false);
        setMessage("Try another move, or use Hint.");
        return;
      }
      show(step + 1);
    } catch {}
  }
  const premove = usePremoves({
    fen,
    side,
    legal: c
      .moves({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion || "")),
    active: practice && !!expected && !decisionActive,
    identity: selected.id + ":" + branch,
    execute: (move) => play(move.slice(0, 2), move.slice(2, 4), move[4]),
  });
  const activeContinuation = lines[branch]?.continuation;
  const study = activeContinuation
    ? { title: lines[branch].name, ...activeContinuation }
    : workbook;
  const jumpToNote = activeContinuation ? show : studyPosition;
  const lessonNote =
    workbook &&
    moves.slice(0, step + 1).every((m, i) => m === workbook.moves[i])
      ? workbook.notes.find((n) => n.ply === step + 1)?.text
      : undefined;
  const explanation =
    activeContinuation?.notes.find(note => note.ply === step + 1)?.text || lessonNote || (expected ? moveNote(c, expected, guide) : guide?.structure);
  const shift = selected.id.length % 3,
    answers =
      guide?.quiz.answers.map((_, i) => guide.quiz.answers[(i + shift) % 3]) ||
      [];
  const navigation = (
    <div className="lesson-step-controls">
      <IconButton
        label="Restart lesson"
        onClick={() => {
          show(0);
          setPerfect(true);
        }}
      >
        <RotateCcw size={17} />
      </IconButton>
      <Button
        className="secondary"
        disabled={!step}
        onClick={() => show(step - 1)}
      >
        <ChevronLeft size={16} />
        Back
      </Button>
      {practice ? (
        <Button
          disabled={!expected}
          onClick={() => {
            setHint(true);
            setPerfect(false);
          }}
        >
          <Lightbulb size={16} />
          Hint
        </Button>
      ) : (
        <Button disabled={!expected} onClick={() => show(step + 1)}>
          Next
          <ChevronRight size={16} />
        </Button>
      )}
      {!practice && (
        <IconButton
          label={autoplay ? "Stop lesson" : "Play lesson"}
          onClick={() => setAutoplay((v) => !v)}
        >
          {autoplay ? <Square size={16} /> : <Play size={16} />}
        </IconButton>
      )}
    </div>
  );
  return (
    <>
      <div
        className={`lesson-workspace ${catalog ? "catalog-open" : "catalog-closed"}`}
      >
        <div className="lesson-sidebar">
          <Button
            className="secondary catalog-toggle"
            onClick={() => setCatalog((v) => !v)}
          >
            {catalog ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelLeftOpen size={18} />
            )}
            Openings<span>{catalog ? "Hide" : "Browse"}</span>
          </Button>
          {catalog ? (
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
              <Field label="Opening family">
                <select value={familyFilter} onChange={event => { setFamilyFilter(event.target.value); setLimit(80); }}>
                  <option value="">All openings</option>
                  {families.map(family => <option key={family}>{family}</option>)}
                </select>
              </Field>
              <div className="list-summary">
                {search
                  ? `${candidates.length} lines`
                  : `${candidates.length} lessons`}
              </div>
              <div className="scroll-list">
                {visibleGroups.map(({ family, lines }) => (
                  <section className="opening-family" key={family} aria-label={family}>
                    <h3>{family}</h3>
                    {lines.map((o) => (
                      <button
                        className={`opening-row ${selected.id === o.id ? "active" : ""}`}
                        key={o.id}
                        onClick={() => choose(o)}
                      >
                        <span className="eco">{o.eco}</span>
                        <span>
                          {o.name}
                          <small>{Math.ceil(o.moves.length / 2)} moves</small>
                        </span>
                        {library.progress.learned.includes(o.id) && (
                          <Check size={15} />
                        )}
                      </button>
                    ))}
                  </section>
                ))}
                {candidates.length > limit && (
                  <Button
                    className="secondary"
                    onClick={() => setLimit(limit + 80)}
                  >
                    Show more
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card className="lesson-desk">
              <div className="lesson-next">
                <span className="eyebrow">
                  {Math.ceil(step / 2)} / {Math.ceil(moves.length / 2)}
                </span>
                <h3>
                  {expected
                    ? practice && !hint
                      ? "Play the next move"
                      : `Next: ${expected.san}`
                    : "Line complete"}
                </h3>
                {(!practice || hint) && <p>{explanation}</p>}
                {message && (
                  <p className="feedback" role="status">
                    {message}
                  </p>
                )}
              </div>
              {navigation}
              <div className="segmented">
                {["Study", "Plan", "Structure", "Decisions", "Review"].map(
                  (v) => (
                    <button
                      key={v}
                      className={info === v ? "active" : ""}
                      onClick={() => setInfo(v)}
                    >
                      {v}
                    </button>
                  ),
                )}
              </div>
              <div
                className="lesson-info-scroll"
                tabIndex={0}
                aria-label="Lesson notes"
              >
                {guide ? (
                  info === "Study" && study ? (
                    <div className="opening-study">
                      <h3>{study.title}</h3>
                      <p>{study.summary}</p>
                      {activeContinuation && <p className="caption">Worked example with a Stockfish continuation.</p>}
                      <Button
                        className="secondary"
                        onClick={() => jumpToNote(study.notes[0].ply)}
                      >
                        Study the position
                      </Button>
                      <div className="study-checkpoints">
                        {study.notes.map((n) => (
                          <button
                            key={n.ply}
                            onClick={() => jumpToNote(n.ply)}
                          >
                            <b>
                              {Math.ceil(n.ply / 2)}
                              {n.ply % 2 ? "." : "…"} {n.san}
                            </b>
                            <span>{n.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : info === "Decisions" && workbook ? (
                    <div className="opening-decision">
                      <h3>{workbook.question}</h3>
                      <p className="caption">
                        Find the move that fits this lesson’s plan.
                      </p>
                      <Button
                        onClick={() => studyPosition(workbook.challenge, true)}
                      >
                        Try the position
                      </Button>
                      {lines[branch].name === "Study: " + workbook.title && (
                        <>
                          <div className="lesson-quiz">
                            {[...workbook.answers]
                              .sort((a, b) => a.san.localeCompare(b.san))
                              .map((a) => (
                                <button
                                  key={a.uci}
                                  disabled={!decisionActive}
                                  onClick={() =>
                                    play(
                                      a.uci.slice(0, 2),
                                      a.uci.slice(2, 4),
                                      a.uci[4],
                                    )
                                  }
                                >
                                  {a.san}
                                </button>
                              ))}
                          </div>
                          {decisionActive && (
                            <Button
                              className="text-button"
                              onClick={() => {
                                studyPosition(workbook.challenge + 1);
                                setInfo("Decisions");
                                setMessage(
                                  workbook.notes.find(
                                    (n) => n.ply === workbook.challenge + 1,
                                  )?.text || "",
                                );
                              }}
                            >
                              Show answer
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  ) : info === "Plan" ? (
                    <>
                      <p>{guide.idea}</p>
                      <h3>White’s plan</h3>
                      <ul>
                        {guide.white.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      <h3>Black’s plan</h3>
                      <ul>
                        {guide.black.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </>
                  ) : info === "Structure" ? (
                    <>
                      <p>{guide.structure}</p>
                      <h3>Pawn breaks</h3>
                      <div className="button-row">
                        {guide.breaks.map((s) => (
                          <span className="pill" key={s}>
                            {s}
                          </span>
                        ))}
                      </div>
                      <h3>Watch for</h3>
                      <p>{guide.avoid}</p>
                    </>
                  ) : (
                    <>
                      <h3>{guide.quiz.question}</h3>
                      <div className="lesson-quiz">
                        {answers.map((a, i) => (
                          <button
                            key={a}
                            className={answer === i ? "selected" : ""}
                            onClick={() => setAnswer(i)}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                      {answer !== null && (
                        <p role="status">
                          {answers[answer] ===
                          guide.quiz.answers[guide.quiz.correct]
                            ? "Correct. "
                            : "Try again. "}
                          {guide.quiz.explanation}
                        </p>
                      )}
                    </>
                  )
                ) : (
                  <p>
                    Compare development, central pawn breaks and king safety in
                    this position.
                  </p>
                )}
              </div>
              <Toggle
                label="Practice moves"
                checked={practice}
                onChange={(v) => {
                  setPractice(v);
                  show(0);
                  setPerfect(true);
                  setAutoplay(false);
                }}
              />
              {practice && (
                <Field label="Train as">
                  <ChoiceSelect
                    value={side}
                    onChange={(e) => {
                      setSide(e.target.value as "w" | "b");
                      show(0);
                      setPerfect(true);
                    }}
                  >
                    <option value="w">White</option>
                    <option value="b">Black</option>
                  </ChoiceSelect>
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
          )}
        </div>
        <div className="lesson-board-area">
          <div className="card-heading">
            <div>
              <span className="eyebrow">{selected.eco}</span>
              <h2>{selected.name}</h2>
            </div>
          </div>
          <PremoveQueue
            moves={premove.queue}
            undo={() => premove.setQueue((q) => q.slice(0, -1))}
            clear={premove.clear}
          />
          <ChoiceSelect
            aria-label="Lesson variation"
            value={branch}
            onChange={(e) => {
              setDecisionActive(false);
              setBranch(+e.target.value);
              setStep(0);
              setHint(false);
              setPerfect(true);
              setMessage("");
            }}
          >
            {lines.map((l, i) => (
              <option key={i} value={i}>
                {l.name}
              </option>
            ))}
          </ChoiceSelect>
          <Board
            fen={premove.preview}
            materialFen={fen}
            onCancelPremoves={premove.cancelOnRightClick}
            premoveDestinations={premove.destinations}
            legalMoves={
              practice && c.turn() !== side ? premove.options : undefined
            }
            onMove={(from, to, promotion) =>
              practice && c.turn() !== side
                ? premove.enqueue(from + to + (promotion || ""))
                : play(from, to, promotion)
            }
            disabled={
              !decisionActive &&
              (!practice ||
                !expected ||
                (c.turn() !== side && !appearance.premoves))
            }
            flipped={
              info === "Decisions" && workbook
                ? (() => {
                    const b = new Chess();
                    workbook.moves
                      .slice(0, workbook.challenge)
                      .forEach((m) => b.move(m));
                    return b.turn() === "b";
                  })()
                : practice
                  ? side === "b"
                  : c.turn() === "b"
            }
            highlights={
              step
                ? [moves[step - 1].slice(0, 2), moves[step - 1].slice(2, 4)]
                : []
            }
            hint={hint ? expected?.from : undefined}
          />
          <div className="lesson-bar">
            <span style={{ width: `${(step / moves.length) * 100}%` }} />
          </div>
          {catalog && (
            <div className="lesson-compact-controls">
              {navigation}
              <p className="caption">
                {expected ? `Next: ${expected.san}` : "Line complete"}
              </p>
            </div>
          )}
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
            <ChoiceSelect
              value={side}
              onChange={(e) => setSide(e.target.value as "w" | "b")}
            >
              <option value="w">White</option>
              <option value="b">Black</option>
            </ChoiceSelect>
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
                    moves,
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
function moveNote(c: Chess, m: ReturnType<Chess["move"]>, g?: Guide) {
  const piece = {
      p: "pawn",
      n: "knight",
      b: "bishop",
      r: "rook",
      q: "queen",
      k: "king",
    }[m.piece],
    side = m.color === "w" ? "White" : "Black";
  if (m.san === "O-O" || m.san === "O-O-O")
    return `${side} castles to connect the rooks. Before opening ${g?.breaks[0] || "the center"}, compare which king will be safer.`;
  if (m.captured)
    return `${m.san} exchanges the ${m.captured === "p" ? "pawn" : { n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }[m.captured as "n"] || "piece"} on ${m.to}. Recount the attackers and defenders before choosing a recapture. ${g?.structure || ""}`;
  if (m.piece === "p") {
    const direction = m.color === "w" ? 1 : -1,
      file = m.to.charCodeAt(0) - 97,
      rank = +m.to[1] + direction;
    const squares = [file - 1, file + 1]
      .filter((f) => f >= 0 && f < 8 && rank >= 1 && rank <= 8)
      .map((f) => "abcdefgh"[f] + rank);
    const specific: Record<string, string> = {
      "w:c3":
        "It prepares d4, but removes c3 as a knight square; Nb1–d2 is the usual alternative.",
      "w:d3":
        "It supports e4 and opens the c1 bishop’s diagonal while keeping central tension.",
      "w:h3":
        "It takes g4 away from an enemy minor piece, at the cost of a tempo before central play.",
      "w:g3":
        "It prepares Bg2 and pressure on the long diagonal; watch the resulting dark-square weaknesses.",
      "b:c6":
        "It supports d5 and controls b5, but blocks the b8 knight’s most natural developing square.",
      "b:d6":
        "It supports e5 or prepares a restrained center; the c8 bishop gains a diagonal.",
      "b:a6":
        "It takes b5 away from White’s minor pieces and may prepare ...b5; central development still matters.",
      "b:g6":
        "It prepares ...Bg7. Keep the long diagonal open enough for the bishop to influence the center.",
    };
    const isBreak = g?.breaks.some(
      (b) => b.replace("...", "").toLowerCase() === m.san.toLowerCase(),
    );
    return `${m.san} controls ${squares.join(" and ")}. ${isBreak ? g?.structure : specific[m.color + ":" + m.san] || "The pawn cannot step back: compare the space gained with the squares left behind."}`;
  }
  const after = new Chess(c.fen());
  after.move(m.san);
  const pressure = after
    .moves({ verbose: true })
    .filter((reply) => reply.to === m.to).length;
  return `${m.san} places the ${piece} on ${m.to}. ${pressure ? "The opponent can challenge this square; check the exchanges before relying on it. " : ""}${(m.color === "w" ? g?.white : g?.black)?.[Math.floor(c.history().length / 6) % 3] || g?.idea || "Compare central control and king safety before the next move."}`;
}
