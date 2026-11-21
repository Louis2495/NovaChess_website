import load from "./vendor/team-stockfish.mjs";
import { Chess } from "chess.js";
import { weakComputerMove } from "../../../src/lib/computerStrength.ts";
import type { EngineLine } from "../../../src/lib/engine.ts";
import { teamComputerMaxRating, teamComputerNativeMinRating } from "../../../src/lib/teamComputer.ts";

type Engine = {
  listener?: (line: string) => void;
  ccall(name: string, result: null, types: string[], args: string[], options?: { async: boolean }): unknown;
};

let engine: Promise<Engine> | undefined;
let queue = Promise.resolve();

function command(engine: Engine, text: string, async = false) {
  return engine.ccall("command", null, ["string"], [text], { async });
}

export function teamComputerMove(fen: string, moves: string[], rating: number) {
  // A single WASM instance handles UCI commands in order across requests.
  const search = queue.then(async () => {
    engine ??= Deno.readFile(new URL("./vendor/team-stockfish.wasm", import.meta.url))
      .then(wasmBinary => load({ wasmBinary }))
      .catch(error => { engine = undefined; throw error; });
    const stockfish = await engine;
    const simulated = rating < teamComputerNativeMinRating;
    const board = simulated ? new Chess(fen) : null;
    const candidates = new Map<number, EngineLine>();
    let move: string | undefined;
    stockfish.listener = line => {
      if (line.startsWith("bestmove ")) move = line.split(" ")[1];
      if (!board || !line.startsWith("info ")) return;
      const pv = line.match(/\bpv (\S+)/);
      if (!pv) return;
      const rank = Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1);
      const cp = line.match(/\bscore cp (-?\d+)/);
      const mate = Number(line.match(/\bscore mate (-?\d+)/)?.[1] ?? 0);
      const sign = board.turn() === "w" ? 1 : -1;
      candidates.set(rank, {
        rank, depth: Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0),
        score: (cp ? Number(cp[1]) : Math.sign(mate) * 10_000) * sign,
        mate: mate ? mate * sign : null, moves: [pv[1]],
      });
    };
    try {
      command(stockfish, "setoption name Hash value 8");
      command(stockfish, "ucinewgame");
      command(stockfish, "setoption name Skill Level value 20");
      const limited = rating < teamComputerMaxRating;
      command(stockfish, `setoption name UCI_LimitStrength value ${limited}`);
      if (limited) command(stockfish, `setoption name UCI_Elo value ${Math.max(rating, teamComputerNativeMinRating)}`);
      command(stockfish, `setoption name MultiPV value ${simulated ? 6 : 1}`);
      command(stockfish, moves.length ? `position startpos moves ${moves.join(" ")}` : "position startpos");
      await command(stockfish, "go movetime 350 nodes 100000", true);
      if (!move || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
        throw Error("Stockfish could not find a move. Try again.");
      }
      if (!board) return move;
      const legal = board.moves({ verbose: true }).map(play => play.from + play.to + (play.promotion ?? ""));
      return weakComputerMove(legal, [...candidates.values()], board.turn(), rating, Math.random, move);
    } finally {
      stockfish.listener = undefined;
    }
  });
  queue = search.then(() => {}, () => {});
  return search;
}
