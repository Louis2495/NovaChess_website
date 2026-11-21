import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';
test('Stats uses a quiet overview, outcome splits and a separate competition tab',async({page,isMobile})=>{
 const c=new Chess(),initial=c.fen();c.move('e4');const games=['w','b'].flatMap(human=>['1-0','0-1','1/2-1/2'].map((result,i)=>({id:human+i,title:'Standard',created:Date.now(),initial,positions:[initial,c.fen()],moves:['e2e4'],notation:['e4'],human,result,variant:'chess',folder:'Games',kind:'game',origin:'novachess'})));
 await page.addInitScript(games=>localStorage.setItem('novachess-library-v2',JSON.stringify({games,localRating:1250})),games);await page.goto('/#stats');await expect(page.locator('.stat-metric-label')).toHaveText(['Rating','Games played','Puzzles solved','Puzzle streak']);const colors=await page.locator('.stats-metrics > div').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));expect(new Set(colors).size).toBe(1);await expect(page.locator(".speedrun-stats")).toHaveCount(0);await page.getByText("Training and results by color",{exact:true}).click();
 for(const side of ['White','Black']){const bar=page.getByRole('img',{name:`${side}: 1 wins, 1 losses, 1 draws`,exact:true});await expect(bar).toBeVisible();const widths=await bar.locator('span').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(1);}
 await expect(page.locator('.outcome-win').first()).toHaveCSS('background-color','rgb(89, 195, 151)');await expect(page.locator('.outcome-loss').first()).toHaveCSS('background-color','rgb(219, 119, 135)');await expect(page.locator('.outcome-draw').first()).toHaveCSS('background-color','rgb(181, 191, 204)');
 if(!isMobile){const results=(await page.locator('.results-card').boundingBox())!,activity=(await page.locator('.activity-card').boundingBox())!;expect(activity.width).toBeGreaterThan(results.width);}
 const overviewWidth = (await page.locator('.stats-metrics').boundingBox())!.width;
 await page.getByRole('button',{name:'Competition',exact:true}).click();
 await expect(page.locator('.variant-breakdown .stat-bar')).toBeVisible();await expect(page.locator('.variant-breakdown summary')).toHaveCount(0);
 const throne=page.getByRole('group',{name:'Throne metric',exact:true});await throne.getByRole('button',{name:'Games',exact:true}).click();await expect(page.locator('.competition-total')).toHaveText('0');await throne.getByRole('button',{name:'Time',exact:true}).click();await expect(page.locator('.competition-total')).toHaveText('0:00:00');await expect(page.locator('.speedrun-rating')).toHaveCount(59);await expect(page.locator('.speedrun-rating').first()).toContainText('100');await expect(page.locator('.speedrun-rating').last()).toContainText('3000');const s=(await page.locator('.speedrun-stats').boundingBox())!;expect(Math.abs(s.width-overviewWidth)).toBeLessThan(2);await expect(page.locator('.speedrun-stats h2')).toHaveCSS('font-weight','650');
});

test('Speedrun rating squares start a local game at the selected Elo',async({page})=>{
 await page.goto('/#stats');await page.getByRole('button',{name:'Competition',exact:true}).click();await page.getByRole('button',{name:'Play Speedrun at 1500 Elo',exact:true}).click();
 await expect(page.locator('.play-match')).toBeVisible();
 const game=await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame);expect(game.botRating).toBe(1500);expect(game.title).toBe('Speedrun');expect(game.speedrun.invalid).not.toBe(true);
});
test('variant breakdown uses display names',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('novachess-library-v2',JSON.stringify({games:[{id:'fog-game',title:'Fog',variant:'cvfog',folder:'Games',moves:['e2e4'],result:'1-0',human:'w',created:Date.now()}]})));
 await page.goto('/#stats');await page.getByRole('button',{name:'Competition',exact:true}).click();await expect(page.locator('.variant-breakdown')).toContainText('Fog of War');await expect(page.locator('.variant-breakdown')).not.toContainText('cvfog');
});

test('Achievements can be filtered and the World map remains interactive', async ({page}) => {
  await page.goto('/#stats');
  await page.getByRole('button',{name:'Achievements',exact:true}).click();
  await expect(page.getByRole('progressbar')).toHaveCount(18);
  await page.getByRole('button',{name:'Unlocked only',exact:true}).click();
  await expect(page.getByText('No achievements unlocked yet.')).toBeVisible();
  await page.getByRole('button',{name:'World map',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Opponent countries'})).toBeVisible();
  await expect(page.locator('.world-map path').first()).toBeVisible();
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(page.locator('.map-controls')).toContainText('1.5×');
});
