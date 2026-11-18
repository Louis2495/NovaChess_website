import { test, expect } from '@playwright/test';
import { Chess } from 'chess.js';

test('computer game result can be dismissed outside the message and opened for review', async ({ page }) => {
  const board = new Chess(), initial = board.fen();
  board.move('e4');
  const game = { id:'finished-local', title:'Finished game', created:Date.now(), initial, variant:'chess', moves:['e2e4'], notation:['e4'], positions:[initial,board.fen()], result:'1-0', human:'w', folder:'Games', kind:'game', origin:'novachess', opponent:'Computer', botRating:1200 };
  await page.addInitScript(game => localStorage.setItem('novachess-library-v2', JSON.stringify({activeGame:game,games:[game]})), game);
  await page.goto('/#play/resume');
  const message = page.locator('.game-result-banner');
  await expect(message.getByRole('img', {name:'Sad chess king'})).toBeVisible();
  await message.getByText('You won!', {exact:true}).click();
  await expect(message).toBeVisible();
  const bounds = (await page.locator('.play-match .board').boundingBox())!;
  await page.mouse.click(bounds.x+8,bounds.y+8);
  await expect(message).toHaveCount(0);
  await page.reload();
  await message.getByRole('button', {name:'Game review',exact:true}).click();
  await expect(page).toHaveURL(/#library\/finished-local/);
  await expect(page.locator('.game-review-layout')).toBeVisible();
});
