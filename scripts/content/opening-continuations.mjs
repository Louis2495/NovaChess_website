import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Chess } from "chess.js";

const data = name => JSON.parse(readFileSync(`public/data/${name}.json`, "utf8"));
const workbooks = data("opening-workbooks");
const guides = new Map(data("opening-guides").map(guide => [guide.family, guide]));
const engine = spawn(process.execPath, ["node_modules/stockfish/bin/stockfish-19-lite-single.js"], {
  stdio: ["pipe", "pipe", "inherit"],
});
const responses = createInterface({ input: engine.stdout })[Symbol.asyncIterator]();
const send = command => engine.stdin.write(command + "\n");
async function until(done, read = () => {}) {
  while (true) {
    const { value, done: ended } = await responses.next();
    if (ended) throw Error("Stockfish closed before completing the search.");
    if (done(value)) return;
    read(value);
  }
}

async function candidates(moves, count) {
  const lines = new Map();
  send("ucinewgame");
  send(`setoption name MultiPV value ${count}`);
  send("isready");
  await until(line => line === "readyok");
  send("position startpos" + (moves.length ? " moves " + moves.join(" ") : ""));
  send(`go depth ${count === 1 ? 16 : 14}`);
  await until(line => line.startsWith("bestmove"), line => {
    const match = / multipv (\d+) score (cp|mate) (-?\d+)\b.*? pv (.+)$/.exec(line);
    if (match) lines.set(Number(match[1]), {
      score: match[2] === "cp" ? Number(match[3]) : Math.sign(Number(match[3])) * 100000,
      moves: match[4].split(" "),
    });
  });
  return [...lines.entries()].sort(([a], [b]) => a - b).map(([, line]) => line);
}

async function extend(seed, plyTarget) {
  const board = new Chess();
  const moves = [...seed];
  moves.forEach(move => board.move(move));
  while (moves.length < plyTarget && !board.isGameOver()) {
    const pv = (await candidates(moves, 1))[0]?.moves;
    if (!pv?.length) break;
    const advance = Math.min(8, plyTarget - moves.length, pv.length);
    for (const move of pv.slice(0, advance)) {
      board.move(move);
      moves.push(move);
      if (board.isGameOver()) break;
    }
  }
  return moves;
}

const pieceNames = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const sideName = color => color === "w" ? "White" : "Black";
function explain(board, move, reply) {
  const after = new Chess(move.after);
  const rival = after.turn();
  if (after.isCheckmate()) return `The king is in check and has no legal reply. ${sideName(move.color)} wins by checkmate.`;
  if (after.inCheck()) return `The check forces ${sideName(rival)} to respond immediately. This continuation uses ${reply?.san ?? "a legal king defense"}.`;
  if (move.captured) {
    const follow = reply?.captured && reply.to === move.to
      ? `The reply ${reply.san} recaptures on ${move.to}.`
      : reply ? `The next move, ${reply.san}, changes the position before any exchange on that square.` : "";
    return `The ${pieceNames[move.piece]} takes a ${pieceNames[move.captured]} on ${move.to}. ${follow}`.trim();
  }
  if (move.san.startsWith("O-O")) return `The king moves to ${move.to} and the rook joins the center. Compare how the next pawn exchanges change the safety of this king.`;
  const enemy = after.attackers(move.to, rival).length;
  const friends = after.attackers(move.to, move.color).length;
  const changed = ["d4", "e4", "d5", "e5"].filter(square => after.attackers(square, move.color).length > board.attackers(square, move.color).length);
  if (changed.length) return `${move.san} adds ${sideName(move.color)} pressure on ${changed.join(" and ")}. Check what moves or exchanges are now available on those squares.`;
  if (enemy) return `The ${pieceNames[move.piece]} on ${move.to} has ${enemy} opposing ${enemy === 1 ? "attacker" : "attackers"} and ${friends} friendly ${friends === 1 ? "defender" : "defenders"}. Count checks and pins before assuming an exchange is safe.`;
  if (move.piece === "p") {
    const controlled = after.moves({ verbose: true }).filter(candidate => candidate.captured === "p" && candidate.to === move.to);
    return `${move.san} fixes a pawn on ${move.to}.${controlled.length ? " It can be captured immediately." : " It cannot be captured immediately."} Compare the resulting pawn structure with the alternate line.`;
  }
  return `The ${pieceNames[move.piece]} relocates from ${move.from} to ${move.to}.${reply ? ` The example continues with ${reply.san}; check what that response changes before advancing.` : ""}`;
}

function annotate(moves, workbook, divergence) {
  const board = new Chess();
  const notes = [];
  for (const [index, uci] of moves.entries()) {
    const before = new Chess(board.fen());
    const move = board.move(uci);
    const ply = index + 1;
    const original = ply <= divergence ? workbook.notes.find(note => note.ply === ply) : null;
    if (original) {
      notes.push(original);
    } else if (ply === divergence + 1 || (ply > divergence && (ply % 4 === 0 || ply === moves.length))) {
      const reply = moves[ply] ? new Chess(board.fen()).move(moves[ply]) : undefined;
      notes.push({ ply, san: move.san, text: explain(before, move, reply) });
    }
  }
  return notes;
}

const additions = [];
function add(workbook, suffix, moves, divergence, summary) {
  const guide = guides.get(workbook.family);
  additions.push({
    id: `advanced-${guide.id}-${suffix}`,
    eco: guide.eco,
    name: `${workbook.family}: ${summary.title}`,
    moves,
    continuation: { summary: summary.text, notes: annotate(moves, workbook, divergence) },
  });
}

try {
  send("uci");
  await until(line => line === "uciok");
  for (const workbook of workbooks) {
    const main = await extend(workbook.moves, 52);
    add(workbook, "main", main, workbook.moves.length, {
      title: "Advanced main continuation",
      text: workbook.summary,
    });
    const prefix = workbook.moves.slice(0, workbook.challenge);
    const board = new Chess();
    prefix.forEach(move => board.move(move));
    const alternatives = (await candidates(prefix, 6))
      .filter(line => line.moves[0] !== workbook.moves[workbook.challenge] && line.score > -350)
      .slice(0, 3);
    for (const [index, line] of alternatives.entries()) {
      const first = new Chess(board.fen()).move(line.moves[0]);
      const label = `${board.moveNumber()}${first.color === "w" ? "." : "..."}${first.san}`;
      const moves = await extend([...prefix, ...line.moves.slice(0, 3)], 48);
      add(workbook, `sideline-${index + 1}`, moves, prefix.length, {
        title: `Advanced sideline with ${label}`,
        text: `Compare ${label} with the workbook’s choice at the same position. Follow how the pawn structure and piece placement change after the decision.`,
      });
    }
    console.log(workbook.family, main.length, alternatives.length);
  }
  const originals = data("lessons").filter(line => !line.id.startsWith("advanced-"));
  writeFileSync("public/data/lessons.json", JSON.stringify([...originals, ...additions], null, 2) + "\n");
} finally {
  send("quit");
}
