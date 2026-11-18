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
    ).startsWith("4k3/8/8/3N4/8/8/8/4K3[]"),
  );
});

test('premove geometry follows Horde, Antichess and Pawn race rules',()=>{
 assert.ok(premoveOptions('7k/8/8/8/8/8/8/P7 b - - 0 1','w',false,[],'horde').includes('a1a3'));
 assert.ok(!premoveOptions('7k/8/8/8/8/8/8/P7 b - - 0 1','w').includes('a1a3'));
 assert.ok(premoveOptions('7k/P7/8/8/8/8/8/7K b - - 0 1','w',false,[],'antichess').includes('a7a8k'));
 const race=premoveOptions('8/P7/8/8/8/8/8/8 b - - 0 1','w',false,[],'cvpawnrace');assert.ok(race.includes('a7a8'));assert.ok(!race.includes('a7a8q'));
});
test('queued pocket drops consume inventory and planned captures add Crazyhouse pieces',()=>{
 const fen='4k3/8/8/8/8/8/8/4K3[NN] b - - 0 1';
 assert.ok(previewPremoves(fen,['N@c3'],'w','crazyhouse').includes('[N]'));
 assert.ok(previewPremoves(fen,['N@c3','N@d5'],'w','crazyhouse').includes('[]'));
 const captured=previewPremoves('4k3/8/8/8/8/n7/8/R3K3[] b - - 0 1',['a1a3','N@d5'],'w','crazyhouse');assert.ok(captured.includes('3N4'));assert.ok(captured.includes('[]'));
});

test('Crazyhouse previews keep promoted markers and return a captured promotion as a pawn',()=>{
 const preview=previewPremoves('4k3/8/8/8/8/q~7/8/R3K3[] b - - 0 1',['a1a3'],'w','crazyhouse');assert.ok(preview.includes('[P]'));assert.ok(!preview.includes('[Q]'));
 assert.ok(previewPremoves('4k3/8/8/8/8/Q~7/8/4K3[] b - - 0 1',['a3b3'],'w','crazyhouse').includes('1Q~6'));
});
import {duration,throneDuration} from '../../src/lib/speedrun.ts';
test('Throne time always includes hours and rolls over minutes correctly',()=>{assert.equal(throneDuration(0),'0:00:00');assert.equal(throneDuration(3723000),'1:02:03');assert.equal(throneDuration(90000000),'25:00:00');});

test('Speedrun stats omit zero minutes and keep minutes for longer runs',()=>{assert.equal(duration(9000,true),'9.0');assert.equal(duration(59999,true),'59.9');assert.equal(duration(60000,true),'1:00.0');assert.equal(duration(72300,true),'1:12.3');assert.equal(duration(9000),'0:09.0');});
