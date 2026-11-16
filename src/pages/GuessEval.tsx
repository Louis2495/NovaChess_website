import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Target, ArrowRight } from "lucide-react";
import { useApp } from "../lib/context";
import { useData } from "../lib/store";
import { search } from "../lib/engine";
import type { PuzzleData } from "../lib/types";
import { Board } from "../components/Board";
import { Card, Button, Field, Loading } from "../components/UI";
export default function GuessEval() {
  const { data, error } = useData<PuzzleData[]>("puzzles");
  if (!data) return <Loading error={error} />;
  return <EvalGame puzzles={data} />;
}
function EvalGame({ puzzles }: { puzzles: PuzzleData[] }) {
  const { setLibrary, library } = useApp();
  const [round, setRound] = useState(0),
    [score, setScore] = useState(0),
    [guess, setGuess] = useState(""),
    [answer, setAnswer] = useState<number | null>(null),
    [target, setTarget] = useState<number | null>(null),
    [error, setError] = useState(""),
    [seed, setSeed] = useState(Math.floor(Math.random() * puzzles.length));
  const submitted = useRef(false);
  const puzzle = puzzles[(seed + round * 137) % puzzles.length],
    fen = puzzle.fen;
  useEffect(() => {
    const ctrl = new AbortController();
    setTarget(null);
    setError("");
    submitted.current = false;
    search(fen, { time: 1800, signal: ctrl.signal })
      .then((r) => {
        const line = r.lines[0];
        if (!line) throw new Error("No engine evaluation returned.");
        const white = new Chess(fen).turn() === "w" ? 1 : -1;
        setTarget(
          line.mate !== null
            ? (line.mate > 0 ? 15 : -15) * white
            : Math.max(-15, Math.min(15, (line.score / 100) * white)),
        );
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      });
    return () => ctrl.abort();
  }, [fen]);
  const difference =
      answer !== null && target !== null ? Math.abs(answer - target) : null,
    points =
      difference === null
        ? 0
        : Math.max(0, Math.round(100 - Math.min(difference, 5) * 20));
  function submit() {
    if (
      target === null ||
      submitted.current ||
      guess.trim() === "" ||
      !Number.isFinite(+guess)
    )
      return;
    submitted.current = true;
    const n = Math.max(-15, Math.min(15, +guess));
    setAnswer(n);
    const earned = Math.max(
      0,
      Math.round(100 - Math.min(Math.abs(n - target), 5) * 20),
    );
    setScore((s) => s + earned);
    setLibrary((l) => ({
      ...l,
      progress: {
        ...l.progress,
        evalPerfect:
          (l.progress.evalPerfect || 0) +
          (Math.abs(n - target) <= 0.25 ? 1 : 0),
        evalBest: Math.max(l.progress.evalBest || 0, score + earned),
      },
    }));
  }
  return (
    <div className="chess-layout">
      <div className="board-column">
        <Board fen={fen} disabled />
      </div>
      <Card className="eval-game-panel">
        <div className="card-heading">
          <h2>Guess the eval</h2>
          <Target size={23} />
        </div>
        <div className="game-score-row">
          <span>Round {round + 1} / 5</span>
          <b>{score} pts</b>
        </div>
        <p className="caption">
          Positive favors White. Negative favors Black. ±15 includes forced
          mates.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="Your evaluation">
            <input
              inputMode="decimal"
              type="number"
              step="0.1"
              min={-15}
              max={15}
              value={guess}
              disabled={answer !== null}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="+0.0"
            />
          </Field>
          <Button
            disabled={target === null || answer !== null || guess.trim() === ""}
            type="submit"
          >
            {target === null ? "Engine thinking…" : "Lock in"}
          </Button>
        </form>
        {error && <p role="alert">{error}</p>}
        {answer !== null && target !== null && (
          <div className="eval-result" role="status">
            <strong>
              {target >= 0 ? "+" : ""}
              {target.toFixed(2)}
            </strong>
            <span>Stockfish · fixed 1.8s search</span>
            <p>
              {difference! <= 0.25
                ? "Within a quarter pawn"
                : `${difference!.toFixed(2)} pawns away`}{" "}
              · +{points} pts
            </p>
            {round < 4 ? (
              <Button
                onClick={() => {
                  setRound((r) => r + 1);
                  setAnswer(null);
                  setGuess("");
                }}
              >
                Next position
                <ArrowRight size={16} />
              </Button>
            ) : (
              <>
                <h3>{score} / 500</h3>
                <Button
                  onClick={() => {
                    setRound(0);
                    setScore(0);
                    setAnswer(null);
                    setGuess("");
                    setSeed(Math.floor(Math.random() * puzzles.length));
                  }}
                >
                  Play again
                </Button>
              </>
            )}
          </div>
        )}
        <p className="caption">Best: {library.progress.evalBest || 0}</p>
      </Card>
    </div>
  );
}
