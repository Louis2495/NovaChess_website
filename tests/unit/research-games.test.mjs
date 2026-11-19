import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {parseResearchPGN} from '../../src/lib/researchGames.ts';
test('opening parser matches full chess.js replay while preserving full PGN exports',()=>{
 const games=JSON.parse(readFileSync('public/data/famous-games.json','utf8'));
 for(const game of games.slice(0,20)){
  const board=new Chess();board.loadPgn(game.pgn);const parsed=parseResearchPGN(game.pgn,board.getHeaders().White);
  assert.deepEqual(parsed.moves,board.history({verbose:true}).slice(0,40).map(m=>m.from+m.to+(m.promotion||'')));assert.equal(parsed.pgn,game.pgn);assert.equal(parsed.result,board.getHeaders().Result||'*');assert.equal(parsed.color,'w');
 }
});
test('opening parser skips comments, nested variations, move numbers and annotation glyphs',()=>{
 const parsed=parseResearchPGN('[White "Tester"]\n[Result "1-0"]\n\n1.e4 {book} (1.d4 (1.c4) d5) e5 $1 2.Nf3!? ;comment\nNc6 3.Bb5 a6 1-0','tester');
 assert.deepEqual(parsed.moves,['e2e4','e7e5','g1f3','b8c6','f1b5','a7a6']);assert.equal(parsed.result,'1-0');assert.equal(parseResearchPGN('[Variant "Atomic"]\n\n1. e4'),null);assert.equal(parseResearchPGN('1. notAMove'),null);
});
test('opening parser never replays moves beyond the 40-ply research limit',()=>{
 const game=new Chess();for(let i=0;i<10;i++)for(const move of ['Nf3','Nf6','Ng1','Ng8'])game.move(move);
 const pgn=game.pgn()+' THIS LATE TEXT IS NOT PARSED';assert.equal(parseResearchPGN(pgn).moves.length,40);assert.equal(parseResearchPGN(pgn).pgn,pgn);
});
