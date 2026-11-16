import { useRef, useState } from "react";
import { RefreshCw, Save, ArrowUpRight } from "lucide-react";
import { useApp } from "../lib/context";
import {
  federationId,
  federationRating,
  federationURL,
  type Federation,
  type FederationProfile,
} from "../lib/federations";
import { loadFederationProfile } from "../lib/federationLookup";
import { Button, Card, Field, IconButton } from "./UI";
const kinds = ["fide", "uscf"] as const;
export function FederationProfiles() {
  const { library, setLibrary, notify } = useApp();
  const [drafts, setDrafts] = useState<Record<Federation, FederationProfile>>(
      () => ({
        fide: library.profile.federations?.fide || { id: "" },
        uscf: library.profile.federations?.uscf || { id: "" },
      }),
    ),
    [busy, setBusy] = useState<Federation | null>(null),
    [error, setError] = useState("");
  const latestDrafts = useRef(drafts);
  latestDrafts.current = drafts;
  function change(
    kind: Federation,
    field: keyof FederationProfile,
    value: string,
  ) {
    setDrafts((d) => ({
      ...d,
      [kind]:
        field === "id"
          ? { id: value }
          : {
              ...d[kind],
              [field]: ["standard", "rapid", "blitz"].includes(field)
                ? federationRating(value)
                : value,
              source: "entered",
              updatedAt: Date.now(),
            },
    }));
  }
  async function load(kind: Federation) {
    setBusy(kind);
    setError("");
    try {
      const requested = drafts[kind];
      const record = await loadFederationProfile(kind, requested.id);
      if (latestDrafts.current[kind] !== requested) return;
      setDrafts((d) => ({ ...d, [kind]: record }));
      setLibrary((l) => ({
        ...l,
        profile: {
          ...l.profile,
          federations: { ...l.profile.federations, [kind]: record },
        },
      }));
      notify("Federation profile loaded.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card className="federation-profiles">
      <h2>Federation profiles</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const records: Partial<Record<Federation, FederationProfile>> = {};
            for (const kind of kinds) {
              const record = drafts[kind],
                id = federationId(kind, record.id);
              if (id)
                records[kind] = {
                  ...record,
                  id,
                  source: record.source || "entered",
                  updatedAt: record.updatedAt || Date.now(),
                };
            }
            setLibrary((l) => ({
              ...l,
              profile: { ...l.profile, federations: records },
            }));
            setError("");
            notify("Federation profiles saved.");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <div className="federation-edit-grid">
          {kinds.map((kind) => (
            <fieldset key={kind}>
              <legend>{kind === "fide" ? "FIDE" : "USCF"}</legend>
              <div className="federation-id-row">
                <Field label={`${kind.toUpperCase()} profile`}>
                  <input
                    aria-label={`${kind.toUpperCase()} profile`}
                    value={drafts[kind].id}
                    onChange={(e) => change(kind, "id", e.target.value)}
                    placeholder="Profile URL or ID"
                  />
                </Field>
                <IconButton
                  type="button"
                  label={`Load ${kind.toUpperCase()} profile`}
                  disabled={!!busy || !drafts[kind].id.trim()}
                  onClick={() => void load(kind)}
                >
                  <RefreshCw
                    className={busy === kind ? "spin" : ""}
                    size={18}
                  />
                </IconButton>
              </div>
              <Field label="Player name">
                <input
                  aria-label={`${kind.toUpperCase()} player name`}
                  value={drafts[kind].name || ""}
                  onChange={(e) => change(kind, "name", e.target.value)}
                />
              </Field>
              <div className="federation-rating-fields">
                {(["standard", "rapid", "blitz"] as const).map((key) => (
                  <Field
                    key={key}
                    label={
                      key === "standard"
                        ? kind === "fide"
                          ? "Standard"
                          : "Regular"
                        : key === "rapid"
                          ? kind === "fide"
                            ? "Rapid"
                            : "Quick"
                          : "Blitz"
                    }
                  >
                    <input
                      aria-label={`${kind.toUpperCase()} ${key === "rapid" && kind === "uscf" ? "quick" : key === "standard" && kind === "uscf" ? "regular" : key} rating`}
                      type="number"
                      min={0}
                      max={5000}
                      value={drafts[kind][key] ?? ""}
                      onChange={(e) => change(kind, key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button className="secondary" type="submit">
          <Save size={16} />
          Save profiles
        </Button>
      </form>
    </Card>
  );
}
export function FederationCards() {
  const { library, navigate } = useApp();
  const records = kinds.filter((k) => library.profile.federations?.[k]);
  if (!records.length)
    return (
      <Card>
        <Button className="secondary" onClick={() => navigate("profile")}>
          Attach federation profiles
        </Button>
      </Card>
    );
  return (
    <div className="federation-cards">
      {records.map((kind) => {
        const r = library.profile.federations![kind]!;
        return (
          <Card key={kind}>
            <div className="card-heading">
              <h2>{kind === "fide" ? "FIDE" : "USCF"}</h2>
              <a
                className="external"
                href={federationURL(kind, r.id)}
                target="_blank"
                rel="noreferrer"
                aria-label={`${kind.toUpperCase()} official record`}
              >
                <ArrowUpRight size={18} />
              </a>
            </div>
            <p className="federation-player">
              {r.title && <span className="pill">{r.title}</span>}
              {r.name || r.id}
            </p>
            {r.federation && <p className="caption">{r.federation}</p>}
            <div className="federation-rating-summary">
              {(["standard", "rapid", "blitz"] as const).map((key) => (
                <div key={key}>
                  <strong>{r[key] ?? "—"}</strong>
                  <span>
                    {key === "standard"
                      ? kind === "fide"
                        ? "Standard"
                        : "Regular"
                      : key === "rapid"
                        ? kind === "fide"
                          ? "Rapid"
                          : "Quick"
                        : "Blitz"}
                  </span>
                </div>
              ))}
            </div>
            <p className="caption">
              {r.source === "entered"
                ? "Entered ratings"
                : r.source === "fide"
                  ? "FIDE data via Lichess"
                  : "US Chess record"}
              {r.updatedAt
                ? ` · ${new Date(r.updatedAt).toLocaleDateString()}`
                : ""}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
