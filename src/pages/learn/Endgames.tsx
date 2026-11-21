import { usePremoves } from "../../lib/usePremoves";
import PremoveQueue from "../../components/PremoveQueue";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Flag, Check, RotateCcw, Lightbulb, ChevronDown } from "lucide-react";
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
  const [exercise, setExercise] = useState(exercises[0]),
    [moves, setMoves] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [outcome, setOutcome] = useState(""),
    [busy, setBusy] = useState(false),
    [hint, setHint] = useState(""),
    [tip, setTip] = useState(false);
  const generation = useRef(0);
  const hintController = useRef<AbortController | null>(null);
  useEffect(() => () => hintController.current?.abort(), []);
  const c = new Chess(exercise.fen);
  for (const move of moves) c.move(move);
  const fen = c.fen();
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
    if (outcome || c.turn() === exercise.side) return;
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
  }, [fen, exercise, outcome]);
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
  }
  const premove = usePremoves({
    fen,
    side: exercise.side,
    legal: c
      .moves({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion || "")),
    active: !outcome,
    identity: exercise.id,
    execute: playMove,
  });
  return (
    <div className="learning-layout">
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
      <div className="board-column">
        <div className="card-heading">
          <h2>{exercise.title}</h2>
          <span className="pill">
            {exercise.side === "w" ? "White" : "Black"}
          </span>
        </div>
        <Board
          fen={premove.preview}
          materialFen={fen}
          onCancelPremoves={premove.cancelOnRightClick}
          premoveDestinations={premove.destinations}
          legalMoves={c.turn() === exercise.side ? undefined : premove.options}
          flipped={exercise.side === "b"}
          disabled={
            !!outcome || (c.turn() !== exercise.side && !appearance.premoves)
          }
          hint={hint}
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
        <PremoveQueue
          moves={premove.queue}
          undo={() => premove.setQueue((q) => q.slice(0, -1))}
          clear={premove.clear}
        />
        <Card className="lesson-controls">
          <div className="card-heading">
            <h3>
              {outcome ||
                (busy
                  ? "Stockfish is replying…"
                  : exercise.goal === "mate"
                    ? "Checkmate the king"
                    : exercise.goal === "promote"
                      ? "Promote a pawn"
                      : "Hold the draw")}
            </h3>
            <span className="caption">{Math.ceil(moves.length / 2)} moves</span>
          </div>
          {message && (
            <p className="feedback" role="status">
              {message}
            </p>
          )}
          <div className="button-row">
            <Button
              disabled={!!outcome || busy}
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
              disabled={!claimable || !!outcome}
              onClick={() => finish(exercise.goal === "draw", "Draw claimed.")}
            >
              Claim draw
            </Button>
          </div>
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
      </div>
    </div>
  );
}
