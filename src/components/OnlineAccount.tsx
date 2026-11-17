import { useEffect, useState } from "react";
import { online, useOnlineSession, onlineAuthOptions } from "../lib/online";
import { useApp } from "../lib/context";
import { Button, Card, Field } from "./UI";
export default function OnlineAccount() {
  const { session } = useOnlineSession(),
    { notify } = useApp();
  const [providers,setProviders]=useState<("google"|"github")[]>([]);
  const [emailEnabled,setEmailEnabled]=useState(true);
  useEffect(()=>{let active=true;void onlineAuthOptions().then(p=>{if(active){setProviders(p.providers as ("google"|"github")[]);setEmailEnabled(p.emailEnabled);}}).catch(()=>{});return()=>{active=false;};},[]);
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  if (!online)
    return (
      <Card className="online-unavailable">
        <h2>Online play</h2>
        <p className="caption">Not connected yet.</p>
      </Card>
    );
  if (session)
    return (
      <Card>
        <div className="card-heading">
          <h2>Account</h2>
          <span className="pill">Connected</span>
        </div>
        <p className="caption">{session.user.email}</p>
        <Button className="secondary" onClick={() => online!.auth.signOut()}>
          Sign out
        </Button>
      </Card>
    );
  return (
    <Card className="account-form">
      <h2>{signup ? "Create account" : "Sign in"}</h2>
      {providers.length>0 && <div className="oauth-buttons">{providers.map(provider=><Button key={provider} className="secondary" disabled={busy} onClick={async()=>{
        setBusy(true);try{const {error}=await online!.auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}});if(error)notify(error.message);}catch{notify("Sign-in could not start. Try again.");}finally{setBusy(false);}
      }}>Continue with {provider==="google"?"Google":"GitHub"}</Button>)}</div>}
      {emailEnabled && <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { data, error } = signup
            ? await online!.auth.signUp({
                email,
                password,
                options: {
                  emailRedirectTo: location.origin + location.pathname,
                },
              })
            : await online!.auth.signInWithPassword({ email, password });
          if (error) notify(error.message);
          else if (signup && !data.session)
            notify("Check your email to confirm your account.");
          setBusy(false);
        }}
      >
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button disabled={busy}>
          {busy ? "Connecting…" : signup ? "Create account" : "Sign in"}
        </Button>
      </form>
      <button className="text-link" onClick={() => setSignup((v) => !v)}>
        {signup ? "Already have an account?" : "Create an account"}
      </button>
      </>}
      {!emailEnabled && !providers.length && <p className="caption">Sign-in is temporarily unavailable.</p>}
    </Card>
  );
}
