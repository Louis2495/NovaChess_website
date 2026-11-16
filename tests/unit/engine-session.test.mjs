import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import fs from 'node:fs';
test('review reuses one worker, resets strength, honors depth limits and terminates on cancel',async()=>{
 const originalWorker=globalThis.Worker,originalDocument=globalThis.document;
 class FakeWorker {commands=[];terminated=false;postMessage(s){this.commands.push(s);}terminate(){this.terminated=true;}emit(s){this.onmessage({data:s});}}
 globalThis.Worker=FakeWorker;globalThis.document={baseURI:'https://example.com/'};
 try {
  const source=fs.readFileSync('src/lib/engine.ts','utf8').replace(/^import .*;\n/gm,'');
  const js=ts.transpileModule('const base="/";\n'+source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const {search}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  const worker=new FakeWorker(),fen='4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
  const first=search(fen,{elo:1000,worker,time:500,depth:20});worker.emit('uciok');assert.ok(worker.commands.includes('setoption name Skill Level value 0'));assert.ok(!worker.commands.includes('setoption name Skill Level value 7'));worker.emit('readyok');assert.ok(worker.commands.includes('go depth 20 movetime 500'));worker.emit('info depth 17 score cp 35 pv e2e4');worker.emit('bestmove e2e4');assert.equal((await first).best,'e2e4');assert.equal(worker.terminated,false);
  worker.commands=[];const second=search(fen,{worker,depth:22,time:1200});worker.emit('uciok');assert.ok(worker.commands.includes('setoption name Skill Level value 20'));assert.ok(worker.commands.includes('setoption name UCI_LimitStrength value false'));worker.emit('readyok');worker.emit('bestmove e2e3');assert.equal((await second).best,'e2e3');assert.equal(worker.terminated,false);
  const controller=new AbortController(),third=search(fen,{worker,signal:controller.signal});controller.abort();await assert.rejects(third,{name:'AbortError'});assert.equal(worker.terminated,true);
 } finally {globalThis.Worker=originalWorker;globalThis.document=originalDocument;}
});
