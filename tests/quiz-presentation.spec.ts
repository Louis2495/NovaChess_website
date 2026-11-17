import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const quizzes=JSON.parse(readFileSync('public/data/personality-quizzes.json','utf8'));
test('quiz questions omit the title and sandwich result gets its own sandwich picture',async({page})=>{
 await page.goto('/#learn/quizzes');
 for(const title of ["What's your chess style?","Which Disney princess are you?","What's your chess alter ego?"])await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 const quiz=quizzes.find((q:any)=>q.id==='snack');await page.getByRole('heading',{name:quiz.title,exact:true}).click();
 await expect(page.getByText(quiz.title,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:quiz.questions[0].answers[2].label,exact:true}).click();
 await page.getByRole('button',{name:'Previous',exact:true}).click();await expect(page.getByRole('heading',{name:quiz.questions[0].prompt,exact:true})).toBeVisible();
 for(const q of quiz.questions)await page.getByRole('button',{name:q.answers[2].label,exact:true}).click();
 const art=page.getByRole('img',{name:'The reliable sandwich',exact:true});await expect(art).toBeVisible();await expect(art).toHaveCSS('background-image',/food-villains\.webp/);await expect(art).toHaveCSS('background-position','66.6667% 0%');
 await expect(page.getByText(/Based on your chess preferences|For fun/)).toHaveCount(0);
});
