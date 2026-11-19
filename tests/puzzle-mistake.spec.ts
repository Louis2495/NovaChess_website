import {test,expect} from '@playwright/test';
for(const route of ['puzzles','puzzles/daily'])test(`${route} explains wrong moves and clears the explanation after a correct move`,async({page})=>{
 await page.route('**/data/puzzles.json',r=>r.fulfill({json:[{id:'mistake-test',fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',moves:['e2e4','e7e5'],sourceRating:1500,themes:['opening']}]}));
 await page.route('**/engine/stockfish-19-lite-single.js',r=>r.fulfill({contentType:'application/javascript',body:`let after=false;onmessage=({data})=>{if(data==='uci')postMessage('uciok');if(data==='isready')postMessage('readyok');if(data.startsWith('position fen'))after=data.includes('/3p4/');if(data.startsWith('go ')){postMessage(after?'info depth 16 score cp 200 pv e4d5 d8d5 b1c3':'info depth 16 score cp 0 pv e7e5');postMessage(after?'bestmove e4d5':'bestmove e7e5');}};`}));
 await page.goto('/#'+route);const board=page.getByRole('group',{name:'Chessboard',exact:true});
 const square=(s:string)=>board.getByRole('button',{name:new RegExp('^'+s+',')});
 await square('d7').click();await square('d5').click();
 const box=page.locator('.puzzle-mistake');await expect(box).toBeVisible();await expect(box).toContainText('Why d5 didn’t work');await expect(box).toContainText('White can respond with exd5');await expect(box).toContainText('2.0 pawns');
 await expect(square('d7')).toHaveAttribute('aria-label','d7, black pawn');
 await square('e7').click();await square('e5').click();await expect(box).toHaveCount(0);await expect(page.locator('.puzzle-board')).toHaveClass(/solved/);
 if(route==='puzzles'){
  const theme=page.locator('.card:has(.theme-select)');await expect(theme).toHaveCSS('background-color','rgb(189, 150, 120)');await expect(theme).toHaveCSS('border-color','rgb(89, 59, 41)');
  const next=page.getByRole('button',{name:'Next puzzle',exact:true});await expect(next).toHaveCSS('background-color','rgb(255, 223, 0)');await expect(next.locator('svg')).toHaveCount(0);await next.hover();await expect(next).toHaveCSS('background-color','rgb(255, 223, 0)');
 }

});
