import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {quizArtwork} from '../../src/lib/quizArtwork.ts';
test('every themed quiz has four distinct result pictures and all picture files exist',()=>{
 for(const id of ['snack','villain','vacation','groupchat','pet','weather','restaurant','wizard','apocalypse','movie','style','princess']){
  const pictures=Array.from({length:4},(_,i)=>quizArtwork(id,i));assert.equal(new Set(pictures.map(p=>p.sheet+':'+p.tile)).size,4,id);
  for(const p of [quizArtwork(id),...pictures]){assert.ok(p.tile>=0&&p.tile<8,id);assert.ok(existsSync('public/quizzes/'+p.sheet),p.sheet);}
 }
 assert.deepEqual(quizArtwork('snack',2),{sheet:'food-villains.webp',tile:2});
});
