import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';
test('Speedrun uses 50 Elo steps, excludes computer time and preserves the timer',async({page})=>{
 await page.goto('/#play');await page.getByRole('button',{name:'Speedrun',exact:true}).click();const elo=page.getByRole('spinbutton',{name:'Computer Elo',exact:true});await expect(elo).toHaveAttribute('step','50');await elo.fill('850');await page.getByRole('button',{name:'Start game',exact:true}).click();await expect(page.getByRole('timer')).toBeVisible();await page.waitForTimeout(400);const board=page.locator('.play-match .board');await board.getByRole('button',{name:'e2, white pawn',exact:true}).click();await board.getByRole('button',{name:'e4, empty',exact:true}).click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame.moves.length)).toBeGreaterThanOrEqual(1);const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame);expect(state.botRating).toBe(850);expect(state.speedrun.elapsedMs).toBeGreaterThan(300);expect(state.speedrun.elapsedMs).toBeLessThan(5000);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame.moves.length)).toBe(2);const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame);expect(after.speedrun.elapsedMs).toBe(state.speedrun.elapsedMs);expect(after.speedrun.turnStartedAt).toBeGreaterThan(0);
});
test('Stats keeps only the fastest eligible win at each Elo and Home shows player details',async({page})=>{
 const c=new Chess(),initial=c.fen();c.move('e4');const base={created:Date.now(),initial,positions:[initial,c.fen()],moves:['e2e4'],notation:['e4'],variant:'chess',human:'w',folder:'Games',kind:'game',origin:'novachess',opponent:'Computer',botRating:850,title:'Speedrun'};
 await page.addInitScript(games=>localStorage.setItem('novachess-library-v2',JSON.stringify({games})),[{...base,id:'a',result:'1-0',speedrun:{elapsedMs:12000,turnStartedAt:null}},{...base,id:'b',result:'1-0',speedrun:{elapsedMs:9000,turnStartedAt:null}},{...base,id:'c',result:'0-1',speedrun:{elapsedMs:1000,turnStartedAt:null}},{...base,id:'d',result:'1-0',speedrun:{elapsedMs:500,turnStartedAt:null,invalid:true}}]);await page.goto('/#stats');await expect(page.locator('.speedrun-rating.has-record')).toHaveCount(1);await expect(page.locator('.speedrun-stats')).toContainText('0:09.0');await expect(page.getByRole('heading',{name:'On the Throne',exact:true})).toBeVisible();await page.goto('/');await expect(page.locator('.recent-game-row').first()).toContainText('Computer · 850');await expect(page.locator('.recent-game-row').first()).toContainText('Speedrun');await expect(page.locator('.recent-game-mark')).toHaveCount(0);
});
test('winning a Speedrun archives a stopped record while losses are excluded',async({page})=>{
 const initial='7k/8/5KQ1/8/8/8/8/8 w - - 0 1';
 await page.addInitScript(g=>localStorage.setItem('novachess-library-v2',JSON.stringify({activeGame:g})),{id:'finish-run',title:'Speedrun',created:Date.now(),variant:'chess',initial,positions:[initial],moves:[],notation:[],result:'*',human:'w',folder:'Games',kind:'game',origin:'novachess',opponent:'Computer',botRating:850,speedrun:{elapsedMs:1000,turnStartedAt:Date.now()-1000}});
 await page.goto('/#play/resume');const board=page.locator('.play-match .board');await board.getByRole('button',{name:'g6, white queen',exact:true}).click();await board.getByRole('button',{name:'g7, empty',exact:true}).click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).games.length)).toBe(1);const game=await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).games[0]);expect(game.result).toBe('1-0');expect(game.speedrun.elapsedMs).toBeGreaterThan(2000);expect(game.speedrun.turnStartedAt).toBeNull();await page.goto('/#stats');await expect(page.locator('.speedrun-rating.has-record')).toHaveCount(1);
});

test('Speedrun ratings run from 100 to 3000 in one horizontally scrolling row',async({page})=>{
 await page.goto('/#stats');
 const grid=page.getByRole('list',{name:'Fastest wins by computer rating'}),cards=grid.getByRole('listitem');
 await expect(cards).toHaveCount(59);
 await expect(cards.first()).toHaveAttribute('aria-label','100 Elo: No win yet');
 await expect(cards.last()).toHaveAttribute('aria-label','3000 Elo: No win yet');
 const layout=await grid.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,tops:[...el.children].map(c=>c.getBoundingClientRect().top)}));
 expect(new Set(layout.tops).size).toBe(1);expect(layout.scrollWidth).toBeGreaterThan(layout.width);
 await grid.scrollIntoViewIfNeeded();
 await grid.evaluate(el=>el.scrollLeft=el.scrollWidth);
 await expect(cards.last()).toBeInViewport();
 await page.goto('/#play');await page.getByRole('button',{name:'Speedrun',exact:true}).click();
 const elo=page.getByRole('spinbutton',{name:'Computer Elo',exact:true});
 await expect(elo).toHaveAttribute('min','100');await expect(elo).toHaveAttribute('max','3000');await expect(elo).toHaveAttribute('step','50');
 await elo.fill('50');await elo.blur();await expect(elo).toHaveValue('100');
 await elo.fill('3050');await elo.blur();await expect(elo).toHaveValue('3000');
 await elo.fill('1226');await elo.blur();await expect(elo).toHaveValue('1250');
});
