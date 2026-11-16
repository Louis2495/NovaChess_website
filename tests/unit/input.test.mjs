import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  matchTypedMove,
  parseTypedMove,
  humanTheme,
} from "../../src/lib/moves.ts";
import { previewPremoves, premoveOptions } from "../../src/lib/premoves.ts";
test("typed moves ignore case while preserving pawn/bishop ambiguity", () => {
  assert.equal(parseTypedMove(new Chess(), "nf3").san, "Nf3");
  assert.equal(parseTypedMove(new Chess(), "E4").san, "e4");
  const choices = [
    { uci: "b4c5", san: "bxc5" },
    { uci: "e3c5", san: "Bxc5" },
  ];
  assert.equal(matchTypedMove("bxc5", choices), "b4c5");
  assert.equal(matchTypedMove("Bxc5", choices), "e3c5");
  assert.equal(humanTheme("discoveredAttack"), "Discovered Attack");
});
test("consecutive premoves follow the same piece through its planned squares", () => {
  const fen = "4k3/8/8/8/8/8/PP6/R3K3 b Q - 0 1";
  const preview = previewPremoves(fen, ["a2a4", "a4a5", "a5a6"], "w");
  const c = new Chess(preview);
  assert.equal(c.get("a6").type, "p");
  assert.equal(c.get("a2"), undefined);
  assert.ok(premoveOptions(preview, "w").includes("a6a7"));
  assert.ok(!premoveOptions(fen, "w", false, ["a3"]).includes("a2a4"));
});
test("premove previews retain promotions, duck placements, pockets and sliding blockers", () => {
  assert.ok(
    previewPremoves("7k/P7/8/8/8/8/8/7K b - - 0 1", ["a7a8n"], "w").startsWith(
      "N6k/",
    ),
  );
  assert.ok(
    previewPremoves(
      "7k/8/8/8/8/8/8/R6K b - - 0 1",
      ["a1a2,b3"],
      "w",
    ).startsWith("7k/8/8/8/8/1*6/R7/7K"),
  );
  assert.ok(
    !premoveOptions("7k/8/8/8/8/p7/P7/7K b - - 0 1", "w").includes("a2a3"),
  );
  assert.ok(
    !premoveOptions("7k/8/8/8/8/8/8/R6K b - - 0 1", "w", false, [
      "a3",
    ]).includes("a1a4"),
  );
});

test("Chess960 premoves preserve both castling pieces and pocket drops", () => {
  const fen = previewPremoves(
    "4k3/8/8/8/8/8/8/1R2K2R b BH - 0 1",
    ["e1b1"],
    "w",
  );
  assert.ok(fen.startsWith("4k3/8/8/8/8/8/8/2KR3R"));
  assert.ok(
    premoveOptions("4k3/8/8/8/8/8/8/1R2K2R b BH - 0 1", "w").includes("e1b1"),
  );
  assert.ok(
    previewPremoves(
      "4k3/8/8/8/8/8/8/4K3[N] b - - 0 1",
      ["N@c3", "c3d5"],
      "w",
    ).startsWith("4k3/8/8/3N4/8/8/8/4K3[N]"),
  );
});
