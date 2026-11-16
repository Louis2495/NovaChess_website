import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { base } from "./store";
export type EngineLine = {
  depth: number;
  score: number;
  mate: number | null;
  moves: string[];
  rank: number;
};
export function search(
  fen: string,
  {
    time = 1200,
    infinite = false,
    multiPV = 1,
    elo = 3190,
    signal,
    onInfo,
  }: {
    time?: number;
    infinite?: boolean;
    multiPV?: number;
    elo?: number;
    signal?: AbortSignal;
    onInfo?: (line: EngineLine) => void;
  } = {},
): Promise<{ best: string; lines: EngineLine[] }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Canceled", "AbortError"));
      return;
    }
    const worker = new Worker(
      new URL(`${base}engine/stockfish-19-lite-single.js`, document.baseURI),
    );
    const lines: EngineLine[] = [];
    let finished = false;
    const finish = (error?: Error, best = "") => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
      error ? reject(error) : resolve({ best, lines: lines.filter(Boolean) });
    };
    const abort = () => finish(new DOMException("Canceled", "AbortError"));
    signal?.addEventListener("abort", abort);
    const timeout = setTimeout(
      () => finish(new Error("Engine timed out. Try again.")),
      Math.max(25000, time + 12000),
    );
    worker.onerror = () =>
      finish(
        new Error(
          "Stockfish could not start. Reload or check WebAssembly support.",
        ),
      );
    worker.onmessage = (e) => {
      const text = String(e.data);
      if (text === "uciok") {
        worker.postMessage("setoption name Hash value 32");
        worker.postMessage(`setoption name MultiPV value ${multiPV}`);
        if (elo < 1320) {
          worker.postMessage("setoption name UCI_LimitStrength value false");
          worker.postMessage(
            `setoption name Skill Level value ${Math.max(0, Math.min(20, Math.round(elo / 100) - 3))}`,
          );
        } else if (elo < 3190) {
          worker.postMessage("setoption name UCI_LimitStrength value true");
          worker.postMessage(
            `setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, elo))}`,
          );
        }
        worker.postMessage("isready");
      } else if (text === "readyok") {
        worker.postMessage(`position fen ${fen}`);
        if (infinite) clearTimeout(timeout);
        worker.postMessage(infinite ? "go infinite" : `go movetime ${time}`);
      } else if (text.startsWith("info ") && text.includes(" pv ")) {
        const depth = Number(text.match(/depth (\d+)/)?.[1] || 0),
          rank = Number(text.match(/multipv (\d+)/)?.[1] || 1);
        const cp = text.match(/score cp (-?\d+)/),
          mate = text.match(/score mate (-?\d+)/);
        const sign = fen.split(" ")[1] === "w" ? 1 : -1;
        const line = {
          depth,
          rank,
          score: cp
            ? Number(cp[1]) * sign
            : mate
              ? (Number(mate[1]) > 0 ? 10000 : -10000) * sign
              : 0,
          mate: mate ? Number(mate[1]) * sign : null,
          moves: text.split(" pv ")[1].trim().split(/\s+/),
        };
        lines[rank - 1] = line;
        onInfo?.(line);
      } else if (text.startsWith("bestmove"))
        finish(undefined, text.split(" ")[1] || "");
    };
    worker.postMessage("uci");
  });
}
export function useEngine(fen: string, enabled: boolean, multiPV = 1) {
  const [lines, setLines] = useState<EngineLine[]>([]),
    [status, setStatus] = useState("Idle"),
    [error, setError] = useState("");
  useEffect(() => {
    setLines([]);
    setError("");
    if (!enabled) {
      setStatus("Idle");
      return;
    }
    const c = new AbortController();
    setStatus("Analyzing");
    search(fen, {
      infinite: true,
      multiPV,
      signal: c.signal,
      onInfo: (line) => {
        if (!c.signal.aborted)
          setLines((prev) => {
            const next = [...prev];
            next[line.rank - 1] = line;
            return next;
          });
      },
    })
      .then(() => {
        if (!c.signal.aborted) setStatus("Complete");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setStatus("Unavailable");
        }
      });
    return () => c.abort();
  }, [fen, enabled, multiPV]);
  return { lines, status, error };
}
export function sanLine(fen: string, moves: string[]) {
  try {
    const c = new Chess(fen);
    return moves
      .slice(0, 12)
      .map((m) => c.move(m).san)
      .join(" ");
  } catch {
    return moves.slice(0, 8).join(" ");
  }
}
export function scoreLabel(line?: EngineLine) {
  return !line
    ? "—"
    : line.mate !== null
      ? `M${line.mate}`
      : `${line.score >= 0 ? "+" : ""}${(line.score / 100).toFixed(2)}`;
}
