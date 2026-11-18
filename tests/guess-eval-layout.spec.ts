import {test,expect} from '@playwright/test';
test('Guess the eval aligns the board and panel with a wider gap and equal outer margins',async({page})=>{
 for(const width of [1440,1024]){
  await page.setViewportSize({width,height:1000});await page.goto('/#puzzles/eval');
  const board=page.locator('.guess-eval-layout .board');await expect(board).toBeVisible();
  const check=async()=>{
   const b=(await board.boundingBox())!,panel=(await page.locator('.eval-game-panel').boundingBox())!,sidebar=(await page.locator('.sidebar').boundingBox())!,right=await page.evaluate(()=>document.body.getBoundingClientRect().right);
   return {top:Math.abs(b.y-panel.y),gap:panel.x-b.x-b.width,margins:Math.abs((b.x-sidebar.x-sidebar.width)-(right-panel.x-panel.width))};
  };
  await expect.poll(async()=>(await check()).top).toBeLessThan(2);
  expect((await check()).gap).toBeGreaterThanOrEqual(39);await expect.poll(async()=>(await check()).margins).toBeLessThan(2);
  const resize=page.getByRole('slider',{name:'Resize board',exact:true});await resize.focus();await resize.press('ArrowLeft');await resize.press('ArrowLeft');
  await expect.poll(async()=>(await check()).margins).toBeLessThan(2);
 }
});
