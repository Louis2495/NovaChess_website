import {test,expect} from '@playwright/test';
for(const route of ['puzzles','puzzles/daily']){
 test(`${route} board stays centered in the page after resizing and reloading`,async({page})=>{
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:1000});await page.goto('/#'+route);
   const board=page.locator('.puzzle-layout .board');await expect(board).toBeVisible();
   const offset=()=>board.evaluate(el=>{const r=el.getBoundingClientRect();const body=document.body.getBoundingClientRect(),center=innerWidth<=1000?body.x+body.width/2:document.documentElement.clientWidth/2;return Math.abs(r.x+r.width/2-center);});
   await expect.poll(offset).toBeLessThan(2);
   const resize=page.getByRole('slider',{name:'Resize board',exact:true});await resize.focus();await resize.press('ArrowLeft');await resize.press('ArrowLeft');
   await expect.poll(offset).toBeLessThan(2);await page.reload();await expect.poll(offset).toBeLessThan(2);
  }
 });
}
