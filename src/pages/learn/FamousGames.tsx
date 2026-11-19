import BoardPlayer from "../../components/BoardPlayer";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Play,
  Square,
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
import {
  ChoiceSelect,
  Card,
  Button,
  IconButton,
  Loading,
} from "../../components/UI";
import { useApp } from "../../lib/context";
import { download, useData } from "../../lib/store";
import { exportGIF } from "../../lib/export";
import type { SavedGame } from "../../lib/types";
export type FamousGame = {
  id: string;
  title: string;
  white: string;
  whiteRating?:number;
  blackRating?:number;
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
    [games, search],
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
      folder: "Games",
      kind: "game",
      origin: "archive",
      opponent: game.black,
      whiteName:game.white,blackName:game.black,humanRating:game.whiteRating,opponentRating:game.blackRating,
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
        <BoardPlayer placement="top" side={flipped?'w':'b'} name={flipped?game.white:game.black} rating={flipped?game.whiteRating:game.blackRating} result={game.result}/>
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
        <BoardPlayer placement="bottom" side={flipped?'b':'w'} name={flipped?game.black:game.white} rating={flipped?game.blackRating:game.whiteRating} result={game.result}/>
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
            label={playing ? "Stop replay" : "Play replay"}
            onClick={() => {
              if (cursor === game.moves.length) setCursor(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Square size={18} /> : <Play size={18} />}
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
            <ChoiceSelect
              aria-label="Replay speed"
              value={speed}
              onChange={(e) => setSpeed(+e.target.value)}
            >
              <option value={3000}>3s / move</option>
              <option value={2000}>2s / move</option>
              <option value={1000}>1s / move</option>
              <option value={500}>0.5s / move</option>
              <option value={250}>0.25s / move</option>
            </ChoiceSelect>
          </label>
        </div>
      </div>
      <div className="master-notes">
        <Card className="master-score">
          <table className="paired-game-moves" aria-label="Famous game moves"><thead><tr><th>#</th><th>White</th><th>Black</th></tr></thead><tbody>{Array.from({length:Math.ceil(game.notation.length/2)},(_,row)=><tr key={row}><th scope="row">{row+1}.</th>{[0,1].map(side=>{const i=row*2+side;return <td key={side}>{game.notation[i] && <button className={cursor===i+1?'current':''} onClick={()=>seek(i+1)} aria-label={`Move ${row+1}, ${side?'Black':'White'}: ${game.notation[i]}`}>{game.notation[i]}</button>}</td>;})}</tr>)}</tbody></table>
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
