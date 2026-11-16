import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Download,
  Copy,
  Share2,
  Image,
  GitBranch,
  Trash2,
  SquarePen,
  Pause,
  Play,
  Lightbulb,
  Save,
} from "lucide-react";
import { useApp } from "../lib/context";
import { initialFen, uid, download, copyText } from "../lib/store";
import { useEngine, sanLine, scoreLabel } from "../lib/engine";
import { exportGIF, exportPNG } from "../lib/export";
import type { SavedGame } from "../lib/types";
import { useControl } from "../lib/controls";
import { Board } from "../components/Board";
import PositionEditor from "../components/PositionEditor";
import {
  Card,
  Button,
  IconButton,
  PageTitle,
  Modal,
  Field,
  Toggle,
} from "../components/UI";
type Line = {
  name: string;
  initial: string;
  moves: string[];
  notation: string[];
  positions: string[];
};
export default function Analysis() {
  const { appearance, library, setLibrary, notify, detail } = useApp();
  const source = detail.startsWith("game:")
    ? library.games.find((g) => g.id === detail.slice(5))
    : library.analysis;
  let defaultFen = initialFen;
  if (detail.startsWith("fen:")) {
    try {
      defaultFen = new Chess(detail.slice(4)).fen();
    } catch {
      defaultFen = initialFen;
    }
  }
  const [initial, setInitial] = useState(
      detail.startsWith("fen:") ? defaultFen : source?.initial || initialFen,
    ),
    [positions, setPositions] = useState(
      detail.startsWith("fen:")
        ? [defaultFen]
        : source?.positions || [defaultFen],
    ),
    [moves, setMoves] = useState<string[]>(
      detail.startsWith("fen:") ? [] : source?.moves || [],
    ),
    [notation, setNotation] = useState<string[]>(
      detail.startsWith("fen:") ? [] : source?.notation || [],
    ),
    [cursor, setCursor] = useState(
      detail.startsWith("fen:") ? 0 : (source?.positions.length || 1) - 1,
    ),
    [flipped, setFlipped] = useState(false),
    [enabled, setEnabled] = useState(true),
    [insights, setInsights] = useState(false),
    [editing, setEditing] = useState(false),
    [branches, setBranches] = useState<Line[]>(source?.branches || []),
    [name, setName] = useState(source?.title || "Analysis"),
    [sharing, setSharing] = useState(false),
    [exporting, setExporting] = useState(false),
    [moveInput, setMoveInput] = useState("");
  const fen = positions[cursor] || initial,
    engine = useEngine(fen, enabled, appearance.searchTime, appearance.multiPV);
  const c = new Chess(fen);
  useEffect(() => {
    setLibrary((l) => ({
      ...l,
      analysis: {
        id: "analysis",
        title: name,
        created: Date.now(),
        initial,
        variant: "chess",
        moves,
        notation,
        positions,
        result: "*",
        human: "w",
        folder: "Studies",
        branches,
      },
    }));
  }, [initial, moves, notation, positions, name, branches]);
  useControl("next", () =>
    setCursor((n) => Math.min(positions.length - 1, n + 1)),
  );
  useControl("previous", () => setCursor((n) => Math.max(0, n - 1)));
  useControl("first", () => setCursor(0));
  useControl("last", () => setCursor(positions.length - 1));
  function play(from: string, to: string, promotion?: string) {
    try {
      const ch = new Chess(fen),
        m = ch.move({ from, to, promotion: promotion || "q" });
      if (cursor < moves.length)
        setBranches((b) => [
          ...b,
          {
            name: `Branch ${b.length + 1}`,
            initial,
            moves,
            notation,
            positions,
          },
        ]);
      setPositions([...positions.slice(0, cursor + 1), ch.fen()]);
      setMoves([
        ...moves.slice(0, cursor),
        m.from + m.to + (m.promotion || ""),
      ]);
      setNotation([...notation.slice(0, cursor), m.san]);
      setCursor(cursor + 1);
      if (appearance.sound) window.dispatchEvent(new Event("chess-move"));
    } catch {
      notify("That move is not legal.");
    }
  }
  function reset(fen: string) {
    setInitial(fen);
    setPositions([fen]);
    setMoves([]);
    setNotation([]);
    setCursor(0);
    setBranches([]);
  }
  function pgn() {
    const ch = new Chess(initial);
    for (const m of moves.slice(0, cursor)) ch.move(m);
    return ch.pgn();
  }
  function save() {
    if (!moves.length) {
      notify("Play at least one move to save a study.");
      return;
    }
    const g: SavedGame = {
      id: uid(),
      title: name || "Analysis",
      created: Date.now(),
      initial,
      moves: [...moves],
      notation: [...notation],
      positions: [...positions],
      variant: "chess",
      result: "*",
      human: "w",
      folder: "Studies",
      branches,
    };
    setLibrary((l) => ({ ...l, games: [g, ...l.games] }));
    notify("Study saved to your library.");
  }
  let material: Record<string, number> = { w: 0, b: 0 };
  const pv: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  for (const p of c.board().flat()) if (p) material[p.color] += pv[p.type];
  const white = engine.lines[0]?.score || 0;
  return (
    <>
      <PageTitle
        title="Analysis"
        subtitle="Stockfish 19 Lite · local WebAssembly"
      >
        <Button onClick={save}>
          <Save size={16} />
          Save study
        </Button>
      </PageTitle>
      <div className="chess-layout">
        <div className="board-column">
          <div className="board-topline">
            <span className="turn-indicator">
              <i className={c.turn() === "w" ? "white-piece" : "black-piece"} />
              {c.turn() === "w" ? "White" : "Black"} to move
            </span>
            <div className="button-row">
              <IconButton
                label="Edit position"
                onClick={() => setEditing(true)}
              >
                <SlidersHorizontal size={17} />
              </IconButton>
              <IconButton
                label="Share position"
                onClick={() => setSharing(true)}
              >
                <Share2 size={17} />
              </IconButton>
            </div>
          </div>
          <div className="board-with-eval">
            <div
              className="eval-meter"
              aria-label={`Evaluation ${scoreLabel(engine.lines[0])}`}
            >
              <div style={{ height: `${50 + Math.tanh(white / 450) * 46}%` }} />
              <span>{scoreLabel(engine.lines[0])}</span>
            </div>
            <Board
              fen={fen}
              onMove={play}
              flipped={flipped}
              onFlip={() => setFlipped((v) => !v)}
              highlights={
                cursor
                  ? [
                      moves[cursor - 1].slice(0, 2),
                      moves[cursor - 1].slice(2, 4),
                    ]
                  : []
              }
            />
          </div>
          <div className="board-navigation">
            <IconButton
              label="First position"
              disabled={!cursor}
              onClick={() => setCursor(0)}
            >
              <ChevronsLeft size={18} />
            </IconButton>
            <IconButton
              label="Previous position"
              disabled={!cursor}
              onClick={() => setCursor(cursor - 1)}
            >
              <ChevronLeft size={20} />
            </IconButton>
            <span>
              {cursor} / {moves.length}
            </span>
            <IconButton
              label="Next position"
              disabled={cursor === moves.length}
              onClick={() => setCursor(cursor + 1)}
            >
              <ChevronRight size={20} />
            </IconButton>
            <IconButton
              label="Last position"
              disabled={cursor === moves.length}
              onClick={() => setCursor(moves.length)}
            >
              <ChevronsRight size={18} />
            </IconButton>
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const m = new Chess(fen).move(moveInput.trim());
                play(m.from, m.to, m.promotion);
                setMoveInput("");
              } catch {
                notify("Enter a legal SAN or coordinate move.");
              }
            }}
          >
            <input
              aria-label="Enter analysis move"
              value={moveInput}
              onChange={(e) => setMoveInput(e.target.value)}
              placeholder="Move · e.g. Nf3 or g1f3"
            />
            <Button disabled={!moveInput.trim()}>Play</Button>
          </form>
          <div className="button-row board-actions">
            <Button
              className="secondary"
              onClick={() =>
                download(
                  "novachess-study.pgn",
                  pgn(),
                  "application/x-chess-pgn",
                )
              }
            >
              <Download size={15} />
              PGN
            </Button>
            <Button className="text-button" onClick={() => reset(initialFen)}>
              Reset
            </Button>
          </div>
        </div>
        <div className="side-panels">
          <Card>
            <div className="card-heading">
              <h2>Engine</h2>
              <IconButton
                label={enabled ? "Pause analysis" : "Start analysis"}
                onClick={() => setEnabled(!enabled)}
              >
                {enabled ? <Pause size={17} /> : <Play size={17} />}
              </IconButton>
            </div>
            <div className="engine-status">
              <span className={enabled ? "status-dot" : ""} />
              {engine.status}
              {engine.lines[0] && <span>Depth {engine.lines[0].depth}</span>}
            </div>
            {engine.error && <p className="error">{engine.error}</p>}
            <div className="engine-lines">
              {engine.lines.filter(Boolean).map((line, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const m = line.moves[0];
                    if (m) play(m.slice(0, 2), m.slice(2, 4), m[4]);
                  }}
                >
                  <b>{scoreLabel(line)}</b>
                  <span>{sanLine(fen, line.moves)}</span>
                  <ChevronRight size={14} />
                </button>
              ))}
              {!engine.lines.length && (
                <p className="muted">
                  {enabled ? "Starting engine…" : "Analysis paused."}
                </p>
              )}
            </div>
            <Toggle
              label="Position insights"
              checked={insights}
              onChange={setInsights}
            />
            {insights && (
              <div className="insights">
                <p>
                  <Lightbulb size={15} />
                  Material: White {material.w} · Black {material.b}
                </p>
                <p>
                  {c.isCheckmate()
                    ? "Checkmate."
                    : c.isStalemate()
                      ? "Stalemate."
                      : c.isCheck()
                        ? "The king is in check."
                        : `${c.moves().length} legal moves available.`}
                </p>
                <p>
                  {material.w === material.b
                    ? "Material is balanced."
                    : `${material.w > material.b ? "White" : "Black"} has a material advantage.`}
                </p>
                {c.isInsufficientMaterial() && (
                  <p>Insufficient material to checkmate.</p>
                )}
              </div>
            )}
          </Card>
          <Card>
            <div className="card-heading">
              <h2>Notation</h2>
              <span className="pill">{Math.ceil(moves.length / 2)} moves</span>
            </div>
            <div className="notation-table">
              <div>
                <span>#</span>
                <span>White</span>
                <span>Black</span>
              </div>
              {Array.from(
                { length: Math.ceil(notation.length / 2) },
                (_, i) => (
                  <div key={i}>
                    <span>{i + 1}</span>
                    {[0, 1].map((k) => (
                      <button
                        key={k}
                        disabled={!notation[i * 2 + k]}
                        className={cursor === i * 2 + k + 1 ? "current" : ""}
                        onClick={() => setCursor(i * 2 + k + 1)}
                      >
                        {notation[i * 2 + k] || "—"}
                      </button>
                    ))}
                  </div>
                ),
              )}
              {!moves.length && (
                <p className="muted">Play a move on the board.</p>
              )}
            </div>
          </Card>
          <Card>
            <div className="card-heading">
              <h2>Study</h2>
              <GitBranch size={18} />
            </div>
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </Field>
            {branches.length ? (
              <div className="branch-list">
                {branches.map((b, i) => (
                  <div key={i}>
                    <button
                      onClick={() => {
                        setBranches((prev) =>
                          prev.map((v, n) =>
                            n === i
                              ? {
                                  name: "Previous line",
                                  initial,
                                  moves,
                                  notation,
                                  positions,
                                }
                              : v,
                          ),
                        );
                        setInitial(b.initial);
                        setMoves(b.moves);
                        setNotation(b.notation);
                        setPositions(b.positions);
                        setCursor(b.moves.length);
                      }}
                    >
                      <GitBranch size={14} />
                      {b.name}
                    </button>
                    <IconButton
                      label={`Delete ${b.name}`}
                      onClick={() =>
                        setBranches((v) => v.filter((_, n) => n !== i))
                      }
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : (
              <p className="caption">
                Go back and play a different move to create a branch.
              </p>
            )}
            <Button className="text-button" onClick={() => setEditing(true)}>
              <SquarePen size={14} />
              Set up a position
            </Button>
          </Card>
        </div>
      </div>
      {editing && (
        <PositionEditor
          fen={fen}
          onClose={() => setEditing(false)}
          onApply={(fen) => {
            reset(fen);
            setEditing(false);
          }}
        />
      )}

      {sharing && (
        <Modal title="Share position" onClose={() => setSharing(false)}>
          <div className="share-grid">
            <Button
              className="secondary"
              onClick={async () =>
                notify(
                  (await copyText(fen))
                    ? "FEN copied."
                    : "Clipboard unavailable. Use the FEN text below.",
                )
              }
            >
              <Copy size={16} />
              Copy FEN
            </Button>
            <Button
              className="secondary"
              onClick={async () => {
                const url = new URL(location.href);
                url.hash = "analysis/" + encodeURIComponent("fen:" + fen);
                notify(
                  (await copyText(url.href))
                    ? "Position link copied."
                    : "Clipboard unavailable.",
                );
              }}
            >
              <Share2 size={16} />
              Copy link
            </Button>
            <Button
              className="secondary"
              onClick={() =>
                void exportPNG(fen, appearance, flipped).catch((e) =>
                  notify(e.message),
                )
              }
            >
              <Image size={16} />
              Board image
            </Button>
            <Button
              className="secondary"
              disabled={exporting || !moves.length}
              onClick={async () => {
                setExporting(true);
                try {
                  await exportGIF(
                    positions.slice(0, cursor + 1),
                    appearance,
                    flipped,
                  );
                  notify("GIF exported.");
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? "Exporting…" : "Game GIF"}
            </Button>
          </div>
          <Field label="FEN">
            <textarea readOnly value={fen} rows={3} />
          </Field>
          <p className="caption">
            Position links include the FEN. GIF export includes all positions.
          </p>
        </Modal>
      )}
    </>
  );
}
