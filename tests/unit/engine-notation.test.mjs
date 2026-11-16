import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { engineMoveRows } from "../../src/lib/engineNotation.ts";
test("engine moves align in White and Black columns with actual move numbers", () => {
  const c = new Chess();
  assert.deepEqual(engineMoveRows(c.fen(), ["e2e4", "e7e5", "g1f3"]), [
    { number: 1, white: "e4", black: "e5" },
    { number: 2, white: "Nf3" },
  ]);
  c.move("e4");
  assert.deepEqual(engineMoveRows(c.fen(), ["c7c5", "g1f3", "d7d6"]), [
    { number: 1, black: "c5" },
    { number: 2, white: "Nf3", black: "d6" },
  ]);
});
test("engine notation preserves castling/promotion SAN and never invents moves from an invalid PV", () => {
  assert.deepEqual(
    engineMoveRows("4k3/P7/8/8/8/8/8/4K3 w - - 0 37", ["a7a8n", "a8a7"]),
    [{ number: 37, white: "a8=N" }],
  );
  assert.deepEqual(engineMoveRows("4k3/8/8/8/8/8/8/4K2R w K - 0 8", ["e1g1"]), [
    { number: 8, white: "O-O" },
  ]);
});
