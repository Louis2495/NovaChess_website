import { usePremoves } from "../lib/usePremoves";
import PremoveQueue from "../components/PremoveQueue";
import { useEffect, useState } from "react";
import {
  Flag,
  Handshake,
  RotateCcw,
  Snowflake,
  ArrowLeftRight,
} from "lucide-react";
import { useApp } from "../lib/context";
import { usePersistent, uid, pieceUrl } from "../lib/store";
import {
  newSpecial,
  specialApply,
  specialLegal,
  specialBot,
  specialTurn,
  cells,
  type SpecialVariant,
  type SpecialState,
} from "../lib/specialRules";
import { Board } from "../components/Board";
import { Button, Card } from "../components/UI";
import GameResult from "../components/GameResult";
import GameGIFButton from "../components/GameGIFButton";
export default function SpecialPlay({
  variant,
  human,
  dropCount,
  onBack,
}: {
  variant: SpecialVariant;
  human: "w" | "b";
  dropCount: number;
  onBack: () => void;
}) {
  const { library, setLibrary, notify, appearance } = useApp();
  const [saved, setSaved] = usePersistent<{
    id: string;
    state: SpecialState;
    human: "w" | "b";
    history?: SpecialState[];
  }>("novachess-special-" + variant, {
    id: uid(),
    state: newSpecial(variant, dropCount),
    human,
  });
  const state = saved.state,
    side = saved.human;
  const [armed, setArmed] = useState<"" | "freeze" | "swap">(""),
    [first, setFirst] = useState(""),
    [busy, setBusy] = useState(false);
  const names = {
    dropping: "Dropping Squares",
    chaos: "Chaos chess",
    random: "Random",
  };
  function apply(action: Parameters<typeof specialApply>[1]) {
    try {
      const next = specialApply(state, action);
      setSaved((s) => ({
        ...s,
        history: [...(s.history || []), s.state],
        state: next,
      }));
      setArmed("");
      setFirst("");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  useEffect(() => {
    const g = {
      id: saved.id,
      title: names[variant],
      created:
        library.activeGame?.id === saved.id
          ? library.activeGame.created
          : Date.now(),
      initial: state.positions[0],
      variant,
      moves: state.moves,
      notation: state.notation,
      positions: state.positions,
      result: state.result,
      human: side,
      folder: "Games",
      kind: "game" as const,
      origin: "novachess" as const,
      special: state,
    };
    setLibrary((l) => ({
      ...l,
      activeGame: g,
      games:
        state.result !== "*" && state.moves.length
          ? [g, ...l.games.filter((v) => v.id !== g.id)]
          : l.games,
    }));
  }, [state]);
  useEffect(() => {
    if (state.result !== "*" || specialTurn(state) === side) return;
    setBusy(true);
    const t = setTimeout(() => {
      try {
        let next = state;
        if (
          variant === "chaos" &&
          !next.freezeUsed.includes(specialTurn(next)) &&
          next.ply > 8
        ) {
          const p = cells(next.fen),
            enemy = Object.keys(p).filter(
              (k) =>
                (p[k] === p[k].toUpperCase() ? "w" : "b") === side &&
                p[k].toLowerCase() !== "k",
            );
          if (enemy.length)
            next = specialApply(next, {
              type: "freeze",
              square: enemy[Math.floor(Math.random() * enemy.length)],
            });
        }
        const move = specialBot(next);
        if (move)
          setSaved((s) => ({
            ...s,
            history: [...(s.history || []), s.state],
            state: specialApply(next, { type: "move", move }),
          }));
      } catch (e) {
        notify((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [state, side]);
  const legal = specialLegal(state),
    turn = specialTurn(state),
    onSquare = armed
      ? (square: string) => {
          if (armed === "freeze") apply({ type: "freeze", square });
          else if (!first) setFirst(square);
          else apply({ type: "swap", from: first, to: square });
        }
      : undefined;
  const premove = usePremoves({
    fen: state.fen,
    side,
    legal,
    active: state.result === "*",
    identity: saved.id,
    execute: (move) => apply({ type: "move", move }),
    chaos: variant === "chaos",
    blocked: state.blocked,
  });
  return (
    <>
      <h1 className="sr-only">{names[variant]}</h1>
      <div className="chess-layout play-match special-match">
        <div className="board-column">
          <GameResult result={state.result} />
          <div className="player-strip">
            <b>Computer</b>
          </div>
          <Board
            fen={premove.preview}
            materialFen={state.fen}
            onCancelPremoves={premove.cancelOnRightClick}
            flipped={side === "b"}
            legalMoves={turn === side ? legal : premove.options}
            blocked={state.blocked}
            selected={first || state.randomFrom || undefined}
            disabled={
              (turn !== side && !appearance.premoves) || state.result !== "*"
            }
            onMove={(from, to, promotion) =>
              turn === side
                ? apply({ type: "move", move: from + to + (promotion || "") })
                : premove.enqueue(from + to + (promotion || ""))
            }
            onSquare={onSquare}
            onCancel={
              armed
                ? () => {
                    setArmed("");
                    setFirst("");
                  }
                : undefined
            }
          />
          <div className="player-strip">
            <span className="avatar">
              <img
                src={library.profile.avatar || pieceUrl("wP", "Chessnut")}
                alt=""
              />
            </span>
            <b>{library.profile.name}</b>
          </div>
          <PremoveQueue
            moves={premove.queue}
            undo={() => premove.setQueue((q) => q.slice(0, -1))}
            clear={premove.clear}
          />
        </div>
        <div className="side-panels match-sidebar">
          <div className="button-row">
            {variant === "chaos" && state.result === "*" && (
              <>
                <Button
                  className={armed === "freeze" ? "" : "secondary"}
                  disabled={
                    busy || turn !== side || state.freezeUsed.includes(side)
                  }
                  onClick={() => {
                    setArmed(armed === "freeze" ? "" : "freeze");
                    setFirst("");
                  }}
                >
                  <Snowflake size={17} />
                  Freeze
                </Button>
                <Button
                  className={armed === "swap" ? "" : "secondary"}
                  disabled={
                    busy || turn !== side || state.swapUsed.includes(side)
                  }
                  onClick={() => {
                    setArmed(armed === "swap" ? "" : "swap");
                    setFirst("");
                  }}
                >
                  <ArrowLeftRight size={17} />
                  Switch
                </Button>
              </>
            )}
            <Button
              className="resign-button"
              disabled={state.result !== "*"}
              onClick={() =>
                setSaved((s) => ({
                  ...s,
                  state: { ...s.state, result: side === "w" ? "0-1" : "1-0" },
                }))
              }
            >
              <Flag size={16} />
              Resign
            </Button>
            <Button
              className="draw-button"
              disabled={state.result !== "*"}
              onClick={() =>
                setSaved((s) => ({
                  ...s,
                  state: { ...s.state, result: "1/2-1/2" },
                }))
              }
            >
              <Handshake size={16} />
              Draw
            </Button>
            <Button
              className="takeback-button"
              disabled={state.result !== "*" || !saved.history?.length}
              onClick={() => {
                const history = [...(saved.history || [])];
                let previous = history.pop();
                while (
                  previous &&
                  specialTurn(previous) !== side &&
                  history.length
                )
                  previous = history.pop();
                while (
                  previous &&
                  history.length &&
                  history[history.length - 1].ply === previous.ply
                )
                  previous = history.pop();
                if (previous)
                  setSaved((s) => ({ ...s, state: previous!, history }));
                setArmed("");
                setFirst("");
                premove.clear();
              }}
            >
              {" "}
              <RotateCcw size={16} />
              Take back
            </Button>
            <GameGIFButton
              positions={state.positions}
              flipped={side === "b"}
              blocked={state.blocked}
            />
          </div>

          {armed && (
            <p role="status">
              {armed === "freeze"
                ? "Choose an opponent piece."
                : first
                  ? "Choose your second piece."
                  : "Choose your first piece."}
            </p>
          )}
          {state.frozen && (
            <p className="pill">Frozen: {state.frozen.square}</p>
          )}
          <span
            role="img"
            aria-label={turn === "w" ? "White turn" : "Black turn"}
            className={`analysis-turn-dot ${turn === "w" ? "white-turn" : "black-turn"}`}
          />
          <Card>
            <h2>Moves</h2>
            <div className="match-notation">
              <div className="notation-row notation-head">
                <span>White</span>
                <span>Black</span>
              </div>
              {Array.from(
                { length: Math.ceil(state.notation.length / 2) },
                (_, i) => (
                  <div className="notation-row" key={i}>
                    <span>
                      <small>{i + 1}.</small> {state.notation[i * 2]}
                    </span>
                    <span>{state.notation[i * 2 + 1] || ""}</span>
                  </div>
                ),
              )}
            </div>
          </Card>
          {state.result !== "*" && (
            <Button onClick={onBack}>
              <RotateCcw size={17} />
              New game
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
