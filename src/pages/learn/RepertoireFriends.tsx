import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field } from "../../components/UI";
import { useApp } from "../../lib/context";
import { online, useOnlineSession } from "../../lib/online";
import { usePlayers } from "../../lib/players";
import { parseRepertoireStudy } from "../../lib/repertoire";
import { screenName } from "../../lib/screenName";

export function ShareWithFriend({ pgn, onSent }: { pgn: string; onSent: () => void }) {
  const { session, ready } = useOnlineSession();
  if (!ready) return null;
  if (!session) return <p className="caption">Sign in to share directly with a friend.</p>;
  return <FriendPicker key={session.user.id} pgn={pgn} onSent={onSent} />;
}

function FriendPicker({ pgn, onSent }: { pgn: string; onSent: () => void }) {
  const { players, loading, error } = usePlayers("", "friends");
  const { notify } = useApp();
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const friend = players.find(player => player.id === recipient && player.relationship === "friends");

  async function send() {
    if (!online || !friend || !pgn || sending) return;
    setSendError("");
    setSending(true);
    try {
      const { error } = await online.rpc("send_repertoire_share", { p_recipient: friend.id, p_pgn: pgn });
      if (error) throw error;
      notify(`Repertoire sent to ${screenName(friend)}.`);
      onSent();
    } catch (error) {
      setSendError((error as Error).message || "Could not share these lines.");
    } finally {
      setSending(false);
    }
  }

  return <section className="repertoire-share-friend" aria-label="Share with a friend">
    <h3>Share with a friend</h3>
    {loading ? <p className="caption">Loading friends…</p> : error ? <p role="alert">{error}</p> : !players.length ?
      <p className="caption">Add a friend in Players to share with them here.</p> : <div className="repertoire-friend-picker">
        <Field label="Friend">
          <select value={recipient} disabled={sending} onChange={event => setRecipient(event.target.value)}>
            <option value="">Choose a friend</option>
            {players.filter(player => player.relationship === "friends").map(player =>
              <option key={player.id} value={player.id}>{screenName(player)}</option>)}
          </select>
        </Field>
        <Button disabled={!friend || !pgn || sending} onClick={() => void send()}>{sending ? "Sending…" : "Send to friend"}</Button>
      </div>}
    {sendError && <p role="alert">{sendError}</p>}
  </section>;
}

type IncomingShare = { id: string; pgn: string; username: string; screen_name: string };

export function RepertoireInbox() {
  const { session } = useOnlineSession();
  return session ? <Inbox key={session.user.id} /> : null;
}

function Inbox() {
  const [shares, setShares] = useState<IncomingShare[]>([]);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let loading = false;
    async function refresh() {
      if (!online || loading) return;
      loading = true;
      try {
        const { data, error } = await online.rpc("repertoire_share_inbox");
        if (!active) return;
        if (error) throw error;
        setShares(Array.isArray(data) ? data : []);
        setError("");
      } catch {
        if (active) setError("Could not load repertoire shares. Retrying shortly.");
      } finally {
        loading = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [version]);

  if (!shares.length && !error) return null;
  return <Card className="repertoire-inbox" aria-label="Shared with you">
    <h2>Shared with you</h2>
    {error && <p role="status">{error}</p>}
    {shares.map(share => <IncomingRepertoire key={share.id} share={share} onRespond={() => {
      setShares(current => current.filter(item => item.id !== share.id));
      setVersion(current => current + 1);
    }} />)}
  </Card>;
}

function IncomingRepertoire({ share, onRespond }: { share: IncomingShare; onRespond: () => void }) {
  const { setLibrary, notify } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lines = useMemo(() => {
    try { return parseRepertoireStudy(share.pgn); }
    catch { return []; }
  }, [share.pgn]);
  const sender = screenName(share);

  async function respond(accept: boolean) {
    if (!online || busy || (accept && !lines.length)) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await online.rpc("respond_repertoire_share", { p_share: share.id, p_accept: accept });
      if (error) throw error;
      if (accept) {
        const received = lines.map((line, index) => ({ ...line, id: `shared-${share.id}-${index}` }));
        setLibrary(current => ({
          ...current,
          repertoire: [...current.repertoire, ...received.filter(line =>
            !current.repertoire.some(saved => saved.id === line.id))],
        }));
        notify(`Added ${lines.length} ${lines.length === 1 ? "line" : "lines"} from ${sender}.`);
      }
      onRespond();
    } catch (error) {
      setError((error as Error).message || "Could not respond to this share.");
    } finally {
      setBusy(false);
    }
  }

  return <article className="repertoire-incoming">
    <div>
      <h3>{sender} shared {lines.length ? `${lines.length} ${lines.length === 1 ? "line" : "lines"}` : "a repertoire"}</h3>
      {lines.length ? <details><summary>View lines</summary>
        <ul>{lines.map((line, index) => <li key={index}>{line.name}</li>)}</ul>
      </details> : <p className="caption">These lines could not be read.</p>}
      {error && <p role="alert">{error}</p>}
    </div>
    <div className="button-row">
      <Button disabled={busy || !lines.length} onClick={() => void respond(true)}>Accept</Button>
      <Button className="secondary" disabled={busy} onClick={() => void respond(false)}>Reject</Button>
    </div>
  </article>;
}
