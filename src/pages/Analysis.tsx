import {SavedBoardPlayer} from "../components/BoardPlayer";
import { engineMoveRows } from "../lib/engineNotation";
import { positionInsights } from "../lib/positionInsights";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Download,
  Copy,
  Share2,
  Image,
  GitBranch,
  Trash2,
  Lightbulb,
  LocateFixed,
  Save,
  RotateCcw,
} from "lucide-react";
import { useApp } from "../lib/context";
import { initialFen, uid, download, copyText } from "../lib/store";
import { useEngine, useSettledEvaluation, scoreLabel } from "../lib/engine";
import { exportGIF, exportPNG } from "../lib/export";
import type { SavedGame } from "../lib/types";
import { useControl } from "../lib/controls";
import { Board } from "../components/Board";
import PositionEditor from "../components/PositionEditor";
import {
  ChoiceSelect,
  Card,
  Button,
  IconButton,
  Modal,
  Field,
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
    ? library.games.find((g) => g.id === detail.slice(5)) ||
      (library.activeGame?.id === detail.slice(5) ? library.activeGame : null)
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
    [flipped, setFlipped] = useState(
      () =>
        (detail.startsWith("fen:")
          ? defaultFen
          : source?.positions.at(-1) || defaultFen
        ).split(" ")[1] === "b",
    ),
    [editing, setEditing] = useState(false),
    [branches, setBranches] = useState<Line[]>(source?.branches || []),
    [name, setName] = useState(source?.title || "Analysis"),
    [sharing, setSharing] = useState(false),
    [saving, setSaving] = useState(false),
    [notationOpen, setNotationOpen] = useState(false),
    [lineCount, setLineCount] = useState(3),
    [exporting, setExporting] = useState(false);
  const notationRef = useRef<HTMLDivElement>(null);
  const [followNotation, setFollowNotation] = useState(true);
  useLayoutEffect(() => {
    const list = notationRef.current;
    if (followNotation && list && cursor === 0) {
      list.scrollTop = 0;
      return;
    }
    const current =
      list?.querySelector<HTMLElement>("button.current")?.parentElement;
    if (!followNotation || !list || !current) return;
    const row = current.getBoundingClientRect(),
      box = list.getBoundingClientRect();
    if (row.top < box.top + 35 || row.bottom > box.bottom)
      list.scrollTop +=
        row.top - box.top - list.clientHeight / 2 + row.height / 2;
  }, [cursor, notation.length, followNotation, notationOpen]);
  const fen = positions[cursor] || initial,
    engine = useEngine(fen, true, lineCount);
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
        kind: "study",
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
    } catch {}
  }
  function reset(fen: string) {
    setInitial(fen);
    setPositions([fen]);
    setFlipped(fen.split(" ")[1] === "b");
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
      kind: "study",
      branches,
    };
    setLibrary((l) => ({ ...l, games: [g, ...l.games] }));
    setSaving(false);
    notify("Study saved to your library.");
  }
  const insights = positionInsights(fen, engine.lines[0]);
  const settledEvaluation = useSettledEvaluation(fen, engine.lines[0]);
  const white = settledEvaluation?.score || 0;
  return (
    <>
      <div className="chess-layout analysis-layout">
        <div className="board-column">
          {source && <SavedBoardPlayer game={source} side={flipped?'w':'b'} placement="top"/>}
          <div className="board-with-eval">
            <div
              className="eval-meter"
              role="img"
              aria-label={`Evaluation ${scoreLabel(settledEvaluation)}`}
            >
              <div style={{ height: `${50 + Math.tanh(white / 450) * 46}%` }} />
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
          {source && <SavedBoardPlayer game={source} side={flipped?'b':'w'} placement="bottom"/>}
          <div className="board-navigation analysis-navigation">
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
              {Math.ceil(cursor / 2)} / {Math.ceil(moves.length / 2)}
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
        </div>
        <div className="side-panels">
          <h1 className="sr-only">Analysis</h1>
          <div className="analysis-summary-row">
        <div className="analysis-position-meta">
          <span
            className="evaluation-readout"
            aria-label={`Evaluation ${scoreLabel(settledEvaluation)}`}
          >
            {scoreLabel(settledEvaluation)}
          </span>
          <span
            className={`analysis-turn-dot ${c.turn() === "w" ? "white-turn" : "black-turn"}`}
            role="img"
            aria-label={`${c.turn() === "w" ? "White" : "Black"} turn`}
            title={`${c.turn() === "w" ? "White" : "Black"} turn`}
          />
        </div>
            <p className="analysis-engine-label">Stockfish 19 Lite · Depth {engine.lines[0]?.depth ?? 0}</p>
        <div className="analysis-tools-menu" role="group" aria-label="Analysis actions">
          <button aria-label="Save study" title="Save study" onClick={() => setSaving(true)}><Save size={18} /></button>
          <button aria-label="Edit position" title="Set up position" onClick={() => setEditing(true)}><SlidersHorizontal size={18} /></button>
          <button aria-label="Share position" title="Share" onClick={() => setSharing(true)}><Share2 size={18} /></button>
          <button aria-label="Reset" title="Reset" onClick={() => reset(initialFen)}><RotateCcw size={18} /></button>
        </div>
          </div>
          {engine.error && <p className="error" role="alert">{engine.error}</p>}
          <Card className="engine-top-lines">
            <div className="card-heading">
              <h2>Top lines</h2>
              <ChoiceSelect
                aria-label="Number of engine lines"
                value={lineCount}
                onChange={(e) => setLineCount(+e.target.value)}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </ChoiceSelect>
            </div>
            <div
              className="engine-lines"
              style={
                {
                  "--engine-columns": Math.min(lineCount, 3),
                } as React.CSSProperties
              }
            >
              {Array.from({ length: lineCount }, (_, i) => {
                const line = engine.lines[i];
                return (
                  <div className="engine-line" key={i}>
                    <div className="pv-heading">
                      <span>{i + 1}</span>
                      <strong>{scoreLabel(line)}</strong>
                    </div>
                    <table aria-label={`Engine line ${i + 1}`}>
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">White</th>
                          <th scope="col">Black</th>
                        </tr>
                      </thead>
                      <tbody>
                        {line ? (
                          engineMoveRows(fen, line.moves).map((row) => (
                            <tr key={row.number}>
                              <td>{row.number}</td>
                              <td>{row.white || "—"}</td>
                              <td>{row.black || "—"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3}>…</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            {branches.length > 0 && (
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
            )}
          </Card>
          <Card className="positional-insights">
            <div className="card-heading">
              <h2>Positional insights</h2>
              <Lightbulb size={18} />
            </div>
            <div className="insights" aria-live="polite">
              {insights.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </Card>
          <Card className="analysis-notation">
            <div className="card-heading">
              <button
                className="notation-toggle"
                aria-expanded={notationOpen}
                aria-controls="analysis-notation"
                onClick={() => setNotationOpen((v) => !v)}
              >
                <h2>Notation</h2>
                <ChevronDown size={17} />
              </button>
              <div className="button-row">
                <span className="pill">
                  {Math.ceil(moves.length / 2)} moves
                </span>
                {!followNotation && (
                  <IconButton
                    label="Follow current move"
                    onClick={() => setFollowNotation(true)}
                  >
                    <LocateFixed size={17} />
                  </IconButton>
                )}
              </div>
            </div>
            <div
              className="notation-table"
              id="analysis-notation"
              hidden={!notationOpen}
              ref={notationRef}
              tabIndex={0}
              aria-label="Game notation"
              onWheel={() => {
                const l = notationRef.current;
                if (l && l.scrollHeight > l.clientHeight)
                  setFollowNotation(false);
              }}
              onTouchMove={() => {
                const l = notationRef.current;
                if (l && l.scrollHeight > l.clientHeight)
                  setFollowNotation(false);
              }}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setFollowNotation(false);
              }}
              onKeyDown={(e) => {
                if (
                  [
                    "ArrowUp",
                    "ArrowDown",
                    "PageUp",
                    "PageDown",
                    "Home",
                    "End",
                  ].includes(e.key)
                ) {
                  setFollowNotation(false);
                  e.stopPropagation();
                }
              }}
            >
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
                        onClick={() => {
                          setCursor(i * 2 + k + 1);
                          setFollowNotation(true);
                        }}
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

        </div>
      </div>
      {saving && (
        <Modal title="Save study" onClose={() => setSaving(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field label="Study name">
              <input
                autoFocus
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Button type="submit">Save</Button>
          </form>
        </Modal>
      )}
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
              onClick={() =>
                download(
                  "novachess-study.pgn",
                  pgn(),
                  "application/x-chess-pgn",
                )
              }
            >
              <Download size={15} />
              Download PGN
            </Button>

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
