import {test,expect} from '@playwright/test';
test('Library previews keep material indicators inside equally padded cards',async({page})=>{
 const positions=['4k3/8/8/8/8/8/8/R3K2q w - - 0 1','4k3/8/8/8/8/8/8/Q3K2r w - - 0 1'];
 await page.addInitScript(positions=>localStorage.setItem('novachess-library-v2',JSON.stringify({games:positions.map((initial,i)=>({id:String(i),title:'Material preview '+i,initial,positions:[initial],moves:[],notation:[],result:'*',human:'w',variant:'chess',folder:'Games',kind:'game',created:Date.now()}))})),positions);
 await page.goto('/#library');const cards=page.locator('.saved-game-card');await expect(cards).toHaveCount(2);
 const top=cards.first().locator('.material-top');await expect(top).toHaveText('+4');
 const spacing=await cards.first().evaluate(card=>{const style=getComputedStyle(card);return {top:parseFloat(style.paddingTop),bottom:parseFloat(style.paddingBottom)};});
 expect(Math.abs(spacing.top-spacing.bottom)).toBeLessThan(1);
 for(const card of await cards.all()){const frame=(await card.locator('.compact-frame').boundingBox())!,board=(await card.locator('.board').boundingBox())!;expect(board.y-frame.y).toBeGreaterThanOrEqual(21);expect(frame.y+frame.height-board.y-board.height).toBeGreaterThanOrEqual(21);}
});
