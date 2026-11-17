import test from 'node:test';import assert from 'node:assert/strict';import {Chess} from 'chess.js';
import {previewRoomMove} from '../../src/lib/roomPreview.ts';
test('local move previews are immediate, legal and do not mutate confirmed state',()=>{
 const c=new Chess(),state={initial:c.fen(),fen:c.fen(),positions:[c.fen()],moves:[],notation:[],result:'*'};const next=previewRoomMove(null,'chess',state,'e2e4');assert.ok(next);assert.deepEqual(next.moves,['e2e4']);assert.deepEqual(state.moves,[]);assert.equal(previewRoomMove(null,'chess',state,'e2e5'),null);
});
