import {test,expect} from '@playwright/test';
for(const variant of ['chess','atomic','cvfog','speedrun'])test(`${variant} keeps notation right of the board`,async({page,isMobile})=>{
 test.skip(isMobile,'Small screens stack the game controls');
 await page.addInitScript(variant=>{const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';localStorage.setItem('novachess-library-v2',JSON.stringify({activeGame:{id:'layout',title:variant,kind:'game',variant:variant==='speedrun'?'chess':variant,initial,positions:[initial],moves:[],notation:[],result:'*',human:'w',folder:'Games',created:Date.now(),...(variant==='speedrun'?{speedrun:{elapsedMs:0,turnStartedAt:Date.now()}}:{})}}));},variant);
 await page.goto('/#play/resume');const board=page.locator('.play-match .board'),notation=page.locator(variant==='cvfog'?'.match-sidebar':'.match-notation');await expect(board).toBeVisible();await expect(notation).toBeVisible();
 const b=(await board.boundingBox())!,n=(await notation.boundingBox())!;expect(n.x).toBeGreaterThanOrEqual(b.x+b.width);
 if(variant==='speedrun'){
  await expect.poll(async()=>{const b=(await board.boundingBox())!;return Math.abs(b.x+b.width/2-720);}).toBeLessThan(1);
  const timer=(await page.getByRole('timer',{name:'Your move time'}).boundingBox())!,b=(await board.boundingBox())!;expect(timer.x+timer.width).toBeLessThan(b.x);expect(Math.abs(timer.y+timer.height/2-b.y-b.height/2)).toBeLessThan(1);
 }
});
