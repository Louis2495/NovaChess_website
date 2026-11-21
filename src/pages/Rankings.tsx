import {screenName} from "../lib/screenName";
import { FederationCards } from "../components/FederationProfiles";
import { useEffect, useState } from "react";
import { Trophy, ArrowUpRight } from "lucide-react";
import { online, useOnlineSession } from "../lib/online";
import { regions } from "../lib/regions";
import { ChoiceSelect, Button, Card, Field, PageTitle } from "../components/UI";
type Ranking = {
  id: string;
  username: string; screen_name?:string;
  country: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  global_rank: number;
  country_rank: number;
  global_percentile: number;
  country_percentile: number;
};
export default function Rankings({ embedded = false }: { embedded?: boolean }) {
  const { session } = useOnlineSession();
  const [country, setCountry] = useState(""),
    [rankings, setRankings] = useState<Ranking[]>([]),
    [mine, setMine] = useState<Ranking | null>(null),
    [error, setError] = useState(""),
    [federation, setFederation] = useState("FIDE"),
    [memberId, setMemberId] = useState("");
  useEffect(() => {
    if (!online) return;
    let active = true;
    let q = online
      .from("rankings")
      .select("*")
      .order("rating", { ascending: false })
      .limit(100);
    if (country) q = q.eq("country", country);
    q.then(({ data, error }) => {
      if (active) {
        setRankings(data || []);
        setError(error?.message || "");
      }
    });
    if (session)
      online
        .from("rankings")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (active) setMine(data);
        });
    return () => {
      active = false;
    };
  }, [country, session?.user.id]);
  const officialUrl =
    federation === "FIDE"
      ? "https://ratings.fide.com/profile/" + encodeURIComponent(memberId)
      : "https://www.uschess.org/msa/MbrDtlMain.php?" +
        encodeURIComponent(memberId);
  return (
    <div className={`rankings-page ${embedded ? "stats-rankings" : ""}`}>
      {!embedded && <PageTitle title="Rankings" />}
      <div className="rank-summary" aria-label="Your online ranking">
        {mine ? (
          <>
            <Card>
              <span>Global</span>
              <strong>#{mine.global_rank}</strong>
              <p>{mine.global_percentile}th percentile</p>
            </Card>
            <Card>
              <span>{mine.country || "Country not set"}</span>
              <strong>#{mine.country_rank}</strong>
              <p>{mine.country_percentile}th percentile</p>
            </Card>
            <Card>
              <span>NovaChess rating</span>
              <strong>{mine.rating}</strong>
              <p>
                {mine.wins} W · {mine.draws} D · {mine.losses} L
              </p>
            </Card>
          </>
        ) : (
          <Card>
            <Trophy size={35} />
            <p className="caption">
              Rankings begin after five rated online games.
            </p>
          </Card>
        )}
      </div>
      <div className="section-toolbar">
        <h2>Leaderboard</h2>
        <ChoiceSelect
          aria-label="Rankings country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="">Global</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </ChoiceSelect>
      </div>
      <Card className="rank-table">
        {!online ? (
          <p className="caption">Online rankings are not connected yet.</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : rankings.length ? (
          <table className="stats-leaderboard" aria-label="NovaChess leaderboard">
            <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Rating</th></tr></thead>
            <tbody>{rankings.map(r => (
              <tr key={r.id} className={r.id === session?.user.id ? "you" : ""}>
                <td>#{country ? r.country_rank : r.global_rank}</td>
                <td>{r.country && <span aria-hidden="true">{flag(r.country)} </span>}{screenName(r)}</td>
                <td><strong>{r.rating}</strong></td>
              </tr>
            ))}</tbody>
          </table>
        ) : (
          <p className="caption">No ranked players yet.</p>
        )}
      </Card>
      <div className="stats-federation"><FederationCards />
      <Card className="rating-lookup">
        <h2>Federation ratings</h2>
        <div className="inline-form">
          <Field label="Federation">
            <ChoiceSelect
              value={federation}
              onChange={(e) => setFederation(e.target.value)}
            >
              <option>FIDE</option>
              <option>USCF</option>
            </ChoiceSelect>
          </Field>
          <Field label="Member ID">
            <input
              inputMode="numeric"
              maxLength={12}
              value={memberId}
              onChange={(e) => setMemberId(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          {memberId ? (
            <a
              className="btn secondary"
              href={officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              Official record
              <ArrowUpRight size={16} />
            </a>
          ) : (
            <Button disabled>Official record</Button>
          )}
        </div>
      </Card>
      </div>
    </div>
  );
}
function flag(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? [...code]
        .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
        .join("")
    : "";
}
