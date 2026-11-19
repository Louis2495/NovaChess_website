import {test,expect} from '@playwright/test';
test('loaded research gives the board the left column and resizes without shrinking against the evaluation rail',async({page,isMobile})=>{
 await page.addInitScript(()=>localStorage.setItem('novachess-library-v2',JSON.stringify({profile:{name:'Tester'},games:[{id:'research-test',title:'Standard',kind:'game',variant:'chess',origin:'novachess',initial:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',moves:['e2e4','e7e5'],notation:['e4','e5'],human:'w',result:'1-0',folder:'Games',created:Date.now()}]})));
 await page.goto('/#research');await page.getByRole('button',{name:'NovaChess',exact:true}).click();await page.getByRole('button',{name:'Load games',exact:true}).click();await expect(page.locator('.research-layout')).toHaveClass(/research-loaded/);
 const board=page.locator('.research-layout .board'),handle=page.getByRole('slider',{name:'Resize board',exact:true});
 if(!isMobile){const b=(await board.boundingBox())!,moves=(await page.locator('.research-results').boundingBox())!,settings=(await page.locator('.research-form').boundingBox())!;expect(moves.x).toBeGreaterThan(b.x+b.width);expect(settings.x).toBeGreaterThan(moves.x+moves.width);expect(Math.abs(moves.y-settings.y)).toBeLessThan(1);}
 await handle.focus();await handle.press('ArrowLeft');await handle.press('ArrowLeft');
 const before=(await board.boundingBox())!.width,h=(await handle.boundingBox())!;
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2-15,h.y+h.height/2+15,{steps:5});await page.mouse.up();
 const after=(await board.boundingBox())!.width;expect(before-after).toBeGreaterThan(24);expect(before-after).toBeLessThan(36);
 await handle.press('ArrowRight');await expect.poll(async()=>(await board.boundingBox())!.width).toBeCloseTo(after+20,0);
});
