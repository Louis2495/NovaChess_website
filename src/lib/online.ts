import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const online = url && key ? createClient(url, key) : null;
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
