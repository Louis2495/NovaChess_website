import {test,expect} from '@playwright/test';
for(const variant of ['chess','atomic','cvfog','speedrun'])test(`${variant} centers the board and places the game controls`,async({page,isMobile})=>{
 await page.addInitScript(variant=>{const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';localStorage.setItem('novachess-library-v2',JSON.stringify({activeGame:{id:'layout',title:variant,kind:'game',variant:variant==='speedrun'?'chess':variant,initial,positions:[initial],moves:[],notation:[],result:'*',human:'w',folder:'Games',created:Date.now(),...(variant==='speedrun'?{speedrun:{elapsedMs:0,turnStartedAt:Date.now()}}:{})}}));},variant);
 await page.goto('/#play/resume');const board=page.locator('.play-match .board'),notation=page.locator(variant==='cvfog'?'.match-sidebar':'.match-notation');await expect(board).toBeVisible();await expect(notation).toBeVisible();
 const actions=page.locator('.match-sidebar .game-actions');
 if(isMobile){
  const b=(await board.boundingBox())!,a=(await actions.boundingBox())!;
  const center=await page.evaluate(()=>document.documentElement.clientWidth/2);
  expect(Math.abs(b.x+b.width/2-center)).toBeLessThan(1);
  expect(a.y).toBeGreaterThanOrEqual(b.y+b.height);
  return;
 }
 for(const width of [1440,1100]){
  await page.setViewportSize({width,height:1000});
  await expect.poll(async()=>{
   const b=(await board.boundingBox())!,a=(await actions.boundingBox())!;
   const center=await page.evaluate(()=>document.documentElement.clientWidth/2);
   return Math.max(Math.abs(b.x+b.width/2-center),Math.abs(b.y-a.y));
  }).toBeLessThan(1);
  const b=(await board.boundingBox())!,n=(await notation.boundingBox())!;
  expect(n.x).toBeGreaterThanOrEqual(b.x+b.width);
 }
 if(variant==='chess'){
  const handle=page.getByRole('slider',{name:'Resize board'});
  const before=(await board.boundingBox())!.width;
  await expect(handle).toHaveAttribute('aria-valuenow',String(Math.round(before)));
  await handle.press('ArrowLeft');
  await expect.poll(async()=>{
   const b=(await board.boundingBox())!;
   const center=await page.evaluate(()=>document.documentElement.clientWidth/2);
   return b.width<before && Math.abs(b.x+b.width/2-center)<1;
  }).toBe(true);
 }
 if(variant==='speedrun'){
  await page.setViewportSize({width:1440,height:1000});
  await expect.poll(async()=>{const b=(await board.boundingBox())!;return Math.abs(b.x+b.width/2-720);}).toBeLessThan(1);
  const timer=(await page.getByRole('timer',{name:'Your move time'}).boundingBox())!,b=(await board.boundingBox())!;expect(timer.x+timer.width).toBeLessThan(b.x);expect(Math.abs(timer.y+timer.height/2-b.y-b.height/2)).toBeLessThan(1);
 }
});
