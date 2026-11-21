import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';
test('result banner is centered on the board and uses player-relative winner wording',async({page})=>{
 const c=new Chess(),initial=c.fen();await page.addInitScript(g=>{if(!localStorage.getItem('novachess-library-v2'))localStorage.setItem('novachess-library-v2',JSON.stringify({activeGame:g}));},{id:'won',title:'Standard',created:Date.now(),initial,positions:[initial],moves:[],notation:[],result:'1-0',human:'w',variant:'chess',folder:'Games',origin:'novachess'});await page.goto('/#play/resume');await expect(page.getByText('You won!',{exact:true})).toBeVisible({timeout:15000});const board=(await page.locator('.play-match .board').boundingBox())!,banner=(await page.locator('.board-result-overlay .game-result-banner').boundingBox())!;expect(Math.abs(board.x+board.width/2-banner.x-banner.width/2)).toBeLessThan(2);expect(Math.abs(board.y+board.height/2-banner.y-banner.height/2)).toBeLessThan(2);
 await page.evaluate(()=>{const l=JSON.parse(localStorage.getItem('novachess-library-v2')!);l.activeGame.human='b';localStorage.setItem('novachess-library-v2',JSON.stringify(l));});await page.reload();await expect(page.getByText('White won',{exact:true})).toBeVisible();await expect(page.getByRole('img',{name:'Sad chess king'})).toBeVisible();
});
test('review starts automatically and shows an open book for opening moves',async({page})=>{
 const c=new Chess(),initial=c.fen();c.move('e4');await page.addInitScript(g=>localStorage.setItem('novachess-library-v2',JSON.stringify({games:[g]})),{id:'auto',title:'Automatic',created:Date.now(),initial,positions:[initial,c.fen()],moves:['e2e4'],notation:['e4'],result:'1-0',human:'w',variant:'chess',folder:'Games',origin:'archive'});await page.goto('/#library/auto');await expect(page.getByRole('status').filter({hasText:'Review complete.'})).toBeVisible({timeout:30000});await expect(page.locator('.review-notation .move-quality[aria-label=Book] svg')).toBeVisible();await expect(page.locator('.board-move-badge .move-quality')).toBeVisible();
});
test('background evaluation warms review without sharing weakened computer scores',async({page})=>{
 await page.addInitScript(()=>{(window as any).__reviewCalls=[];const Native=window.Worker;window.Worker=class extends Native{fen='';constructor(url:any,options?:any){super(url,options);const send=this.postMessage.bind(this);this.postMessage=((m:any)=>{if(typeof m==='string'&&m.startsWith('position fen '))this.fen=m.slice(13);if(typeof m==='string'&&m.startsWith('go '))(window as any).__reviewCalls.push({fen:this.fen,command:m});send(m);}) as any;}};});
 await page.goto('/#play');await page.getByRole("button",{name:"Computer",exact:true}).click();await page.getByRole('button',{name:'Start game',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__reviewCalls.filter((c:any)=>c.command.includes('depth 18')).length)).toBeGreaterThan(0);await page.waitForTimeout(1200);
 const board=page.locator('.play-match .board');await board.getByRole('button',{name:'e2, white pawn',exact:true}).click();await board.getByRole('button',{name:'e4, empty',exact:true}).click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame.moves.length)).toBe(2);await page.waitForTimeout(1800);
 const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('novachess-library-v2')!).activeGame.id);await page.goto('/#library/'+id);await expect(page.getByRole('status').filter({hasText:'Review complete.'})).toBeVisible({timeout:30000});await expect(page.locator('.review-notation .move-quality')).toHaveCount(2);
});

test("Game Review restores every move from a compact online game history", async ({ page }) => {
  const board = new Chess();
  const initial = board.fen();
  const moves = ["e2e4", "e7e5", "g1f3"];
  const notation = moves.map(move => board.move(move).san);
  const game = {
    id: "online-team-compact", title: "Team Chess", created: Date.now(), initial,
    positions: [initial, board.fen()], moves, notation, result: "1-0",
    human: "w", variant: "chess", folder: "Games", origin: "novachess",
  };
  await page.addInitScript(saved => {
    localStorage.setItem("novachess-library-v2", JSON.stringify({ games: [saved] }));
  }, game);
  await page.goto("/#library/online-team-compact");
  await expect(page.getByRole("status").filter({ hasText: "Review complete." })).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".review-notation .move-quality")).toHaveCount(3);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("novachess-library-v2")!).games[0]);
  expect(stored.positions).toHaveLength(4);
  expect(stored.review).toHaveLength(3);
});
