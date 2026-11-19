import {test,expect} from '@playwright/test';
test('encyclopedia exposes practical articles, accent-insensitive search, and defining move orders',async({page})=>{
 await page.goto('/#learn/encyclopedia');await page.getByLabel('Search encyclopedia').fill('reti maneuver');await expect(page.locator('.encyclopedia-entry h2')).toHaveText('Reti maneuver');await expect(page.locator('.encyclopedia-article-section')).toContainText('King geometry');
 await page.getByLabel('Search encyclopedia').fill('Lucena');await expect(page.locator('.encyclopedia-entry')).toContainText('Building a bridge');
 await page.getByLabel('Search encyclopedia').fill('Amar Opening');await page.locator('.encyclopedia-index>button').first().click();await expect(page.locator('.encyclopedia-entry')).toContainText('Defining move order');
});
