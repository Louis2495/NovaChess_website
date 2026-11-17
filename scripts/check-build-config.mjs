import {validateOnlineConfig} from './check-online-config.mjs';
const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_ANON_KEY;
if(url || key){
 try{const ref=process.env.SUPABASE_PROJECT_REF || new URL(url).hostname.split('.')[0];validateOnlineConfig({...process.env,SUPABASE_PROJECT_REF:ref});}
 catch(e){console.error(`Online configuration: ${e.message}`);process.exitCode=1;}
}
