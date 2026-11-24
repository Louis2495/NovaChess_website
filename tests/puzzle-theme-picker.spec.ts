import {test,expect} from '@playwright/test';
test('puzzle themes use a compact searchable picker with keyboard and outside dismissal',async({page})=>{
 const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
 await page.route('**/data/puzzles.json',r=>r.fulfill({json:[{id:'a',fen,moves:['e2e4','e7e5'],sourceRating:1000,themes:['fork']},{id:'b',fen,moves:['d2d4','d7d5'],sourceRating:1000,themes:['mateIn1']}]}));
 await page.goto('/#puzzles');const picker=page.locator('.puzzle-theme-picker'),trigger=picker.locator('summary');await expect(trigger).toHaveAttribute('title','Theme: All themes');await expect(trigger).toHaveText('Find a theme');await expect(picker).not.toHaveAttribute('open','');await expect(page.getByRole('listbox',{name:'Puzzle themes'})).toBeHidden();
 await trigger.click();const search=page.getByRole('searchbox',{name:'Search puzzle themes'});await expect(search).toBeFocused();await search.fill('mate');await expect(page.getByRole('option')).toHaveCount(1);await search.press('ArrowDown');await page.keyboard.press('Enter');await expect(trigger).toHaveAttribute('title',/Mate/i);await expect(trigger).toContainText(/Mate/i);await expect(picker).not.toHaveAttribute('open','');await expect(page.getByRole('button',{name:'d4, white pawn',exact:true})).toBeVisible();
 await trigger.click();await expect(search).toHaveValue('');await expect(page.getByRole('option',{selected:true})).toContainText(/Mate/i);await search.fill('nothing like this');await expect(page.getByText('No themes match.',{exact:true})).toBeVisible();await search.press('Escape');await expect(trigger).toBeFocused();await expect(picker).not.toHaveAttribute('open','');
 await trigger.click();await page.getByRole('button',{name:'e7, black pawn',exact:true}).click();await expect(picker).not.toHaveAttribute('open','');
});

test('practice randomizes comparable puzzles and skips the current one', async ({ page }) => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  await page.route('**/data/puzzles.json', route => route.fulfill({ json: [
    { id: 'near-a', fen, moves: ['e2e4', 'e7e5'], sourceRating: 1200, themes: ['opening'] },
    { id: 'near-b', fen, moves: ['d2d4', 'd7d5'], sourceRating: 1240, themes: ['opening'] },
    { id: 'far', fen, moves: ['c2c4', 'c7c5'], sourceRating: 2200, themes: ['opening'] },
  ] }));
  await page.addInitScript(() => {
    Math.random = () => sessionStorage.getItem('second-practice-visit') ? 0.99 : 0;
  });
  const board = page.locator('.puzzle-board');
  await page.goto('/#puzzles');
  await expect(board).toHaveAttribute('data-puzzle-id', 'near-a');
  await page.evaluate(() => sessionStorage.setItem('second-practice-visit', 'yes'));
  await page.reload();
  await expect(board).toHaveAttribute('data-puzzle-id', 'near-b');
  await page.getByRole('button', { name: 'Skip', exact: true }).filter({ visible: true }).click();
  await expect(board).toHaveAttribute('data-puzzle-id', 'near-a');
});
