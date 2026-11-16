import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Film,
  ArrowUpRight,
  ScanLine,
  Bookmark,
} from "lucide-react";
import { useControl } from "../../lib/controls";
import { Board } from "../../components/Board";
import { Card, Button, IconButton, Loading } from "../../components/UI";
import { useApp } from "../../lib/context";
import { download, useData } from "../../lib/store";
import { exportGIF } from "../../lib/export";
import type { SavedGame } from "../../lib/types";
export type FamousGame = {
  id: string;
  title: string;
  white: string;
  black: string;
  year: number;
  event: string;
  result: string;
  motif: string;
  source: string;
  intro: string;
  moves: string[];
  notation: string[];
  positions: string[];
  notes: Record<string, string>;
  pgn: string;
};
export default function FamousGames() {
  const { data, error } = useData<FamousGame[]>("famous-games");
  if (!data) return <Loading error={error} />;
  return <Archive games={data} />;
}
function Archive({ games }: { games: FamousGame[] }) {
  const { appearance, library, setLibrary, navigate, notify } = useApp();
  const [search, setSearch] = useState(""),
    [motif, setMotif] = useState("All"),
    [id, setId] = useState(games[0].id),
    [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1000),
    [flipped, setFlipped] = useState(false),
    [exporting, setExporting] = useState(false),
    [progress, setProgress] = useState(0);
  const game = games.find((g) => g.id === id)!;
  useControl("next", () => seek(Math.min(game.moves.length, cursor + 1)));
  useControl("previous", () => seek(Math.max(0, cursor - 1)));
  useControl("first", () => seek(0));
  useControl("last", () => seek(game.moves.length));
  useControl("autoplay", () => {
    if (cursor === game.moves.length) setCursor(0);
    setPlaying((v) => !v);
  });
  const filtered = useMemo(
    () =>
      games.filter(
        (g) =>
          (motif === "All" || g.motif === motif) &&
          (
            g.title +
            " " +
            g.white +
            " " +
            g.black +
            " " +
            g.year +
            " " +
            g.event
          )
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [games, search, motif],
  );
  function seek(n: number) {
    setCursor(n);
    setPlaying(false);
  }
  useEffect(() => {
    if (!playing) return;
    if (cursor >= game.moves.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setCursor((n) => n + 1), speed);
    return () => clearTimeout(t);
  }, [playing, cursor, speed, game]);
  useEffect(() => {
    if (cursor !== game.moves.length) return;
    setLibrary((l) => ({
      ...l,
      progress: {
        ...l.progress,
        famous: [...new Set([...(l.progress.famous || []), game.id])],
      },
    }));
  }, [cursor, game.id]);
  function save(analyze = false) {
    const saved: SavedGame = {
      id: `famous-${game.id}`,
      title: `${game.white} – ${game.black} (${game.year})`,
      created: Date.now(),
      initial: game.positions[0],
      moves: game.moves,
      notation: game.notation,
      positions: game.positions,
      result: game.result,
      variant: "chess",
      human: "w",
      folder: "Studies",
      opponent: game.black,
    };
    setLibrary((l) => ({
      ...l,
      games: l.games.some((g) => g.id === saved.id)
        ? l.games
        : [saved, ...l.games],
    }));
    if (analyze) navigate("analysis", "game:" + saved.id);
    else notify("Game saved to Studies.");
  }
  async function gif() {
    setExporting(true);
    setProgress(0);
    try {
      await exportGIF(game.positions, appearance, flipped, setProgress, {
        delay: speed,
        filename: game.id + ".gif",
      });
      notify("GIF exported.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  const note = game.notes[String(cursor)];
  return (
    <div className="master-archive">
      <aside className="master-game-list card">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search famous games"
            placeholder="Player, game or year"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Game theme"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
        >
          <option value="All">All themes</option>
          {[...new Set(games.map((g) => g.motif))].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="master-game-rows">
          {filtered.map((g) => (
            <button
              key={g.id}
              className={g.id === id ? "active" : ""}
              aria-pressed={g.id === id}
              onClick={() => {
                setId(g.id);
                seek(0);
              }}
            >
              <span className="master-year">{g.year}</span>
              <span>
                <b>{g.title}</b>
                <small>
                  {g.white.split(" ").at(-1)} · {g.black.split(" ").at(-1)}
                </small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
          {!filtered.length && <p className="caption">No matching games.</p>}
        </div>
      </aside>
      <div className="master-replay">
        <div className="card-heading">
          <div>
            <span className="eyebrow">
              {game.event} · {game.year}
            </span>
            <h2>{game.title}</h2>
          </div>
        </div>
        <p className="master-players">
          {game.white}
          <span>{game.result}</span>
          {game.black}
        </p>
        <Board
          fen={game.positions[cursor]}
          disabled
          flipped={flipped}
          onFlip={() => setFlipped((v) => !v)}
          highlights={
            cursor
              ? [
                  game.moves[cursor - 1].slice(0, 2),
                  game.moves[cursor - 1].slice(2, 4),
                ]
              : []
          }
        />
        <div className="board-navigation">
          <IconButton
            label="First move"
            onClick={() => seek(0)}
            disabled={!cursor}
          >
            <ChevronsLeft size={18} />
          </IconButton>
          <IconButton
            label="Previous move"
            onClick={() => seek(cursor - 1)}
            disabled={!cursor}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            label={playing ? "Pause replay" : "Play replay"}
            onClick={() => {
              if (cursor === game.moves.length) setCursor(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </IconButton>
          <IconButton
            label="Next move"
            disabled={cursor === game.moves.length}
            onClick={() => seek(cursor + 1)}
          >
            <ChevronRight size={18} />
          </IconButton>
          <IconButton
            label="Last move"
            disabled={cursor === game.moves.length}
            onClick={() => seek(game.moves.length)}
          >
            <ChevronsRight size={18} />
          </IconButton>
        </div>
        <input
          aria-label="Replay position"
          className="replay-slider"
          type="range"
          min={0}
          max={game.moves.length}
          value={cursor}
          onChange={(e) => seek(+e.target.value)}
        />
        <div className="replay-speed">
          <span>
            {Math.ceil(cursor / 2)} / {Math.ceil(game.moves.length / 2)}
          </span>
          <label>
            Speed
            <select
              aria-label="Replay speed"
              value={speed}
              onChange={(e) => setSpeed(+e.target.value)}
            >
              <option value={3000}>3s / move</option>
              <option value={2000}>2s / move</option>
              <option value={1000}>1s / move</option>
              <option value={500}>0.5s / move</option>
              <option value={250}>0.25s / move</option>
            </select>
          </label>
        </div>
      </div>
      <div className="master-notes">
        <Card>
          <span className="pill">{game.motif}</span>
          <p>{game.intro}</p>
          {note && (
            <p className="master-current-note" role="status">
              {note}
            </p>
          )}
          <div className="key-moments">
            <h3>Key moments</h3>
            {Object.entries(game.notes).map(([ply, n]) => (
              <button
                key={ply}
                className={+ply === cursor ? "active" : ""}
                onClick={() => seek(+ply)}
              >
                <b>
                  {Math.ceil(+ply / 2)}
                  {+ply % 2 ? "." : "…"} {game.notation[+ply - 1]}
                </b>
                <span>{n}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card className="master-score">
          <div className="move-chips">
            {game.notation.map((m, i) => (
              <button
                key={i}
                className={cursor === i + 1 ? "current" : ""}
                onClick={() => seek(i + 1)}
                aria-label={`Move ${Math.floor(i / 2) + 1}, ${i % 2 ? "Black" : "White"}: ${m}`}
              >
                {i % 2 === 0 && <small>{i / 2 + 1}.</small>}
                {m}
              </button>
            ))}
          </div>
        </Card>
        <div className="button-row">
          <Button className="secondary" disabled={exporting} onClick={gif}>
            <Film size={16} />
            {exporting ? `${progress}%` : "Game GIF"}
          </Button>
          <Button
            className="secondary"
            onClick={() =>
              download(game.id + ".pgn", game.pgn, "application/x-chess-pgn")
            }
          >
            <Download size={16} />
            PGN
          </Button>
          <IconButton label="Save game" onClick={() => save()}>
            <Bookmark size={17} />
          </IconButton>
          <IconButton label="Analyze game" onClick={() => save(true)}>
            <ScanLine size={18} />
          </IconButton>
          <a
            className="icon-btn"
            aria-label="Game source"
            href={game.source}
            target="_blank"
            rel="noreferrer"
          >
            <ArrowUpRight size={17} />
          </a>
        </div>
        {library.progress.famous?.includes(game.id) && (
          <span className="caption">Viewed</span>
        )}
      </div>
    </div>
  );
}
