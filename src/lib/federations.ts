export type Federation = "fide" | "uscf";
export type FederationProfile = {
  id: string;
  name?: string;
  title?: string;
  federation?: string;
  birthYear?: number;
  standard?: number;
  rapid?: number;
  blitz?: number;
  updatedAt?: number;
  source?: "entered" | "fide" | "uscf";
};
export const federationURL = (kind: Federation, id: string) =>
  kind === "fide"
    ? `https://ratings.fide.com/profile/${id}`
    : `https://www.uschess.org/msa/MbrDtlMain.php?${id}`;
export function federationId(kind: Federation, input: string) {
  let value = input.trim();
  if (!value) return "";
  if (!/^\d+$/.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw Error("Enter a profile URL or member ID.");
    }
    const allowed =
      kind === "fide"
        ? ["ratings.fide.com"]
        : ["www.uschess.org", "uschess.org", "ratings.uschess.org"];
    if (
      !allowed.includes(url.hostname.toLowerCase()) ||
      url.protocol !== "https:"
    )
      throw Error("Use the official federation profile URL.");
    value =
      (kind === "fide"
        ? url.pathname.match(/\/profile\/(\d+)/)?.[1] ||
          url.searchParams.get("event")
        : url.pathname.match(/\/player\/(\d+)/)?.[1] ||
          url.search.match(/^\?(\d+)/)?.[1] ||
          url.searchParams.get("id")) || "";
  }
  if (!(kind === "uscf" ? /^\d{8}$/ : /^\d{4,12}$/).test(value))
    throw Error(
      kind === "uscf"
        ? "USCF IDs contain eight digits."
        : "Enter a valid FIDE ID.",
    );
  return value;
}
export function federationRating(value: unknown) {
  const n =
    typeof value === "number"
      ? value
      : Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 && n <= 5000 ? Math.round(n) : undefined;
}
export function parseFIDEProfile(
  data: Record<string, unknown>,
  id: string,
): FederationProfile {
  if (
    String(data.id) !== id ||
    typeof data.name !== "string" ||
    !data.name.trim()
  )
    throw Error("FIDE player not found.");
  return {
    id,
    name: data.name.slice(0, 120),
    title: typeof data.title === "string" ? data.title : undefined,
    federation:
      typeof data.federation === "string" ? data.federation : undefined,
    birthYear: typeof data.year === "number" ? data.year : undefined,
    standard: federationRating(data.standard),
    rapid: federationRating(data.rapid),
    blitz: federationRating(data.blitz),
    updatedAt: Date.now(),
    source: "fide",
  };
}
const plain = (html: string) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
export function parseUSCFProfile(html: string, id: string): FederationProfile {
  const rows = (html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || []).map(plain);
  const rating = (label: string) => {
    const row = rows.find((r) =>
      new RegExp(`\\b${label}\\s+Rating\\b`, "i").test(r),
    );
    const match = row?.match(
      new RegExp(`\\b${label}\\s+Rating\\s*:?\\s*([0-9]{1,4})(?![0-9])`, "i"),
    );
    return federationRating(match?.[1]);
  };
  const title = html.match(new RegExp(`\\b${id}\\s*[:–-]\\s*([^<\\r\\n]+)`));
  const name = title
    ? plain(title[1]).replace(/\s*\([^)]*\)\s*$/, "")
    : undefined;
  const standard = rating("Regular"),
    rapid = rating("Quick"),
    blitz = rating("Blitz");
  if (!standard && !rapid && !blitz && !name)
    throw Error("USCF ratings could not be read from the official record.");
  return {
    id,
    name,
    standard,
    rapid,
    blitz,
    source: "uscf",
    updatedAt: Date.now(),
  };
}
