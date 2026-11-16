import { online } from "./online";
import {
  federationId,
  federationURL,
  parseFIDEProfile,
  parseUSCFProfile,
  type Federation,
  type FederationProfile,
} from "./federations";
export async function loadFederationProfile(
  kind: Federation,
  input: string,
): Promise<FederationProfile> {
  const id = federationId(kind, input);
  if (!id) throw Error("Enter a profile URL or member ID.");
  try {
    if (kind === "fide") {
      const response = await fetch(
        `https://lichess.org/api/fide/player/${id}`,
        { signal: AbortSignal.timeout(12000) },
      );
      if (!response.ok) throw Error("FIDE lookup unavailable.");
      return parseFIDEProfile(await response.json(), id);
    }
    const response = await fetch(federationURL(kind, id), {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error("USCF lookup unavailable.");
    return parseUSCFProfile(await response.text(), id);
  } catch {
    if (online) {
      const { data, error } = await online.functions.invoke(
        "federation-records",
        { body: { kind, id } },
      );
      if (!error && data?.id === id) return data;
    }
    throw Error(
      `${kind === "fide" ? "FIDE" : "USCF"} lookup unavailable. You can enter ratings below.`,
    );
  }
}
