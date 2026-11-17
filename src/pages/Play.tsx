import { useReviewWarmup } from "../lib/useReviewWarmup";
import { duration } from "../lib/speedrun";
import { weakComputerMove } from "../lib/computerStrength";
import { matchTypedMove } from "../lib/moves";
import { previewPremoves } from "../lib/premoves";
import { usePremoves } from "../lib/usePremoves";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FairyStockfish } from "ffish-es6";
import {
  Timer,
  RotateCcw,
  Flag,
  Handshake,
  ChevronDown,
  ArrowRight,
  MonitorPlay,
  Trash2,
} from "lucide-react";
import { useApp } from "../lib/context";
import {
  fairy,
  makeBoard,
  legal,
  variantList,
  chess960,
  squares,
  promotedAt,
  fog,
} from "../lib/variants";
import { search } from "../lib/engine";
import { uid, useData, pieceUrl, base } from "../lib/store";
import type { Opening, SavedGame } from "../lib/types";
import { Board, Piece } from "../components/Board";
import {
  ChoiceSelect,
  Card,
  Button,
  Field,
  Toggle,
  Modal,
  IconButton,
  Loading,
} from "../components/UI";
import SpecialPlay from "./SpecialPlay";
import GameResult from "../components/GameResult";
import { newSpecial } from "../lib/specialRules";
import type { SpecialVariant } from "../lib/specialRules";
import VariantIcon from "../components/VariantIcon";
import { buildFen } from "../components/PositionEditor";
function addPocket(fen: string, piece: string) {
  if (!piece) return fen;
  return fen.replace(/\[([^\]]*)\]/, (_, p) => `[${p}${piece}]`);
}
function snapshot(ff: FairyStockfish, g: SavedGame) {
  const b =
    g.variant === "bughouse"
      ? new ff.Board("bughouse", g.positions.at(-1))
      : makeBoard(ff, g.variant, g.initial, g.moves);
  try {
    return {
      fen: b.fen(),
      legal: legal(b),
      turn: b.turn() ? "w" : "b",
      over: b.isGameOver(),
      result: b.result(),
      whitePocket: b.pocket(true),
      blackPocket: b.pocket(false),
      check: b.isCheck(),
    };
  } finally {
    b.delete();
  }
}
function variantMove(
  variant: string,
  initial: string,
  moves: string[],
  budget: number,
  signal: AbortSignal,
) {
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(
      new URL("../lib/variant-worker.ts", import.meta.url),
      { type: "module" },
    );
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Variant search timed out."));
    }, 20000);
    const stop = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    signal.addEventListener(
      "abort",
      () => {
        stop();
        reject(new DOMException("Canceled", "AbortError"));
      },
      { once: true },
    );
    worker.onmessage = (e) => {
      stop();
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.move);
    };
    worker.onerror = () => {
      stop();
      reject(new Error("Variant worker could not start."));
    };
    worker.postMessage({ variant, initial, moves, budget });
  });
}
export default function Play() {
  const { library, setLibrary, appearance, navigate, detail, notify } =
    useApp();
  const [ff, setFF] = useState<FairyStockfish | null>(null),
    [error, setError] = useState(""),
    [playing, setPlaying] = useState(detail === "resume"),
    [variant, setVariant] = useState("chess"),
    [speedrunMode, setSpeedrunMode] = useState(false),
    [speedrunRating, setSpeedrunRating] = useState(1000),
    [clockNow, setClockNow] = useState(Date.now()),
    [special, setSpecial] = useState<SpecialVariant | null>(
      detail === "resume" && library.activeGame?.special
        ? (library.activeGame.variant as SpecialVariant)
        : null,
    ),
    [dropCount, setDropCount] = useState(2),
    [human, setHuman] = useState<"w" | "b">("w"),
    [choice, setChoice] = useState("Current rating"),
    [openingSearch, setOpeningSearch] = useState(""),
    [rating, setRating] = useState(1200),
    [rated, setRated] = useState(true),
    [openingId, setOpeningId] = useState(""),
    [options, setOptions] = useState(false),
    [drawPending, setDrawPending] = useState(false),
    [flipped, setFlipped] = useState(false),
    [duck, setDuck] = useState<{
      fen: string;
      options: string[];
      queued?: boolean;
    } | null>(null),
    [pocket, setPocket] = useState(""),
    [confirm, setConfirm] = useState(false),
    [moveText, setMoveText] = useState(""),
    [busy, setBusy] = useState(false);
  const { data: openings } = useData<Opening[]>("openings");
  const game = library.activeGame;
  useEffect(() => { if (!game?.speedrun || game.result !== "*") return; const tick=setInterval(()=>setClockNow(Date.now()),100); return ()=>clearInterval(tick); },[game?.id,game?.result]);
  const live = useRef(game);
  live.current = game;
  useEffect(() => {
    let active = true;
    fairy()
      .then((v) => {
        if (active) setFF(v);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  const snap = useMemo(() => {
    if (!ff || !game || ["dropping", "chaos", "random"].includes(game.variant))
      return null;
    try {
      return snapshot(ff, game);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [ff, game]);
  const valid = snap && !("error" in snap) ? snap : null;
  useReviewWarmup(game,!!game && playing && game.result === "*" && valid?.turn === game.human);
  function archive(l: typeof library, g: SavedGame) {
    const existing = l.games.some((v) => v.id === g.id);
    return {
      ...l,
      games: existing
        ? l.games.map((v) => (v.id === g.id ? g : v))
        : [g, ...l.games],
      localRating:
        g.rated && !existing && g.result !== "*"
          ? Math.max(
              100,
              l.localRating +
                32 *
                  ((g.result === "1/2-1/2"
                    ? 0.5
                    : g.result === (g.human === "w" ? "1-0" : "0-1")
                      ? 1
                      : 0) -
                    0.5),
            )
          : l.localRating,
    };
  }
  function start() {
    if (["dropping", "chaos", "random"].includes(variant)) {
      const state = newSpecial(variant as SpecialVariant, dropCount),
        id = uid();
      try {
        localStorage.setItem(
          "novachess-special-" + variant,
          JSON.stringify({ id, state, human }),
        );
      } catch {
        notify("Browser storage is unavailable.");
      }
      setLibrary((l) => ({
        ...l,
        games:
          l.activeGame?.result === "*" && l.activeGame.moves.length
            ? [
                {
                  ...l.activeGame,
                  title: l.activeGame.title + " · unfinished",
                },
                ...l.games.filter((g) => g.id !== l.activeGame!.id),
              ]
            : l.games,
        activeGame: {
          id,
          title: variantList.find((v) => v.id === variant)!.name,
          created: Date.now(),
          initial: state.fen,
          variant,
          moves: [],
          notation: [],
          positions: state.positions,
          result: "*",
          human,
          folder: "Games",
          kind: "game",
          origin: "novachess",
          special: state,
        },
      }));
      setSpecial(variant as SpecialVariant);
      return;
    }
    if (!ff) return;
    const initial =
      variant === "chess960"
        ? chess960()
        : new ff.Board(
            ["blind", "blindtext"].includes(variant) ? "chess" : variant,
          );
    let fen: string;
    if (typeof initial === "string") fen = initial;
    else {
      fen = initial.fen();
      initial.delete();
    }
    const g: SavedGame = {
      id: uid(),
      title: speedrunMode ? "Speedrun" : variantList.find((v) => v.id === variant)?.name || "Game",
      created: Date.now(),
      initial: fen,
      variant,
      moves: [],
      notation: [],
      positions: [fen],
      result: "*",
      human,
      folder: "Games",
      kind: "game",
      origin: "novachess",
      opponent: "Computer",
      opponentChoice: choice,
      botRating: speedrunMode ? Math.max(100,Math.min(3000,Math.round(speedrunRating/50)*50)) : choice === "Current rating" ? library.localRating : rating,
      speedrun: speedrunMode ? {elapsedMs:0,turnStartedAt:human === "w" ? Date.now() : null} : undefined,
      rated: !speedrunMode && rated && variant === "chess",
      requestedOpening: speedrunMode ? "" : openingId,
    };
    if (variant === "bughouse") {
      const b = new ff.Board("bughouse");
      g.partner = {
        initial: b.fen(),
        positions: [b.fen()],
        moves: [],
        notation: [],
        result: "*",
      };
      b.delete();
    }
    setLibrary((l) => ({
      ...l,
      games:
        l.activeGame?.result === "*" && l.activeGame.moves.length
          ? [
              { ...l.activeGame, title: `${l.activeGame.title} · unfinished` },
              ...l.games.filter((v) => v.id !== l.activeGame!.id),
            ]
          : l.games,
      activeGame: g,
    }));
    setPlaying(true);
    setFlipped(human === "b");
    setPremoves([]);
    setDuck(null);
    setPocket("");
  }
  function apply(
    uci: string,
    expectedID?: string,
    expectedPly?: number,
    boardB = false,
  ) {
    if (!ff) return;
    setLibrary((l) => {
      const g = l.activeGame;
      if (
        !g ||
        g.result !== "*" ||
        (expectedID && g.id !== expectedID) ||
        (expectedPly !== undefined && !boardB && g.moves.length !== expectedPly)
      )
        return l;
      let b;
      try {
        const current = boardB
          ? g.partner!.positions.at(-1)!
          : g.positions.at(-1)!;
        b =
          g.variant === "bughouse"
            ? new ff.Board("bughouse", current)
            : makeBoard(ff, g.variant, g.initial, g.moves);
        if (!legal(b).includes(uci)) return l;
        const pieces = squares(b.fen()),
          move = uci.split(",")[0];
        let captured = pieces[move.slice(2, 4)] || "";
        if (captured && promotedAt(current, move.slice(2, 4)))
          captured = captured === captured.toUpperCase() ? "P" : "p";
        if (
          !captured &&
          g.variant === "bughouse" &&
          pieces[move.slice(0, 2)]?.toLowerCase() === "p" &&
          move[0] !== move[2] &&
          !move.includes("@")
        )
          captured = pieces[move.slice(2, 3) + move[1]] || "";
        const humanMoved = (b.turn() ? "w" : "b") === g.human;
        const san = b.sanMove(uci);
        if (!b.push(uci)) return l;
        const nextFen = b.fen();
        let next = { ...g };
        if (g.speedrun && !boardB) next.speedrun = { ...g.speedrun, elapsedMs:g.speedrun.elapsedMs + (humanMoved && g.speedrun.turnStartedAt !== null ? Math.max(0,Date.now()-g.speedrun.turnStartedAt) : 0), turnStartedAt:humanMoved ? null : Date.now() };
        if (boardB) {
          next.partner = {
            ...g.partner!,
            moves: [...g.partner!.moves, uci],
            notation: [...g.partner!.notation, san],
            positions: [...g.partner!.positions, nextFen],
          };
          if (captured) {
            const pos = [...g.positions];
            pos[pos.length - 1] = addPocket(pos.at(-1)!, captured);
            next.positions = pos;
          }
        } else {
          next = {
            ...next,
            moves: [...g.moves, uci],
            notation: [...g.notation, san],
            positions: [...g.positions, nextFen],
          };
          if (captured && g.partner) {
            const pos = [...g.partner.positions];
            pos[pos.length - 1] = addPocket(pos.at(-1)!, captured);
            next.partner = { ...g.partner, positions: pos };
          }
        }
        if (b.isGameOver()) {
          let result = b.result();
          if (boardB && result !== "1/2-1/2")
            result = result === "1-0" ? "0-1" : "1-0";
          next.result = result;
          return { ...archive(l, next), activeGame: next };
        }
        return { ...l, activeGame: next };
      } catch (e) {
        notify((e as Error).message);
        return l;
      } finally {
        b?.delete();
      }
    });
    setDuck(null);
    setPocket("");
    if (appearance.sound) window.dispatchEvent(new Event("chess-move"));
  }
  function play(from: string, to: string, promotion?: string) {
    if (!game || !valid || game.result !== "*") return;
    const prefix = from + to + (promotion || "");
    if (valid.turn !== game.human) {
      if (appearance.premoves) {
        if (game.variant === "duck") {
          let b: ReturnType<typeof makeBoard> | undefined;
          try {
            b = makeBoard(ff!, game.variant, premove.preview, []);
            const candidates = legal(b).filter(
              (m) =>
                m.split(",")[0] === prefix ||
                (!promotion && m.split(",")[0] === from + to),
            );
            if (!candidates.length) {
              notify("That premove is unavailable.");
              return;
            }
            if (candidates[0].includes(",")) {
              const preview = previewPremoves(
                premove.preview,
                [candidates[0]],
                game.human,
              );
              const p = squares(preview);
              for (const sq of Object.keys(p)) if (p[sq] === "*") delete p[sq];
              setDuck({
                fen: buildFen(p, game.human, "", ""),
                options: candidates,
                queued: true,
              });
            } else premove.enqueue(candidates[0]);
          } finally {
            b?.delete();
          }
        } else {
          premove.enqueue(prefix);
          notify("Premove queued.");
        }
      }
      return;
    }
    const candidates = valid.legal.filter(
      (m) =>
        m.split(",")[0] === prefix ||
        (!promotion && m.split(",")[0] === from + to),
    );
    if (!candidates.length) {
      return;
    }
    if (game.variant === "duck") {
      if (!candidates[0].includes(",")) {
        apply(candidates[0]);
        return;
      }
      const p = squares(valid.fen);
      const moving = p[from];
      if (moving.toLowerCase() === "p" && from[0] !== to[0] && !p[to])
        delete p[to[0] + from[1]];
      delete p[from];
      delete p["*"];
      for (const k of Object.keys(p)) if (p[k] === "*") delete p[k];
      p[to] = promotion
        ? game.human === "w"
          ? promotion.toUpperCase()
          : promotion
        : moving;
      if (
        moving.toLowerCase() === "k" &&
        Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2
      ) {
        const rFrom = (to[0] === "g" ? "h" : "a") + from[1],
          rTo = (to[0] === "g" ? "f" : "d") + from[1];
        p[rTo] = p[rFrom];
        delete p[rFrom];
      }
      setDuck({ fen: buildFen(p, valid.turn, "", ""), options: candidates });
      return;
    }
    apply(candidates[0]);
  }
  useEffect(() => {
    if (
      !ff ||
      !game ||
      !valid ||
      !playing ||
      game.result !== "*" ||
      valid.turn === game.human
    )
      return;
    const controller = new AbortController();
    setBusy(true);
    const id = game.id,
      ply = game.moves.length;
    async function go() {
      try {
        let book = "";
        const selected = openings?.find((o) => o.id === game!.requestedOpening);
        if (selected && game!.moves.every((m, i) => m === selected.moves[i]))
          book = selected.moves[game!.moves.length] || "";
        if (book && valid!.legal.includes(book)) {
          await new Promise((r) => setTimeout(r, 350));
          if (!controller.signal.aborted) apply(book, id, ply);
          return;
        }
        const standard = ["chess", "blind", "blindtext"].includes(
          game!.variant,
        );
        let move = "";
        if (standard) {
          const result = await search(valid!.fen, {
            time: (game!.botRating || 1200) < 1320 ? 300 : 700,
            multiPV: (game!.botRating || 1200) < 1320 ? Math.min(8, valid!.legal.length) : 1,
            elo: (game!.botRating || 1200) < 1320 ? 1320 : game!.botRating,
            signal: controller.signal,
          });
          move = (game!.botRating || 1200) < 1320 && result.lines.length
            ? weakComputerMove(valid!.legal, result.lines, valid!.turn, game!.botRating || 1200, Math.random, result.best)
            : result.best;
        } else
          move = await variantMove(
            game!.variant,
            game!.variant === "bughouse" ? valid!.fen : game!.initial,
            game!.variant === "bughouse" ? [] : game!.moves,
            Math.max(80, Math.min(1500, ((game!.botRating || 1200) - 300) / 2)),
            controller.signal,
          );
        if (!controller.signal.aborted && move) apply(move, id, ply);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    void go();
    return () => {
      controller.abort();
      setBusy(false);
    };
  }, [ff, game?.id, game?.moves.length, playing, openings]);
  useEffect(() => {
    if (!ff || !game?.partner || !playing || game.result !== "*") return;
    const controller = new AbortController();
    const id = game.id,
      partnerPly = game.partner.moves.length;
    const timer = setTimeout(async () => {
      try {
        const move = await variantMove(
          "bughouse",
          game.partner!.positions.at(-1)!,
          [],
          200,
          controller.signal,
        );
        if (
          !controller.signal.aborted &&
          live.current?.id === id &&
          live.current.partner?.moves.length === partnerPly
        )
          apply(move, id, undefined, true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      }
    }, 1100);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ff, game?.partner?.positions, playing, game?.result]);
  const premove = usePremoves({
    fen: valid?.fen || "8/8/8/8/8/8/8/8 w - - 0 1",
    side: game?.human || "w",
    legal: valid?.legal || [],
    active: !!game && playing && game.result === "*",
    identity: game?.id,
    execute: (move) => apply(move),
  });
  const { queue: premoves, setQueue: setPremoves } = premove;
  const premoveLegal =
    valid?.turn === game?.human ? valid?.legal || [] : premove.options;
  function resign() {
    if (!game) return;
    const next = { ...game, result: game.human === "w" ? "0-1" : "1-0" };
    setLibrary((l) => ({ ...archive(l, next), activeGame: next }));
    setConfirm(false);
    setPremoves([]);
  }
  if (!ff && !error) return <Loading />;
  if (special)
    return (
      <SpecialPlay
        variant={special}
        human={game?.special ? game.human : human}
        dropCount={game?.special?.dropCount || dropCount}
        onBack={() => {
          setVariant(special);
          setSpecial(null);
          setPlaying(false);
          setOptions(false);
        }}
      />
    );
  return (
    <>
      <h1 className="sr-only">{playing ? "Chess game" : "New game"}</h1>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {!playing || !game || !valid ? (
        <div className="game-setup-page">
          <section
            className="new-game-section setup-launch"
            aria-label="New game"
          >
            <div className="play-feature-copy">
              <Button
                className="new-game-primary"
                disabled={!ff}
                onClick={start}
              >
                Start game
              </Button>
              {game?.result === "*" && (
                <button
                  className="resume-link resume-game-button"
                  onClick={() => {
                    if (game.special) {
                      setSpecial(game.variant as SpecialVariant);
                      return;
                    }
                    setPlaying(true);
                    setFlipped(game.human === "b");
                  }}
                >
                  <RotateCcw size={15} />
                  Resume saved game
                </button>
              )}
            </div>
          </section>
          <div
            className="variant-gallery"
            role="group"
            aria-label="Choose variant"
          >
            {variantList.map((v) => (
              <button
                key={v.id}
                aria-pressed={!speedrunMode && variant === v.id}
                onClick={() => {setVariant(v.id);setSpeedrunMode(false);}}
              >
                <VariantIcon id={v.id} size={118} />
                <span>{v.name}</span>
              </button>
            ))}
            <button aria-pressed={speedrunMode} onClick={()=>{setVariant("chess");setSpeedrunMode(true);}}><img className="speedrun-picture" src={`${base}variants/speedrun.webp`} alt=""/><span>Speedrun</span></button>
          </div>
          {speedrunMode && <Card className="speedrun-setup"><Field label="Computer Elo"><input type="number" min={100} max={3000} step={50} value={speedrunRating} onChange={e=>setSpeedrunRating(+e.target.value)} onBlur={()=>setSpeedrunRating(Math.max(100,Math.min(3000,Math.round((speedrunRating||100)/50)*50)))}/></Field></Card>}
          <Card className="game-settings-card">
            <button
              className="options-toggle"
              aria-expanded={options}
              onClick={() => setOptions(!options)}
            >
              Game options
              <ChevronDown size={17} />
            </button>
            {options && (
              <div className="game-options">
                <Field label="Variant">
                  <ChoiceSelect
                    value={variant}
                    onChange={(e) => {setVariant(e.target.value);setSpeedrunMode(false);}}
                  >
                    {variantList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </ChoiceSelect>
                </Field>
                <div className="variant-summary">
                  <VariantIcon id={variant} />
                  <span>{variantList.find((v) => v.id === variant)?.name}</span>
                </div>
                {variantList.find((v) => v.id === variant)?.description && (
                  <p className="caption">
                    {variantList.find((v) => v.id === variant)?.description}
                  </p>
                )}
                {variant === "dropping" && (
                  <Field label="Squares to drop">
                    <ChoiceSelect
                      value={dropCount}
                      onChange={(e) => setDropCount(+e.target.value)}
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </ChoiceSelect>
                  </Field>
                )}
                <Field label="Your color">
                  <ChoiceSelect
                    value={human}
                    onChange={(e) => setHuman(e.target.value as "w" | "b")}
                  >
                    <option value="w">White</option>
                    <option value="b">Black</option>
                  </ChoiceSelect>
                </Field>
                {!speedrunMode && !["dropping", "chaos", "random"].includes(variant) && (
                  <>
                    <div className="opponent-choices">
                      {["Current rating", "Custom"].map((v) => (
                        <label key={v}>
                          <input
                            type="radio"
                            name="opponent"
                            checked={choice === v}
                            onChange={() => setChoice(v)}
                          />
                          <span>
                            {v}
                            {v === "Current rating" && (
                              <small>{Math.round(library.localRating)}</small>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                    {choice === "Custom" && (
                      <Field label="Strength target (approximate)">
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={rating}
                          onChange={(e) =>
                            setRating(
                              Math.max(
                                1,
                                Math.min(10000, Number(e.target.value) || 1),
                              ),
                            )
                          }
                        />
                      </Field>
                    )}
                    <Toggle
                      label="Rated"
                      checked={rated && variant === "chess"}
                      onChange={(v) => setRated(v && variant === "chess")}
                    />
                    {variant === "chess" && (
                      <div className="opening-request">
                        <Field label="Search openings">
                          <input
                            type="search"
                            value={openingSearch}
                            placeholder="Name or ECO code"
                            onChange={(e) => setOpeningSearch(e.target.value)}
                          />
                        </Field>
                        <Field label="Request an opening">
                          <ChoiceSelect
                            value={openingId}
                            onChange={(e) => setOpeningId(e.target.value)}
                          >
                            <option value="">Any opening</option>
                            {openings
                              ?.filter(
                                (o) =>
                                  o.id === openingId ||
                                  `${o.eco} ${o.name}`
                                    .toLowerCase()
                                    .includes(
                                      openingSearch.trim().toLowerCase(),
                                    ),
                              )
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.eco} · {o.name}
                                </option>
                              ))}
                          </ChoiceSelect>
                        </Field>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div
          className={
            game.variant === "bughouse"
              ? "chess-layout play-match bughouse-match"
              : "chess-layout play-match"
          }
        >
          <div className="board-column">
            {game.speedrun && <div className="speedrun-clock" role="timer" aria-label="Your move time"><Timer size={18}/>{duration(game.speedrun.elapsedMs + (game.result === "*" && game.speedrun.turnStartedAt !== null ? Math.max(0,clockNow-game.speedrun.turnStartedAt) : 0))}</div>}
            <div
              className={`player-strip ${valid.turn !== game.human ? "to-move" : ""}`}
            >
              <span className="avatar">
                <MonitorPlay size={19} />
              </span>
              <div>
                <b>{game.opponent}</b>
                <small>{game.botRating}</small>
              </div>
            </div>
            <>
              <Pocket
                value={
                  valid.turn === game.human
                    ? game.human === "w"
                      ? valid.blackPocket
                      : valid.whitePocket
                    : game.human === "w"
                      ? valid.blackPocket
                      : valid.whitePocket
                }
                enabled={false}
                onSelect={() => {}}
              />
              <Board
                fen={duck?.fen || premove.preview}
                overlay={<GameResult result={game.result} human={game.human}/>}
              materialFen={valid.fen}
                onCancelPremoves={premove.cancelOnRightClick}
                onMove={play}
                legalMoves={premoveLegal}
                onSquare={
                  duck
                    ? (square) => {
                        const move = duck.options.find(
                          (m) => m.slice(-2) === square,
                        );
                        if (move) {
                          if (duck.queued) premove.enqueue(move);
                          else apply(move);
                          setDuck(null);
                        } else
                          notify(
                            "Place the duck on an available empty square.",
                          );
                      }
                    : pocket
                      ? (square) => {
                          const move = `${pocket.toUpperCase()}@${square}`;
                          if (
                            valid.turn !== game.human &&
                            appearance.premoves &&
                            !squares(premove.preview)[square]
                          )
                            premove.enqueue(move);
                          else if (valid.legal.includes(move)) apply(move);

                          setPocket("");
                        }
                      : undefined
                }
                flipped={flipped}
                onFlip={() => setFlipped((v) => !v)}
                disabled={
                  game.result !== "*" ||
                  (valid.turn !== game.human && !appearance.premoves)
                }
                hidden={["blind", "blindtext"].includes(game.variant)}
                visible={
                  game.variant === "cvfog"
                    ? fog(valid.fen, game.human)
                    : undefined
                }
                highlights={
                  game.variant !== "cvfog" && game.moves.length
                    ? [
                        game.moves.at(-1)!.slice(0, 2),
                        game.moves.at(-1)!.slice(2, 4),
                      ]
                    : []
                }
              />
              <Pocket
                value={
                  game.human === "w" ? valid.whitePocket : valid.blackPocket
                }
                enabled={
                  (valid.turn === game.human || appearance.premoves) &&
                  game.result === "*"
                }
                selected={pocket}
                onSelect={setPocket}
              />
            </>
            <div
              className={`player-strip ${valid.turn === game.human ? "to-move" : ""}`}
            >
              <span className="avatar">
                <img
                  src={library.profile.avatar || pieceUrl("wP", "Chessnut")}
                  alt=""
                />
              </span>
              <div>
                <b>{library.profile.name}</b>
                <small>{Math.round(library.localRating)}</small>
              </div>
            </div>
            <div className="game-message" role="status">
              {duck ? (
                "Place the duck."
              ) : pocket ? (
                `Drop ${pocket.toUpperCase()}.`
              ) : busy ? (
                "Opponent is thinking…"
              ) : valid.check ? (
                "Check."
              ) : (
                <span
                  role="img"
                  aria-label={valid.turn === "w" ? "White turn" : "Black turn"}
                  className={`analysis-turn-dot ${valid.turn === "w" ? "white-turn" : "black-turn"}`}
                />
              )}
            </div>
            {game.variant === "blindtext" && (
              <form
                className="inline-form blindfold-move-entry"
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const b = makeBoard(
                      ff!,
                      game.variant,
                      valid.turn === game.human ? valid.fen : premove.preview,
                      [],
                    );
                    let move: string | undefined;
                    try {
                      move = matchTypedMove(
                        moveText,
                        premoveLegal.map((uci) => {
                          let san = uci;
                          try {
                            san = b.sanMove(uci);
                          } catch {}
                          return { uci, san };
                        }),
                      );
                    } finally {
                      b.delete();
                    }
                    if (move) {
                      if (valid.turn === game.human) apply(move);
                      else if (appearance.premoves) premove.enqueue(move);
                      setMoveText("");
                    }
                  } catch {}
                }}
              >
                <input
                  aria-label="Blindfold move"
                  value={moveText}
                  onChange={(e) => setMoveText(e.target.value)}
                  placeholder="Move"
                  disabled={
                    game.result !== "*" ||
                    (valid.turn !== game.human && !appearance.premoves)
                  }
                />
                <Button
                  disabled={
                    !moveText.trim() ||
                    game.result !== "*" ||
                    (valid.turn !== game.human && !appearance.premoves)
                  }
                >
                  Play
                </Button>
              </form>
            )}
            {premoves.length > 0 && (
              <div className="premove-queue">
                <span>Premoves: {premoves.join(" → ")}</span>
                <IconButton
                  label="Remove last premove"
                  onClick={() => setPremoves((p) => p.slice(0, -1))}
                >
                  <RotateCcw size={15} />
                </IconButton>
                <IconButton
                  label="Clear premoves"
                  onClick={() => setPremoves([])}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            )}
          </div>
          <div className="side-panels match-sidebar">
            {game.variant === "bughouse" && game.partner && (
              <Card className="partner-board">
                <h2>Partner board</h2>
                <p className="caption">
                  Three local opponents · captures transfer between boards
                </p>
                <Board
                  fen={game.partner.positions.at(-1)!}
                  disabled
                  flipped={game.human === "w"}
                  compact
                />
                <p className="caption">
                  {game.partner.notation.slice(-6).join(" ") || "Ready"}
                </p>
              </Card>
            )}
            {game.result === "*" ? (
              <div className="game-actions">
                <Button
                  className="draw-button"
                  disabled={drawPending}
                  onClick={() => {
                    setDrawPending(true);
                    notify(
                      "Draw offered. The computer accepts if the local evaluation is close.",
                    );
                    void (
                      ["chess", "blind", "blindtext"].includes(game.variant)
                        ? search(valid.fen, { time: 600 }).then(
                            (r) => Math.abs(r.lines[0]?.score || 0) < 60,
                          )
                        : Promise.resolve(
                            game.moves.length > 30 &&
                              Object.keys(squares(valid.fen)).length < 5,
                          )
                    )
                      .then((accepted) => {
                        if (
                          live.current?.id !== game.id ||
                          live.current.result !== "*" ||
                          live.current.moves.length !== game.moves.length
                        )
                          return;
                        if (accepted) {
                          const next = { ...game, result: "1/2-1/2" };
                          setLibrary((l) =>
                            l.activeGame?.id === game.id
                              ? { ...archive(l, next), activeGame: next }
                              : l,
                          );
                          notify("Draw accepted.");
                        } else notify("Draw declined.");
                      })
                      .catch((e) => notify(e.message))
                      .finally(() => setDrawPending(false));
                  }}
                >
                  <Handshake size={15} />
                  Draw
                </Button>
                <Button
                  className="takeback-button"
                  disabled={!game.moves.length || (game.moves.length === 1 && game.human === "b")}
                  onClick={() => {
                    const count =
                      valid.turn === game.human && game.moves.length > 1
                        ? 2
                        : 1;
                    setLibrary((l) => ({
                      ...l,
                      activeGame: l.activeGame
                        ? {
                            ...l.activeGame,
                            rated: false,
                            speedrun: l.activeGame.speedrun ? {...l.activeGame.speedrun,invalid:true,turnStartedAt:Date.now()} : undefined,
                            moves: l.activeGame.moves.slice(0, -count),
                            notation: l.activeGame.notation.slice(0, -count),
                            positions: l.activeGame.positions.slice(0, -count),
                            review: l.activeGame.review?.slice(0,l.activeGame.moves.length-count),
                          }
                        : null,
                    }));
                    setPremoves([]);
                    setDuck(null);
                  }}
                >
                  <RotateCcw size={15} />
                  Take back
                </Button>
                <Button
                  className="resign-button"
                  onClick={() =>
                    appearance.confirmResign ? setConfirm(true) : resign()
                  }
                >
                  <Flag size={15} />
                  Resign
                </Button>
              </div>
            ) : (
              <div className="button-row">
                <Button onClick={() => navigate("library", game.id)}>
                  Review game
                  <ArrowRight size={15} />
                </Button>
                <Button
                  className="secondary"
                  onClick={() => {
                    setPlaying(false);
                    setOptions(false);
                  }}
                >
                  New game
                </Button>
              </div>
            )}
            {game.variant !== "cvfog" && (
              <Card>
                <div className="card-heading">
                  <h2>Moves</h2>
                  <span className="pill">
                    {Math.ceil(game.moves.length / 2)}
                  </span>
                </div>
                <div className="match-notation">
                  <div className="notation-row notation-head">
                    <span>White</span>
                    <span>Black</span>
                  </div>
                  {Array.from(
                    { length: Math.ceil(game.notation.length / 2) },
                    (_, i) => (
                      <div className="notation-row" key={i}>
                        <span>
                          <small>{i + 1}.</small> {game.notation[i * 2]}
                        </span>
                        <span>{game.notation[i * 2 + 1] || ""}</span>
                      </div>
                    ),
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
      {confirm && (
        <Modal title="Resign game?" onClose={() => setConfirm(false)}>
          <p className="muted">The result will be saved to game history.</p>
          <div className="button-row">
            <Button className="secondary" onClick={() => setConfirm(false)}>
              Continue
            </Button>
            <Button className="danger" onClick={resign}>
              Resign
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Pocket({
  value,
  enabled,
  onSelect,
  selected,
}: {
  value: string;
  enabled: boolean;
  onSelect: (v: string) => void;
  selected?: string;
}) {
  if (!value) return null;
  const pieces = [...new Set(value.split(""))];
  return (
    <div className="pockets">
      {pieces.map((p) => (
        <button
          key={p}
          disabled={!enabled}
          className={selected === p ? "selected" : ""}
          aria-label={`Drop ${p.toUpperCase()}`}
          onClick={() => onSelect(selected === p ? "" : p)}
        >
          <Piece symbol={p} />
          <span>{value.split("").filter((v) => v === p).length}</span>
        </button>
      ))}
    </div>
  );
}
