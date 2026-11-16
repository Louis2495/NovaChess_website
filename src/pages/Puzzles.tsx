import { usePremoves } from "../lib/usePremoves";
import PremoveQueue from "../components/PremoveQueue";
import { parseTypedMove, humanTheme } from "../lib/moves";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Lightbulb, ArrowRight, RotateCcw, Calendar } from "lucide-react";
import { useApp } from "../lib/context";
import { useData, today } from "../lib/store";
import type { PuzzleData } from "../lib/types";
import GuessEval from "./GuessEval";
import { dailyPuzzle } from "./Home";
import { Board } from "../components/Board";
import { PageTitle, Card, Button, Loading, Field } from "../components/UI";
export default function Puzzles() {
  const { detail: puzzleView, navigate: changePuzzleView } = useApp();
  if (puzzleView === "eval")
    return (
      <>
        <PageTitle title="Guess the eval">
          <Button
            className="secondary"
            onClick={() => changePuzzleView("puzzles")}
          >
            Puzzles
          </Button>
        </PageTitle>
        <GuessEval />
      </>
    );
  return <ClassicPuzzles />;
}
function ClassicPuzzles() {
  const { data, error } = useData<PuzzleData[]>("puzzles");
  if (!data) return <Loading error={error} />;
  return <PuzzleTrainer puzzles={data} />;
}
function PuzzleTrainer({ puzzles }: { puzzles: PuzzleData[] }) {
  const { library, setLibrary, detail, notify, navigate, appearance } =
    useApp();
  const daily = detail === "daily";
  const [theme, setTheme] = useState("All themes");
  const pool = useMemo(
    () =>
      theme === "All themes"
        ? puzzles
        : puzzles.filter((p) => p.themes.includes(theme)),
    [puzzles, theme],
  );
  function choose(exclude?: string) {
    if (daily) {
      const saved = library.progress.daily[today()];
      return puzzles.find((p) => p.id === saved?.id) || dailyPuzzle(puzzles);
    }
    const unseen = pool.filter(
      (p) => p.id !== exclude && !library.progress.completed.includes(p.id),
    );
    const choices = unseen.length
      ? unseen
      : pool.filter((p) => p.id !== exclude);
    return (
      [...choices].sort(
        (a, b) =>
          Math.abs(a.sourceRating - library.progress.rating) -
            Math.abs(b.sourceRating - library.progress.rating) ||
          a.id.localeCompare(b.id),
      )[0] || pool[0]
    );
  }
  const [puzzle, setPuzzle] = useState(() => choose()),
    [cursor, setCursor] = useState(1),
    [fen, setFen] = useState(() => {
      const c = new Chess(puzzle.fen);
      c.move(puzzle.moves[0]);
      return c.fen();
    }),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false),
    [hint, setHint] = useState(""),
    [wrong, setWrong] = useState(false),
    [played, setPlayed] = useState<string[]>([]),
    [moveInput, setMoveInput] = useState("");
  const moveInputRef = useRef<HTMLInputElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null),
    puzzleBoardRef = useRef<HTMLDivElement>(null);
  const [ratingOffset, setRatingOffset] = useState(47);
  useLayoutEffect(() => {
    const measure = () => {
      const board = puzzleBoardRef.current?.querySelector(".board");
      if (board && layoutRef.current)
        setRatingOffset(
          board.getBoundingClientRect().top -
            layoutRef.current.getBoundingClientRect().top,
        );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (puzzleBoardRef.current) observer.observe(puzzleBoardRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fen]);
  const graded = useRef(daily && !!library.progress.daily[today()]);
  const learner = useMemo(() => {
    const c = new Chess(puzzle.fen);
    c.move(puzzle.moves[0]);
    return c.turn();
  }, [puzzle]);
  const c = new Chess(fen);
  function grade(correct: boolean) {
    if (graded.current) return;
    graded.current = true;
    setLibrary((l) => {
      if (daily && l.progress.daily[today()]) return l;
      const p = l.progress;
      const expected = 1 / (1 + 10 ** ((puzzle.sourceRating - p.rating) / 400));
      const k = p.attempts < 10 ? 400 : p.attempts < 25 ? 120 : 40;
      return {
        ...l,
        progress: {
          ...p,
          rating: Math.max(
            200,
            Math.min(3500, p.rating + k * ((correct ? 1 : 0) - expected)),
          ),
          attempts: p.attempts + 1,
          solved: p.solved + (correct ? 1 : 0),
          streak: correct ? p.streak + 1 : 0,
          completed: [...new Set([...p.completed, puzzle.id])],
          daily: daily
            ? {
                ...p.daily,
                [today()]: { id: puzzle.id, correct, completed: correct },
              }
            : p.daily,
        },
      };
    });
  }
  function complete() {
    const assisted = graded.current;
    grade(true);
    setDone(true);
    setMessage(
      daily && library.progress.daily[today()]
        ? "Daily puzzle replayed. No rating change."
        : assisted
          ? "Completed. Earlier hints or mistakes remain recorded."
          : "Solved.",
    );
    if (daily)
      setLibrary((l) => ({
        ...l,
        progress: {
          ...l.progress,
          daily: {
            ...l.progress.daily,
            [today()]: {
              ...(l.progress.daily[today()] || {
                id: puzzle.id,
                correct: !assisted,
              }),
              completed: true,
            },
          },
        },
      }));
  }
  function load(p: PuzzleData) {
    const c = new Chess(p.fen);
    c.move(p.moves[0]);
    setPuzzle(p);
    setFen(c.fen());
    setCursor(1);
    setDone(false);
    setMessage("");
    setHint("");
    setWrong(false);
    setPlayed([]);
    graded.current = daily && !!library.progress.daily[today()];
    setMoveInput("");
  }
  function attempt(from: string, to: string, promotion?: string) {
    if (done || c.turn() !== learner) return;
    try {
      const ch = new Chess(fen),
        m = ch.move({ from, to, promotion: promotion || "q" }),
        uci = m.from + m.to + (m.promotion || "");
      if (uci !== puzzle.moves[cursor] && !ch.isCheckmate()) {
        grade(false);
        setWrong(true);
        setMessage("Try another move.");
        return;
      }
      setFen(ch.fen());
      setPlayed((p) => [...p, m.san]);
      setCursor(cursor + 1);
      setWrong(false);
      setHint("");
      setMessage("Correct.");
      if (cursor + 1 >= puzzle.moves.length || ch.isCheckmate()) complete();
    } catch {
      notify("That move is not legal.");
    }
  }
  useEffect(() => {
    if (done || c.turn() === learner || cursor >= puzzle.moves.length) return;
    const timer = setTimeout(() => {
      try {
        const ch = new Chess(fen),
          m = ch.move(puzzle.moves[cursor]);
        setFen(ch.fen());
        setPlayed((p) => [...p, m.san]);
        setCursor(cursor + 1);
      } catch {
        setMessage(
          "The puzzle reply could not be played. Skip to the next puzzle.",
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [fen, cursor, puzzle, done]);
  const premove = usePremoves({
    fen,
    side: learner,
    legal: c
      .moves({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion || "")),
    active: !done,
    identity: puzzle.id,
    execute: (move) => attempt(move.slice(0, 2), move.slice(2, 4), move[4]),
  });
  const themes = useMemo(
    () => [...new Set(puzzles.flatMap((p) => p.themes))].sort(),
    [puzzles],
  );
  return (
    <>
      <PageTitle
        title={daily ? "Daily puzzle" : "Puzzles"}
        subtitle={daily ? new Date().toLocaleDateString() : undefined}
      >
        <Button
          className="secondary"
          onClick={() => navigate("puzzles", daily ? "" : "daily")}
        >
          <Calendar size={16} />
          {daily ? "Adaptive practice" : "Daily puzzle"}
        </Button>
        <Button
          className="secondary"
          onClick={() => navigate("puzzles", "eval")}
        >
          Guess the eval
        </Button>
      </PageTitle>
      <div
        className="chess-layout puzzle-layout"
        ref={layoutRef}
        style={
          {
            "--puzzle-rating-offset": `${ratingOffset}px`,
          } as React.CSSProperties
        }
      >
        <div className="board-column">
          <div className="board-topline">
            <span className="turn-indicator">
              <i className={learner === "w" ? "white-piece" : "black-piece"} />
              {done
                ? "Completed"
                : c.turn() !== learner
                  ? "Playing reply…"
                  : `${learner === "w" ? "White" : "Black"} to move`}
            </span>
          </div>
          <div
            ref={puzzleBoardRef}
            className={`puzzle-board ${wrong ? "wrong" : ""} ${done ? "solved" : ""}`}
          >
            <Board
              fen={premove.preview}
              materialFen={fen}
              onCancelPremoves={premove.cancelOnRightClick}
              legalMoves={c.turn() === learner ? undefined : premove.options}
              onMove={(from, to, promotion) =>
                c.turn() === learner
                  ? attempt(from, to, promotion)
                  : premove.enqueue(from + to + (promotion || ""))
              }
              disabled={done || (c.turn() !== learner && !appearance.premoves)}
              flipped={learner === "b"}
              hint={hint}
            />
          </div>
          <PremoveQueue
            moves={premove.queue}
            undo={() => premove.setQueue((q) => q.slice(0, -1))}
            clear={premove.clear}
          />
          <div className="puzzle-feedback" role="status">
            {message}
          </div>
          <div className="button-row equal-buttons">
            <Button
              className="hint-button"
              disabled={done || c.turn() !== learner}
              onClick={() => {
                grade(false);
                const m = new Chess(fen).move(puzzle.moves[cursor]);
                setHint(m.from);
                setMessage(`Try ${m.san}.`);
              }}
            >
              <Lightbulb size={17} />
              Hint
            </Button>
            <Button
              onClick={() => {
                if (daily) {
                  load(puzzle);
                } else {
                  if (!done) grade(false);
                  load(choose(puzzle.id));
                }
              }}
            >
              {daily ? <RotateCcw size={16} /> : <ArrowRight size={16} />}{" "}
              {daily ? "Replay" : done ? "Next puzzle" : "Skip"}
            </Button>
          </div>
          <form
            className="inline-form move-entry"
            onSubmit={(e) => {
              e.preventDefault();
              if (done || c.turn() !== learner) return;
              try {
                const m = parseTypedMove(new Chess(fen), moveInput);
                attempt(m.from, m.to, m.promotion);
                setMoveInput("");
              } catch {
                notify("Enter a legal move.");
              } finally {
                moveInputRef.current?.focus();
              }
            }}
          >
            <input
              aria-label="Puzzle move"
              ref={moveInputRef}
              value={moveInput}
              onChange={(e) => setMoveInput(e.target.value)}
              placeholder="Enter move"
              readOnly={done}
              aria-disabled={done}
            />
            <Button className="secondary" disabled={!moveInput || done}>
              Play
            </Button>
          </form>
        </div>
        <div className="side-panels">
          <Card>
            <div className="large-metric puzzle-rating">
              {Math.round(library.progress.rating)}
            </div>
          </Card>
          {!daily && (
            <Card>
              <h2>Practice</h2>
              <Field label="Theme">
                <select
                  className="theme-select"
                  value={theme}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTheme(value);
                    const choices =
                      value === "All themes"
                        ? puzzles
                        : puzzles.filter((p) => p.themes.includes(value));
                    if (!done) grade(false);
                    load(
                      [...choices].sort(
                        (a, b) =>
                          Math.abs(a.sourceRating - library.progress.rating) -
                          Math.abs(b.sourceRating - library.progress.rating),
                      )[0],
                    );
                  }}
                >
                  <option>All themes</option>
                  {themes.map((t) => (
                    <option key={t} value={t}>
                      {humanTheme(t)}
                    </option>
                  ))}
                </select>
              </Field>
            </Card>
          )}
          <Card>
            <div className="card-heading">
              <h2>Moves</h2>
              <span className="pill">{done ? "Complete" : "In progress"}</span>
            </div>
            <div className="move-chips">
              {played.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
