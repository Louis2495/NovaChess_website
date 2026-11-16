import { isNovaChessGame } from "../../lib/library";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Download,
  LoaderCircle,
} from "lucide-react";
import { useApp } from "../../lib/context";
import { initialFen, download } from "../../lib/store";
import { Board } from "../../components/Board";
import { Card, Field, Button } from "../../components/UI";
type PublicGame = {
  moves: string[];
  result: string;
  color: string;
  pgn: string;
};
function parsePGN(text: string, username = ""): PublicGame | null {
  try {
    const c = new Chess();
    c.loadPgn(text);
    const h = c.getHeaders();
    if (h.Variant && !["Standard", "chess"].includes(h.Variant)) return null;
    const moves = c.history({ verbose: true });
    if (!moves.length || moves[0].before !== initialFen) return null;
    return {
      moves: moves.slice(0, 40).map((m) => m.from + m.to + (m.promotion || "")),
      result: h.Result || "*",
      color: username
        ? (h.White || "").toLowerCase() === username.toLowerCase()
          ? "w"
          : "b"
        : "both",
      pgn: text,
    };
  } catch {
    return null;
  }
}
export default function Research() {
  const { appearance, library } = useApp();
  const [site, setSite] = useState("Chess.com"),
    [username, setUsername] = useState(""),
    [identity, setIdentity] = useState(""),
    [games, setGames] = useState<PublicGame[]>([]),
    [path, setPath] = useState<string[]>([]),
    [side, setSide] = useState("w"),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const c = new Chess();
  path.forEach((m) => c.move(m));
  const matching = useMemo(
    () =>
      games.filter(
        (g) =>
          (g.color === "both" || g.color === side) &&
          path.every((m, i) => g.moves[i] === m),
      ),
    [games, path, side],
  );
  const branches = useMemo(() => {
    const map = new Map<
      string,
      {
        move: string;
        san: string;
        count: number;
        white: number;
        draw: number;
        black: number;
      }
    >();
    for (const g of matching) {
      const move = g.moves[path.length];
      if (!move) continue;
      const current = map.get(move) || {
        move,
        san: new Chess(c.fen()).move(move).san,
        count: 0,
        white: 0,
        draw: 0,
        black: 0,
      };
      current.count++;
      if (g.result === "1-0") current.white++;
      if (g.result === "0-1") current.black++;
      if (g.result === "1/2-1/2") current.draw++;
      map.set(move, current);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [matching, path]);
  async function load() {
    if (!username.trim()) return;
    setBusy(true);
    setError("");
    setStatus("0 games loaded");
    const ctrl = new AbortController();
    controller.current = ctrl;
    const loaded: PublicGame[] = [];
    const name = username.trim();
    async function json(url: string) {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok)
        throw new Error(
          r.status === 429
            ? "Rate limit reached. Retry later."
            : `Service returned HTTP ${r.status}.`,
        );
      return r.json();
    }
    try {
      if (site === "NovaChess") {
        if (name.toLowerCase() !== library.profile.name.toLowerCase())
          throw Error("No saved NovaChess games for that username.");
        const records =
          library.activeGame &&
          !library.games.some((g) => g.id === library.activeGame?.id)
            ? [...library.games, library.activeGame]
            : library.games;
        for (const g of records.filter(
          (g) =>
            isNovaChessGame(g) &&
            ["chess", "blind", "blindtext"].includes(g.variant),
        )) {
          try {
            const b = new Chess(g.initial);
            for (const move of g.moves) b.move(move);
            b.setHeader(
              "White",
              g.human === "w" ? name : g.opponent || "Computer",
            );
            b.setHeader(
              "Black",
              g.human === "b" ? name : g.opponent || "Computer",
            );
            b.setHeader("Result", g.result);
            const parsed = parsePGN(b.pgn(), name);
            if (parsed) loaded.push(parsed);
          } catch {}
        }
      } else if (site === "Chess.com") {
        const archives = await json(
          `https://api.chess.com/pub/player/${encodeURIComponent(name)}/games/archives`,
        );
        for (let i = 0; i < archives.archives.length; i++) {
          setStatus(`${loaded.length} games loaded`);
          const archive = await json(archives.archives[i]);
          for (const game of archive.games || []) {
            if (game.rules && game.rules !== "chess") continue;
            const parsed = parsePGN(game.pgn || "", name);
            if (parsed) loaded.push(parsed);
          }
          setStatus(`${loaded.length} games loaded`);
        }
      } else {
        const r = await fetch(
          `https://lichess.org/api/games/user/${encodeURIComponent(name)}?moves=true&clocks=false&evals=false&opening=false`,
          { signal: ctrl.signal, headers: { Accept: "application/x-ndjson" } },
        );
        if (!r.ok) throw new Error(`Lichess returned HTTP ${r.status}.`);
        if (!r.body)
          throw new Error("Streaming is unavailable. Try again later.");
        const reader = r.body.getReader(),
          decoder = new TextDecoder();
        let buffer = "";
        const add = (line: string) => {
          if (!line.trim()) return;
          const g = JSON.parse(line);
          if (g.variant !== "standard" || !g.moves) return;
          const ch = new Chess();
          try {
            ch.loadPgn(g.moves);
          } catch {
            return;
          }
          const white =
            g.players?.white?.user?.name || g.players?.white?.user?.id || "";
          loaded.push({
            moves: ch
              .history({ verbose: true })
              .slice(0, 40)
              .map((m) => m.from + m.to + (m.promotion || "")),
            result:
              g.winner === "white"
                ? "1-0"
                : g.winner === "black"
                  ? "0-1"
                  : g.status === "draw" || g.status === "stalemate"
                    ? "1/2-1/2"
                    : "*",
            color: white.toLowerCase() === name.toLowerCase() ? "w" : "b",
            pgn: ch.pgn(),
          });
        };
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          lines.forEach(add);
          setStatus(`${loaded.length} games loaded`);
        }
        buffer += decoder.decode();
        if (buffer.trim()) add(buffer);
      }
      setGames(loaded);
      setIdentity(`${site} · ${name}`);
      setPath([]);
      setStatus(`${loaded.length} games loaded`);
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Loading canceled. Previous results retained."
          : `${(e as Error).message}${site === "NovaChess" ? "" : " Public access or browser CORS may be unavailable; try again later."}`,
      );
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  return (
    <>
      <Card className="research-form">
        <div className="research-fields">
          <div className="research-source field">
            <span>Source</span>
            <div className="segmented-control" role="group" aria-label="Source">
              {["NovaChess", "Chess.com", "Lichess"].map((value) => (
                <button
                  key={value}
                  aria-pressed={site === value}
                  onClick={() => {
                    setSite(value);
                    if (value === "NovaChess")
                      setUsername(library.profile.name);
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <Field label="Public username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              maxLength={50}
            />
          </Field>
          <div className="research-color field">
            <span>Color</span>
            <div
              className="segmented-control"
              role="group"
              aria-label="Player’s color"
            >
              {[
                ["w", "White"],
                ["b", "Black"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={side === value}
                  onClick={() => setSide(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button
            disabled={busy || !username.trim()}
            onClick={() => void load()}
          >
            <Search size={16} />
            Load games
          </Button>
          {busy && (
            <Button
              className="secondary"
              onClick={() => controller.current?.abort()}
            >
              <X size={16} />
              Cancel
            </Button>
          )}
        </div>

        {status && (
          <p role="status" className="feedback research-loading">
            {busy && (
              <LoaderCircle
                className="spin"
                size={16}
                aria-label="Loading games"
              />
            )}
            {status}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </Card>
      <div className="chess-layout">
        <div className="board-column">
          <Board
            fen={c.fen()}
            guides={branches.map((b) => ({
              from: b.move.slice(0, 2),
              to: b.move.slice(2, 4),
              color: appearance.accent,
              opacity:
                0.2 +
                (0.75 * b.count) / Math.max(1, ...branches.map((m) => m.count)),
            }))}
            onMove={(from, to, promotion) => {
              try {
                const m = new Chess(c.fen()).move({
                  from,
                  to,
                  promotion: promotion || "q",
                });
                setPath((v) => [...v, m.from + m.to + (m.promotion || "")]);
              } catch {}
            }}
          />
          <div className="board-navigation">
            <Button
              className="secondary"
              disabled={!path.length}
              onClick={() => setPath((v) => v.slice(0, -1))}
            >
              <ChevronLeft size={15} />
              Back
            </Button>
            <span>{Math.ceil(path.length / 2)} moves</span>
            <Button
              className="secondary"
              disabled={!path.length}
              onClick={() => setPath([])}
            >
              <RotateCcw size={15} />
              Reset
            </Button>
          </div>
        </div>
        <Card>
          <div className="card-heading">
            <h2>{identity || "Opening explorer"}</h2>
            <span className="pill">{matching.length} games</span>
          </div>
          <div className="research-branches">
            {branches.map((b) => (
              <button
                key={b.move}
                onClick={() => setPath((v) => [...v, b.move])}
              >
                <b>{b.san}</b>
                <div>
                  <span>
                    {b.count} games ·{" "}
                    {Math.round((b.count / Math.max(1, matching.length)) * 100)}
                    %
                  </span>
                  <div className="result-bar">
                    <i style={{ width: `${(b.white / b.count) * 100}%` }} />
                    <i style={{ width: `${(b.draw / b.count) * 100}%` }} />
                    <i style={{ width: `${(b.black / b.count) * 100}%` }} />
                  </div>
                  <small>
                    White {b.white} · Draw {b.draw} · Black {b.black}
                  </small>
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
            {!branches.length && games.length > 0 && (
              <p className="muted">No continuations at this position.</p>
            )}
          </div>
          {games.length > 0 && (
            <Button
              className="text-button"
              onClick={() =>
                download(
                  "public-games.pgn",
                  games.map((g) => g.pgn).join("\n\n"),
                  "application/x-chess-pgn",
                )
              }
            >
              <Download size={14} />
              Export games
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}
