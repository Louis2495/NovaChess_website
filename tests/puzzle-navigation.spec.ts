import {test,expect} from '@playwright/test';
for(const route of ['puzzles','puzzles/daily'])test(`${route} navigates played moves without revealing answers or changing progress`,async({page,isMobile})=>{
 await page.route('**/data/puzzles.json',r=>r.fulfill({json:[{id:'navigation-test',fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',moves:['e2e4','e7e5','g1f3','b8c6'],sourceRating:1500,themes:['opening']}]}));
 await page.goto('/#'+route);const board=page.getByRole('group',{name:'Chessboard',exact:true}),nav=page.getByRole('group',{name:'Puzzle move navigation',exact:true}),back=nav.getByRole('button',{name:'Previous puzzle move'}),forward=nav.getByRole('button',{name:'Next puzzle move'}),slider=nav.getByRole('slider');
 const square=(s:string)=>board.getByRole('button',{name:new RegExp('^'+s+',')});await expect(back).toBeDisabled();await expect(forward).toBeDisabled();await expect(slider).toHaveAttribute('max','0');
 await square('e7').click();await square('e5').click();await expect(square('f3')).toHaveAttribute('aria-label','f3, white knight');await expect(slider).toHaveAttribute('max','2');
 if(!isMobile){const n=(await nav.boundingBox())!,b=(await board.boundingBox())!;expect(n.x).toBeGreaterThan(b.x+b.width);}
 await back.click();await back.click();await expect(square('e7')).toHaveAttribute('aria-label','e7, black pawn');await expect(square('g1')).toHaveAttribute('aria-label','g1, white knight');await expect(back).toBeDisabled();await expect(forward).toBeEnabled();
 await expect(square('d7')).toHaveAttribute('aria-disabled','true');await forward.click();await forward.click();await expect(forward).toBeDisabled();await expect(square('f3')).toHaveAttribute('aria-label','f3, white knight');
 await square('b8').click();await square('c6').click();await expect(page.locator('.puzzle-board')).toHaveClass(/solved/);const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).progress);await back.click();await forward.click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).progress)).toEqual(progress);
});
