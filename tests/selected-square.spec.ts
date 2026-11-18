import {test,expect} from '@playwright/test';
test('selected squares have visible yellow overlays with extra contrast on light squares',async({page})=>{
 await page.goto('/#analysis');const dark=page.getByRole('button',{name:'d2, white pawn',exact:true});await dark.click();await expect(dark).toHaveAttribute('aria-pressed','true');
 const darkColor=await dark.evaluate(el=>{const s=getComputedStyle(el,'::after');return {display:s.display,values:s.backgroundColor.match(/[\d.]+/g)!.map(Number)};});expect(darkColor.display).toBe('block');expect(darkColor.values.slice(0,3)).toEqual([244,200,66]);expect(darkColor.values[3]).toBeGreaterThan(.3);
 const light=page.getByRole('button',{name:'e2, white pawn',exact:true});await light.click();const color=await light.evaluate(el=>getComputedStyle(el,'::after').backgroundColor.match(/[\d.]+/g)!.map(Number));expect(color.slice(0,3)).toEqual([229,182,47]);expect(color[3]).toBeGreaterThan(darkColor.values[3]);await expect(light.locator('.piece')).toBeVisible();
});
