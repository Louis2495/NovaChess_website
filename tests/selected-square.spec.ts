import {test,expect} from '@playwright/test';
test('selected squares have a subtle yellow overlay without hiding pieces',async({page})=>{
 await page.goto('/#analysis');const square=page.getByRole('button',{name:'e2, white pawn',exact:true});await square.click();await expect(square).toHaveAttribute('aria-pressed','true');const style=await square.evaluate(el=>({display:getComputedStyle(el,'::after').display,background:getComputedStyle(el,'::after').backgroundColor}));expect(style.display).toBe('block');expect(style.background).toBe('rgba(255, 226, 138, 0.19)');await expect(square.locator('.piece')).toBeVisible();
});
