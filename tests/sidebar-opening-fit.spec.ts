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
test('desktop variants form three rows and their launch action precedes the gallery',async({page,isMobile})=>{
 await page.goto('/#variants');const gallery=page.getByRole('group',{name:'Online variants',exact:true});await expect(gallery.getByRole('button')).toHaveCount(21);
 const action=(await page.getByRole('button',{name:'Join queue',exact:true}).boundingBox())!,box=(await gallery.boundingBox())!;expect(action.y+action.height).toBeLessThan(box.y);
 const rows=await gallery.getByRole('button').evaluateAll(es=>es.map(e=>Math.round(e.getBoundingClientRect().y)));
 if(!isMobile){expect(new Set(rows).size).toBe(3);for(const y of new Set(rows))expect(rows.filter(r=>r===y)).toHaveLength(7);}
 else expect(new Set(rows).size).toBeGreaterThan(3);
});
test('research fields keep a common baseline even with an injected autofill badge',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#research');await page.getByLabel('Public username').waitFor();
 await page.locator('.research-username').evaluate(e=>{const badge=document.createElement('div');badge.textContent='Autofill';badge.style.height='14px';e.append(badge);});
 const fields=await page.locator('.research-fields > .field').evaluateAll(es=>es.map(e=>e.querySelector('input,.segmented-control')!.getBoundingClientRect().y));
 expect(Math.max(...fields)-Math.min(...fields)).toBeLessThan(1);
});
