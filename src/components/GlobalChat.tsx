import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Flag, Trash2, ShieldBan } from "lucide-react";
import { online, useOnlineSession } from "../lib/online";
import { useApp } from "../lib/context";
import { pieceUrl } from "../lib/store";
import { Button, IconButton } from "./UI";
type Message = {
  id: number;
  user_id: string;
  body: string;
  created_at: string;
};
type Person = { id: string; username: string; avatar: string };
export default function GlobalChat() {
  const { library, navigate } = useApp(),
    { session } = useOnlineSession();
  const [open, setOpen] = useState(false),
    [messages, setMessages] = useState<Message[]>([]),
    [people, setPeople] = useState<Person[]>([]),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [moderator, setModerator] = useState(false),
    [reported, setReported] = useState<number[]>([]);
  const list = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open || !online || !session) return;
    const client = online;
    let active = true;
    async function load() {
      const [m, p, mod] = await Promise.all([
        client
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(80),
        client.from("profiles").select("id,username,avatar").limit(1000),
        client.rpc("is_chat_moderator"),
      ]);
      if (!active) return;
      if (m.error) {
        setError(m.error.message);
        return;
      }
      setMessages((m.data || []).reverse());
      setPeople(p.data || []);
      setModerator(mod.data === true);
      if (mod.data === true) {
        const r = await client.from("reports").select("message_id");
        if (active) setReported((r.data || []).map((r) => r.message_id));
      }
    }
    void load();
    const channel = client
      .channel("global-chat-dock")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => void load(),
      )
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [open, session?.user.id]);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages.length]);
  async function action(message: Message, kind: "delete" | "report" | "ban") {
    if (!online || !session) return;
    setError("");
    const result =
      kind === "report"
        ? await online
            .from("reports")
            .insert({ reporter: session.user.id, message_id: message.id })
        : moderator
          ? await online.rpc("moderate_chat", {
              p_message_id: message.id,
              p_ban: kind === "ban",
            })
          : await online.from("messages").delete().eq("id", message.id);
    if (result.error)
      setError(
        result.error.code === "23505"
          ? "Already reported."
          : result.error.message,
      );
    else if (kind === "report") setError("Reported for review.");
    else setMessages((m) => m.filter((v) => v.id !== message.id));
  }
  return (
    <>
      <button
        className="chat-launcher"
        aria-label="Open global chat"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle size={20} />
      </button>
      {open && (
        <aside
          className="global-chat-panel"
          aria-label="Global chat"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              e.stopPropagation();
            }
          }}
        >
          <div className="chat-dock-heading">
            <h2>Global chat</h2>
            <IconButton
              label="Close global chat"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </IconButton>
          </div>
          {!online ? (
            <p className="caption">Draft only · chat is not connected yet.</p>
          ) : !session ? (
            <Button
              className="text-button"
              onClick={() => {
                navigate("profile");
                setOpen(false);
              }}
            >
              Sign in to chat
            </Button>
          ) : null}
          <div
            className="chat-dock-messages"
            role="log"
            aria-label="Global chat messages"
            tabIndex={0}
            ref={list}
          >
            {messages.map((m) => {
              const self = m.user_id === session?.user.id,
                p = people.find((p) => p.id === m.user_id);
              return (
                <div className="chat-entry" key={m.id}>
                  <img
                    className="chat-avatar"
                    src={
                      self
                        ? library.profile.avatar || pieceUrl("wP", "Chessnut")
                        : p?.avatar || pieceUrl("wP", "Chessnut")
                    }
                    alt=""
                  />
                  <div>
                    <div className="chat-entry-meta">
                      <b>
                        {self ? library.profile.name : p?.username || "Player"}
                      </b>
                      <time dateTime={m.created_at}>
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p>{m.body}</p>
                    {moderator && reported.includes(m.id) && (
                      <small>Reported</small>
                    )}
                    <div className="chat-message-actions">
                      {(self || moderator) && (
                        <IconButton
                          label="Delete message"
                          onClick={() => void action(m, "delete")}
                        >
                          <Trash2 size={13} />
                        </IconButton>
                      )}
                      {!self && (
                        <IconButton
                          label="Report message"
                          onClick={() => void action(m, "report")}
                        >
                          <Flag size={13} />
                        </IconButton>
                      )}
                      {moderator && !self && (
                        <IconButton
                          label="Ban sender"
                          onClick={() => void action(m, "ban")}
                        >
                          <ShieldBan size={13} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {error && (
            <p role="status" className="caption">
              {error}
            </p>
          )}
          <form
            className="chat-compose"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!online || !session || !draft.trim() || sending) return;
              setSending(true);
              setError("");
              try {
                const { error } = await online.rpc("post_message", {
                  p_body: draft.trim(),
                });
                if (error) setError(error.message);
                else setDraft("");
              } catch {
                setError("Message could not be sent. Try again.");
              } finally {
                setSending(false);
              }
            }}
          >
            <input
              ref={input}
              aria-label="Message global chat"
              maxLength={600}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message"
            />
            <IconButton
              type="submit"
              label="Send message"
              disabled={!online || !session || !draft.trim() || sending}
            >
              <Send size={18} />
            </IconButton>
          </form>
        </aside>
      )}
    </>
  );
}
