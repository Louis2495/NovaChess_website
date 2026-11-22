import { useEffect, useState } from "react";

export type HistoryImage = { url: string; credits: string };
type PageImageResponse = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages: { title: string; pageimage?: string; thumbnail?: { source: string } }[];
  };
};

const cache = new Map<string, HistoryImage | null>();

export function useHistoryImages(titles: string[]) {
  const key = [...new Set(titles)].sort().join("|");
  const [, refresh] = useState(0);
  useEffect(() => {
    const missing = key.split("|").filter(title => title && !cache.has(title));
    if (!missing.length) return;
    const controller = new AbortController();
    const endpoint = new URL("https://en.wikipedia.org/w/api.php");
    endpoint.search = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", origin: "*", redirects: "1",
      prop: "pageimages", piprop: "thumbnail|name", pilicense: "free", pilimit: "50",
      pithumbsize: "720", titles: missing.join("|"),
    }).toString();
    void fetch(endpoint, { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const data: PageImageResponse = await response.json();
      const query = data.query;
      if (!query || controller.signal.aborted) return;
      const aliases = new Map([...(query.normalized ?? []), ...(query.redirects ?? [])]
        .map(({ from, to }) => [from, to]));
      const pages = new Map(query.pages.map(page => [page.title, page]));
      for (const title of missing) {
        let target = title;
        const seen = new Set<string>();
        while (aliases.has(target) && !seen.has(target)) {
          seen.add(target);
          target = aliases.get(target)!;
        }
        const page = pages.get(target);
        cache.set(title, page?.thumbnail?.source && page.pageimage ? {
          url: page.thumbnail.source,
          credits: "https://en.wikipedia.org/wiki/File:" + encodeURIComponent(page.pageimage.replaceAll(" ", "_")),
        } : null);
      }
      refresh(count => count + 1);
    }).catch(() => {});
    return () => controller.abort();
  }, [key]);
  return cache;
}
