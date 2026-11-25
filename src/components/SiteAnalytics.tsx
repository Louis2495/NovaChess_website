import { useEffect, useState } from "react";
import { online } from "../lib/online";
import { Button, Card, Field, Toggle } from "./UI";

type Day = { day: string; views: number; sessions: number; signups: number; ratedGames: number };
type Snapshot = {
  views: number;
  sessions: number;
  accounts: number;
  filters?: { enabled: boolean; emails: string[] };
  days: Day[];
  pages: { page: string; views: number }[];
};

const number = new Intl.NumberFormat();
const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const dateLabel = (value: string) => date.format(new Date(value));
const metrics = { views: "Page views", sessions: "Browser sessions", signups: "New accounts", ratedGames: "Rated games" };

export default function SiteAnalytics() {
  const [period, setPeriod] = useState(30);
  const [metric, setMetric] = useState<keyof typeof metrics>("views");
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [email, setEmail] = useState("");
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterError, setFilterError] = useState("");

  async function saveFilter(params: { p_enabled?: boolean; p_email?: string; p_remove?: boolean }) {
    if (!online) return;
    setSavingFilter(true);
    setFilterError("");
    try {
      const { error } = await online.rpc("set_owner_analytics_filter", params);
      if (error) throw error;
      if (params.p_email && !params.p_remove) setEmail("");
      setRevision(value => value + 1);
    } catch (error) {
      setFilterError((error as Error).message);
    } finally {
      setSavingFilter(false);
    }
  }

  useEffect(() => {
    if (!online) return;
    let active = true;
    setError("");
    setSnapshot(undefined);
    void online.rpc("owner_site_analytics", { p_days: period }).then(({ data, error }) => {
      if (!active) return;
      if (error || !Array.isArray(data?.days)) setError(error?.message || "Analytics are unavailable.");
      else setSnapshot(data);
    }, () => {
      if (active) setError("Analytics could not be loaded.");
    });
    return () => { active = false; };
  }, [period, revision]);

  const peak = Math.max(1, ...(snapshot?.days.map(day => day[metric]) ?? []));
  return <Card className="site-analytics" aria-label="Website analytics">
    <div className="site-analytics-heading">
      <h2>Website analytics</h2>
      <div className="site-analytics-controls">
        <Field label="Date range"><select value={period} onChange={event => setPeriod(Number(event.target.value))}>
          {[7, 30, 90].map(days => <option key={days} value={days}>Last {days} days</option>)}
        </select></Field>
        <Button className="secondary" onClick={() => setRevision(value => value + 1)}>Refresh</Button>
      </div>
    </div>
    {error ? <p role="alert">{error}</p> : !snapshot ? <p role="status">Loading analytics…</p> : <>
      {snapshot.filters && <section className="site-analytics-filters" aria-label="Analytics exclusions">
        <fieldset disabled={savingFilter}>
          <Toggle label="Exclude my account and added accounts" checked={snapshot.filters.enabled}
            onChange={enabled => void saveFilter({ p_enabled: enabled })} />
          <form className="site-analytics-add-email" onSubmit={event => {
            event.preventDefault();
            void saveFilter({ p_email: email.trim() });
          }}>
            <Field label="Email to exclude"><input type="email" value={email} required maxLength={254}
              onChange={event => setEmail(event.target.value)} /></Field>
            <Button className="secondary">Add email</Button>
          </form>
          {!!snapshot.filters.emails.length && <ul>
            {snapshot.filters.emails.map(address => <li key={address}><span>{address}</span>
              <Button className="secondary" aria-label={`Remove ${address}`}
                onClick={() => void saveFilter({ p_email: address, p_remove: true })}>Remove</Button>
            </li>)}
          </ul>}
        </fieldset>
        <p className="caption">This filter hides selected accounts, their rated games, and browser sessions linked to them. Unlinked guest traffic stays in the totals.</p>
        {filterError && <p role="alert">{filterError}</p>}
      </section>}
      <dl className="site-analytics-totals">
        {([
          ["Page views", snapshot.views],
          ["Browser sessions", snapshot.sessions],
          ["New accounts", snapshot.days.reduce((sum, day) => sum + day.signups, 0)],
          ["Rated games", snapshot.days.reduce((sum, day) => sum + day.ratedGames, 0)],
          ["Total accounts", snapshot.accounts],
        ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number.format(value)}</dd></div>)}
      </dl>
      <div className="site-analytics-panels">
        <section aria-label="Daily activity">
          <Field label="Daily activity"><select value={metric} onChange={event => setMetric(event.target.value as keyof typeof metrics)}>
            {Object.entries(metrics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></Field>
          <div className="site-analytics-bars" aria-hidden="true">
            {snapshot.days.map(day => <div key={day.day} title={`${dateLabel(day.day)} · ${number.format(day[metric])}`}>
              <span style={{ height: `${day[metric] / peak * 100}%` }} />
            </div>)}
          </div>
          {!!snapshot.days.length && <div className="site-analytics-dates">
            <span>{dateLabel(snapshot.days[0].day)}</span><span>{dateLabel(snapshot.days.at(-1)!.day)}</span>
          </div>}
          <details><summary>Daily figures</summary><div className="admin-account-table">
            <table><thead><tr><th>Date (UTC)</th><th>Views</th><th>Sessions</th><th>New accounts</th><th>Rated games</th></tr></thead>
              <tbody>{[...snapshot.days].reverse().map(day => <tr key={day.day}><th scope="row">{day.day}</th>
                <td>{number.format(day.views)}</td><td>{number.format(day.sessions)}</td>
                <td>{number.format(day.signups)}</td><td>{number.format(day.ratedGames)}</td>
              </tr>)}</tbody>
            </table>
          </div></details>
        </section>
        <section aria-label="Top pages">
          <h3>Top pages</h3>
          {snapshot.pages.length ? <ol>{snapshot.pages.map(({ page, views }) =>
            <li key={page}><span>{page === "signin" ? "Sign in" : page}</span><strong>{number.format(views)}</strong></li>)}</ol>
            : <p className="caption">No traffic recorded in this period.</p>}
        </section>
      </div>
      <p className="caption">Traffic is recorded from the start of collection. Browser sessions include guests and can count the same person more than once. Rated games include server-recorded rated results.</p>
    </>}
  </Card>;
}
