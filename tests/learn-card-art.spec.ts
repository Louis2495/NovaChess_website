import {test,expect} from '@playwright/test';
test('all Learn cards share dimensions and keep Train an opening unchanged',async({page})=>{
 await page.goto('/#learn');const cards=page.locator('.learn-tile');await expect(cards).toHaveCount(8);await page.evaluate(()=>document.fonts.ready);const sizes=await cards.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height};}));expect(Math.max(...sizes.map(s=>s.w))-Math.min(...sizes.map(s=>s.w))).toBeLessThan(1);expect(Math.max(...sizes.map(s=>s.h))-Math.min(...sizes.map(s=>s.h))).toBeLessThan(1);
 for(const title of ['Train an opening']){const picture=cards.filter({has:page.getByRole('heading',{name:title,exact:true})}).locator('.learn-picture');await expect(picture).toHaveCSS('background-image',/\/learn\/illustrations.webp/);}
 await expect(page.locator('.learn-picture[style*="subjects.webp"]')).toHaveCount(7);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
