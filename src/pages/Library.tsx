import { resolvePlayColor } from "../lib/playColor";
import {SavedBoardPlayer} from "../components/BoardPlayer";
import {screenName} from "../lib/screenName";
import { cachedReview, cacheReview } from "../lib/reviewCache";
import { classifyMove, performanceRating, restoreReviewHistory, reviewHighlights } from "../lib/gameReview";
import { MoveBadge, EvaluationGraph, MoveBreakdown } from "../components/ReviewVisuals";
import { isStudy, libraryKind } from "../lib/library";
import { RepertoireTrainer } from "./learn/Repertoire";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Square,
  ChartLine,
  Share2,
  Save,
  GitBranch,
} from "lucide-react";
import { useApp } from "../lib/context";
import { uid, download, base, loadData, initialFen } from "../lib/store";
import { search, useEngine, useSettledEvaluation, scoreLabel } from "../lib/engine";
import { fairy, legal, squares, fog } from "../lib/variants";
import type {
  SavedGame,
  ReviewRow,
  Repertoire as RepertoireLine,
} from "../lib/types";
import GameGIFButton from "../components/GameGIFButton";
import { useControl } from "../lib/controls";
import { Board } from "../components/Board";
import {
  ChoiceSelect,
  Toggle,
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
    c.setHeader("White", g.human === "w" ? "You" : screenName({name:g.opponent},g.opponent?"Opponent":"Computer"));
    c.setHeader("Black", g.human === "b" ? "You" : screenName({name:g.opponent},g.opponent?"Opponent":"Computer"));
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
    whiteName:h.White,blackName:h.Black,
    humanRating:Number(h.WhiteElo)||undefined,opponentRating:Number(h.BlackElo)||undefined,
    folder: "Games",
    kind: "game",
    origin: "archive",
  };
}
export default function LibraryPage() {
  const { library, setLibrary, detail, notify, navigate } = useApp();
  const [category, setCategory] = useState("All"),
    [trainingStudy, setTrainingStudy] = useState<SavedGame | null>(null),
    [folder, setFolder] = useState("All"),
    [query, setQuery] = useState(""),
    [newFolder, setNewFolder] = useState(false),
    [name, setName] = useState("");
  const records =
    library.activeGame?.moves.length &&
    !library.games.some((g) => g.id === library.activeGame?.id)
      ? [library.activeGame, ...library.games]
      : library.games;
  const games = records.filter(
    (g) =>
      (category === "All" || libraryKind(g) === category) &&
      (folder === "All" || g.folder === folder) &&
      g.title.toLowerCase().includes(query.toLowerCase()),
  );
  const g = records.find((v) => v.id === detail);
  if (trainingStudy)
    return (
      <StudyTraining
        study={trainingStudy}
        onClose={() => setTrainingStudy(null)}
      />
    );
  if (g) return <GameViewer key={g.id} game={restoreReviewHistory(g)} />;
  return (
    <div className="library-page">
      <PageTitle title="Library" />
      <div className="library-header-row">
      <div
        className="library-categories"
        role="group"
        aria-label="Library sections"
      >
        {["All", "Studies", "Games", "Matein4"].map((value) => (
          <button
            key={value}
            aria-pressed={category === value}
            onClick={() => {
              setCategory(value);
              setFolder("All");
            }}
          >
            {value}
          </button>
        ))}
      </div>
        <Button className="secondary library-add-folder" onClick={() => setNewFolder(true)}><Plus size={16}/>Folder</Button>
      </div>
      <div className="section-toolbar">
        {library.folders.some((f) => !["Games", "Studies"].includes(f)) && (
          <div className="folder-tabs">
            {[
              "All",
              ...library.folders.filter(
                (f) => !["Games", "Studies"].includes(f),
              ),
            ].map((f) => (
              <button
                key={f}
                className={folder === f ? "active" : ""}
                onClick={() => setFolder(f)}
              >
                <FolderOpen size={15} />
                {f === "All" ? "All folders" : f}
              </button>
            ))}
          </div>
        )}
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
                <SavedBoardPlayer game={g} side={g.human==='w'?'b':'w'} placement="top"/>
                <Board fen={g.positions.at(-1) || g.initial} flipped={g.human === "b"} disabled compact />
                <SavedBoardPlayer game={g} side={g.human} placement="bottom"/>
              </div>
              <div className="saved-game-details">
                <div className="card-heading">
                  <h3>{g.result === "*" && !isStudy(g) ? g.title.replace(/\s*(?:[·—–-]\s*)?\bunfinished\b/gi, "").trim() || "Game" : g.title}</h3>
                  <span className="pill">
                    {isStudy(g)
                      ? "Study"
                      : g.result === "*"
                        ? "Unfinished"
                        : g.result}
                  </span>
                </div>
                <p className="caption">
                  {isStudy(g)
                    ? `${1 + (g.branches?.length || 0)} lines`
                    : libraryKind(g)}{" "}
                  · {Math.ceil(g.moves.length / 2)} {Math.ceil(g.moves.length / 2) === 1 ? "move" : "moves"}
                </p>
                <p className="caption library-game-date"><time dateTime={new Date(g.created).toISOString()}>{new Date(g.created).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"})} · {new Date(g.created).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}</time></p>
                <div className="button-row">
                  {isStudy(g) ? (
                    <>
                      <Button onClick={() => setTrainingStudy(g)}>
                        Train lines
                      </Button>
                      <Button
                        className="secondary"
                        onClick={() => navigate("analysis", "game:" + g.id)}
                      >
                        Open study
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="secondary"
                      onClick={() => navigate("library", g.id)}
                    >
                      Review
                    </Button>
                  )}
                  <IconButton
                    className="library-delete"
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
    </div>
  );
}
function StudyTraining({
  study,
  onClose,
}: {
  study: SavedGame;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0),
    [side, setSide] = useState<"w" | "b">(
      study.initial.split(" ")[1] === "b" ? "b" : "w",
    );
  const lines = useMemo<RepertoireLine[]>(
    () =>
      [
        { name: "Main line", initial: study.initial, moves: study.moves },
        ...(study.branches || []),
      ]
        .filter((line) => line.moves.length > 0)
        .map((line, i) => ({
          id: `${study.id}-${i}`,
          name: line.name,
          side,
          initial: line.initial,
          moves: line.moves,
        })),
    [study, side],
  );
  if (!lines.length)
    return (
      <Card>
        <p>No saved moves.</p>
        <Button onClick={onClose}>Back to Library</Button>
      </Card>
    );
  return (
    <>
      <PageTitle title={study.title}>
        <Button className="secondary" onClick={onClose}>
          Back to Library
        </Button>
      </PageTitle>
      <div className="section-toolbar">
        <Field label="Study line">
          <ChoiceSelect
            value={index}
            onChange={(e) => setIndex(+e.target.value)}
          >
            {lines.map((line, i) => (
              <option key={line.id} value={i}>
                {line.name}
              </option>
            ))}
          </ChoiceSelect>
        </Field>
        <Field label="Practice as">
          <ChoiceSelect
            value={side}
            onChange={(e) => setSide(resolvePlayColor(e.target.value))}
          >
            <option value="w">White</option>
            <option value="b">Black</option>
            <option value="random">Random</option>
          </ChoiceSelect>
        </Field>
      </div>
      <RepertoireTrainer
        key={`${index}-${side}`}
        line={lines[index]}
        lines={lines}
        onClose={onClose}
      />
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
function GameViewer({ game }: { game: SavedGame }) {
  const { library, setLibrary, navigate, notify } = useApp();
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [fogEnabled, setFogEnabled] = useState(true),
    [sharing, setSharing] = useState(false),
    [reviewing, setReviewing] = useState(!game.special && game.moves.length > 0 && (game.review?.length !== game.moves.length || game.review.some(r=>r.afterScore===undefined))),

    [status, setStatus] = useState(""),
    [flipped, setFlipped] = useState(game.human === "b"),
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
  const liveEngine = useEngine(
    game.positions[cursor] || game.initial,
    standard && !reviewing,
  );
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(()=>{if(!game.special && game.moves.length > 0 && (rows.some(r=>r.afterScore===undefined) || game.moves.length>rows.length)) void review();},[game.id]);
  useEffect(() => {
    if (!playing) return;
    if (cursor >= game.moves.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setCursor((v) => v + 1), 650);
    return () => clearTimeout(t);
  }, [playing, cursor]);
  async function review() {
    if (controller.current && !controller.current.signal.aborted) return;
    setReviewing(true);
    const ctrl = new AbortController();
    controller.current = ctrl;
    let worker: Worker | undefined;
    const openings = standard ? await loadData<import("../lib/types").Opening[]>("openings").catch(() => []) : [];
    const cache = new Map<string, Awaited<ReturnType<typeof search>>>();
    const evaluate = async (fen: string, deeper = false) => {
      if (!deeper && cache.has(fen)) return cache.get(fen)!;
      const warmed=cachedReview(fen,deeper?20:14);
      if(warmed){cache.set(fen,warmed);return warmed;}
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
      // Start the worker when the first search can listen for startup errors.
      worker ??= new Worker(new URL(`${base}engine/stockfish-19-lite-single.js`, document.baseURI));
      const result = await search(fen, {
        time: deeper ? 900 : c.isCheck() ? 650 : 350,
        depth: deeper ? 22 : 18, worker, signal: ctrl.signal,
      });
      cache.set(fen, result);
      cacheReview(fen,result);
      return result;
    };
    try {
      const currentRows = rows.every(r => r.afterScore !== undefined) ? rows : [];
      const collected = [...currentRows];
      for (let i = currentRows.length; i < game.moves.length; i++) {
        if (ctrl.signal.aborted) break;
        setStatus(`Reviewing move ${Math.floor(i / 2) + 1}`);
        const before = game.positions[i],
          after = game.positions[i + 1];
        if (!before || !after) throw Error("The position history for this game is incomplete.");
        let best = "",
          score = 0,
          loss = 0,
          concept = "Piece activity",
          label = "Alternative",
          afterScore = 0, depth = 0;
        if (standard) {
          let baseline = await evaluate(before), outcome = await evaluate(after);
          const sign = before.split(" ")[1] === "w" ? 1 : -1;
          if (baseline.best !== game.moves[i] && ((baseline.lines[0]?.score || 0)-(outcome.lines[0]?.score || 0))*sign >= 80) {
            baseline = await evaluate(before, true);
            outcome = await evaluate(after, true);
          }
          score = baseline.lines[0]?.score || 0;
          afterScore = outcome.lines[0]?.score || 0;
          depth = Math.min(baseline.lines[0]?.depth || 0, outcome.lines[0]?.depth || 0);
          best = baseline.best;
          loss = best === game.moves[i] ? 0 : Math.max(0, Math.round((score-afterScore)*sign));
          const book = game.initial === initialFen && openings.some(o => o.moves.length > i && game.moves.slice(0,i+1).every((m,n)=>m===o.moves[n]));
          label = classifyMove(best === game.moves[i], loss, book);
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
            afterScore = material(after);
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

          }
        }
        const row: ReviewRow = {
          afterScore,
          depth,
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
            g.id === game.id ? { ...g, positions: game.positions, notation: game.notation, review: [...collected] } : g,
          ),
          activeGame: l.activeGame?.id === game.id ? {...l.activeGame,review:[...collected]} : l.activeGame,
        }));
      }
      if (!ctrl.signal.aborted) setCursor(n => n || Math.min(1, game.moves.length));
      setStatus(ctrl.signal.aborted ? "Review stopped." : "Review complete.");
    } catch (e) {
      if ((e as Error).name === "AbortError") setStatus("Review stopped.");
      else {
        setStatus("Review stopped.");
        notify((e as Error).message);
      }
    } finally {
      worker?.terminate();
      setReviewing(false);
      controller.current = null;
    }
  }
  const average = (side: string) => {
    const chosen = rows.filter(
      (r) => game.positions[r.ply]?.split(" ")[1] === side,
    );
    return chosen.length
      ? Math.round(
          chosen.reduce((s, r) => s + Math.min(1000, r.loss), 0) /
            chosen.length,
        )
      : null;
  };
  const highlights = standard ? reviewHighlights(rows, game) : null;
  const selected = rows.find((r) => r.ply === Math.max(0, cursor - 1));
  const sideRows = (side: string) => rows.filter(r => game.positions[r.ply]?.split(" ")[1] === side);
  const winner = game.result === "1-0" ? "w" : game.result === "0-1" ? "b" : null;
  const playerMetrics = (["w", "b"] as const).map(side => ({
    side: side === "w" ? "white" : "black",
    rating: performanceRating(sideRows(side)),
    loss: average(side),
    outcome: winner ? (side === winner ? "Win" : "Loss") : game.result === "1/2-1/2" ? "Draw" : undefined,
  }));
  const settledEvaluation = useSettledEvaluation(game.positions[cursor] || game.initial, liveEngine.lines[0]);
  const evaluation = settledEvaluation?.score ?? (cursor ? rows.find(r=>r.ply===cursor-1)?.afterScore : rows[0]?.score) ?? 0;
  const selectedMove = cursor ? game.moves[cursor-1]?.split(",")[0].slice(2,4) : "";
  return (
    <>
      <PageTitle
        title="Game review"
      >
        {game.variant === "cvfog" && <Toggle label="Fog" checked={fogEnabled} onChange={setFogEnabled} />}
        <Button className="secondary" onClick={() => setSharing(true)}><Share2 size={16}/>Share</Button>
        <Button
          onClick={() => navigate("analysis", "game:" + game.id)}
          disabled={!standard}
        >
          <ChartLine size={15} aria-hidden="true" />
          Analyze
        </Button>
      </PageTitle>
      {sharing && <Modal title="Share game" onClose={()=>setSharing(false)}>
        <div className="button-row"><Button onClick={()=>download("novachess-game.pgn",gamePGN(game),"application/x-chess-pgn")}><Download size={16}/>Download PGN</Button>
        <GameGIFButton positions={game.positions} blocked={game.special?.blocked} flipped={flipped}/></div>
      </Modal>}
      <div className="chess-layout game-review-layout">
        <div className="board-column">
          {standard && (
            <div className="live-game-evaluation">
              <strong>{settledEvaluation ? scoreLabel(settledEvaluation) : `${evaluation>=0?"+":""}${(evaluation/100).toFixed(2)}`}</strong>
            </div>
          )}
          {liveEngine.error && (
            <p role="alert" className="error">
              {liveEngine.error}
            </p>
          )}
          <SavedBoardPlayer game={game} side={flipped?'w':'b'} placement="top"/>
          <div className={`review-board-eval ${standard ? "has-eval" : ""}`}>
            {standard && <div className="eval-meter" style={{justifyContent:flipped?"flex-start":"flex-end"}} role="img" aria-label={`Evaluation ${(evaluation/100).toFixed(2)}`}>
              <div style={{height:`${50+Math.tanh(evaluation/450)*46}%`}}/>
            </div>}
          <Board
            fen={game.positions[cursor] || game.initial}
            visible={game.variant === "cvfog" && fogEnabled ? fog(game.positions[cursor] || game.initial, game.human) : undefined}
            blocked={
              game.special?.blocked.slice(0, Math.floor(cursor / 10)) || []
            }
            disabled
            badge={selected && selectedMove ? {square:selectedMove, content:<MoveBadge label={selected.label}/>} : undefined}
            flipped={flipped}
            onFlip={() => setFlipped((v) => !v)}
            highlights={
              cursor && !(game.variant === "cvfog" && fogEnabled)
                ? [
                    game.moves[cursor - 1]?.slice(0, 2),
                    game.moves[cursor - 1]?.slice(2, 4),
                  ]
                : []
            }
          />
          </div>
          <SavedBoardPlayer game={game} side={flipped?'b':'w'} placement="bottom"/>
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
              label={playing ? "Stop replay" : "Play replay"}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? <Square size={17} /> : <Play size={17} />}
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
          <details className="review-game-details"><summary>Game details</summary>
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
              <ChoiceSelect
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
              </ChoiceSelect>
            </Field>
          </Card>
          </details>
        </div>
        <Card className="review-notation-card" aria-label="Moves">
          <table className="review-notation"><thead><tr><th>#</th><th>White</th><th>Black</th></tr></thead>
            <tbody>{Array.from({length:Math.ceil((game.moves.length+(game.initial.split(" ")[1]==="b"?1:0))/2)},(_,i)=>{
              const blackStart=game.initial.split(" ")[1]==="b"?1:0;
              return <tr key={i}><td>{Number(game.initial.split(" ")[5]||1)+i}</td>{[0,1].map(side=>{
                const index=i*2+side-blackStart, row=rows.find(r=>r.ply===index);
                return <td key={side}>{index>=0 && index<game.moves.length && <button className={cursor===index+1?"current":""} onClick={()=>setCursor(index+1)}>{row && <MoveBadge label={row.label}/>}<span>{game.notation[index]}</span></button>}</td>;
              })}</tr>;
            })}</tbody>
          </table>
        </Card>
        <div className="side-panels">
          {standard && <Card className="review-performance" aria-label="Player performance">
            <div className="review-player-metrics">
              {playerMetrics.map(({ side, rating, loss, outcome }) => (
                <dl key={side} className={`review-player-metric ${side}`}
                  aria-label={side === "white" ? "White" : "Black"} aria-description={outcome}
                  data-outcome={outcome?.toLowerCase()}>
                  <dt>Estimated rating</dt>
                  <dd>{rating ?? "—"}</dd>
                  <dt>Average centipawn loss</dt>
                  <dd>{loss ?? "—"}</dd>
                </dl>
              ))}
            </div>
            {playerMetrics.some(({ rating }) => rating === null) && <p className="caption">Needs 8 non-book moves per side.</p>}
          </Card>}
          {highlights && <>
            <Card className="review-graph-card">
              <h2>Evaluation</h2>
              <EvaluationGraph rows={rows} total={game.moves.length} cursor={cursor} onSelect={setCursor} />
            </Card>
            <div className="review-summary">
              <Card className="review-count-card">
                <h2>Move counts</h2>
                <MoveBreakdown rows={rows} />
              </Card>
              <Card className="review-highlight-card">
                {([
                  ["best", "Best move", highlights.best, "No reviewed moves"],
                  ["worst", "Worst move", highlights.worst, "No move lost evaluation"],
                ] as const).map(([kind, title, row, empty]) => (
                  <div className="review-highlight" data-highlight={kind} key={kind}>
                    <h2>{title}</h2>
                    {row ? (
                      <Button className="review-highlight-move" aria-current={cursor === row.ply + 1 ? "step" : undefined} onClick={() => setCursor(row.ply + 1)}>
                        <MoveBadge label={row.label} />
                        <span>{game.positions[row.ply]?.split(" ")[5]}{game.positions[row.ply]?.split(" ")[1] === "b" ? "…" : "."} {row.move}</span>
                      </Button>
                    ) : <p className="caption">{rows.length ? empty : "Awaiting review"}</p>}
                  </div>
                ))}
              </Card>
            </div>
          </>}
          {status && <p role="status" className="review-status">{status}</p>}
          {isStudy(game) && !!game.branches?.length && (
            <Card>
              <h2>Saved branches</h2>
              {game.branches!.map((b, i) => (
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
