import { useState } from "react";
import { online, useOnlineSession } from "../lib/online";
import { useApp } from "../lib/context";
import { Button, Card, Field } from "./UI";
export default function OnlineAccount() {
  const { session } = useOnlineSession(),
    { notify } = useApp();
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
    </Card>
  );
}
