import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const memes=JSON.parse(readFileSync('public/memes/candidates.json','utf8'));
test('meme frames match puzzle height without cropping and puzzle hover highlights the whole card',async({page})=>{
 for(const meme of [memes.reduce((a:any,b:any)=>a.width/a.height<b.width/b.height?a:b),memes.reduce((a:any,b:any)=>a.width/a.height>b.width/b.height?a:b)]){
  await page.route('**/memes/candidates.json',r=>r.fulfill({json:[meme]}));await page.goto('/');const image=page.locator('.daily-meme-image');await image.evaluate((e:HTMLImageElement)=>e.decode());await expect(image).toHaveCSS('object-fit','contain');await expect.poll(async()=>Math.abs((await page.locator('.daily-meme').boundingBox())!.height-(await page.locator('.home-puzzle').boundingBox())!.height)).toBeLessThan(1);await page.unroute('**/memes/candidates.json');
 }
 const card=page.locator('.home-puzzle'),content=page.locator('.home-puzzle-content');const before=await card.evaluate(e=>getComputedStyle(e).backgroundColor);await card.hover();await expect.poll(()=>card.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(before);await expect(content).toHaveCSS('background-color','rgba(0, 0, 0, 0)');const c=(await card.boundingBox())!,b=(await card.locator('.board').boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(c.y+c.height);await card.click();await expect(page).toHaveURL(/puzzles/);
});

test('desktop Home places Recent games beside the meme and keeps the three sections in frame',async({page})=>{
 await page.addInitScript(()=>{const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';localStorage.setItem('novachess-library-v2',JSON.stringify({games:['1-0','0-1','1/2-1/2'].map((result,i)=>({id:String(i),title:'Standard',initial,positions:[initial],moves:[],notation:[],result,human:'w',variant:'chess',folder:'Games',kind:'game',created:Date.now(),opponent:'Computer',botRating:1200}))}));});
 for(const meme of [memes.reduce((a:any,b:any)=>a.width/a.height<b.width/b.height?a:b),memes.reduce((a:any,b:any)=>a.width/a.height>b.width/b.height?a:b)]){
  await page.route('**/memes/candidates.json',r=>r.fulfill({json:[meme]}));
  for(const [width,height] of [[1440,900],[1280,700],[1024,768]]){
   await page.setViewportSize({width,height});await page.goto('/');const image=page.locator('.daily-meme-image');await image.evaluate((image:HTMLImageElement)=>image.decode());
   const puzzle=(await page.locator('.home-puzzle').boundingBox())!,m=(await page.locator('.daily-meme').boundingBox())!,recent=(await page.locator('.home-recent').boundingBox())!;
   expect(Math.abs(puzzle.y-m.y)).toBeLessThan(2);expect(Math.abs(recent.y-m.y)).toBeLessThan(2);expect(recent.x).toBeGreaterThan(m.x+m.width);expect(Math.max(puzzle.y+puzzle.height,m.y+m.height+8,recent.y+recent.height)).toBeLessThan(height-12);
   await expect(page.locator('.daily-meme')).toHaveCSS('border-width','8px');expect(Math.abs(m.height-puzzle.height)).toBeLessThan(1);expect(Math.abs(recent.height-puzzle.height)).toBeLessThan(1);expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height+1);
  }
  await page.unroute('**/memes/candidates.json');
 }
});

test('Home completion uses a yellow outline and recent games show stacked players and individual scores',async({page})=>{
 await page.addInitScript(()=>{const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem('novachess-library-v2',JSON.stringify({profile:{name:'My name'},progress:{daily:{[date]:{id:'test',completed:true,correct:true}}},games:['1-0','0-1','1/2-1/2'].map((result,i)=>({id:String(i),title:'Standard',initial,positions:[initial],moves:['e2e4','e7e5'],notation:['e4','e5'],result,human:'b',variant:'chess',folder:'Games',kind:'game',created:Date.UTC(2026,10,18,18,25),opponent:'Opponent name',humanRating:1234,opponentRating:1567}))}));});
 await page.goto('/');await expect(page.locator('.completion-label')).toHaveCount(0);await expect(page.locator('.home-puzzle')).toHaveCSS('outline-color','rgb(255, 223, 0)');
 const entries=page.locator('.recent-game-entry');await expect(entries).toHaveCount(3);
 for(const entry of await entries.all()){const players=entry.locator('.recent-player');await expect(players.first()).toContainText('Opponent name (1567)');await expect(players.last()).toContainText('My name (1234)');expect((await players.first().boundingBox())!.y).toBeLessThan((await players.last().boundingBox())!.y);await expect(entry.locator('time')).toContainText('2026');await expect(entry.locator('time')).toContainText(/· .*\d.*:\d\d/);await expect(entry.locator('.game-result-label')).toHaveCount(0);}
 await expect(entries.first().locator('.recent-player-score').first()).toHaveText('1');await expect(entries.first().locator('.recent-player-score').first()).toHaveCSS('color','rgb(57, 237, 131)');await expect(entries.first().locator('.recent-player-score').last()).toHaveCSS('color','rgb(255, 83, 100)');await expect(entries.last().locator('.recent-player-score').first()).toHaveText('½');
 await expect(page.locator('.home-recent-list')).toHaveCSS('scrollbar-color','rgb(255, 255, 255) rgba(0, 0, 0, 0)');
 await expect(entries.first()).toHaveCSS('margin-bottom','14px');
 await entries.first().getByRole('slider').focus();const preview=page.locator('.recent-game-preview');await expect(preview).toBeVisible();
 expect(await preview.evaluate(el=>!!el.closest('.home-recent-list,.home-recent'))).toBe(false);
 const popup=(await preview.boundingBox())!;expect(popup.x).toBeGreaterThanOrEqual(0);expect(popup.y).toBeGreaterThanOrEqual(0);expect(popup.x+popup.width).toBeLessThanOrEqual(page.viewportSize()!.width);expect(popup.y+popup.height).toBeLessThanOrEqual(page.viewportSize()!.height);
 const faint=await entries.first().evaluate(e=>{const s=getComputedStyle(e);return s.backgroundColor!==s.borderTopColor});expect(faint).toBe(true);
});
