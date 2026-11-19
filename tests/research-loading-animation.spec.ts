import {test,expect} from '@playwright/test';
for(const reduce of [false,true])test(`Research shows its reading king only while loading${reduce?' with reduced motion':''}`,async({page})=>{
 await page.emulateMedia({reducedMotion:reduce?'reduce':'no-preference'});
 let finish!:()=>void;const pending=new Promise<void>(r=>finish=r);
 await page.route('https://api.chess.com/pub/player/vet/games/archives',r=>r.fulfill({json:{archives:['https://api.chess.com/pub/player/vet/games/2026/01']}}));
 await page.route('https://api.chess.com/pub/player/vet/games/2026/01',async r=>{await pending;await r.fulfill({json:{games:[{rules:'chess',pgn:'[White "vet"]\n[Black "Other"]\n[Result "1-0"]\n\n1. e4 e5 1-0'}]}});});
 await page.goto('/#research');const animation=page.getByRole('img',{name:'A king wearing glasses flips through a book',exact:true});await expect(animation).toHaveCount(0);await page.getByLabel('Public username').fill('vet');const load=page.getByRole('button',{name:'Load games',exact:true});await load.click();
 await expect(animation).toBeVisible();if(reduce){await expect(animation.locator('video')).toHaveCount(0);await expect.poll(()=>animation.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);}else{const video=animation.locator('video');await expect(video).toBeVisible();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);expect(await video.evaluate((v:HTMLVideoElement)=>v.muted&&v.loop&&v.autoplay)).toBe(true);await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);}
 const a=(await animation.boundingBox())!,b=(await load.boundingBox())!;expect(a.y).toBeGreaterThan(b.y+b.height);
 finish();await expect(page.getByRole('status')).toContainText('1 games loaded');await expect(animation).toHaveCount(0);await expect(page.locator('.research-branches')).toContainText('e4');
});
test('Cancel removes the reading animation',async({page})=>{
 let finish!:()=>void;const pending=new Promise<void>(r=>finish=r);
 await page.route('https://api.chess.com/pub/player/vet/games/archives',async r=>{await pending;await r.fulfill({json:{archives:[]}}).catch(()=>{});});
 await page.goto('/#research');await page.getByLabel('Public username').fill('vet');await page.getByRole('button',{name:'Load games',exact:true}).click();await expect(page.locator('.research-reading-animation')).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('.research-reading-animation')).toHaveCount(0);await expect(page.getByRole('alert')).toContainText('Loading canceled');finish();
});
