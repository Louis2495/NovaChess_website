import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const online = url && key ? createClient(url, key, {auth:{flowType:"pkce"}}) : null;
// Register before async auth initialization finishes; recovery must not race mounting.
const recoveryKey="novachess-password-recovery";
type RecoveryState={active:boolean;checking:boolean;error:string};
let recoveryState:RecoveryState={active:false,checking:false,error:""};
try { recoveryState.active=Number(sessionStorage.getItem(recoveryKey))>Date.now(); } catch {}
const recoveryListeners=new Set<(state:RecoveryState)=>void>();
function setRecovery(patch:Partial<RecoveryState>){
 recoveryState={...recoveryState,...patch};
 if(patch.active!==undefined)try {if(patch.active)sessionStorage.setItem(recoveryKey,String(Date.now()+15*60*1000));else sessionStorage.removeItem(recoveryKey);}catch{}
 for(const listener of recoveryListeners)listener(recoveryState);
}
online?.auth.onAuthStateChange(event=>{
 if(event==="PASSWORD_RECOVERY")setRecovery({active:true,error:""});
 else if(event==="SIGNED_OUT")setRecovery({active:false});
});
const recoveryParams=new URLSearchParams(location.search),recoveryToken=recoveryParams.get('token_hash');
if(recoveryToken && recoveryParams.get('type')==='recovery'){
 recoveryParams.delete('token_hash');recoveryParams.delete('type');
 const rest=recoveryParams.toString();history.replaceState(null,'',location.pathname+(rest?'?'+rest:'')+location.hash);
 setRecovery({active:false,checking:true,error:""});
 if(online)void online.auth.verifyOtp({token_hash:recoveryToken,type:'recovery'}).then(({error})=>{
  setRecovery(error?{active:false,checking:false,error:'This link is invalid or expired.'}:{active:true,checking:false,error:''});
 }).catch(()=>setRecovery({active:false,checking:false,error:'This link could not be verified. Request another.'}));
 else setRecovery({checking:false,error:'Online play is not connected yet.'});
}
export function finishPasswordRecovery(){setRecovery({active:false,checking:false,error:""});}
export function useRecoveryState(){
 const [state,setState]=useState(recoveryState);
 useEffect(()=>{recoveryListeners.add(setState);setState(recoveryState);return()=>{recoveryListeners.delete(setState);};},[]);
 return state;
}
export function usePasswordRecovery(){return useRecoveryState().active;}
export function passwordResetRedirect(){return location.origin+location.pathname;}
export async function requestPasswordReset(email:string){
 if(!online)throw Error("Online play is not connected yet.");
 const {error}=await online.auth.resetPasswordForEmail(email.trim(),{redirectTo:passwordResetRedirect()});
 if(error)throw error;
}
export const oauthSignupIntent = "novachess-oauth-signup-intent";
export const oauthProfilePending = "novachess-oauth-profile-pending";

export function useOnlineSession() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(!online);
  useEffect(() => {
    if (!online) return;
    online.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = online.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}
export async function onlineAction(body: Record<string, unknown>) {
  if (!online) throw Error("Online play is not connected yet.");
  const { data, error } = await online.functions.invoke("chess", { body });
  if (error) {
    let message = error.message;
    try {
      message = (await error.context.json()).error || message;
    } catch {}
    throw Error(message);
  }
  if (data?.error) throw Error(data.error);
  return data;
}

export function finishThroneOnPageExit(room: string, token: string) {
  if (!url || !key) return;
  void fetch(`${url.replace(/\/$/, "")}/functions/v1/chess`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "finish", room }),
    keepalive: true,
  }).catch(() => {});
}

export async function onlineAuthOptions(){
 if(!url || !key)return {providers:[],emailEnabled:true};
 const response=await fetch(`${url.replace(/\/$/,"")}/auth/v1/settings`,{headers:{apikey:key},signal:AbortSignal.timeout(10000)});
 if(!response.ok)return {providers:[],emailEnabled:true};
 const settings=await response.json();
 const providers=["google","github"].filter(provider=>settings.external?.[provider]===true) as ("google"|"github")[];
 return {providers,emailEnabled:settings.external?.email!==false};
}

export function useSiteAdmin(){
 const {session,ready}=useOnlineSession();
 const [checked,setChecked]=useState<{id:string;allowed:boolean}|null>(null);
 useEffect(()=>{let active=true;if(!online || !session){setChecked(null);return;}
  void online.rpc('is_site_admin').then(({data})=>{if(active)setChecked({id:session.user.id,allowed:data===true});});
  return()=>{active=false;};
 },[session?.user.id]);
 return {isAdmin:!!session && checked?.id===session.user.id && checked.allowed,ready:ready && (!session || checked?.id===session.user.id),userId:session?.user.id};
}
let broadcastReady:Promise<boolean>|null=null;
export function roomBroadcastReady(){
 return broadcastReady ||= online?Promise.resolve(online.rpc('room_broadcast_ready')).then(({data,error})=>!error && data===true).catch(()=>false):Promise.resolve(false);
}
let clockOffset=0,lastClockSync=0,clockSync:Promise<void>|null=null;
export function onlineNow(){return Date.now()+clockOffset;}
export function syncOnlineClock(){
 if(!online || Date.now()-lastClockSync<300000)return Promise.resolve();
 if(clockSync)return clockSync;
 const start=Date.now();clockSync=Promise.resolve(online.rpc('server_time_ms')).then(({data,error})=>{const end=Date.now();if(!error && Number(data)>0){clockOffset=Number(data)-(start+end)/2;lastClockSync=end;}}).finally(()=>{clockSync=null;});return clockSync;
}
