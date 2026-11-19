import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
const puzzles=JSON.parse(readFileSync('public/data/puzzles.json','utf8'));
const puzzle=puzzles.find((p:any)=>p.sourceRating>=1000&&p.sourceRating<=2200&&p.moves.length>=4&&p.moves.length<=6&&p.moves.every((m:string)=>m.length===4));
test('daily puzzle has scoped chat, controls below the board, and replay only after completion',async({page,isMobile})=>{
 await page.route('**/data/puzzles.json',r=>r.fulfill({json:[puzzle]}));await page.goto('/#puzzles/daily');
 const board=page.locator('.daily-puzzle-layout .board'),hint=page.getByRole('button',{name:'Hint',exact:true});
 await expect(board).toBeVisible();await expect(page.locator('.puzzle-rating')).toHaveCount(0);await expect(page.locator('.page-subtitle')).toHaveCount(0);await expect(page.getByRole('button',{name:'Replay',exact:true})).toHaveCount(0);
 const b=(await board.boundingBox())!,h=(await hint.boundingBox())!,chat=(await page.locator('.puzzle-chat').boundingBox())!;expect(h.y).toBeGreaterThan(b.y+b.height);if(!isMobile){expect(chat.x).toBeGreaterThan(b.x+b.width);const layout=(await page.locator('.daily-puzzle-layout').boundingBox())!;expect(Math.abs(b.x+b.width/2-await page.evaluate(()=>document.documentElement.clientWidth/2))).toBeLessThan(2);expect(Math.abs(chat.x+chat.width/2-(b.x+b.width+layout.x+layout.width)/2)).toBeLessThan(3);}
 const c=new Chess(puzzle.fen);c.move(puzzle.moves[0]);
 for(let i=1;i<puzzle.moves.length;i+=2){await expect(hint).toBeEnabled();const move=puzzle.moves[i];for(const square of [move.slice(0,2),move.slice(2,4)])await board.getByRole('button',{name:new RegExp('^'+square+',')}).click();c.move(move);await expect(page.getByText('Correct.',{exact:true})).toHaveCount(0);if(i+1<puzzle.moves.length)c.move(puzzle.moves[i+1]);}
 await expect(page.locator('.puzzle-board')).toHaveClass(/solved/);await expect(board).toHaveCSS('outline-color','rgb(248, 217, 83)');await expect(page.locator('.puzzle-board')).toHaveCSS('border-top-color','rgba(0, 0, 0, 0)');
 await page.getByRole('button',{name:'Replay',exact:true}).click();await expect(page.getByRole('button',{name:'Replay',exact:true})).toHaveCount(0);await expect(hint).toBeVisible();
});
test('recent games use bright outlines for each result',async({page})=>{
 const c=new Chess(),initial=c.fen();c.move('e4');await page.addInitScript(games=>localStorage.setItem('novachess-library-v2',JSON.stringify({games})),['*','1/2-1/2','1-0','0-1'].map((result,i)=>({id:String(i),title:'Game',initial,positions:[initial,c.fen()],moves:['e2e4'],notation:['e4'],human:'w',variant:'chess',created:Date.now(),result})));
 await page.goto('/');await expect(page.locator('.recent-game-entry.result-unfinished')).toHaveCSS('border-color','rgb(255, 255, 255)');await expect(page.locator('.recent-game-entry.result-draw')).toHaveCSS('border-color','rgb(225, 231, 237)');await expect(page.locator('.recent-game-entry.result-win')).toHaveCSS('border-color','rgb(57, 237, 131)');
});

test('daily puzzle Hint fits above the bottom navigation on short screens',async({page})=>{
 for(const [width,height] of [[1440,700],[390,664]]){
  await page.setViewportSize({width,height});await page.goto('/#puzzles/daily');const hint=page.getByRole('button',{name:'Hint',exact:true});await expect(hint).toBeVisible();
  await expect.poll(async()=>{const h=(await hint.boundingBox())!,tabs=page.locator('.mobile-tabs');const bottom=await tabs.isVisible()?(await tabs.boundingBox())!.y:height;return h.y+h.height-bottom;}).toBeLessThanOrEqual(-8);
 }
});

test('first Hint highlights the piece; second Hint draws its move arrow and a move clears it',async({page})=>{
 await page.route('**/data/puzzles.json',r=>r.fulfill({json:[puzzle]}));await page.goto('/#puzzles/daily');const board=page.locator('.daily-puzzle-layout .board'),hint=page.getByRole('button',{name:'Hint',exact:true}),move=puzzle.moves[1];
 await hint.click();await expect(board.locator('.hinted')).toHaveAttribute('aria-label',new RegExp('^'+move.slice(0,2)+','));await expect(board.locator('.board-marks line,.board-marks polyline')).toHaveCount(0);
 await hint.click();await expect(board.locator('.board-marks line,.board-marks polyline')).toHaveCount(1);await expect(board.locator('.board-marks g')).toHaveAttribute('stroke','#42d9ec');
 for(const square of [move.slice(0,2),move.slice(2,4)])await board.getByRole('button',{name:new RegExp('^'+square+',')}).click();await expect(board.locator('.board-marks line,.board-marks polyline')).toHaveCount(0);
});
