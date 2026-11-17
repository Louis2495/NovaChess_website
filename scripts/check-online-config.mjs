import {pathToFileURL} from 'node:url';
export function validateOnlineConfig(env=process.env){
 const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_ANON_KEY,ref=env.SUPABASE_PROJECT_REF;
 if(!url || !key || !ref)throw Error('Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and SUPABASE_PROJECT_REF as repository Actions variables.');
 let parsed;try{parsed=new URL(url);}catch{throw Error('VITE_SUPABASE_URL is not a valid URL.');}
 if(parsed.pathname!=='/' || parsed.search || parsed.hash)throw Error('Use the base project URL, without an API path, query or fragment.');
 if(parsed.protocol!=='https:' || /YOUR_|PLACEHOLDER/i.test(url+key+ref))throw Error('Use the real HTTPS project URL and public browser key from Supabase.');
 if(!/^[a-z0-9]{20}$/.test(ref))throw Error('SUPABASE_PROJECT_REF should be the 20-character project reference.');
 if(parsed.hostname.endsWith('.supabase.co') && parsed.hostname!==`${ref}.supabase.co`)throw Error('The project URL and project reference do not match.');
 if(key.startsWith('sb_secret_'))throw Error('A secret key must never be used in VITE_SUPABASE_ANON_KEY. Use the publishable key.');
 if(!key.startsWith('sb_publishable_')){
  let payload;try{payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{throw Error('Use a publishable key or legacy anon JWT key.');}
  if(payload.role!=='anon')throw Error('Use the legacy anon key, not service_role or a user token.');
 }
 return {url:parsed.origin,key,ref};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const c=validateOnlineConfig();console.log(`Public configuration validated for ${new URL(c.url).hostname}. No key was printed.`);}catch(e){console.error(e.message);process.exitCode=1;}}
