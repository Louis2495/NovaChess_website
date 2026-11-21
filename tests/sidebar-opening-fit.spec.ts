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
test('opening request combines filtering, selection, keyboard access and clearing in one field',async({page})=>{
 await page.goto('/#play');await page.getByRole('button',{name:'Computer',exact:true}).click();await page.getByRole('button',{name:'Game options',exact:true}).click();
 await expect(page.getByLabel('Search openings',{exact:true})).toHaveCount(0);
 const picker=page.getByRole('combobox',{name:'Request an opening',exact:true});
 await picker.fill('Sicilian Najdorf');await expect(page.getByRole('option').first()).toContainText('Najdorf');
 await picker.press('ArrowDown');await picker.press('Enter');await expect(picker).toHaveValue(/Najdorf/);await expect(picker).toHaveAttribute('aria-expanded','false');
 const chosen=await picker.inputValue();await picker.click();await picker.fill('nothing-matches-this');await expect(page.getByText('No matching openings.',{exact:true})).toBeVisible();await picker.press('Escape');await expect(picker).toHaveValue(chosen);
 await picker.click();await page.getByRole('option',{name:'Any opening',exact:true}).click();await expect(picker).toHaveValue('Any opening');
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
  if(isMobile) expect(cards.y+cards.height).toBeLessThan((await page.locator('.mobile-tabs').boundingBox())!.y);
 }
 await expect(page.getByRole('group',{name:'Online variants',exact:true}).getByRole('button')).toHaveCount(21);
 await check('Online variants','Join queue');
 await toggle.getByRole('button',{name:'Computer',exact:true}).click();
 await check('Choose variant','Start game');
 await page.getByRole('button',{name:'Speedrun',exact:true}).click();
 await expect(page.getByRole('spinbutton',{name:'Computer Elo'})).toBeInViewport({ratio:1});
 await check('Choose variant','Start game');
 await page.getByRole('button',{name:'Game options',exact:true}).click();
 await check('Choose variant','Start game');
 if(!isMobile){
  await page.setViewportSize({width:900,height:620});
  await check('Choose variant','Start game');
 }
});
test('research fields stay aligned in their column even with an injected autofill badge',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#research');await page.getByLabel('Public username').waitFor();
 await page.locator('.research-username').evaluate(e=>{const badge=document.createElement('div');badge.textContent='Autofill';badge.style.height='14px';e.append(badge);});
 const fields=await page.locator('.research-fields > .field').evaluateAll(es=>es.map(e=>e.querySelector('input,.segmented-control')!.getBoundingClientRect().x));
 expect(Math.max(...fields)-Math.min(...fields)).toBeLessThan(1);
});
