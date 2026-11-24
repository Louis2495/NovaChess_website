import {isGeneratedUsername} from "../lib/screenName";
import { useEffect, useState } from "react";
import { online, useOnlineSession, onlineAuthOptions, useRecoveryState, finishPasswordRecovery, requestPasswordReset, oauthSignupIntent, oauthProfilePending } from "../lib/online";
import { useApp } from "../lib/context";
import { Button, Card, Field } from "./UI";
import PasswordField from './PasswordField';
import SignupProfileFields from './SignupProfileFields';
export default function OnlineAccount() {
 const {session,ready}=useOnlineSession(),recovery=useRecoveryState(),{notify,navigate,detail,setLibrary}=useApp();
 const [providers,setProviders]=useState<("google"|"github")[]>([]),[emailEnabled,setEmailEnabled]=useState(true);
 const [mode,setMode]=useState<'signin'|'signup'|'forgot'>(detail==='forgot'?'forgot':'signin'),[email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [country,setCountry]=useState(''),[avatar,setAvatar]=useState(''),[avatarBusy,setAvatarBusy]=useState(false);
 useEffect(()=>{let active=true;void onlineAuthOptions().then(p=>{if(active){setProviders(p.providers as ("google"|"github")[]);setEmailEnabled(p.emailEnabled);}}).catch(()=>{});return()=>{active=false;};},[]);
 function changeMode(next:typeof mode){setMode(next);setPassword('');setConfirm('');setMessage('');setError('');}
 if(!online)return <Card className="online-unavailable"><h2>Online play</h2><p className="caption">Not connected yet.</p></Card>;
 const reset=recovery.active || recovery.checking || !!recovery.error || detail==='reset';
 if(reset && (!ready || recovery.checking))return <Card><p role="status">Checking reset link…</p></Card>;
 if(reset && (!session || !recovery.active || !!recovery.error))return <Card><h2>Reset password</h2><p>{recovery.error || "This link is invalid or expired."}</p><Button onClick={()=>{finishPasswordRecovery();changeMode('forgot');navigate('signin','forgot');}}>Request a new link</Button></Card>;
 if(detail==='setup' && session && !reset) return <Card className="account-form">
  <h2>Set up your profile</h2>
  {error && <p className="auth-error" role="alert">{error}</p>}
  <form onSubmit={async e => {
    e.preventDefault();
    if(!country || !avatar){setError('Choose a country and profile picture.');return;}
    setBusy(true);setError('');
    try {
      const {error}=await online!.from('profiles').update({country,avatar}).eq('id',session.user.id);
      if(error)throw error;
      setLibrary(l=>({...l,profile:{...l.profile,country,avatar}}));
      sessionStorage.removeItem(oauthProfilePending);
      navigate('profile');
    } catch(e){setError((e as Error).message);} finally{setBusy(false);}
  }}>
    <SignupProfileFields country={country} avatar={avatar} onCountry={setCountry} onAvatar={setAvatar} onBusy={setAvatarBusy} onError={setError}/>
    <Button className={!reset && mode === "signin" ? "sign-in-action" : undefined} disabled={busy || avatarBusy}>{busy?'Saving…':'Save profile'}</Button>
  </form>
 </Card>;
 if(session && !reset && mode!=='forgot')return <Card><div className="card-heading"><h2>Account</h2><span className="pill">Connected</span></div><p className="caption">{session.user.email}</p><Button className="secondary" onClick={()=>online!.auth.signOut()}>Sign out</Button></Card>;
 return <Card className="account-form">
  <h2>{reset?'Reset password':mode==='signup'?'Create account':mode==='forgot'?'Forgot password':'Sign in'}</h2>
  {message && <p role="status">{message}</p>}{error && <p className="auth-error" role="alert">{error}</p>}
  {!reset && mode!=='forgot' && providers.length>0 && <div className="oauth-buttons">{providers.map(provider=><Button key={provider} className="secondary" disabled={busy} onClick={async()=>{
   setBusy(true);setError('');try{sessionStorage.setItem(oauthSignupIntent,String(Date.now()));const {error}=await online!.auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}});if(error)throw error;}catch(e){sessionStorage.removeItem(oauthSignupIntent);setError((e as Error).message || 'Sign-in could not start. Try again.');}finally{setBusy(false);}
  }}>Continue with {provider==='google'?'Google':'GitHub'}</Button>)}</div>}
  {(emailEnabled || reset || mode==='forgot') && <>
   <form onSubmit={async e=>{
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try {
     if(!reset && mode==='signup' && (name.trim().length<2 || isGeneratedUsername(name)))throw Error('Choose a screen name with 2–32 characters.');
     if(!reset && mode==='signup' && (!country || !avatar))throw Error('Choose a country and profile picture.');
     if(!reset && mode==='signup'){
      const {data}=await online!.rpc('username_is_reserved',{p_name:name.trim()});
      if(data===true)throw Error('That username is reserved. Choose a different name.');
     }
     if(reset){
      if(password!==confirm)throw Error('Passwords do not match.');
      const {error}=await online!.auth.updateUser({password});if(error)throw error;
      setPassword('');setConfirm('');finishPasswordRecovery();notify('Password updated.');navigate('profile');
     }else if(mode==='forgot'){
      await requestPasswordReset(email);setMessage('If this email has an account, a reset link is on its way.');
     }else{
      const {data,error}=mode==='signup'?await online!.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:location.origin+location.pathname,data:{screen_name:name.trim(),country,avatar}}}):await online!.auth.signInWithPassword({email:email.trim(),password});
      if(error)throw error;
      if(mode==='signup' && !data.session)setMessage('Check your email to confirm your account.');
     }
    }catch(e){setError((e as Error).message || 'Please try again.');}finally{setBusy(false);}
   }}>
    {!reset && mode==='signup' && <Field label="Screen name"><input required minLength={2} maxLength={32} autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)}/></Field>}
    {!reset && mode==='signup' && <SignupProfileFields country={country} avatar={avatar} onCountry={setCountry} onAvatar={setAvatar} onBusy={setAvatarBusy} onError={setError}/>}
    {!reset && <Field label="Email"><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field>}
    {mode!=='forgot' || reset ? <PasswordField label={reset?'New password':'Password'} required minLength={8} autoComplete={reset || mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/> : null}
    {reset && <PasswordField id="confirm-password" label="Confirm password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/>}
    <Button disabled={busy || avatarBusy}>{busy?'Connecting…':reset?'Save password':mode==='forgot'?'Send reset link':mode==='signup'?'Create account':'Sign in'}</Button>
   </form>
   {!reset && <div className="account-form-links">{mode==='signin' && <button className="text-link" onClick={()=>changeMode('forgot')}>Forgot password?</button>}<button className="text-link" onClick={()=>changeMode(mode==='signin'?'signup':'signin')}>{mode==='signin'?'Create an account':mode==='signup'?'Already have an account?':'Back to sign in'}</button></div>}
  </>}
  {!emailEnabled && !providers.length && mode!=='forgot' && !reset && <p className="caption">Sign-in is temporarily unavailable.</p>}
 </Card>;
}
