import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
const data=name=>JSON.parse(readFileSync(`public/data/${name}.json`,'utf8'));
test('new personality quizzes have unique chess questions and reachable, distinct outcomes',()=>{
 const quizzes=data('personality-quizzes');assert.equal(quizzes.length,10);
 assert.equal(new Set(quizzes.map(q=>q.id)).size,10);
 const prompts=[];
 for(const q of quizzes){assert.equal(q.questions.length,6);assert.equal(q.results.length,4);assert.equal(new Set(q.results.map(r=>r.title)).size,4);
  for(const question of q.questions){prompts.push(question.prompt);assert.match(question.prompt,/\?$/);assert.equal(question.answers.length,4);assert.equal(new Set(question.answers.map(a=>a.label)).size,4);assert.deepEqual(question.answers.map(a=>a.score).sort(),[0,1,2,3]);}
  for(let outcome=0;outcome<4;outcome++){const score=[0,0,0,0];for(const question of q.questions)score[question.answers.find(a=>a.score===outcome).score]++;assert.equal(score.indexOf(Math.max(...score)),outcome);}
 }
 assert.equal(new Set(prompts).size,prompts.length);
});
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
