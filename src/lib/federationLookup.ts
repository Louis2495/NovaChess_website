import { base } from "./store";
import {
  federationId,
  parseFIDEProfile,
  type Federation,
  type FederationProfile,
} from "./federations";
async function lookupEndpoint() {
  const configured = import.meta.env.VITE_FEDERATION_LOOKUP_URL;
  const project = import.meta.env.VITE_SUPABASE_URL;
  if (configured) return configured;
  if (project)
    return `${project.replace(/\/$/, "")}/functions/v1/federation-records`;
  const response = await fetch(`${base}federation-lookup.json`, {
    cache: "no-store",
  });
  if (!response.ok) return "";
  const config = await response.json();
  return typeof config.url === "string" && /^https:\/\//.test(config.url)
    ? config.url
    : "";
}
async function serverLookup(
  kind: Federation,
  id: string,
): Promise<FederationProfile> {
  const endpoint = await lookupEndpoint();
  if (!endpoint)
    throw Error(
      "USCF lookup is not connected yet. The site owner needs to deploy the federation lookup function.",
    );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id }),
    signal: AbortSignal.timeout(15000),
    credentials: "omit",
  });
  const record = await response.json();
  if (!response.ok || record.id !== id || record.source !== kind) {
    throw Error(
      record.error ||
        "The federation lookup server could not load this record.",
    );
  }
  return record;
}
export async function loadFederationProfile(
  kind: Federation,
  input: string,
): Promise<FederationProfile> {
  const id = federationId(kind, input);
  if (!id) throw Error("Enter a profile URL or member ID.");
  // US Chess does not permit the cross-origin HTML request from GitHub Pages.
  // Go straight to the public read-only function instead of a doomed browser fetch.
  if (kind === "uscf") return serverLookup(kind, id);
  try {
    const response = await fetch(`https://lichess.org/api/fide/player/${id}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw Error("FIDE lookup unavailable.");
    return parseFIDEProfile(await response.json(), id);
  } catch {
    try {
      return await serverLookup(kind, id);
    } catch {
      throw Error("FIDE lookup unavailable. Please try again later.");
    }
  }
}
