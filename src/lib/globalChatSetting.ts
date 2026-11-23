import { useEffect, useState } from "react";
import { online } from "./online";

const eventName = "novachess-global-chat-setting";

export function useGlobalChatSetting() {
  const [enabled, setEnabled] = useState<boolean | null>(online ? null : true);
  useEffect(() => {
    const client = online;
    if (!client) return;
    let active = true;
    let version = 0;
    const refresh = async () => {
      const request = ++version;
      const { data, error } = await client.rpc("global_chat_enabled");
      if (active && request === version && !error) setEnabled(data !== false);
    };
    const synchronize = (event: Event) => {
      version++;
      setEnabled((event as CustomEvent<boolean>).detail);
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener(eventName, synchronize);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(eventName, synchronize);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return enabled;
}

export async function setGlobalChatEnabled(enabled: boolean) {
  if (!online) throw Error("Online play is unavailable.");
  const { error } = await online.rpc("set_global_chat_enabled", { p_enabled: enabled });
  if (error) throw error;
  window.dispatchEvent(new CustomEvent(eventName, { detail: enabled }));
}
