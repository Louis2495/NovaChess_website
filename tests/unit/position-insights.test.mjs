import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { positionInsights } from "../../src/lib/positionInsights.ts";
const position = (moves) => {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c;
};
test("insights explain real pins, passed pawns and supported outposts instead of generic counts", () => {
  const pin = position(["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"]);
  assert.match(
    positionInsights(pin.fen()).join(" "),
    /knight on c3 is pinned.*bishop on b4/,
  );
  assert.match(
    positionInsights("7k/8/3P4/8/8/8/8/K7 w - - 0 40").join(" "),
    /passed pawn on d6.*advance/,
  );
  assert.match(
    positionInsights("7k/8/8/2pNp3/2P5/8/8/7K w - - 0 20").join(" "),
    /knight on d5.*outpost/,
  );
  assert.match(
    positionInsights("7k/pp1ppppp/8/8/8/8/PP1PPPPP/2R4K w - - 0 15").join(" "),
    /rook on c1.*open c-file/,
  );
  assert.match(
    positionInsights("7k/8/8/3q4/8/8/5P2/6K1 w - - 0 30").join(" "),
    /king on g1.*pawn cover/,
  );
});
test("engine plans describe a legal structural consequence and reject illegal continuations", () => {
  const c = position(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]);
  const insights = positionInsights(c.fen(), {
    depth: 18,
    moves: ["b5c6", "b7c6"],
  });
  assert.match(insights.join(" "), /Bxc6 bxc6.*doubled c-pawns/);
  assert.ok(
    !positionInsights(new Chess().fen(), { depth: 20, moves: ["a1a8"] })
      .join(" ")
      .includes("a1a8"),
  );
  const mate = position(["f3", "e5", "g4"]);
  assert.match(
    positionInsights(mate.fen(), { depth: 12, moves: ["d8h4"] }).join(" "),
    /Qh4#.*mating net/,
  );
});
test("explanations stay short and identify terminal positions without fabricated plans", () => {
  const c = new Chess();
  for (let i = 0; i < 90 && !c.isGameOver(); i++) {
    const insights = positionInsights(c.fen());
    assert.ok(insights.length <= 3);
    assert.ok(insights.join(" ").split(/\s+/).length < 100);
    assert.doesNotMatch(
      insights.join(" "),
      /legal moves available|Material: White|Material is balanced/,
    );
    const moves = c.moves();
    c.move(moves[(i * 13) % moves.length]);
  }
  assert.match(
    positionInsights("7k/8/5KQ1/8/8/8/8/8 b - - 0 1")[0],
    /stalemate/,
  );
});
