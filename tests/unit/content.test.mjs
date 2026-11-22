import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { Chess } from "chess.js";
const read = (n) => JSON.parse(readFileSync("public/data/" + n + ".json"));
test("every curated lesson, branch and famous-game score replays legally to its stored positions", () => {
  const guides = read("opening-guides");
  assert.equal(guides.length, 32);
  for (const lesson of read("lessons")) {
    const c = new Chess();
    for (const move of lesson.moves) c.move(move);
  }
  for (const g of guides)
    for (const line of g.lines) {
      const c = new Chess();
      for (const move of line.moves) c.move(move);
    }
  for (const g of read("famous-games")) {
    const c = new Chess();
    assert.equal(g.positions.length, g.moves.length + 1);
    for (let i = 0; i < g.moves.length; i++) {
      const move = c.move(g.moves[i]);
      assert.equal(move.san, g.notation[i]);
      assert.equal(c.fen(), g.positions[i + 1]);
    }
    const pgn = new Chess();
    pgn.loadPgn(g.pgn);
    assert.equal(pgn.fen(), c.fen());
    for (const ply of Object.keys(g.notes))
      assert.ok(+ply > 0 && +ply <= g.moves.length);
  }
});
test("owner-supplied memes form a unique 22-day cycle and facts omit movement diagrams", () => {
  const memes = JSON.parse(
    readFileSync("public/memes/candidates.json"),
  );
  assert.equal(memes.length, 22);
  assert.equal(readdirSync("public/memes").filter(n=>/\.(jpg|webp|png|svg)$/i.test(n)).length,22);
  assert.ok(memes.every(m=>m.alt && m.width>0 && m.height>0));
  assert.equal(
    new Set(memes.map(m=>createHash("sha256").update(readFileSync("public/memes/"+m.image)).digest("hex"))).size,
    memes.length,
  );
  const facts = read("learning").facts;
  assert.equal(facts.length, 75);
  assert.ok(facts.every((f) => !f.diagram));
  assert.ok(
    !facts.some((f) =>
      /knight’s eight exits|straight-line specialist|two tiny armies/i.test(
        f.title,
      ),
    ),
  );
});
test("trivia always offers four distinct answers", () => {
  for (const q of read("trivia")) {
    assert.ok(q.prompt.endsWith("?"), q.id);
    assert.equal(new Set(q.answers).size, 4, q.id);
    assert.ok(q.correct >= 0 && q.correct < 4);
  }
});
test("encyclopedia covers more than 3,000 entries including advanced motifs, players and events", () => {
  const data = read("encyclopedia");
  assert.ok(data.length > 3000);
  for (const term of [
    "Novotny",
    "Babson task",
    "Hole",
    "Vancura defense",
    "Emanuel Lasker",
  ])
    assert.ok(data.some((e) => e.title === term));
});

test("opening workbooks have real legal positions, matched annotations and valid decision alternatives", () => {
  const workbooks = read("opening-workbooks");
  assert.equal(workbooks.length, 32);
  assert.equal(
    workbooks.reduce((n, w) => n + w.notes.length, 0),
    176,
  );
  for (const lesson of read("lessons"))
    assert.ok(
      workbooks.some((w) => lesson.name.startsWith(w.family)),
      lesson.name,
    );
  for (const w of workbooks) {
    const c = new Chess(),
      sans = [];
    for (const move of w.moves) sans.push(c.move(move).san);
    for (const note of w.notes) {
      assert.equal(note.san, sans[note.ply - 1]);
      assert.ok(note.text.length > 70);
    }
    const problem = new Chess();
    w.moves.slice(0, w.challenge).forEach((m) => problem.move(m));
    assert.equal(new Set(w.answers.map((a) => a.uci)).size, 3);
    for (const a of w.answers)
      assert.equal(new Chess(problem.fen()).move(a.uci).san, a.san);
    assert.equal(w.answers[0].uci, w.moves[w.challenge]);
  }
});
test("each opening trap has a playable refutation and a concrete defense exercise", () => {
  const traps = read("opening-traps");
  assert.equal(traps.length, 20);
  for (const t of traps) {
    assert.ok(t.why.trim() && t.defense.trim());
    for (const line of [t.trap, t.refutation]) {
      assert.deepEqual(line.slice(0, t.setup.length), t.setup);
      const c = new Chess();
      line.forEach((m) => c.move(m));
    }
    assert.notDeepEqual(t.trap, t.refutation);
  }
});

test("advanced opening continuations cover every workbook family with deep lines and accurate checkpoints", () => {
  const advanced = read("lessons").filter(lesson => lesson.continuation);
  assert.ok(advanced.length >= 100);
  for (const { family } of read("opening-workbooks")) {
    const lines = advanced.filter(lesson => lesson.name.startsWith(family + ":"));
    assert.ok(lines.length >= 3, family);
    assert.equal(new Set(lines.map(lesson => lesson.moves.join(" "))).size, lines.length);
    for (const line of lines) {
      assert.ok(line.moves.length >= 36, line.name);
      assert.ok(line.continuation.notes.length >= 4, line.name);
      const board = new Chess();
      const notation = line.moves.map(move => board.move(move).san);
      for (const note of line.continuation.notes) assert.equal(note.san, notation[note.ply - 1], line.name);
    }
  }
});

test("every endgame demo replays legally to the lesson goal", () => {
  for (const exercise of read("endgames")) {
    const board = new Chess(exercise.fen);
    assert.ok(exercise.demo.length, exercise.id);
    let last;
    for (const move of exercise.demo) last = board.move(move);
    if (exercise.goal === "mate") {
      assert.ok(board.isCheckmate(), exercise.id);
      assert.equal(last.color, exercise.side);
    } else if (exercise.goal === "promote") {
      assert.ok(last.promotion, exercise.id);
      assert.equal(last.color, exercise.side);
    } else {
      assert.ok(board.isDraw(), exercise.id);
    }
  }
});
