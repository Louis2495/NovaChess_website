import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const trivia = JSON.parse(readFileSync('public/data/trivia.json','utf8'));

test('trivia completion summarizes this round accurately and resets on replay', async ({page}) => {
  await page.goto('/#learn/trivia');
  const quiz = page.locator('.trivia-game');
  await expect(quiz).toBeVisible();
  const card = (await quiz.boundingBox())!;
  const workspace = (await page.locator('#workspace').boundingBox())!;
  expect(Math.abs(card.x + card.width / 2 - workspace.x - workspace.width / 2)).toBeLessThanOrEqual(1);
  for (let round=0; round<10; round++) {
    const prompt = await page.locator('.trivia-question h2').textContent();
    const options = await page.locator(".trivia-options button").allTextContents();
    const question = trivia.find((q:any) => q.prompt === prompt && q.answers.every((answer:string) => options.includes(answer)));
    const answer = round%3===0 ? question.answers[(question.correct+1)%question.answers.length] : question.answers[question.correct];
    await page.getByRole('button',{name:answer,exact:true}).click();
    await page.getByRole('button',{name:'Next',exact:true}).click();
  }
  await expect(page.locator('.result-metrics > div').nth(0)).toContainText('6 / 10');
  await expect(page.locator('.result-metrics > div').nth(1)).toContainText('60%');
  await expect(page.locator('.result-metrics > div').nth(2)).toContainText('2');
  await expect(page.locator('.result-review details')).toHaveCount(10);
  await expect(page.locator('.review-incorrect')).toHaveCount(4);
  await page.locator('.review-incorrect summary').first().click();
  await expect(page.locator('.review-incorrect[open]')).toContainText('Your answer:');
  await page.getByRole('button',{name:'Play again',exact:true}).click();
  await expect(page.locator('.game-score-row')).toContainText('0 points');
  await expect(page.locator('.result-review')).toHaveCount(0);
});
