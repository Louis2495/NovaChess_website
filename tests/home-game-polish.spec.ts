import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';
test('rated game takeback removes the human move and reply and keeps them removed',async({page})=>{
 const c=new Chess(),initial=c.fen(),positions=[initial];for(const m of ['e4','e5']){c.move(m);positions.push(c.fen());}
 await page.addInitScript(g=>localStorage.setItem('novachess-library-v2',JSON.stringify({activeGame:g})),{id:'undo-test',title:'Standard',created:Date.now(),variant:'chess',initial,positions,moves:['e2e4','e7e5'],notation:['e4','e5'],result:'*',human:'w',folder:'Games',kind:'game',origin:'novachess',rated:true,botRating:1000});
 await page.goto('/#play');await page.getByRole('button',{name:'Resume saved game',exact:true}).click();const undo=page.getByRole('button',{name:'Take back',exact:true});await expect(undo).toBeEnabled();await undo.click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame.moves.length)).toBe(0);await page.waitForTimeout(1000);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame.positions.length)).toBe(1);
});
test('puzzle resize grows and shrinks sensitively without losing width to its wrapper',async({page})=>{
 await page.goto('/#puzzles');const handle=page.getByRole('slider',{name:'Resize board',exact:true}),board=page.locator('.puzzle-board .board');await handle.focus();await handle.press('ArrowLeft');await handle.press('ArrowLeft');const before=(await board.boundingBox())!.width,h=(await handle.boundingBox())!;await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2-15,h.y+h.height/2+15,{steps:5});await page.mouse.up();const after=(await board.boundingBox())!.width;expect(before-after).toBeGreaterThan(24);expect(before-after).toBeLessThan(36);await page.reload();await expect.poll(async()=>(await board.boundingBox())!.width).toBeCloseTo(after,0);
});
test('resize affordance reveals on hover and Start game has no arrow',async({page,isMobile})=>{
 await page.goto('/#analysis');const handle=page.getByRole('slider',{name:'Resize board',exact:true});if(!isMobile){await page.mouse.move(2,2);await expect(handle).toHaveCSS('opacity','0');await handle.hover();await expect(handle).toHaveCSS('opacity','1');}await page.goto('/#play');await expect(page.getByRole('button',{name:'Start game',exact:true}).locator('svg')).toHaveCount(0);
});
test('evaluation waits for deeper estimates and its bar exactly matches the board with material above or below',async({page})=>{
 await page.route('**/engine/stockfish-19-lite-single.js',r=>r.fulfill({contentType:'application/javascript',body:`onmessage=({data})=>{if(data==='uci')postMessage('uciok');if(data==='isready')postMessage('readyok');if(data.startsWith('go ')){postMessage('info depth 3 score cp 900 pv h1g1');setTimeout(()=>postMessage('info depth 14 score cp 125 pv h1g1'),650);}};`}));
 await page.goto('/#analysis/'+encodeURIComponent('fen:7k/8/8/8/8/8/P7/7K w - - 0 1'));const readout=page.locator('.evaluation-readout');await expect(readout).not.toContainText('9.00');await expect(readout).toContainText('1.25');
 for(let i=0;i<2;i++){const board=(await page.locator('.analysis-layout .board').boundingBox())!,bar=(await page.locator('.analysis-layout .eval-meter').boundingBox())!;expect(Math.abs(board.y-bar.y)).toBeLessThan(1);expect(Math.abs(board.y+board.height-bar.y-bar.height)).toBeLessThan(1);await page.locator('body').click({position:{x:2,y:2}});await page.keyboard.press('f');}
});
