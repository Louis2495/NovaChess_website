import { useEffect } from "react";
import { online } from "../lib/online";

export default function AccountPresence({userId}: {userId?:string}) {
  useEffect(() => {
    if (!online || !userId) return;
    const heartbeat = () => { void online!.rpc("account_heartbeat").then(() => {}, () => {}); };
    heartbeat();
    const timer = window.setInterval(heartbeat, 60000);
    window.addEventListener("focus", heartbeat);
    window.addEventListener("online", heartbeat);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", heartbeat);
      window.removeEventListener("online", heartbeat);
    };
  }, [userId]);
  return null;
}
