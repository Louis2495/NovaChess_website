import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const quizzes=JSON.parse(readFileSync('public/data/personality-quizzes.json','utf8'));
test('all ten additional quizzes finish with their own result and can be retaken',async({page})=>{
 await page.goto('/#learn/quizzes');await expect(page.locator('.quiz-selection > button')).toHaveCount(13);
 for(const quiz of quizzes){
  await page.getByRole('button',{name:new RegExp(quiz.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
  for(const q of quiz.questions){await expect(page.getByRole('heading',{name:q.prompt,exact:true})).toBeVisible();await page.getByRole('button',{name:q.answers[0].label,exact:true}).click();}
  await expect(page.locator('.quiz-result h2')).toHaveText(quiz.results[0].title);
  await page.getByRole('button',{name:'Retake quiz',exact:true}).click();await expect(page.getByRole('heading',{name:quiz.questions[0].prompt,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Quizzes',exact:true}).click();
 }
});
test('encyclopedia exposes practical articles, accent-insensitive search, and defining move orders',async({page})=>{
 await page.goto('/#learn/encyclopedia');await page.getByLabel('Search encyclopedia').fill('reti maneuver');await expect(page.locator('.encyclopedia-entry h2')).toHaveText('Reti maneuver');await expect(page.locator('.encyclopedia-article-section')).toContainText('King geometry');
 await page.getByLabel('Search encyclopedia').fill('Lucena');await expect(page.locator('.encyclopedia-entry')).toContainText('Building a bridge');
 await page.getByLabel('Search encyclopedia').fill('Amar Opening');await page.locator('.encyclopedia-index>button').first().click();await expect(page.locator('.encyclopedia-entry')).toContainText('Defining move order');
});
