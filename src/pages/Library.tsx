import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  FolderOpen,
  Plus,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Pause,
  ScanLine,
  Star,
  ChartNoAxesCombined,
  Save,
  GitBranch,
} from "lucide-react";
import { useApp } from "../lib/context";
import { uid, download, dateLabel } from "../lib/store";
import { search } from "../lib/engine";
import { fairy, legal, squares } from "../lib/variants";
import type { SavedGame, ReviewRow } from "../lib/types";
import GameGIFButton from "../components/GameGIFButton";
import { useControl } from "../lib/controls";
import { Board } from "../components/Board";
import {
  PageTitle,
  Card,
  Button,
  Field,
  Empty,
  IconButton,
  Modal,
} from "../components/UI";
export function gamePGN(g: SavedGame) {
  if (["chess", "blind", "blindtext"].includes(g.variant)) {
    const c = new Chess(g.initial);
    g.moves.forEach((m) => c.move(m));
    c.setHeader("Event", g.title);
    c.setHeader("Result", g.result);
    c.setHeader("White", g.human === "w" ? "You" : g.opponent || "Computer");
    c.setHeader("Black", g.human === "b" ? "You" : g.opponent || "Computer");
    return c.pgn();
  }
  return `[Event "${g.title.replaceAll('"', "")} "]\n[Variant "${g.variant}"]\n[FEN "${g.initial}"]\n[Result "${g.result}"]\n\n${g.notation.map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : "") + m).join(" ")} ${g.result}`;
}
export function parseGame(text: string): SavedGame {
  const c = new Chess();
  c.loadPgn(text);
  const h = c.getHeaders(),
    history = c.history({ verbose: true });
  if (!history.length) throw new Error("No legal standard moves found.");
  return {
    id: uid(),
    title:
      h.Event && h.Event !== "?"
        ? h.Event
        : `${h.White || "White"} – ${h.Black || "Black"}`,
    created: Date.now(),
    initial: history[0].before,
    variant: "chess",
    moves: history.map((m) => m.from + m.to + (m.promotion || "")),
    notation: history.map((m) => m.san),
    positions: [history[0].before, ...history.map((m) => m.after)],
    result: h.Result || "*",
    human: "w",
    folder: "Games",
  };
}
export default function LibraryPage() {
  const { library, setLibrary, detail, notify } = useApp();
  const [folder, setFolder] = useState("All"),
    [query, setQuery] = useState(""),
    [newFolder, setNewFolder] = useState(false),
    [name, setName] = useState(""),
    [selected, setSelected] = useState(detail || "");
  const games = library.games.filter(
    (g) =>
      (folder === "All" || g.folder === folder) &&
      g.title.toLowerCase().includes(query.toLowerCase()),
  );
  const g = library.games.find((v) => v.id === selected);
  if (g) return <GameViewer game={g} onClose={() => setSelected("")} />;
  return (
    <>
      <PageTitle
        title="Saved games"
        subtitle={`${library.games.length} games and studies`}
      >
        <Button className="secondary" onClick={() => setNewFolder(true)}>
          <Plus size={16} />
          Folder
        </Button>
      </PageTitle>
      <div className="section-toolbar">
        <div className="folder-tabs">
          {["All", ...library.folders].map((f) => (
            <button
              key={f}
              className={folder === f ? "active" : ""}
              onClick={() => setFolder(f)}
            >
              <FolderOpen size={15} />
              {f}
            </button>
          ))}
        </div>
        <input
          aria-label="Search saved games"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games"
        />
      </div>
      {games.length ? (
        <div className="saved-games-grid">
          {games.map((g) => (
            <Card
              key={g.id}
              className={`saved-game-card result-${g.result === "*" ? "study" : g.result === "1/2-1/2" ? "draw" : g.result === (g.human === "w" ? "1-0" : "0-1") ? "win" : "loss"}`}
            >
              <div className="saved-board-button">
                <Board fen={g.positions.at(-1) || g.initial} disabled compact />
              </div>
              <div className="card-heading">
                <h3>{g.title}</h3>
                <span className="pill">
                  {g.result === "*" ? "Study" : g.result}
                </span>
              </div>
              <p className="caption">
                {g.variant} · {Math.ceil(g.moves.length / 2)} moves ·{" "}
                {dateLabel(g.created)}
              </p>
              <div className="button-row">
                <Button className="secondary" onClick={() => setSelected(g.id)}>
                  Replay & review
                  <ChevronRight size={15} />
                </Button>
                <IconButton
                  label={`Delete ${g.title}`}
                  onClick={() => {
                    setLibrary((l) => ({
                      ...l,
                      games: l.games.filter((v) => v.id !== g.id),
                    }));
                    notify("Game removed.");
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Empty
            icon={<FolderOpen size={35} />}
            title="No games here"
            description="Save an analysis study or finish a game."
          />
        </Card>
      )}
      {newFolder && (
        <Modal title="New folder" onClose={() => setNewFolder(false)}>
          <Field label="Folder name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </Field>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              setLibrary((l) => ({
                ...l,
                folders: [...new Set([...l.folders, name.trim()])],
              }));
              setNewFolder(false);
              setName("");
            }}
          >
            Create folder
          </Button>
        </Modal>
      )}
    </>
  );
}
function repertoireChoice(
  fen: string,
  library: ReturnType<typeof useApp>["library"],
) {
  const key = fen.split(" ").slice(0, 4).join(" "),
    out: { move: string; name: string }[] = [];
  for (const line of library.repertoire) {
    const c = new Chess(line.initial);
    for (const m of line.moves) {
      if (
        c.fen().split(" ").slice(0, 4).join(" ") === key &&
        c.turn() === line.side
      )
        out.push({ move: m, name: line.name });
      c.move(m);
    }
  }
  return out;
}
function material(fen: string) {
  const v: Record<string, number> = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0,
  };
  return Object.values(squares(fen)).reduce(
    (s, p) => s + (p === p.toUpperCase() ? 1 : -1) * (v[p.toLowerCase()] || 0),
    0,
  );
}
function GameViewer({
  game,
  onClose,
}: {
  game: SavedGame;
  onClose: () => void;
}) {
  const { library, setLibrary, navigate, notify } = useApp();
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [replaySpeed, setReplaySpeed] = useState(650),
    [reviewing, setReviewing] = useState(false),
    [budget, setBudget] = useState(500),
    [status, setStatus] = useState(""),
    [flipped, setFlipped] = useState(game.initial.split(" ")[1] === "b"),
    [title, setTitle] = useState(game.title);
  useControl("next", () =>
    setCursor((n) => Math.min(game.moves.length, n + 1)),
  );
  useControl("previous", () => setCursor((n) => Math.max(0, n - 1)));
  useControl("first", () => setCursor(0));
  useControl("last", () => setCursor(game.moves.length));
  useControl("autoplay", () => {
    if (cursor === game.moves.length) setCursor(0);
    setPlaying((v) => !v);
  });
  const controller = useRef<AbortController | null>(null);
  const standard = ["chess", "blind", "blindtext"].includes(game.variant),
    rows = game.review || [];
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!playing) return;
    if (cursor >= game.moves.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setCursor((v) => v + 1), replaySpeed);
    return () => clearTimeout(t);
  }, [playing, cursor, replaySpeed]);
  async function review() {
    setReviewing(true);
    const ctrl = new AbortController();
    controller.current = ctrl;
    const cache = new Map<string, Awaited<ReturnType<typeof search>>>();
    const evaluate = async (fen: string) => {
      if (cache.has(fen)) return cache.get(fen)!;
      const c = new Chess(fen);
      if (c.isCheckmate())
        return {
          best: "",
          lines: [
            {
              score: c.turn() === "w" ? -100000 : 100000,
              depth: 0,
              mate: 0,
              moves: [],
              rank: 1,
            },
          ],
        };
      if (c.isDraw())
        return {
          best: "",
          lines: [{ score: 0, depth: 0, mate: null, moves: [], rank: 1 }],
        };
      const result = await search(fen, { time: budget, signal: ctrl.signal });
      cache.set(fen, result);
      return result;
    };
    try {
      const collected = [...rows];
      for (let i = rows.length; i < game.moves.length; i++) {
        if (ctrl.signal.aborted) break;
        setStatus(`Reviewing move ${Math.floor(i / 2) + 1}`);
        const before = game.positions[i],
          after = game.positions[i + 1];
        let best = "",
          score = 0,
          loss = 0,
          concept = "Piece activity",
          label = "Alternative";
        if (standard) {
          const baseline = await evaluate(before),
            outcome = await evaluate(after);
          const side = before.split(" ")[1];
          score = baseline.lines[0]?.score || 0;
          best = baseline.best;
          loss = Math.max(
            0,
            Math.round(
              (score - (outcome.lines[0]?.score || 0)) *
                (side === "w" ? 1 : -1),
            ),
          );
          label =
            best === game.moves[i]
              ? "Top move"
              : loss < 30
                ? "Good"
                : loss < 100
                  ? "Inaccuracy"
                  : loss < 250
                    ? "Mistake"
                    : "Blunder";
          concept =
            loss >= 250
              ? "Tactics / material"
              : new Chess(after).isCheck()
                ? "King safety"
                : i < 20
                  ? "Opening play"
                  : new Chess(after).board().flat().filter(Boolean).length < 12
                    ? "Endgame technique"
                    : "Piece activity";
        } else {
          const ff = await fairy(),
            b = new ff.Board(
              game.variant === "chess960" ? "chess" : game.variant,
              before,
              game.variant === "chess960",
            );
          try {
            const sign = b.turn() ? 1 : -1;
            let bestValue = -Infinity;
            for (const move of legal(b)) {
              b.push(move);
              const value = material(b.fen()) * sign;
              b.pop();
              if (value > bestValue) {
                bestValue = value;
                best = move;
              }
            }
            score = material(before);
            loss = Math.max(0, bestValue - material(after) * sign);
            label = best === game.moves[i] ? "Material choice" : "Review";
            concept = "Variant goals";
          } finally {
            b.delete();
          }
        }
        let expected = "";
        if (standard && before.split(" ")[1] === game.human) {
          const choices = repertoireChoice(before, library);
          if (
            choices.length &&
            !choices.some((x) => x.move === game.moves[i])
          ) {
            expected = choices
              .map((x) => new Chess(before).move(x.move).san)
              .join(" / ");
            concept = "Repertoire recall";
            label = "Opening recall";
          }
        }
        const row: ReviewRow = {
          ply: i,
          move: game.notation[i],
          best,
          score,
          loss,
          label,
          concept,
          expected,
        };
        collected.push(row);
        setLibrary((l) => ({
          ...l,
          games: l.games.map((g) =>
            g.id === game.id ? { ...g, review: [...collected] } : g,
          ),
        }));
      }
      setStatus(ctrl.signal.aborted ? "Review paused." : "Review complete.");
    } catch (e) {
      if ((e as Error).name === "AbortError") setStatus("Review paused.");
      else {
        setStatus("Review paused.");
        notify((e as Error).message);
      }
    } finally {
      setReviewing(false);
      controller.current = null;
    }
  }
  const average = (side: string) => {
    const chosen = rows.filter(
      (r) => game.positions[r.ply].split(" ")[1] === side,
    );
    return chosen.length
      ? Math.round(
          chosen.reduce((s, r) => s + Math.min(1000, r.loss), 0) /
            chosen.length,
        )
      : null;
  };
  const selected = rows.find((r) => r.ply === Math.max(0, cursor - 1));
  let bestSAN = "";
  if (selected?.best) {
    try {
      bestSAN = standard
        ? new Chess(game.positions[selected.ply]).move(selected.best).san
        : selected.best;
    } catch {
      bestSAN = selected.best;
    }
  }
  return (
    <>
      <PageTitle
        title="Game review"
        subtitle={`${game.variant} · ${game.result}`}
      >
        <Button className="secondary" onClick={onClose}>
          Back to games
        </Button>
        <Button
          className="secondary"
          onClick={() =>
            download(
              "novachess-game.pgn",
              gamePGN(game),
              "application/x-chess-pgn",
            )
          }
        >
          <Download size={15} />
          PGN
        </Button>
        <Button
          onClick={() => navigate("analysis", "game:" + game.id)}
          disabled={!standard}
        >
          <ScanLine size={15} />
          Analyze
        </Button>
      </PageTitle>
      <div className="chess-layout">
        <div className="board-column">
          <Board
            fen={game.positions[cursor] || game.initial}
            blocked={
              game.special?.blocked.slice(0, Math.floor(cursor / 10)) || []
            }
            disabled
            flipped={flipped}
            onFlip={() => setFlipped((v) => !v)}
            highlights={
              cursor
                ? [
                    game.moves[cursor - 1]?.slice(0, 2),
                    game.moves[cursor - 1]?.slice(2, 4),
                  ]
                : []
            }
          />
          <div className="board-navigation">
            <IconButton
              label="First move"
              disabled={!cursor}
              onClick={() => setCursor(0)}
            >
              <ChevronsLeft size={18} />
            </IconButton>
            <IconButton
              label="Previous move"
              disabled={!cursor}
              onClick={() => setCursor(cursor - 1)}
            >
              <ChevronLeft size={18} />
            </IconButton>
            <IconButton
              label={playing ? "Pause replay" : "Play replay"}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </IconButton>
            <IconButton
              label="Next move"
              disabled={cursor >= game.moves.length}
              onClick={() => setCursor(cursor + 1)}
            >
              <ChevronRight size={18} />
            </IconButton>
            <IconButton
              label="Last move"
              disabled={cursor >= game.moves.length}
              onClick={() => setCursor(game.moves.length)}
            >
              <ChevronsRight size={18} />
            </IconButton>
          </div>
          <div className="replay-speed">
            <label>
              Speed
              <select
                aria-label="Replay speed"
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(+e.target.value)}
              >
                <option value={2000}>2s / move</option>
                <option value={1000}>1s / move</option>
                <option value={650}>0.65s / move</option>
                <option value={250}>0.25s / move</option>
              </select>
            </label>
            <GameGIFButton
              positions={game.positions}
              blocked={game.special?.blocked}
              flipped={flipped}
              delay={replaySpeed}
            />
          </div>
          <input
            className="replay-slider"
            aria-label="Replay position"
            type="range"
            min={0}
            max={game.moves.length}
            value={cursor}
            onChange={(e) => setCursor(Number(e.target.value))}
          />
          {selected && (
            <Card className="review-suggestion">
              <div className="card-heading">
                <b>
                  {selected.move} · {selected.label}
                </b>
                <span>
                  {standard ? `${selected.loss} cp` : "Local heuristic"}
                </span>
              </div>
              <p>
                <Star size={16} />
                {selected.expected
                  ? `Repertoire: ${selected.expected}`
                  : `Top: ${bestSAN}`}
              </p>
              <p className="caption">{selected.concept}</p>
              {selected.expected && (
                <Button
                  className="text-button"
                  onClick={() => navigate("learn", "repertoire")}
                >
                  Train repertoire
                </Button>
              )}
            </Card>
          )}
          <Card>
            <div className="inline-form">
              <input
                aria-label="Game title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <IconButton
                label="Save title"
                onClick={() => {
                  setLibrary((l) => ({
                    ...l,
                    games: l.games.map((g) =>
                      g.id === game.id ? { ...g, title } : g,
                    ),
                  }));
                  notify("Title saved.");
                }}
              >
                <Save size={16} />
              </IconButton>
            </div>
            <Field label="Folder">
              <select
                value={game.folder}
                onChange={(e) =>
                  setLibrary((l) => ({
                    ...l,
                    games: l.games.map((g) =>
                      g.id === game.id ? { ...g, folder: e.target.value } : g,
                    ),
                  }))
                }
              >
                {library.folders.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
          </Card>
        </div>
        <div className="side-panels">
          {!game.special && (
            <Card>
              <div className="card-heading">
                <h2>{standard ? "Engine review" : "Variant review"}</h2>
                <span className="pill">
                  {rows.length} / {game.moves.length}
                </span>
              </div>
              <p className="caption">
                {standard
                  ? "Stockfish 19 Lite. Scores depend on search time."
                  : "Legal replay and local material alternatives, not a full-strength engine verdict."}
              </p>
              {standard && (
                <Field label="Time per position">
                  <select
                    disabled={reviewing}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  >
                    <option value={300}>0.3 seconds</option>
                    <option value={500}>0.5 seconds</option>
                    <option value={1000}>1 second</option>
                    <option value={3000}>3 seconds</option>
                  </select>
                </Field>
              )}
              <Button
                disabled={rows.length >= game.moves.length}
                onClick={() =>
                  reviewing ? controller.current?.abort() : void review()
                }
              >
                {reviewing ? <Pause size={15} /> : <Play size={15} />}{" "}
                {reviewing
                  ? "Pause"
                  : rows.length
                    ? "Resume review"
                    : "Review game"}
              </Button>
              {status && (
                <p role="status" className="feedback">
                  {status}
                </p>
              )}
              {rows.length > 0 && !reviewing && (
                <Button
                  className="text-button"
                  onClick={() => {
                    setLibrary((l) => ({
                      ...l,
                      games: l.games.map((g) =>
                        g.id === game.id ? { ...g, review: [] } : g,
                      ),
                    }));
                    setStatus("");
                  }}
                >
                  Reset review
                </Button>
              )}
              {standard && (
                <div className="metric-pair">
                  <div>
                    <b>{average("w") ?? "—"}</b>
                    <span>White avg. cp loss</span>
                  </div>
                  <div>
                    <b>{average("b") ?? "—"}</b>
                    <span>Black avg. cp loss</span>
                  </div>
                </div>
              )}
              <Button className="text-button" onClick={() => navigate("stats")}>
                <ChartNoAxesCombined size={15} />
                Improvement patterns
              </Button>
            </Card>
          )}
          <Card>
            <h2>Moves</h2>
            <div className="review-moves">
              {game.notation.map((m, i) => {
                const r = rows[i];
                return (
                  <button
                    key={i}
                    className={`${cursor === i + 1 ? "current" : ""} review-${r?.label.toLowerCase().replace(" ", "-") || "pending"}`}
                    onClick={() => setCursor(i + 1)}
                  >
                    <span>
                      {Math.floor(i / 2) + 1}
                      {i % 2 ? "…" : "."} {m}
                    </span>
                    {r && (
                      <small>
                        {r.label === "Top move" ? <Star size={13} /> : r.label}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
          {game.branches?.length && (
            <Card>
              <h2>Saved branches</h2>
              {game.branches.map((b, i) => (
                <Button
                  key={i}
                  className="text-button"
                  onClick={() => {
                    setLibrary((l) => ({
                      ...l,
                      analysis: { ...game, ...b, title: b.name },
                    }));
                    navigate("analysis");
                  }}
                >
                  <GitBranch size={14} />
                  {b.name}
                </Button>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
