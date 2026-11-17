import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const memes=JSON.parse(readFileSync('public/memes/candidates.json','utf8'));
test('meme frames have no side gutters and puzzle hover highlights the whole card',async({page})=>{
 for(const meme of [memes.reduce((a:any,b:any)=>a.width/a.height<b.width/b.height?a:b),memes.reduce((a:any,b:any)=>a.width/a.height>b.width/b.height?a:b)]){
  await page.route('**/memes/candidates.json',r=>r.fulfill({json:[meme]}));await page.goto('/');const image=page.locator('.daily-meme-image');await image.evaluate((e:HTMLImageElement)=>e.decode());const gutters=await image.evaluate((e:HTMLImageElement)=>{const r=e.getBoundingClientRect();return r.width-Math.min(r.width,r.height*e.naturalWidth/e.naturalHeight);});expect(gutters).toBeLessThan(3);await page.unroute('**/memes/candidates.json');
 }
 const card=page.locator('.home-puzzle'),content=page.locator('.home-puzzle-content');const before=await card.evaluate(e=>getComputedStyle(e).backgroundColor);await card.hover();await expect.poll(()=>card.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(before);await expect(content).toHaveCSS('background-color','rgba(0, 0, 0, 0)');const c=(await card.boundingBox())!,b=(await card.locator('.board').boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(c.y+c.height);await card.click();await expect(page).toHaveURL(/puzzles/);
});
