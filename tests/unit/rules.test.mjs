import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  newSpecial,
  specialApply,
  specialLegal,
  specialTurn,
  specialBot,
} from "../../src/lib/specialRules.ts";
function at(variant, fen, extra = {}) {
  const s = newSpecial(variant, 2, 42);
  return { ...s, fen, positions: [fen], randomFrom: "", ...extra };
}
test("unmodified positions agree with chess.js, including king safety", () => {
  for (let trial = 0; trial < 12; trial++) {
    let s = newSpecial("dropping", 2, trial + 1),
      c = new Chess();
    for (let ply = 0; ply < 9; ply++) {
      const expected = c
        .moves({ verbose: true })
        .map((m) => m.from + m.to + (m.promotion || ""))
        .sort();
      assert.deepEqual(specialLegal(s).sort(), expected);
      const move = expected[(trial * 11 + ply * 7) % expected.length];
      s = specialApply(s, { type: "move", move });
      c.move(move);
      assert.equal(s.fen, c.fen({ forceEnpassantSquare: true }));
    }
  }
});
test("dropping squares fall after five full moves, remain impassable, and stop at the chosen cap", () => {
  for (const count of [1, 2, 3, 4]) {
    let s = newSpecial("dropping", count, 155);
    for (let i = 0; i < 50 && s.result === "*"; i++) {
      const ms = specialLegal(s);
      s = specialApply(s, { type: "move", move: ms[(i * 17 + 9) % ms.length] });
      assert.equal(s.blocked.length, Math.min(count, Math.floor(s.ply / 10)));
      assert.ok(s.blocked.every((sq) => /[3456]/.test(sq[1])));
      assert.ok(
        specialLegal(s).every((m) => !s.blocked.includes(m.slice(2, 4))),
      );
    }
  }
  const s = at("dropping", "7k/8/8/8/8/8/8/R6K w - - 0 1", { blocked: ["a4"] });
  const ms = specialLegal(s);
  assert.ok(ms.includes("a1a3"));
  assert.ok(!ms.includes("a1a4"));
  assert.ok(!ms.includes("a1a5"));
});
test("chaos pawns take two clear squares from non-starting ranks but cannot jump an obstacle", () => {
  let s = at("chaos", "7k/8/8/8/4P3/8/8/7K w - - 0 1");
  assert.ok(specialLegal(s).includes("e4e6"));
  s = at("chaos", "7k/8/8/4p3/4P3/8/8/7K w - - 0 1");
  assert.ok(!specialLegal(s).includes("e4e6"));
  assert.ok(!specialLegal(s).includes("e4e5"));
});
test("freeze is additional to the move, expires after the frozen side acts, and cannot be reused", () => {
  let s = newSpecial("chaos");
  s = specialApply(s, { type: "freeze", square: "e7" });
  assert.equal(s.ply, 0);
  assert.equal(specialTurn(s), "w");
  s = specialApply(s, { type: "move", move: "e2e4" });
  assert.ok(!specialLegal(s).some((m) => m.startsWith("e7")));
  s = specialApply(s, { type: "move", move: "d7d5" });
  assert.equal(s.frozen, null);
  assert.throws(() => specialApply(s, { type: "freeze", square: "d5" }));
});
test("a switch uses a turn, is once per side, and cannot expose the king", () => {
  let s = newSpecial("chaos");
  s = specialApply(s, { type: "swap", from: "b1", to: "c1" });
  assert.equal(specialTurn(s), "b");
  assert.equal(s.ply, 1);
  assert.match(s.fen, /RBNQKBNR/);
  assert.deepEqual(s.swapUsed, ["w"]);
  assert.throws(() =>
    specialApply(at("chaos", "4r2k/8/8/8/8/8/4R3/4K2N w - - 0 1"), {
      type: "swap",
      from: "e1",
      to: "e2",
    }),
  );
});
test("Random assigns only a movable piece and rejects every other source", () => {
  let s = newSpecial("random", 2, 44);
  for (let i = 0; i < 30 && s.result === "*"; i++) {
    const ms = specialLegal(s);
    assert.ok(ms.length);
    assert.ok(ms.every((m) => m.startsWith(s.randomFrom)));
    const bad = specialLegal({ ...s, variant: "dropping" }, false).find(
      (m) => !m.startsWith(s.randomFrom),
    );
    if (bad) assert.throws(() => specialApply(s, { type: "move", move: bad }));
    s = specialApply(s, { type: "move", move: ms[0] });
  }
});
test("checkmate, castling, en passant and underpromotion obey the variant rules", () => {
  let s = at("chaos", "7k/8/5KQ1/8/8/8/8/8 w - - 0 1");
  s = specialApply(s, { type: "move", move: "g6g7" });
  assert.equal(s.result, "1-0");
  s = at("dropping", "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  assert.ok(specialLegal(s).includes("e1g1"));
  assert.ok(!specialLegal({ ...s, blocked: ["f1"] }).includes("e1g1"));
  s = at("chaos", "7k/P7/8/8/8/8/8/7K w - - 0 1");
  assert.ok(specialLegal(s).includes("a7a8n"));
  s = at("chaos", "7k/8/8/3pP3/8/8/8/7K w - d6 0 2");
  assert.ok(specialLegal(s).includes("e5d6"));
  s = specialApply(s, { type: "move", move: "e5d6" });
  assert.ok(!s.fen.includes("3p"));
});
test("variant opponent selects a legal reply", () => {
  for (const variant of ["dropping", "chaos", "random"]) {
    const s = newSpecial(variant, 2, 15);
    assert.ok(specialLegal(s).includes(specialBot(s)));
  }
});
