import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import load from "ffish-es6";
test("Fog of War uses checkmate and king safety, not king capture", async () => {
  const ff = await load({ wasmBinary: fs.readFileSync("node_modules/ffish-es6/ffish.wasm") });
  const source = fs.readFileSync("src/lib/variants.ts", "utf8");
  ff.loadVariantConfig(source.match(/export const customVariants = `([^`]+)`/)[1].replaceAll("\\n", "\n"));
  const b = new ff.Board("cvfog");
  try {
    for (const move of ["f2f3", "e7e5", "g2g4", "d8h4"]) assert.ok(b.push(move));
    assert.ok(b.isCheck());
    assert.ok(b.isGameOver());
    assert.equal(b.result(), "0-1");
    assert.equal(b.legalMoves(), "");
    assert.ok(b.fen().includes("k"));
    assert.ok(b.fen().includes("K"));
  } finally { b.delete(); }
});
