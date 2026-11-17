import {test,expect} from '@playwright/test';
test('Variants exposes online modes without room creation before sign-in',async({page,isMobile})=>{
 await page.goto('/#home');if(isMobile)await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Variants',exact:true}).click();
 await page.getByRole('button',{name:'Online',exact:true}).click();
 const modes=page.getByRole('group',{name:'Online variants',exact:true});await expect(modes.getByRole('button')).toHaveCount(6);
 await modes.getByRole('button',{name:'Throne',exact:true}).click();await expect(page.getByRole('button',{name:'Join queue',exact:true})).toBeDisabled();
 await modes.getByRole('button',{name:'Vote Chess',exact:true}).click();await expect(page.getByRole('button',{name:'Join Vote Chess',exact:true})).toBeDisabled();
 await modes.getByRole('button',{name:'Team Chess',exact:true}).click();await expect(page.getByRole('button',{name:'Start Team Chess',exact:true})).toBeDisabled();
 await expect(page.getByLabel('Room name',{exact:true})).toHaveCount(0);await expect(page.getByText('Not connected yet.',{exact:true})).toBeVisible();
});
