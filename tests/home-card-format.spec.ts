import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const memes=JSON.parse(readFileSync('public/memes/candidates.json','utf8'));
test('memes preserve their proportions and puzzle hover highlights the whole card',async({page})=>{
 for(const meme of [memes.reduce((a:any,b:any)=>a.width/a.height<b.width/b.height?a:b),memes.reduce((a:any,b:any)=>a.width/a.height>b.width/b.height?a:b)]){
  await page.route('**/memes/candidates.json',r=>r.fulfill({json:[meme]}));await page.goto('/');const image=page.locator('.daily-meme-image');await image.evaluate((e:HTMLImageElement)=>e.decode());await expect(image).toHaveCSS('object-fit','contain');await expect(page.locator('.daily-meme')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await page.unroute('**/memes/candidates.json');
 }
 const card=page.locator('.home-puzzle'),content=page.locator('.home-puzzle-content');const before=await card.evaluate(e=>getComputedStyle(e).backgroundColor);await card.hover();await expect.poll(()=>card.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(before);await expect(content).toHaveCSS('background-color','rgba(0, 0, 0, 0)');const c=(await card.boundingBox())!,b=(await card.locator('.board').boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(c.y+c.height);await card.click();await expect(page).toHaveURL(/puzzles/);
});

test('Recent games stays visible when the library is empty', async ({ page }) => {
  await page.goto('/');
  const recent = page.getByRole('region', { name: 'Recent games' });
  await expect(recent.getByText('No games yet.')).toBeVisible();
  await expect(recent.locator('.recent-game-entry')).toHaveCount(0);
  await recent.locator('.home-recent-empty img').evaluate((image: HTMLImageElement) => image.decode());
  await recent.getByRole('button', { name: 'Play your first game' }).click();
  await expect(page).toHaveURL(/#play$/);
});

test('desktop Home places equally tall Recent games beside the meme',async({page})=>{
 await page.addInitScript(()=>{const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';localStorage.setItem('novachess-library-v2',JSON.stringify({games:['1-0','0-1','1/2-1/2'].map((result,i)=>({id:String(i),title:'Standard',initial,positions:[initial],moves:[],notation:[],result,human:'w',variant:'chess',folder:'Games',kind:'game',created:Date.now(),opponent:'Computer',botRating:1200}))}));});
 for(const meme of [memes.reduce((a:any,b:any)=>a.width/a.height<b.width/b.height?a:b),memes.reduce((a:any,b:any)=>a.width/a.height>b.width/b.height?a:b)]){
  await page.route('**/memes/candidates.json',r=>r.fulfill({json:[meme]}));
  for(const [width,height] of [[1440,900],[1280,700],[1024,768]]){
   await page.setViewportSize({width,height});await page.goto('/');const image=page.locator('.daily-meme-image');await image.evaluate((image:HTMLImageElement)=>image.decode());
   const puzzle=(await page.locator('.home-puzzle').boundingBox())!,m=(await page.locator('.daily-meme').boundingBox())!,recent=(await page.locator('.home-recent').boundingBox())!;
   expect(Math.abs(puzzle.y-m.y)).toBeLessThan(2);expect(Math.abs(recent.y-m.y)).toBeLessThan(2);expect(recent.x).toBeGreaterThan(m.x+m.width);
   await expect(page.locator('.daily-meme')).toHaveCSS('border-width','0px');expect(Math.abs(m.height-puzzle.height)).toBeLessThan(1);expect(Math.abs(recent.height-puzzle.height)).toBeLessThan(1);expect(await page.locator('.home-recent-list').evaluate(e=>e.scrollHeight-e.clientHeight)).toBeLessThanOrEqual(1);
   expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight), `Home fits at ${width}x${height}`).toBeLessThanOrEqual(1);
  }
  await page.unroute('**/memes/candidates.json');
 }
});

test('Home completion uses a yellow outline and recent games show stacked players and individual scores',async({page})=>{
 await page.addInitScript(()=>{const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem('novachess-library-v2',JSON.stringify({profile:{name:'My name'},progress:{daily:{[date]:{id:'test',completed:true,correct:true}}},games:['1-0','0-1','1/2-1/2'].map((result,i)=>({id:String(i),title:'Standard',initial,positions:[initial],moves:['e2e4','e7e5'],notation:['e4','e5'],result,human:'b',variant:'chess',folder:'Games',kind:'game',created:Date.UTC(2026,10,18,18,25),opponent:'Opponent name',humanRating:1234,opponentRating:1567}))}));});
 await page.goto('/');await expect(page.locator('.completion-label')).toHaveCount(0);await expect(page.locator('.home-puzzle')).toHaveCSS('outline-color','rgb(255, 223, 0)');
 const entries=page.locator('.recent-game-entry');await expect(entries).toHaveCount(3);await expect(entries.locator('.recent-variant-picture')).toHaveCount(3);expect((await entries.locator('.recent-variant-picture').first().boundingBox())!.width).toBeCloseTo(73.8, 1);
 for(const entry of await entries.all()){const players=entry.locator('.recent-player');await expect(players.first()).toContainText('Opponent name (1567)');await expect(players.last()).toContainText('My name (1234)');expect((await players.first().boundingBox())!.y).toBeLessThan((await players.last().boundingBox())!.y);const date=entry.locator('time span').first(),time=entry.locator('time span').last();await expect(date).toContainText('2026');await expect(time).toHaveText(/\d.*:\d\d/);expect((await time.boundingBox())!.y).toBeGreaterThan((await date.boundingBox())!.y);await expect(entry.locator('.game-result-label')).toHaveCount(0);}
 const player = entries.first().locator('.recent-player').first();
 const nameSize = await player.locator('.recent-player-name').evaluate(el => getComputedStyle(el).fontSize);
 const scoreSize = await player.locator('.recent-player-score').evaluate(el => getComputedStyle(el).fontSize);
 expect(parseFloat(scoreSize)).toBeCloseTo(parseFloat(nameSize) * .85, 1);
 await expect(entries.first().locator('.recent-player-score').first()).toHaveText('1');await expect(entries.first().locator('.recent-player-score').first()).toHaveCSS('color','rgb(57, 237, 131)');await expect(entries.first().locator('.recent-player-score').last()).toHaveCSS('color','rgb(255, 83, 100)');await expect(entries.last().locator('.recent-player-score').first()).toHaveText('½');
 await expect(page.locator('.home-recent-list')).toHaveCSS('scrollbar-color','rgb(255, 255, 255) rgba(0, 0, 0, 0)');
 await expect(entries.first()).toHaveCSS('margin-bottom','0px');
 for(const [width,height] of [[1440,1000],[1280,700],[1024,768],[390,844]]){await page.setViewportSize({width,height});await expect.poll(()=>page.locator('.home-recent-list').evaluate(e=>e.scrollHeight-e.clientHeight),{message:`Recent games fit at ${width}x${height}`}).toBeLessThanOrEqual(1);}

 await entries.first().getByRole('slider').focus();const preview=page.locator('.recent-game-preview');await expect(preview).toBeVisible();
 expect(await preview.evaluate(el=>!!el.closest('.home-recent-list,.home-recent'))).toBe(false);
 const popup=(await preview.boundingBox())!;expect(popup.x).toBeGreaterThanOrEqual(0);expect(popup.y).toBeGreaterThanOrEqual(0);expect(popup.x+popup.width).toBeLessThanOrEqual(page.viewportSize()!.width);expect(popup.y+popup.height).toBeLessThanOrEqual(page.viewportSize()!.height);
 const faint=await entries.first().evaluate(e=>{const s=getComputedStyle(e);return s.backgroundColor!==s.borderTopColor});expect(faint).toBe(true);
});

test('Home shows the app announcement and opens Vote Chess from the entire tile',async({page,isMobile})=>{
 await page.goto('/');
 const launch=(await page.getByRole('button',{name:'New game',exact:true}).boundingBox())!;
 const recent=(await page.getByRole('region',{name:'Recent games'}).boundingBox())!;
 expect(launch.x+launch.width).toBeCloseTo(recent.x+recent.width,0);
 const app=page.getByRole('region',{name:'Try the app'});
 await expect(app.getByText('Coming soon to the App Store')).toBeVisible();
 const free=page.getByRole('region',{name:'Free chess tools'});
 await expect(free.locator('strong, p')).toHaveText(['1000% Free','No Ads','All the best chess tools in one place']);
 await expect(free.locator('img')).toBeVisible();
 await expect.poll(() => free.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 const appBounds=(await app.boundingBox())!, freeBounds=(await free.boundingBox())!;
 expect(freeBounds.x).toBeGreaterThan(appBounds.x+appBounds.width);
 if(!isMobile){
  const columns = await Promise.all(['.home-puzzle', '.daily-meme', '.home-recent'].map(selector =>
    page.locator(selector).boundingBox()));
  const featured = (await page.locator('.home-featured-group').boundingBox())!;
  for (const [index, lower] of [appBounds, freeBounds, featured].entries()) {
   expect(lower.x).toBeCloseTo(columns[index]!.x, 0);
   expect(lower.x + lower.width).toBeCloseTo(columns[index]!.x + columns[index]!.width, 0);
  }
 }
 await expect(page.getByRole('region',{name:'Next up'})).toHaveCount(0);
 await expect(page.getByText('Featured variant',{exact:true})).toHaveCount(0);
 await expect(page.locator('.home-featured-group > button:nth-child(2)')).toHaveCount(0);
 const vote=page.getByRole('button',{name:/^Vote Chess/});
 await expect.poll(() => vote.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 await vote.click({position:{x:5,y:5}});
 await expect(page.getByRole('group',{name:'Online variants'}).getByRole('button',{name:'Vote Chess',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('Home splits the featured space with the most recently played variant',async({page})=>{
 await page.addInitScript(()=>{
  const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const game={title:'Saved game',positions:[initial],initial,moves:['e2e4'],notation:['e4'],result:'1-0',human:'w',folder:'Games',kind:'game',origin:'novachess'};
  localStorage.setItem('novachess-library-v2',JSON.stringify({
   games:[
    {...game,id:'archive-duck',variant:'duck',created:400,origin:'archive'},
    {...game,id:'standard',variant:'chess',created:300},
    {...game,id:'horde',variant:'horde',created:100},
   ],
   activeGame:{...game,id:'atomic',variant:'atomic',created:200,result:'*'},
  }));
 });
 await page.goto('/');
 const vote=page.getByRole('button',{name:/^Vote Chess/});
 const recent=page.getByRole('button',{name:/^Atomic/});
 await expect(vote).toBeVisible();
 await expect(recent).toContainText("Captures explode nearby non-pawns.");
 await expect(page.getByText('Last played variant',{exact:true})).toHaveCount(0);
 for(const tile of [vote,recent]){
  const art=(await tile.locator(':scope > [aria-hidden=true], :scope > img').first().boundingBox())!;
  const title=(await tile.locator('strong').boundingBox())!;
  expect(title.x).toBeGreaterThan(art.x+art.width);
 }
 expect((await vote.boundingBox())!.height).toBeCloseTo((await recent.boundingBox())!.height,0);
 await recent.focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('group',{name:'Choose variant'}).getByRole('button',{name:'Atomic',exact:true})).toHaveAttribute('aria-pressed','true');
});
