import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';
test('Stats uses a quiet overview, outcome splits and a separate competition tab',async({page})=>{
 const c=new Chess(),initial=c.fen();c.move('e4');const games=['w','b'].flatMap(human=>['1-0','0-1','1/2-1/2'].map((result,i)=>({id:human+i,title:'Standard',created:Date.now(),initial,positions:[initial,c.fen()],moves:['e2e4'],notation:['e4'],human,result,variant:'chess',folder:'Games',kind:'game',origin:'novachess'})));
 await page.addInitScript(games=>localStorage.setItem('novachess-library-v2',JSON.stringify({games,localRating:1250})),games);await page.goto('/#stats');await expect(page.locator('.stat-metric-label')).toHaveText(['Rating','Games played','Puzzles solved','Puzzle streak']);const colors=await page.locator('.stats-metrics > div').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));expect(new Set(colors).size).toBe(1);await expect(page.locator(".speedrun-stats")).toHaveCount(0);await expect(page.getByRole("heading",{name:"Training",exact:true})).toHaveCount(0);
 for(const side of ['White','Black']){const bar=page.getByRole('img',{name:`${side}: 1 wins, 1 losses, 1 draws`,exact:true});await expect(bar).toBeVisible();const widths=await bar.locator('span').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(1);}
 await expect(page.locator('.outcome-win').first()).toHaveCSS('background-color','rgb(89, 195, 151)');await expect(page.locator('.outcome-loss').first()).toHaveCSS('background-color','rgb(219, 119, 135)');await expect(page.locator('.outcome-draw').first()).toHaveCSS('background-color','rgb(181, 191, 204)');
 const color=(await page.locator('.playing-color-stat').boundingBox())!,activity=(await page.locator('.activity-card').boundingBox())!;expect(activity.y).toBeGreaterThan(color.y);await expect(page.locator('.color-results-key')).toHaveCount(0);
 const overviewWidth = (await page.locator('.stats-metrics').boundingBox())!.width;
 await page.getByRole('group',{name:'Stats sections'}).getByRole('button',{name:'Variants',exact:true}).click();
 await expect(page.locator('.variant-breakdown .stat-bar')).toBeVisible();await expect(page.locator('.variant-breakdown summary')).toHaveCount(0);
 const throne=page.getByRole('group',{name:'Throne metric',exact:true});await throne.getByRole('button',{name:'Games',exact:true}).click();await expect(page.locator('.competition-total')).toHaveText('0');await throne.getByRole('button',{name:'Time',exact:true}).click();await expect(page.locator('.competition-total')).toHaveText('0:00:00');await expect(page.locator('.speedrun-rating')).toHaveCount(60);await expect(page.locator('.speedrun-rating').first()).toContainText('100');await expect(page.locator('.speedrun-rating').last()).toContainText('3050');const s=(await page.locator('.speedrun-stats').boundingBox())!;expect(Math.abs(s.width-overviewWidth)).toBeLessThan(2);await expect(page.locator('.speedrun-stats h2')).toHaveCSS('font-weight','650');
});

test('Speedrun rating squares start a local game at the selected Elo',async({page})=>{
 await page.goto('/#stats');await page.getByRole('group',{name:'Stats sections'}).getByRole('button',{name:'Variants',exact:true}).click();await page.getByRole('button',{name:'Play Speedrun at 3050 Elo',exact:true}).click();
 await expect(page.locator('.play-match')).toBeVisible();
 await expect(page).toHaveURL(/#variants\/speedrun%2F3050$/);
 await expect(page.getByLabel('Black player', {exact:true})).toContainText('(3050)');
 await expect(page.getByRole('timer', {name:'Your move time'})).toBeVisible();
});
test('variant breakdown uses display names',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('novachess-library-v2',JSON.stringify({games:[{id:'fog-game',title:'Fog',variant:'cvfog',folder:'Games',moves:['e2e4'],result:'1-0',human:'w',created:Date.now()}]})));
 await page.goto('/#stats');await page.getByRole('group',{name:'Stats sections'}).getByRole('button',{name:'Variants',exact:true}).click();await expect(page.locator('.variant-breakdown')).toContainText('Fog of War');await expect(page.locator('.variant-breakdown')).not.toContainText('cvfog');
});

