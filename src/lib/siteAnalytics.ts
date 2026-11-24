import { useEffect } from "react";
import { online } from "./online";

let sessionId: string | undefined;
let previousLocation: string | undefined;

export function useSitePageTracking(page: string, detail: string) {
  useEffect(() => {
    const client = online;
    if (!client || !globalThis.crypto?.randomUUID) return;
    const location = JSON.stringify([page, detail]);
    if (previousLocation === location) return;
    previousLocation = location;
    if (page === "profile" && detail === "admin") return;

    if (!sessionId) {
      try {
        const key = "matein4-analytics-session";
        sessionId = sessionStorage.getItem(key) || crypto.randomUUID();
        sessionStorage.setItem(key, sessionId);
      } catch {
        sessionId ??= crypto.randomUUID();
      }
    }
    void client.rpc("record_site_page", { p_session: sessionId, p_page: page }).then(undefined, () => {});
  }, [page, detail]);
}
