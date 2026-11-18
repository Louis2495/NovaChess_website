import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const memes=JSON.parse(readFileSync('public/memes/candidates.json','utf8'));
test('meme frames have no side gutters and puzzle hover highlights the whole card',async({page})=>{
 for(const meme of [memes.reduce((a:any,b:any)=>a.width/a.height<b.width/b.height?a:b),memes.reduce((a:any,b:any)=>a.width/a.height>b.width/b.height?a:b)]){
  await page.route('**/memes/candidates.json',r=>r.fulfill({json:[meme]}));await page.goto('/');const image=page.locator('.daily-meme-image');await image.evaluate((e:HTMLImageElement)=>e.decode());const gutters=await image.evaluate((e:HTMLImageElement)=>{const r=e.getBoundingClientRect();return r.width-Math.min(r.width,r.height*e.naturalWidth/e.naturalHeight);});expect(gutters).toBeLessThan(3);await page.unroute('**/memes/candidates.json');
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
   await expect(image).toHaveCSS('outline-width','8px');expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height+1);
  }
  await page.unroute('**/memes/candidates.json');
 }
});
