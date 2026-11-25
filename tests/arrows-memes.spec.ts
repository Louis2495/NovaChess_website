import {test,expect} from '@playwright/test';
test('c clears drawn arrows and square highlights and can be remapped',async({page})=>{
 await page.goto('/#analysis');const board=page.locator('.analysis-layout .board'),from=(await board.getByRole('button',{name:'e2, white pawn',exact:true}).boundingBox())!,to=(await board.getByRole('button',{name:'e4, empty',exact:true}).boundingBox())!;await board.getByRole('button',{name:'d4, empty',exact:true}).click({button:'right'});await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down({button:'right'});await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:5});await page.mouse.up({button:'right'});await expect(board.locator('.board-marks line')).toHaveCount(1);await page.keyboard.press('c');await expect(board.locator('.board-marks line')).toHaveCount(0);await expect(board.locator('[data-annotation]')).toHaveCount(0);await page.goto('/#profile');await page.getByRole('button',{name:'Controls',exact:true}).click();const row=page.locator('.control-row').filter({hasText:'Clear arrows'});await expect(row.locator('button')).toHaveText('c');await row.locator('button').click();await page.keyboard.press('x');await expect(row.locator('button')).toHaveText('x');
});
test('Show memes defaults on, persists off and leaves a full dashboard',async({page})=>{
 await page.goto('/#profile');
 const toggle=page.getByRole('checkbox',{name:'Show memes',exact:true});
 await expect(toggle).toBeChecked();
 await toggle.uncheck();
 await page.goto('/');
 await expect(page.locator('.daily-meme')).toHaveCount(0);
 const puzzle=(await page.locator('.home-puzzle').boundingBox())!;
 const recent=(await page.locator('.home-recent').boundingBox())!;
 const launch=(await page.locator('.home-welcome').boundingBox())!;
 expect(launch.y+launch.height).toBeLessThan(puzzle.y);
 if(page.viewportSize()!.width>1000){
  expect(recent.y).toBeCloseTo(puzzle.y,0);
  expect(recent.x).toBeGreaterThan(puzzle.x+puzzle.width);
 }else{
  expect(recent.y).toBeGreaterThan(puzzle.y+puzzle.height);
 }
 await page.reload();
 await expect(page.locator('.daily-meme')).toHaveCount(0);
 await page.goto('/#profile');
 await expect(toggle).not.toBeChecked();
 await toggle.check();
 await page.goto('/');
 await expect(page.locator('.daily-meme')).toBeVisible();
});

test.describe('responsive meme layout', () => {
 test.use({ serviceWorkers: 'block' });
 test('Home fits wide, square and tall memes with an even black frame', async ({ page }) => {
  for (const [width, height] of [[900, 250], [600, 600], [280, 1100]]) {
   await page.route('**/memes/candidates.json', route => route.fulfill({ json: [{
    id: 'test-meme', image: 'test-meme.svg', alt: 'Test chess meme', width, height, status: 'approved',
   }] }));
   await page.route('**/memes/test-meme.svg', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="purple"/></svg>`,
   }));
   await page.goto('/');
   const card = page.getByRole('region', { name: 'Chess meme' });
   const image = card.getByRole('img');
   await image.scrollIntoViewIfNeeded();
   await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(width);
   await expect(card).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
   await expect(image).toHaveCSS('outline-width', '4px');
   await expect(image).toHaveCSS('outline-color', 'rgb(0, 0, 0)');
   const frame = (await card.boundingBox())!;
   const art = (await image.boundingBox())!;
   expect(art.width / art.height).toBeCloseTo(width / height, 2);
   expect(art.width).toBeLessThanOrEqual(frame.width);
   expect(art.height).toBeLessThanOrEqual(frame.height);
   await page.unrouteAll({ behavior: 'wait' });
  }
 });

});
