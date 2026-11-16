import {test,expect} from '@playwright/test';
test('Multiplayer exposes Throne, Vote Chess and Team Chess before the server is connected',async({page,isMobile})=>{
 await page.goto('/#home');if(isMobile)await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Multiplayer',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Multiplayer',exact:true})).toBeVisible();const modes=page.getByRole('group',{name:'Multiplayer modes',exact:true});await expect(modes.getByRole('button')).toHaveCount(3);
 await modes.getByRole('button',{name:'Throne',exact:true}).click();await expect(page.locator('.multiplayer-preview')).toContainText('Winner stays');
 await modes.getByRole('button',{name:'Vote Chess',exact:true}).click();await expect(page.locator('.multiplayer-preview')).toContainText('One day per move');await expect(page.locator('.multiplayer-preview')).toContainText('Earliest vote');
 await modes.getByRole('button',{name:'Team Chess',exact:true}).click();const opponent=page.getByRole('group',{name:'Opponent',exact:true});await opponent.getByRole('button',{name:'Computer',exact:true}).click();await expect(opponent.getByRole('button',{name:'Computer',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Create room',exact:true})).toBeDisabled();await expect(page.getByText('Not connected yet.',{exact:true})).toBeVisible();
});
