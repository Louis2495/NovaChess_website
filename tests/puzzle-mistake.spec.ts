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
 const progress = () => page.evaluate(() => JSON.parse(localStorage.getItem('novachess-library-v2')!).progress);
 const completed = await progress();
 await page.getByRole('button', {name:'Previous puzzle move',exact:true}).click();
 await square('d7').click();await square('d5').click();
 await expect(box).toContainText('Why d5 didn’t work');
 await expect(box).toContainText('White can respond with exd5');
 await expect(square('d7')).toHaveAttribute('aria-label','d7, black pawn');
 expect(await progress()).toEqual(completed);
 await square('e7').click();await square('e5').click();
 await expect(box).toHaveCount(0);
 await expect(square('e5')).toHaveAttribute('aria-label','e5, black pawn');
 await expect(page.locator('.puzzle-board')).toHaveClass(/solved/);
 expect(await progress()).toEqual(completed);
 if(route==='puzzles'){
  await expect(page.locator('.card:has(.theme-select)')).toHaveCount(0);await expect(page.locator('.puzzle-theme-picker summary')).toBeVisible();
  const next=page.getByRole('button',{name:'Next puzzle',exact:true});await expect(next).toHaveCSS('background-color','rgb(173, 217, 237)');await expect(next.locator('svg')).toHaveCount(0);await next.hover();await expect(next).toHaveCSS('background-color','rgb(173, 217, 237)');
 }

});

test('practice moves during an unfinished rewind leave the live puzzle ungraded', async ({ page }) => {
  await page.route('**/data/puzzles.json', route => route.fulfill({json:[{
    id:'rewind-test',fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves:['e2e4','e7e5','g1f3','b8c6'],sourceRating:1500,themes:['opening'],
  }]}));
  await page.goto('/#puzzles');
  const board = page.getByRole('group', {name:'Chessboard',exact:true});
  const square = (name:string) => board.getByRole('button', {name:new RegExp('^'+name+',')});
  const play = async (from:string,to:string) => { await square(from).click(); await square(to).click(); };
  const progress = () => page.evaluate(() => JSON.parse(localStorage.getItem('novachess-library-v2')!).progress);
  await play('e7','e5');
  await expect(square('f3')).toHaveAttribute('aria-label','f3, white knight');
  const before = await progress();
  const previous = page.getByRole('button', {name:'Previous puzzle move',exact:true});
  await previous.click(); await previous.click();
  await play('d7','d5');
  await expect(page.locator('.puzzle-mistake')).toContainText('Why d5 didn’t work');
  expect(await progress()).toEqual(before);
  await page.getByRole('slider', {name:'Puzzle replay position'}).press('End');
  await expect(page.locator('.puzzle-mistake')).toHaveCount(0);
  await expect(square('f3')).toHaveAttribute('aria-label','f3, white knight');
  await play('b8','c6');
  await expect(page.locator('.puzzle-board')).toHaveClass(/solved/);
  expect((await progress()).solved).toBe(before.solved + 1);
});
