import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
test("daily meme collection stays unique for more than a year and facts omit movement diagrams", () => {
  const memes = JSON.parse(
    readFileSync("content/memes/previous-candidates.json"),
  );
  assert.ok(memes.length >= 366);
  assert.equal(
    new Set(memes.map((m) => m.top + "|" + m.bottom)).size,
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
test("quiz moves are legal and trivia always offers four distinct answers", () => {
  for (const q of read("personality"))
    for (const san of q.moves) new Chess(q.fen).move(san);
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
