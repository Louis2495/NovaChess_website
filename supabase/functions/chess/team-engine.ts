import load from "./vendor/team-stockfish.mjs";
import { teamComputerMaxRating } from "../../../src/lib/teamComputer.ts";

type Engine = {
  listener?: (line: string) => void;
  ccall(name: string, result: null, types: string[], args: string[], options?: { async: boolean }): unknown;
};

let engine: Promise<Engine> | undefined;
let queue = Promise.resolve();

function command(engine: Engine, text: string, async = false) {
  return engine.ccall("command", null, ["string"], [text], { async });
}

export function strongTeamComputerMove(fen: string, rating: number) {
  // A single WASM instance handles UCI commands in order across requests.
  const search = queue.then(async () => {
    engine ??= Deno.readFile(new URL("./vendor/team-stockfish.wasm", import.meta.url))
      .then(wasmBinary => load({ wasmBinary }))
      .catch(error => { engine = undefined; throw error; });
    const stockfish = await engine;
    let move: string | undefined;
    stockfish.listener = line => {
      if (line.startsWith("bestmove ")) move = line.split(" ")[1];
    };
    try {
      command(stockfish, "setoption name Hash value 8");
      command(stockfish, "ucinewgame");
      command(stockfish, "setoption name Skill Level value 20");
      const limited = rating < teamComputerMaxRating;
      command(stockfish, `setoption name UCI_LimitStrength value ${limited}`);
      if (limited) command(stockfish, `setoption name UCI_Elo value ${rating}`);
      command(stockfish, `position fen ${fen}`);
      await command(stockfish, "go movetime 350 nodes 100000", true);
      if (!move || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
        throw Error("Stockfish could not find a move. Try again.");
      }
      return move;
    } finally {
      stockfish.listener = undefined;
    }
  });
  queue = search.then(() => {}, () => {});
  return search;
}
