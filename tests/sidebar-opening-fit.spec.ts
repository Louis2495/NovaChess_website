import {test,expect} from '@playwright/test';
test('sidebar fits short and tall screens without scrolling or hiding links',async({page})=>{
 for(const [width,height] of [[1440,1000],[1280,600],[1000,500],[844,390],[390,700]]){
  await page.setViewportSize({width,height});await page.goto('/#puzzles');
  if(width<=760)await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  const sidebar=page.locator('.sidebar');await expect(sidebar).toBeVisible();
  const bounds=await sidebar.evaluate(e=>({client:e.clientHeight,scroll:e.scrollHeight,overflow:getComputedStyle(e).overflowY,items:[...e.querySelectorAll('button')].map(b=>({name:b.textContent,top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom}))}));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client+1);expect(bounds.overflow).toBe('hidden');
  for(const item of bounds.items){expect(item.top,item.name||'button').toBeGreaterThanOrEqual(0);expect(item.bottom,item.name||'button').toBeLessThanOrEqual(height);}
 }
});
test('computer Play keeps the settings compact and Start game lower on the page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('novachess-appearance-v2',
    JSON.stringify({ theme: 'Amber', accent: '#e8b953', buttonColor: '#e8b953' })));
  await page.goto('/#play');
  await page.getByRole('button', { name: 'Computer', exact: true }).click();
  const settings = page.getByRole('group', { name: 'Game setup' });
  await expect(settings.getByRole('group', { name: 'Your color' })).toBeVisible();
  await expect(settings.getByText('Your color', { exact: true })).toHaveCount(0);
  const rated = settings.getByRole('group', { name: 'Rating mode' }).getByRole('button', { name: 'Rated', exact: true });
  await expect(rated).toHaveCSS('background-color', 'rgb(232, 185, 83)');
  await expect(rated).toHaveCSS('color', 'rgb(16, 22, 16)');
  await expect(settings.locator('.opponent-choices label:has(input:checked) small')).toHaveCSS('color', 'rgb(16, 22, 16)');
  await expect(settings.getByRole('button', { name: 'White', exact: true })).toHaveCSS('color', 'rgb(16, 22, 16)');
  await expect(settings.getByRole('button', { name: 'White', exact: true }).locator('img')).toBeVisible();
  await expect(settings.getByRole('button', { name: 'Black', exact: true }).locator('img')).toBeVisible();
  await expect(settings.getByRole('button', { name: 'Random', exact: true }).locator('.split-color-pawn img')).toHaveCount(2);
  await expect(settings.locator('.opponent-choices label > span').first()).toHaveCSS('justify-content', 'center');
  const start = await page.getByRole('button', { name: 'Start game', exact: true }).boundingBox();
  const controls = await settings.boundingBox();
  expect(controls!.width).toBeLessThanOrEqual(340);
  expect(start!.y - controls!.y - controls!.height).toBeGreaterThan(60);
  const startCenter = (start!.y + start!.height / 2) / page.viewportSize()!.height;
  expect(startCenter).toBeGreaterThan(0.65);
  expect(startCenter).toBeLessThan(0.85);
});
test('time control labels use compact chess notation and main boards stay inside the viewport',async({page})=>{
 await page.goto('/#play');await expect(page.getByRole('group',{name:'Time control'}).getByRole('button')).toHaveText(['3','3|2','5','10']);
 for(const route of ['analysis','puzzles','research']){
  await page.goto('/#'+route);const board=page.locator('.board').first();await expect(board).toBeVisible();
  const rect=(await board.boundingBox())!,viewport=page.viewportSize()!;
  expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(viewport.width);expect(rect.y+rect.height).toBeLessThanOrEqual(viewport.height);
 }
});
test('Variants centers its setup and fits all cards without page scrolling',async({page,isMobile})=>{
 await page.setViewportSize(isMobile ? {width:390,height:664} : {width:1280,height:720});
 await page.goto('/#variants');
 const workspace=page.locator('#workspace');
 const toggle=page.getByRole('group',{name:'Opponent',exact:true});
 async function check(galleryName:string,launchName:string){
  const gallery=page.getByRole('group',{name:galleryName,exact:true});
  const launch=page.getByRole('button',{name:launchName,exact:true});
  await expect(gallery.getByRole('button').last()).toBeInViewport({ratio:1});
  await expect(launch).toBeVisible();
  const [frame,cards,action,toggleBox]=(await Promise.all([workspace.boundingBox(),gallery.boundingBox(),launch.boundingBox(),toggle.boundingBox()])).map(box=>box!);
  const center=frame.x+frame.width/2;
  expect(Math.abs(cards.x+cards.width/2-center)).toBeLessThan(1);
  expect(Math.abs(action.x+action.width/2-center)).toBeLessThan(1);
  expect(cards.x-frame.x).toBeGreaterThan(10);
  expect(toggleBox.x).toBeGreaterThan(center);
  expect(action.y+action.height).toBeLessThan(cards.y);
  if(page.viewportSize()!.width>1000)expect(Math.abs(action.y-toggleBox.y)).toBeLessThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight-window.innerHeight)).toBeLessThanOrEqual(1);
  if(isMobile) expect(cards.y+cards.height).toBeLessThan(page.viewportSize()!.height);
 }
 await expect(page.getByRole('group',{name:'Online variants',exact:true}).getByRole('button')).toHaveCount(21);
 await check('Online variants','Join queue');
 const onlineCard=(await page.locator('.online-variant-gallery > button').first().boundingBox())!;
 await toggle.getByRole('button',{name:'Computer',exact:true}).click();
 await check('Choose variant','Start game');
 const computerCard=(await page.locator('.computer-variant-gallery > button').first().boundingBox())!;
 expect(Math.abs(onlineCard.width-computerCard.width)).toBeLessThan(1);
 expect(Math.abs(onlineCard.height-computerCard.height)).toBeLessThan(1);
 const gallery = page.locator('.computer-variant-gallery');
 const initialPosition = await gallery.boundingBox();
 const otherVariant = gallery.getByRole('button').nth(1);
 await otherVariant.click();
 expect(await gallery.boundingBox()).toEqual(initialPosition);
 await gallery.getByRole('button',{name:'Speedrun',exact:true}).click();
 expect(await gallery.boundingBox()).toEqual(initialPosition);
 await expect(page.getByRole('spinbutton',{name:'Computer Rating'})).toBeInViewport({ratio:1});
 await check('Choose variant','Start game');
 const options = page.getByRole('button',{name:'Game options',exact:true});
 async function checkOptions(){
  const cardsBefore = await gallery.boundingBox();
  await expect(options).toBeInViewport({ratio:1});
  await options.click();
  const dialog = page.getByRole('dialog',{name:'Game options',exact:true});
  await expect(dialog.locator('.variant-summary')).toHaveCount(0);
  await expect(dialog.getByRole('spinbutton',{name:'Computer Rating'})).toBeInViewport({ratio:1});
  await expect(dialog.getByRole('button',{name:'Start game',exact:true})).toBeInViewport({ratio:1});
  expect(await gallery.boundingBox()).toEqual(cardsBefore);
  expect(await page.evaluate(()=>window.scrollY)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(options).toBeFocused();
 }
 await checkOptions();
 if(!isMobile){
  await page.setViewportSize({width:900,height:620});
  await check('Choose variant','Start game');
  await checkOptions();
 }
});
test('research fields stay aligned in their column even with an injected autofill badge',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#research');await page.getByLabel('Public username').waitFor();
 await page.locator('.research-username').evaluate(e=>{const badge=document.createElement('div');badge.textContent='Autofill';badge.style.height='14px';e.append(badge);});
 const fields=await page.locator('.research-fields > .field').evaluateAll(es=>es.map(e=>e.querySelector('input,.segmented-control')!.getBoundingClientRect().x));
 expect(Math.max(...fields)-Math.min(...fields)).toBeLessThan(1);
});
