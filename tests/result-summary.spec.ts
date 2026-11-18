import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const trivia = JSON.parse(readFileSync('public/data/trivia.json','utf8'));

test('trivia completion summarizes this round accurately and resets on replay', async ({page}) => {
  await page.goto('/#learn/trivia');
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
  await expect(page.locator('.game-score-row')).toContainText('0 pts');
  await expect(page.locator('.result-review')).toHaveCount(0);
});

test('original quiz reveals the choice breakdown and can be retaken', async ({page}) => {
  await page.goto('/#learn/quizzes');
  await page.getByRole('button',{name:/What's your chess style/}).click();
  for (let step=0; step<6; step++) await page.locator('.quiz-moves button').first().click();
  await expect(page.locator('.quiz-result h2')).toHaveText('The attacker');
  await expect(page.locator('.result-banner')).toContainText('6 choices explored');
  await expect(page.locator('.result-trait.leading')).toContainText('6 / 6');
  await expect(page.locator('.result-trait')).toHaveCount(4);
  await page.getByRole('button',{name:'Retake quiz',exact:true}).click();
  await expect(page.locator('.game-score-row')).toContainText('1 / 6');
});
