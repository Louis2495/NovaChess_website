import {test,expect} from '@playwright/test';
for(const route of ['puzzles','puzzles/daily']){
 test(`${route} board stays centered in the page after resizing and reloading`,async({page})=>{
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:width === 390 ? 664 : 800});await page.goto('/#'+route);
   const board=page.locator('.puzzle-layout .board');await expect(board).toBeVisible();
   const offset=()=>board.evaluate(el=>{const r=el.getBoundingClientRect();const body=document.body.getBoundingClientRect(),center=innerWidth<=1000?body.x+body.width/2:document.documentElement.clientWidth/2;return Math.abs(r.x+r.width/2-center);});
   await expect.poll(offset).toBeLessThan(2);
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight-window.innerHeight)).toBeLessThanOrEqual(1);
   const resize=page.getByRole('slider',{name:'Resize board',exact:true});await resize.focus();await resize.press('ArrowLeft');await resize.press('ArrowLeft');
   await expect.poll(offset).toBeLessThan(2);await page.reload();await expect.poll(offset).toBeLessThan(2);
  }
 });
}
