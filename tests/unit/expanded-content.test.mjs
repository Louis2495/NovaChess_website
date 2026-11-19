import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
const data=name=>JSON.parse(readFileSync(`public/data/${name}.json`,'utf8'));
test('encyclopedia covers broad topics with meaningful articles and playable defining opening lines',()=>{
 const entries=data('encyclopedia');assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
 for(const category of ['Tactics','Strategy','Pawn structures','Pieces & board','Chess technology','Ratings & organizations','Players','Events & history','Variants','Calculation & training','Chess culture & literature']){
  const articles=entries.filter(e=>e.category===category);assert.ok(articles.length>=6,category);assert.ok(articles.some(e=>e.sections?.length),category);
 }
 for(const entry of entries){assert.ok(entry.title&&entry.body&&entry.source,entry.id);for(const section of entry.sections||[])assert.ok(section.body?.trim().length>15,entry.id);}
 const named=entries.filter(e=>e.id.startsWith('opening-line-'));
 const openings=new Map(data('openings').map(o=>[o.id,o]));
 for(const entry of named){const sequence=entry.sections.find(s=>s.title==='Defining move order');assert.ok(sequence,entry.id);const board=new Chess();board.loadPgn(sequence.body);const expected=openings.get(entry.id.slice('opening-line-'.length));assert.deepEqual(board.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')),expected.moves,entry.title);}
});
