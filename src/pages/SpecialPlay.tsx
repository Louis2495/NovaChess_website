import { usePremoves } from "../lib/usePremoves";
import PremoveQueue from "../components/PremoveQueue";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Flag,
  Handshake,
  RotateCcw,
  Snowflake,
  ArrowLeftRight,
} from "lucide-react";
import { useApp } from "../lib/context";
import { usePersistent, uid } from "../lib/store";
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
import { Button, Card, PageTitle } from "../components/UI";
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
      setSaved((s) => ({ ...s, state: next }));
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
      <PageTitle title={names[variant]}>
        <Button className="secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          Games
        </Button>
      </PageTitle>
      <div className="chess-layout">
        <div className="board-column">
          <GameResult result={state.result} />
          <Board
            fen={premove.preview}
            materialFen={state.fen}
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
          <PremoveQueue
            moves={premove.queue}
            undo={() => premove.setQueue((q) => q.slice(0, -1))}
            clear={premove.clear}
          />
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
            <GameGIFButton
              positions={state.positions}
              flipped={side === "b"}
              blocked={state.blocked}
            />
          </div>
        </div>
        <div className="side-panels">
          <Card>
            <h2>
              {state.result === "*"
                ? busy
                  ? "Computer thinking…"
                  : turn === "w"
                    ? "White to move"
                    : "Black to move"
                : "Game finished"}
            </h2>
            {variant === "dropping" && (
              <p className="caption">
                One empty square drops every five full moves.{" "}
                {state.blocked.length} / {state.dropCount} dropped.
              </p>
            )}
            {variant === "chaos" && (
              <p className="caption">
                Pawns can move one or two clear squares. Freeze once without
                using your turn; switch two pieces once as your move.
              </p>
            )}
            {variant === "random" && (
              <p className="caption">
                Move the selected piece: {state.randomFrom}. Each turn selects a
                piece with legal moves.
              </p>
            )}
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
          </Card>
          <Card>
            <div className="move-chips">
              {state.notation.map((m, i) => (
                <span key={i}>
                  {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}
                  {m}
                </span>
              ))}
            </div>
          </Card>
          <Button
            onClick={() => {
              setSaved({
                id: uid(),
                state: newSpecial(variant, dropCount),
                human,
              });
              setArmed("");
            }}
          >
            <RotateCcw size={17} />
            New game
          </Button>
        </div>
      </div>
    </>
  );
}
