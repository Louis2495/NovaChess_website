import { test, expect } from '@playwright/test';
import { Chess } from 'chess.js';
test('Analysis uses icon tools, full-width insights, notation beside the engine and an external resize handle',async({page,isMobile})=>{
 await page.goto('/#analysis');
 const tools=page.getByRole('group',{name:'Analysis actions',exact:true});
 await expect(tools.getByRole('button')).toHaveCount(4);
 for(const button of await tools.getByRole('button').all()){expect((await button.textContent())?.trim()).toBe('');await expect(button).toHaveAttribute('aria-label',/.+/);}
 const board=page.locator('.analysis-layout .board'),notation=page.locator('.side-panels > .analysis-notation');
 await expect(notation.getByRole('button',{name:'Notation',exact:true})).toBeVisible();
 const bb=(await board.boundingBox())!,handle=(await page.getByRole('slider',{name:'Resize board',exact:true}).boundingBox())!;
 if(isMobile){const tail=await page.getByRole("slider",{name:"Resize board",exact:true}).locator("svg").evaluate((svg:SVGSVGElement)=>{const p=new DOMPoint(3,13).matrixTransform(svg.getScreenCTM()!);return {x:p.x,y:p.y};});expect(Math.abs(tail.x-bb.x-bb.width)).toBeLessThan(1);expect(Math.abs(tail.y-bb.y)).toBeLessThan(1);}else{expect(handle.y).toBeLessThan(bb.y);expect(Math.abs(handle.x+handle.width/2-bb.x-bb.width)).toBeLessThan(handle.width);}
 await expect(board.locator('.board-resize-handle')).toHaveCount(0);
 if(!isMobile){const insights=(await page.locator('.positional-insights').boundingBox())!,lines=(await page.locator('.engine-top-lines').boundingBox())!;expect(Math.abs(insights.width-lines.width)).toBeLessThan(1);expect(insights.y).toBeGreaterThan(lines.y);}
 const e2=board.getByRole('button',{name:'e2, white pawn',exact:true});await e2.click();await expect(e2).toHaveAttribute('aria-pressed','true');await page.locator('.analysis-engine-label').click({button:'right'});await expect(e2).toHaveAttribute('aria-pressed','false');
 await e2.click();await board.getByRole('button',{name:'e4, empty',exact:true}).click({button:'right'});await expect(e2).toHaveAttribute('aria-pressed','false');await expect(board.locator('[data-annotation]')).toHaveCount(1);
});
test('recent-game preview slider fills its strip',async({page})=>{
 const c=new Chess(),initial=c.fen();c.move('e4');
 await page.addInitScript(g=>localStorage.setItem('novachess-library-v2',JSON.stringify({games:[g]})),{id:'recent',title:'Recent',created:Date.now(),initial,positions:[initial,c.fen()],moves:['e2e4'],notation:['e4'],human:'w',variant:'chess',result:'1-0',folder:'Games'});
 await page.goto('/#home');const slider=page.getByRole('slider',{name:'Preview Recent',exact:true});await expect(slider).toHaveCSS('height','14px');
});
