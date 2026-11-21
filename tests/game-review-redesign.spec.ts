import { test, expect } from '@playwright/test';
import { Chess } from 'chess.js';
const san='e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 Nbd2 h6 Nf1 Be6 Bc2 d5 exd5 Qxd5'.split(' ');
test('review reuses its engine, shows evaluations, quality icons, ratings and Share exports',async({page})=>{
 const c=new Chess(),positions=[c.fen()],moves:string[]=[],notation:string[]=[];
 for(const m of san){const move=c.move(m);moves.push(move.from+move.to+(move.promotion||''));notation.push(move.san);positions.push(c.fen());}
 const scores=positions.map((_,i)=>i<3?0:Math.floor((i-2)/2)*60-((i-2)%2)*70);
 const map=Object.fromEntries(positions.map((fen,i)=>{const board=new Chess(fen);const alternate=board.moves({verbose:true}).find(m=>m.from+m.to!==moves[i]);return [fen,{score:scores[i],best:alternate?alternate.from+alternate.to+(alternate.promotion||''):'a1a2'}];}));
 await page.addInitScript(g=>{localStorage.setItem('novachess-library-v2',JSON.stringify({games:[g]}));const Native=window.Worker;(window as any).__engineWorkers=[];window.Worker=class extends Native{constructor(url:any,options?:any){super(url,options);if(String(url).includes('stockfish')){const entry:any={commands:[]};(window as any).__engineWorkers.push(entry);const send=this.postMessage.bind(this);this.postMessage=((m:any)=>{entry.commands.push(m);send(m);}) as any;}}};},{id:'review-fixture',title:'Review fixture',created:Date.now(),initial:positions[0],positions,moves,notation,result:'1/2-1/2',human:'w',variant:'chess',kind:'game',origin:'archive',folder:'Games'});
 await page.route('**/engine/stockfish-19-lite-single.js',route=>route.fulfill({contentType:'application/javascript',body:`const fixtures=${JSON.stringify(map)};let fen='';onmessage=({data})=>{if(data==='uci')postMessage('uciok');else if(data==='isready')postMessage('readyok');else if(data.startsWith('position fen '))fen=data.slice(13);else if(data.startsWith('go ')){const p=fixtures[fen];if(!p)return;const sign=fen.split(' ')[1]==='w'?1:-1;postMessage('info depth 20 score cp '+p.score*sign+' pv '+p.best);if(!data.includes('infinite'))postMessage('bestmove '+p.best);}};`}));
 await page.goto('/#library/review-fixture');
 await expect(page.getByRole('heading',{name:'Game review',exact:true})).toBeVisible();
 await expect(page.getByLabel('Time per position')).toHaveCount(0);await expect(page.getByLabel('Replay speed')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Engine review',exact:true})).toHaveCount(0);
 await expect(page.getByRole('status').filter({hasText:'Review complete.'})).toBeVisible();
 await expect(page.locator('.review-notation th')).toHaveText(['#','White','Black']);await expect(page.locator('.review-notation .move-quality')).toHaveCount(moves.length);
 await expect(page.locator('.review-notation-card h2')).toHaveCSS('position', 'static');
 await expect(page.locator('.review-notation th').first()).toHaveCSS('position', 'static');
 await expect(page.locator('.evaluation-graph polyline')).toHaveAttribute('points',/\S+ \S+/);
 await expect(page.locator('.review-performance .review-player-metric dd:first-of-type')).not.toHaveText(['—','—']);
 for (const panel of await page.locator('.review-performance dl').all()) {
  await expect(panel).toHaveCSS('border-top-color', 'rgb(137, 141, 151)');
 }
 const batch=await page.evaluate(()=>(window as any).__engineWorkers.filter((w:any)=>w.commands.filter((s:string)=>s.startsWith('go ')&&!s.includes('infinite')).length>1));expect(batch).toHaveLength(1);
 await page.locator('.review-notation td button').first().click();await expect(page.locator('.board-move-badge .move-quality')).toHaveAttribute('aria-label','Book');await expect(page.locator('.board-move-badge .quality-book svg')).toBeVisible();
 const board=(await page.locator('.game-review-layout .board').boundingBox())!,bar=(await page.locator('.review-board-eval .eval-meter').boundingBox())!;expect(bar.x+bar.width).toBeLessThan(board.x);expect(Math.abs(bar.height-board.height)).toBeLessThan(1);
 await page.getByRole('button',{name:'Share',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Share game',exact:true});await expect(dialog.getByRole('button',{name:'Download PGN',exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Game GIF',exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download PGN',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.pgn$/);
});

test('game review runs real Stockfish when WASM is served as binary', async ({ page, context, isMobile }) => {
  const game = new Chess();
  const initial = game.fen();
  game.move('e4');
  await page.addInitScript(saved => localStorage.setItem(
    'novachess-library-v2', JSON.stringify({ games: [saved] }),
  ), {
    id: 'engine-fixture', title: 'Engine fixture', created: Date.now(),
    initial, positions: [initial, game.fen()], moves: ['e2e4'], notation: ['e4'],
    result: '1-0', human: 'w', variant: 'chess', kind: 'game', origin: 'archive', folder: 'Games',
  });
  let wasmRequests = 0;
  await context.route('**/engine/stockfish-19-lite-single.wasm', async route => {
    wasmRequests++;
    const response = await route.fetch();
    await route.fulfill({ response, contentType: 'application/octet-stream' });
  });

  await page.goto('/#library/engine-fixture');
  await expect(page.locator('.review-status')).toHaveText('Review complete.', { timeout: 15000 });
  expect(wasmRequests).toBeGreaterThan(0);
  await expect(page.locator('.review-notation .move-quality')).toHaveCount(1);

  await expect(page.getByRole('heading', { name: 'Game information' })).toHaveCount(0);
  await expect(page.locator('.page-subtitle')).toHaveCount(0);
  await expect(page.getByText('Stockfish 19 Lite', { exact: false })).toHaveCount(0);
  const stats = page.getByRole('region', { name: 'Player performance' });
  for (const [side, fill, stripe] of [
    ['White', 'rgb(255, 255, 255)', 'rgb(24, 217, 102)'],
    ['Black', 'rgb(17, 19, 24)', 'rgb(255, 56, 91)'],
  ]) {
    const panel = stats.locator(`dl[aria-label="${side}"]`);
    await expect(panel.locator('dt')).toHaveText(['Estimated rating', 'Centipawn loss']);
    await expect(panel.locator('dd')).toHaveCount(2);
    await expect(panel).toHaveCSS('background-color', fill);
    await expect(panel).toHaveCSS('border-top-color', stripe);
  }
  const [white, black] = await Promise.all([
    stats.locator('dl[aria-label="White"]').boundingBox(),
    stats.locator('dl[aria-label="Black"]').boundingBox(),
  ]);
  expect(Math.abs(white!.x + white!.width - black!.x)).toBeLessThan(1);
  await expect(page.locator('.live-game-evaluation')).toHaveText(/^[+-][0-9.]+$/);

  if (!isMobile) {
    const board = (await page.locator('.game-review-layout .board').boundingBox())!;
    const rating = (await stats.boundingBox())!;
    expect(rating.x - (board.x + board.width)).toBeGreaterThanOrEqual(36);
    expect(Math.abs(rating.y - board.y)).toBeLessThan(1);
  }
});
