import { test, expect } from '@playwright/test';
test('account boxes align, Customize is a profile section, and uploaded move sounds play',async({page,isMobile})=>{
 await page.addInitScript(()=>{(window as any).__soundPlays=[];HTMLMediaElement.prototype.play=function(){(window as any).__soundPlays.push({src:this.src,volume:this.volume});return Promise.resolve();};});
 await page.goto('/#profile');await expect(page.getByRole('checkbox',{name:'Show legal moves',exact:true})).not.toBeChecked();
 await expect(page.locator('.app')).toHaveCSS('font-family',/Nunito Sans/);
 if(!isMobile){const left=(await page.locator('.profile-editor').boundingBox())!,right=(await page.locator('.profile-side > .card').boundingBox())!;expect(Math.abs(left.y-right.y)).toBeLessThan(1);expect(Math.abs(left.height-right.height)).toBeLessThan(1);}
 const wav=Buffer.alloc(844);wav.write('RIFF');wav.writeUInt32LE(836,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(800,40);
 await page.getByLabel('Upload move sound',{exact:true}).setInputFiles({name:'move.wav',mimeType:'audio/wav',buffer:wav});
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-appearance-v2')!).customMoveSound)).toMatch(/^data:audio\/wav;base64,/);
 await expect(page.getByRole('checkbox',{name:'Move sounds',exact:true})).toBeChecked();
 await page.evaluate(()=>window.dispatchEvent(new Event('chess-move')));await expect.poll(()=>page.evaluate(()=>(window as any).__soundPlays.length)).toBe(1);
 expect(await page.evaluate(()=>(window as any).__soundPlays[0].src)).toMatch(/^data:audio\/wav/);
 await page.reload();await expect(page.getByRole('button',{name:'Preview move sound',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Use default move sound',exact:true}).click();await expect(page.getByRole('button',{name:'Preview move sound',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Customize',exact:true}).click();await expect(page.getByRole('region',{name:'Appearance',exact:true})).toBeVisible();await expect(page.getByRole('dialog',{name:'Appearance'})).toHaveCount(0);await page.getByRole('tab',{name:'Layout',exact:true}).click();await page.getByLabel('Font',{exact:true}).selectOption('Manrope');await page.reload();await expect(page.locator('.app')).toHaveCSS('font-family',/Manrope/);await page.getByRole('button',{name:'Account',exact:true}).click();await expect(page.locator('.profile-editor')).toBeVisible();
});
test('Research controls share a baseline and chat opens from the sidebar',async({page,isMobile})=>{
 await page.goto('/#research');
 const user=(await page.getByLabel('Public username').boundingBox())!,color=(await page.getByRole('group',{name:'Player’s color',exact:true}).boundingBox())!;
 expect(Math.abs(user.y-color.y)).toBeLessThan(1);expect(Math.abs(user.height-color.height)).toBeLessThan(1);
 if(!isMobile){const source=(await page.getByRole('group',{name:'Source',exact:true}).boundingBox())!;expect(Math.abs(user.y-source.y)).toBeLessThan(1);}
 await expect(page.locator('.chat-launcher')).toHaveCount(0);if(isMobile)await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 const chat=page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Open global chat',exact:true});await chat.click();await expect(page.getByRole('complementary',{name:'Global chat',exact:true})).toBeVisible();
});
test('all 22 owner memes rotate once per day before repeating, including an open page at midnight',async({page})=>{
 await page.clock.install({time:new Date('2026-11-16T12:00:00')});await page.goto('/#home');const card=page.locator('.daily-meme');await expect(card).toBeVisible();const first=await card.getAttribute('data-meme-id'),seen=new Set([first]);
 for(let i=1;i<22;i++){await page.clock.fastForward(86400000);await expect.poll(()=>card.getAttribute('data-meme-id')).not.toBe([...seen].at(-1));seen.add(await card.getAttribute('data-meme-id'));}
 expect(seen.size).toBe(22);await page.clock.fastForward(86400000);await expect(card).toHaveAttribute('data-meme-id',first!);await expect(page.locator('.daily-meme-image')).toHaveAttribute('src',/IMG_55/);
});
