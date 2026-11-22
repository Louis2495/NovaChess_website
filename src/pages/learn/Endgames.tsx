import { useLessonViewport } from "../../lib/useLessonViewport";
import { usePremoves } from "../../lib/usePremoves";
import PremoveQueue from "../../components/PremoveQueue";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Flag, Check, RotateCcw, Lightbulb, ChevronDown, Play, Square } from "lucide-react";
import { useApp } from "../../lib/context";
import { useData } from "../../lib/store";
import { search } from "../../lib/engine";
import type { Endgame } from "../../lib/types";
import { Board } from "../../components/Board";
import { Card, Button, Loading } from "../../components/UI";
export default function Endgames() {
  const { data, error } = useData<Endgame[]>("endgames");
  if (!data) return <Loading error={error} />;
  return <EndgameTrainer exercises={data} />;
}
function EndgameTrainer({ exercises }: { exercises: Endgame[] }) {
  const { library, setLibrary, notify, appearance } = useApp();
  const layout = useLessonViewport();
  const [exercise, setExercise] = useState(exercises[0]),
    [moves, setMoves] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [outcome, setOutcome] = useState(""),
    [busy, setBusy] = useState(false),
    [hint, setHint] = useState(""),
    [tip, setTip] = useState(false),
    [demoStep, setDemoStep] = useState<number | null>(null);
  const generation = useRef(0);
  const hintController = useRef<AbortController | null>(null);
  useEffect(() => () => hintController.current?.abort(), []);
  const demo = demoStep !== null;
  const demoFinished = demo && demoStep === exercise.demo?.length;
  const playedMoves = demoStep === null ? moves : (exercise.demo ?? []).slice(0, demoStep);
  const c = new Chess(exercise.fen);
  let lastMove;
  for (const move of playedMoves) lastMove = c.move(move);
  const fen = c.fen();
  const demoResult = demoFinished && (exercise.goal === "promote" ? "Promotion shown." :
    exercise.goal === "mate" ? "Checkmate shown." :
    c.isThreefoldRepetition() ? "Draw by repetition shown." : "Draw shown.");
  function finish(success: boolean, reason: string) {
    setOutcome(success ? "Completed" : "Try again");
    setMessage(reason);
    if (success)
      setLibrary((l) => ({
        ...l,
        progress: {
          ...l.progress,
          endgames: [...new Set([...l.progress.endgames, exercise.id])],
        },
      }));
  }
  function playMove(uci: string) {
    const b = new Chess(fen),
      m = b.move(uci);
    const next = [...moves, uci];
    setMoves(next);
    setHint("");
    if (
      exercise.goal === "promote" &&
      m.promotion &&
      m.color === exercise.side
    ) {
      finish(true, "Promotion achieved.");
      return;
    }
    if (b.isCheckmate()) {
      finish(m.color === exercise.side, "Checkmate.");
      return;
    }
    const counts = new Map<string, number>();
    const replay = new Chess(exercise.fen);
    const add = () => {
      const k = replay.fen().split(" ").slice(0, 4).join(" ");
      counts.set(k, (counts.get(k) || 0) + 1);
    };
    add();
    for (const move of next) {
      replay.move(move);
      add();
    }
    if (
      b.isStalemate() ||
      b.isInsufficientMaterial() ||
      Number(b.fen().split(" ")[4]) >= 150 ||
      Math.max(...counts.values()) >= 5
    )
      finish(exercise.goal === "draw", "Draw reached.");
    else setMessage("");
  }
  useEffect(() => {
    if (demo || outcome || c.turn() === exercise.side) return;
    const controller = new AbortController();
    setBusy(true);
    search(fen, { time: 900, signal: controller.signal })
      .then(({ best }) => {
        if (!controller.signal.aborted && best && best !== "(none)")
          playMove(best);
      })
      .catch((e) => {
        if (e.name !== "AbortError") notify(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      controller.abort();
      setBusy(false);
    };
  }, [fen, exercise, outcome, demo]);
  useEffect(() => {
    if (demoStep === null || demoFinished) return;
    const timer = window.setTimeout(() => setDemoStep(demoStep + 1), 550);
    return () => window.clearTimeout(timer);
  }, [demoStep, demoFinished, exercise.id]);
  const claimable =
    c.isThreefoldRepetition() || Number(fen.split(" ")[4]) >= 100;
  function reset(ex = exercise) {
    generation.current++;
    hintController.current?.abort();
    setBusy(false);
    setExercise(ex);
    setMoves([]);
    setOutcome("");
    setMessage("");
    setHint("");
    setTip(false);
    setDemoStep(null);
  }
  const premove = usePremoves({
    fen,
    side: exercise.side,
    legal: c
      .moves({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion || "")),
    active: !demo && !outcome,
    identity: exercise.id,
    execute: playMove,
  });
  return (
    <div className="viewport-lesson endgame-lesson learning-layout" ref={layout}>
      <div className="board-column lesson-board-area">
        <div className="card-heading">
          <h2>{exercise.title}</h2>
          <span className="pill">
            {exercise.side === "w" ? "White" : "Black"}
          </span>
        </div>
        <div className="lesson-board-slot">
          <Board
            fen={demo ? fen : premove.preview}
            materialFen={fen}
            onCancelPremoves={premove.cancelOnRightClick}
            premoveDestinations={premove.destinations}
            legalMoves={c.turn() === exercise.side ? undefined : premove.options}
            flipped={exercise.side === "b"}
            disabled={
              demo || !!outcome || (c.turn() !== exercise.side && !appearance.premoves)
            }
            hint={demo ? undefined : hint}
            highlights={demo && lastMove ? [lastMove.from, lastMove.to] : undefined}
            onMove={(from, to, promotion) => {
              if (c.turn() !== exercise.side) {
                premove.enqueue(from + to + (promotion || ""));
                return;
              }
              try {
                const m = new Chess(fen).move({
                  from,
                  to,
                  promotion: promotion || "q",
                });
                playMove(m.from + m.to + (m.promotion || ""));
              } catch {}
            }}
          />
        </div>
        <PremoveQueue
          moves={premove.queue}
          undo={() => premove.setQueue((q) => q.slice(0, -1))}
          clear={premove.clear}
        />
      </div>
      <div className="endgame-lesson-panels">
        <Card className="lesson-controls">
          <select className="endgame-position-picker" aria-label="Position" value={exercise.id} onChange={event => {
            const next = exercises.find(item => item.id === event.target.value);
            if (next) reset(next);
          }}>
            {exercises.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <div className="card-heading">
            <h3>
              {demo ? demoFinished ? "Demo complete" : "Playing demo…" : outcome ||
                (busy
                  ? "Stockfish is replying…"
                  : exercise.goal === "mate"
                    ? "Checkmate the king"
                    : exercise.goal === "promote"
                      ? "Promote a pawn"
                      : "Hold the draw")}
            </h3>
            <span className="caption">{Math.ceil(playedMoves.length / 2)} moves</span>
          </div>
          <div className="button-row">
            {!!exercise.demo?.length && <Button aria-pressed={demo} onClick={() => {
              if (demo) {
                setDemoStep(null);
                return;
              }
              generation.current++;
              hintController.current?.abort();
              premove.clear();
              setBusy(false);
              setDemoStep(0);
            }}>
              {demo ? <Square size={16} /> : <Play size={16} />}
              {demo ? demoFinished ? "Return to practice" : "Stop demo" : "Demo"}
            </Button>}
            <Button
              disabled={demo || !!outcome || busy}
              onClick={async () => {
                const current = generation.current;
                const ctrl = new AbortController();
                hintController.current = ctrl;
                setBusy(true);
                try {
                  const { best } = await search(fen, {
                    time: 1500,
                    signal: ctrl.signal,
                  });
                  if (
                    current === generation.current &&
                    best &&
                    best !== "(none)"
                  ) {
                    const m = new Chess(fen).move(best);
                    setHint(m.from);
                    setMessage(`Try ${m.san}.`);
                  }
                } catch (e) {
                  if ((e as Error).name !== "AbortError")
                    notify((e as Error).message);
                } finally {
                  if (current === generation.current) setBusy(false);
                }
              }}
            >
              <Lightbulb size={16} />
              Hint
            </Button>
            <Button className="secondary" onClick={() => reset()}>
              <RotateCcw size={16} />
              Restart
            </Button>
            <Button
              className="secondary"
              disabled={demo || !claimable || !!outcome}
              onClick={() => finish(exercise.goal === "draw", "Draw claimed.")}
            >
              Claim draw
            </Button>
          </div>
          {demo ? <p className="caption" role="status">
            {demoFinished ? demoResult : lastMove ? `${lastMove.color === "w" ? "White" : "Black"} played ${lastMove.san}.` : "Starting position."}
          </p> : message && <p className="feedback" role="status">{message}</p>}
          <button className="options-toggle" onClick={() => setTip(!tip)}>
            Technique tip
            <ChevronDown size={15} />
          </button>
          {tip && <p className="caption">{exercise.tip}</p>}
          <p className="caption">
            Stockfish 19 Lite replies locally. No tablebase-perfect-play
            guarantee.
          </p>
        </Card>
        <Card className="opening-list">
          <h2>Positions</h2>
          <div className="scroll-list">
            {exercises.map((ex) => (
              <button
                className={`opening-row ${exercise.id === ex.id ? "active" : ""}`}
                key={ex.id}
                onClick={() => reset(ex)}
              >
                <Flag size={18} />
                <span>
                  {ex.title}
                  <small>
                    {ex.category} ·{" "}
                    {ex.goal === "mate"
                      ? "Checkmate"
                      : ex.goal === "promote"
                        ? "Promote"
                        : "Hold the draw"}
                  </small>
                </span>
                {library.progress.endgames.includes(ex.id) && <Check size={16} />}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
