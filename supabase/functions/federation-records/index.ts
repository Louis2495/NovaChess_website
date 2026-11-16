import {
  federationId,
  federationURL,
  parseFIDEProfile,
  parseUSCFProfile,
  type FederationProfile,
} from "../../../src/lib/federations.ts";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const cache = new Map<string, { until: number; record: FederationProfile }>();
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Use POST." }), {
      status: 405,
      headers,
    });
  try {
    const body = await req.json();
    if (!["fide", "uscf"].includes(body.kind) || typeof body.id !== "string")
      throw Error("Invalid federation request.");
    const kind = body.kind as "fide" | "uscf",
      id = federationId(kind, body.id);
    if (!id) throw Error("Member ID is required.");
    const key = kind + ":" + id,
      cached = cache.get(key);
    if (cached && cached.until > Date.now())
      return new Response(JSON.stringify(cached.record), { headers });
    const response = await fetch(
      kind === "fide"
        ? `https://lichess.org/api/fide/player/${id}`
        : federationURL(kind, id),
      {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: kind === "fide" ? "application/json" : "text/html" },
      },
    );
    if (!response.ok) throw Error("Federation record unavailable.");
    const record =
      kind === "fide"
        ? parseFIDEProfile(await response.json(), id)
        : parseUSCFProfile(await response.text(), id);
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key, { until: Date.now() + 6 * 3600000, record });
    return new Response(JSON.stringify(record), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers,
    });
  }
});