test('Achievements can be filtered and the interactive World map fits the viewport', async ({page,isMobile}) => {
  await page.setViewportSize(isMobile ? {width:390,height:580} : {width:1280,height:620});
  await page.goto('/#stats');
  await page.getByRole('button',{name:'Achievements',exact:true}).click();
  await expect(page.getByRole('progressbar')).toHaveCount(18);
  await page.getByRole('button',{name:'Unlocked only',exact:true}).click();
  await expect(page.getByText('No achievements unlocked yet.')).toBeVisible();
  await page.getByRole('button',{name:'World map',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Opponent countries'})).toHaveCount(0);
  await expect(page.locator('.world-map path').first()).toBeVisible();
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(page.locator('.map-controls')).toContainText('1.5×');
  await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeInViewport({ratio:1});
  expect(await page.evaluate(()=>document.documentElement.scrollHeight-window.innerHeight)).toBeLessThanOrEqual(1);
  if(isMobile){
    const map=(await page.locator('.world-map-card').boundingBox())!;
    expect(map.y+map.height).toBeLessThan(page.viewportSize()!.height);
  }
});

test('Stats period follows the user across the overview, competition, achievements and map', async ({page}) => {
  const now = Date.now();
  const base = {initial:new Chess().fen(), positions:[], moves:['e2e4'], human:'w', result:'1-0', variant:'chess', folder:'Games'};
  await page.addInitScript(games => localStorage.setItem('novachess-library-v2', JSON.stringify({games})), [
    {...base, id:'recent', created:now, country:'CA'},
    {...base, id:'older', created:now-30*86400000, country:'US', botRating:850, speedrun:{elapsedMs:9000,turnStartedAt:null}},
  ]);
  await page.goto('/#stats');
  await page.getByRole('combobox',{name:'Stats period'}).selectOption('7');
  await expect(page.getByRole('img',{name:/1 completed game$/})).toBeVisible();
  await expect(page.getByRole('img',{name:'White: 1 wins, 0 losses, 0 draws'})).toBeVisible();
  await page.getByRole('group',{name:'Stats sections'}).getByRole('button',{name:'Variants',exact:true}).click();
  const ratings = page.getByRole('list',{name:'Fastest wins by computer rating'});
  await expect(ratings.getByRole('listitem')).toHaveCount(60);
  const positions = await ratings.getByRole('button').evaluateAll(buttons => {
    const cards = buttons.map(button => button.getBoundingClientRect());
    const firstRow = cards.filter(card => card.top === cards[0].top);
    const lastRow = cards.filter(card => card.top === cards.at(-1)!.top);
    const grid = buttons[0].closest('[role="list"]')!.getBoundingClientRect();
    return {
      gap: firstRow[1].left - firstRow[0].right,
      firstRowOffset: (firstRow[0].left + firstRow.at(-1)!.right - grid.left - grid.right) / 2,
      lastRowOffset: (lastRow[0].left + lastRow.at(-1)!.right - grid.left - grid.right) / 2,
    };
  });
  expect(positions.gap).toBeCloseTo(12, 0);
  expect(Math.abs(positions.firstRowOffset)).toBeLessThan(1);
  expect(Math.abs(positions.lastRowOffset)).toBeLessThan(1);
  expect(await ratings.evaluate(grid => grid.scrollHeight - grid.clientHeight)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button',{name:'Play Speedrun at 850 Elo',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Achievements',exact:true}).click();
  await expect(page.getByRole('progressbar',{name:'Marathon',exact:true})).toHaveAttribute('value','1');
  await page.getByRole('button',{name:'World map',exact:true}).click();
  await expect(page.getByRole('img',{name:'World map, 1 countries played'})).toBeVisible();
  await page.getByRole('combobox',{name:'Stats period'}).selectOption('all');
  await expect(page.getByRole('img',{name:'World map, 2 countries played'})).toBeVisible();
});
