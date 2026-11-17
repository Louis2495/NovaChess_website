import {pathToFileURL} from 'node:url';
import {validateOnlineConfig} from './check-online-config.mjs';
export async function checkOnlineBackend(config,request=fetch){
 const headers={apikey:config.key};
 const auth=await request(`${config.url}/auth/v1/settings`,{headers,signal:AbortSignal.timeout(15000)});
 if(!auth.ok)throw Error(`Auth settings returned ${auth.status}. Check the project URL/key and whether the project is paused.`);
 const settings=await auth.json();
 const db=await request(`${config.url}/rest/v1/profiles?select=id&limit=0`,{headers,signal:AbortSignal.timeout(15000)});
 if(!db.ok)throw Error(`Database smoke check returned ${db.status}. Check migrations and public API grants.`);
 const game=await request(`${config.url}/functions/v1/chess`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'create'}),signal:AbortSignal.timeout(30000)});
 if(game.status!==401)throw Error(`Game function should reject unsigned requests with 401; received ${game.status}. Check function deployment.`);
 return {providers:Object.entries(settings.external||{}).filter(([,enabled])=>enabled).map(([name])=>name)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=await checkOnlineBackend(validateOnlineConfig());console.log(`Backend smoke checks passed. Enabled sign-in providers: ${result.providers.join(', ')||'none'}. Two-account game testing is still required.`);}catch(e){console.error(e.message);process.exitCode=1;}}
