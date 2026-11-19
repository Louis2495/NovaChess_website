import {test,expect} from '@playwright/test';
test('Research downloads two months at a time and reuses historical archives on reload',async({page})=>{
 const urls=Array.from({length:4},(_,i)=>`https://api.chess.com/pub/player/vet/games/2020/0${i+1}`);let release!:()=>void;const wait=new Promise<void>(r=>release=r);let started=0,active=0,peak=0;
 await page.route('https://api.chess.com/pub/player/vet/games/archives',r=>r.fulfill({json:{archives:urls}}));
 for(const url of urls)await page.route(url,async r=>{started++;active++;peak=Math.max(peak,active);await wait;active--;await r.fulfill({json:{games:[{rules:'chess',pgn:'[White "vet"]\n[Result "1-0"]\n\n1. e4 e5 1-0'}]}});});
 await page.goto('/#research');await page.getByLabel('Public username').fill('vet');await page.getByRole('button',{name:'Load games',exact:true}).click();await expect.poll(()=>started).toBe(2);release();await expect(page.getByRole('status')).toContainText('4 games loaded');expect(peak).toBe(2);expect(started).toBe(4);
 await page.reload();await page.getByLabel('Public username').fill('vet');await page.getByRole('button',{name:'Load games',exact:true}).click();await expect(page.getByRole('status')).toContainText('4 games loaded');expect(started).toBe(4);await expect(page.locator('.research-results')).toContainText('4 games');
});
test('Research honors Retry-After and retries an archive without losing its games',async({page})=>{
 let calls=0;
 await page.route('https://api.chess.com/pub/player/vet/games/archives',r=>r.fulfill({json:{archives:['https://api.chess.com/pub/player/vet/games/2020/01']}}));
 await page.route('https://api.chess.com/pub/player/vet/games/2020/01',r=>{calls++;return calls===1?r.fulfill({status:429,headers:{'Retry-After':'1'},json:{}}):r.fulfill({json:{games:[{rules:'chess',pgn:'[White "vet"]\n\n1. e4 e5 1-0'}]}});});
 await page.goto('/#research');await page.getByLabel('Public username').fill('vet');await page.getByRole('button',{name:'Load games',exact:true}).click();await expect(page.getByRole('status')).toContainText('1 games loaded');expect(calls).toBe(2);await expect(page.getByRole('alert')).toHaveCount(0);
});
test('Research refreshes the current month while reusing older months',async({page})=>{
 const now=new Date(),current=`https://api.chess.com/pub/player/vet/games/${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}`,past='https://api.chess.com/pub/player/vet/games/2020/01';let oldCalls=0,currentCalls=0;
 await page.route('https://api.chess.com/pub/player/vet/games/archives',r=>r.fulfill({json:{archives:[past,current]}}));
 for(const url of [past,current])await page.route(url,r=>{url===past?oldCalls++:currentCalls++;return r.fulfill({json:{games:[{rules:'chess',pgn:'[White "vet"]\n\n1. e4 e5 1-0'}]}});});
 await page.goto('/#research');await page.getByLabel('Public username').fill('vet');for(let i=0;i<2;i++){await page.getByRole('button',{name:'Load games',exact:true}).click();await expect(page.getByRole('status')).toContainText('2 games loaded');await expect(page.getByRole('button',{name:'Load games',exact:true})).toBeEnabled();}expect(oldCalls).toBe(1);expect(currentCalls).toBe(2);
});
test('Lichess opening parsing preserves player colors and game results',async({page})=>{
 await page.route('https://lichess.org/api/games/user/vet?*',r=>r.fulfill({contentType:'application/x-ndjson',body:[{variant:'standard',moves:'e4 e5 Nf3 Nc6',winner:'white',players:{white:{user:{name:'vet'}},black:{user:{name:'other'}}}},{variant:'standard',moves:'d4 d5 c4',winner:'black',players:{white:{user:{name:'other'}},black:{user:{name:'vet'}}}}].map(g=>JSON.stringify(g)).join('\n')}));
 await page.goto('/#research');await page.getByRole('button',{name:'Lichess',exact:true}).click();await page.getByLabel('Public username').fill('vet');await page.getByRole('button',{name:'Load games',exact:true}).click();await expect(page.getByRole('status')).toContainText('2 games loaded');await expect(page.locator('.research-branches')).toContainText('e4');await page.getByRole('group',{name:'Player’s color',exact:true}).getByRole('button',{name:'Black',exact:true}).click();await expect(page.locator('.research-branches')).toContainText('d4');await expect(page.locator('.research-branches')).toContainText('Black 1');
});
