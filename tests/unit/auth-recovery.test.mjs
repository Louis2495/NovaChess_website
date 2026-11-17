import test from 'node:test';import assert from 'node:assert/strict';
import {configureAuthRecovery,recoveryTemplate} from '../../scripts/configure-auth-recovery.mjs';
test('recovery deployment configures only the email template, with token-hash verification and no SMTP changes',async()=>{
 let call;
 await configureAuthRecovery({SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',SUPABASE_ACCESS_TOKEN:'test-deployment-secret'},async(url,options)=>{call={url,options};return new Response('{}');});
 assert.match(call.url,/\/projects\/abcdefghijklmnopqrst\/config\/auth$/);assert.equal(call.options.method,'PATCH');
 const fields=JSON.parse(call.options.body);assert.deepEqual(Object.keys(fields).sort(),['mailer_subjects_recovery','mailer_templates_recovery_content']);
 assert.match(recoveryTemplate,/\{\{ \.TokenHash \}\}/);assert.match(recoveryTemplate,/type=recovery/);assert.ok(!recoveryTemplate.includes('test-deployment-secret'));
 await assert.rejects(()=>configureAuthRecovery({SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',SUPABASE_ACCESS_TOKEN:'x'},async()=>new Response('{}',{status:403})),/HTTP 403/);
});
