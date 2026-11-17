import test from 'node:test';import assert from 'node:assert/strict';
import {validateOnlineConfig} from '../../scripts/check-online-config.mjs';
import {checkOnlineBackend} from '../../scripts/check-online-backend.mjs';
const ref='abcdefghijklmnopqrst',env={VITE_SUPABASE_URL:`https://${ref}.supabase.co`,VITE_SUPABASE_ANON_KEY:'sb_publishable_test_public_key',SUPABASE_PROJECT_REF:ref};
test('deployment configuration accepts public keys and rejects server secrets or mismatched projects',()=>{
 assert.equal(validateOnlineConfig(env).ref,ref);
 for(const bad of [{VITE_SUPABASE_ANON_KEY:'sb_secret_private'},{VITE_SUPABASE_URL:'https://otherprojectrefabcdef.supabase.co'},{SUPABASE_PROJECT_REF:''},{VITE_SUPABASE_URL:'http://example.com'}])assert.throws(()=>validateOnlineConfig({...env,...bad}));
 const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
 assert.equal(validateOnlineConfig({...env,VITE_SUPABASE_ANON_KEY:jwt('anon')}).ref,ref);assert.throws(()=>validateOnlineConfig({...env,VITE_SUPABASE_ANON_KEY:jwt('service_role')}));
});
test('deployment smoke test verifies schema/auth and requires unsigned game requests to fail',async()=>{
 const calls=[];const request=async(url,options)=>{calls.push({url,options});if(url.includes('/settings'))return Response.json({external:{google:true,email:true}});if(url.includes('/profiles'))return Response.json([]);return Response.json({error:'Sign in'},{status:401});};
 const result=await checkOnlineBackend(validateOnlineConfig(env),request);assert.deepEqual(result.providers,['google','email']);assert.equal(calls.length,3);assert.ok(calls.every(c=>!c.options.headers.Authorization));
 await assert.rejects(()=>checkOnlineBackend(validateOnlineConfig(env),async()=>Response.json({},{status:404})),/Auth settings/);
 await assert.rejects(()=>checkOnlineBackend(validateOnlineConfig(env),async(url)=>url.includes('settings')?Response.json({}):Response.json([])),/reject unsigned requests/);
});
