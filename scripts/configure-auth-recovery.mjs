import {pathToFileURL} from 'node:url';
export const recoveryTemplate='<h2>Reset your NovaChess password</h2><p><a href="{{ .SiteURL }}?token_hash={{ .TokenHash }}&amp;type=recovery">Choose a new password</a></p><p>If you did not request this, ignore this email.</p>';
export async function configureAuthRecovery(env=process.env,request=fetch){
 const ref=env.SUPABASE_PROJECT_REF,token=env.SUPABASE_ACCESS_TOKEN;
 if(!/^[a-z0-9]{20}$/.test(ref||'') || !token)throw Error('Set the project reference and deployment access token.');
 const response=await request(`https://api.supabase.com/v1/projects/${ref}/config/auth`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mailer_subjects_recovery:'Reset your NovaChess password',mailer_templates_recovery_content:recoveryTemplate}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Recovery email configuration failed (HTTP ${response.status}).`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){try{await configureAuthRecovery();console.log('Recovery email template configured. SMTP settings were not changed.');}catch(e){console.error(e.message);process.exitCode=1;}}
