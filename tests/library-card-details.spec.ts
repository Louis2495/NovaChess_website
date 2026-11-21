import {test,expect} from '@playwright/test';
test('Library cards show concise actions, own-side previews, full start dates and tinted result outlines',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('novachess-library-v2',JSON.stringify({games:['*','1-0','0-1','1/2-1/2'].map((result,i)=>({id:'card-'+i,title:result==='*'?'Random · unfinished':'Game '+i,kind:'game',variant:'chess',initial:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',positions:['rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'],moves:['e2e4','e7e5'],notation:['e4','e5'],result,human:i===0?'b':'w',folder:'Games',created:Date.UTC(2026,10,18,18,25)}))})));
 await page.goto('/#library');const cards=page.locator('.saved-game-card');await expect(cards).toHaveCount(4);
 const unfinished=cards.filter({has:page.getByRole('heading',{name:'Random',exact:true})});await expect(unfinished).toContainText('Unfinished');expect((await unfinished.innerText()).match(/unfinished/gi)).toHaveLength(1);
 for(const card of await cards.all()){
  const review=card.getByRole('button',{name:'Review',exact:true});await expect(review).toBeVisible();await expect(review.locator('svg')).toHaveCount(0);await expect(card.locator('.caption').first()).toContainText('1 move');await expect(card.locator('.caption').first()).not.toContainText('1 moves');await expect(card.locator('time')).toContainText('2026');await expect(card.locator('time')).toContainText(/· .*\d.*:\d\d/);
  const details=(await card.locator('.caption').first().boundingBox())!,date=(await card.locator('.library-game-date').boundingBox())!;expect(date.y).toBeGreaterThan(details.y);
 }
 await expect(unfinished).toHaveCSS('border-color','rgb(255, 255, 255)');await expect(cards.filter({hasText:'Game 1'})).toHaveCSS('border-color','rgb(50, 237, 117)');await expect(cards.filter({hasText:'Game 2'})).toHaveCSS('border-color','rgb(255, 56, 75)');await expect(cards.filter({hasText:'Game 3'})).toHaveCSS('border-color','rgb(201, 206, 214)');
 const fills = await cards.evaluateAll(elements => elements.map(card => getComputedStyle(card).backgroundColor));
 expect(new Set(fills).size).toBe(4);
 for(const [card,first] of [[unfinished,'h1'],[cards.filter({hasText:'Game 1'}),'a8']] as const){await expect(card.locator('.board-square').first()).toHaveAttribute('aria-label',new RegExp('^'+first+','));}
 await unfinished.getByRole('button',{name:'Review',exact:true}).click();await expect(page.locator('.game-review-layout')).toBeVisible();
});
