import {test,expect} from '@playwright/test';
test('Play offers standard computer or online games and Variants has separate game types without room forms',async({page})=>{
 await page.goto('/#play');
 await expect(page.getByRole('button',{name:'Multiplayer',exact:true})).toHaveCount(0);
 await expect(page.locator('.variant-gallery')).toHaveCount(0);
 await page.getByRole('button',{name:'Game options',exact:true}).click();
 await expect(page.getByLabel('Variant',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Online',exact:true}).click();
 await expect(page.getByRole('button',{name:'Play online',exact:true})).toBeVisible();
 await expect(page.getByLabel('Room name',{exact:true})).toHaveCount(0);
 await page.goto('/#variants');
 await expect(page.locator('.variant-gallery>button')).toHaveCount(18);
 await expect(page.locator('.variant-gallery').getByRole('button',{name:'Standard',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Online',exact:true}).click();
 await page.getByRole('button',{name:'Vote Chess',exact:true}).click();
 await expect(page.getByRole('button',{name:'Join Vote Chess',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Throne',exact:true}).click();
 await expect(page.getByRole('button',{name:'Join queue',exact:true})).toBeVisible();
});
