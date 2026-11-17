import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Flag, Trash2, ShieldBan, ArrowDownRight } from "lucide-react";
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
type ChatBox = { left: number; top: number; width: number; height: number };
function fitChat(box: ChatBox): ChatBox {
  const bottom = innerWidth <= 1000 ? 80 : 12;
  const width = Math.max(Math.min(280, innerWidth-24), Math.min(box.width, innerWidth-24));
  const height = Math.max(Math.min(320, innerHeight-bottom-12), Math.min(box.height, innerHeight-bottom-12));
  return { width, height, left: Math.max(12, Math.min(box.left, innerWidth-width-12)), top: Math.max(12,Math.min(box.top,innerHeight-height-bottom)) };
}
export default function GlobalChat() {
  const [box, setBox] = useState<ChatBox>(() => fitChat({left:innerWidth>1000?220:12,top:40,width:440,height:760}));
  const moving = useRef<(ChatBox & { kind:string; x:number; y:number }) | null>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { const resize = () => setBox(b => fitChat(b)); window.addEventListener("resize",resize); return () => window.removeEventListener("resize",resize); },[]);
  function begin(e: React.PointerEvent<HTMLElement>, kind: string) {
    if(e.button!==0 || kind==="move" && (e.target as HTMLElement).closest("button")) return;
    e.preventDefault(); e.stopPropagation();
    const r=panel.current!.getBoundingClientRect();
    moving.current={kind,x:e.clientX,y:e.clientY,left:r.left,top:r.top,width:r.width,height:r.height};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function motion(e: React.PointerEvent<HTMLElement>) {
    const r=moving.current; if(!r) return; e.preventDefault(); e.stopPropagation();
    const dx=e.clientX-r.x,dy=e.clientY-r.y;
    if (r.kind === "move") { setBox(fitChat({...r,left:r.left+dx,top:r.top+dy})); return; }
    const bottom = innerHeight-(innerWidth<=1000?80:12);
    const minW=Math.min(280,innerWidth-24), minH=Math.min(320,bottom-12);
    let left=r.left, top=r.top, right=r.left+r.width, end=r.top+r.height;
    if(r.kind.includes("w")) left=Math.max(12,Math.min(right-minW,r.left+dx));
    if(r.kind.includes("e") || r.kind==="size") right=Math.min(innerWidth-12,Math.max(left+minW,r.left+r.width+dx));
    if(r.kind.includes("n")) top=Math.max(12,Math.min(end-minH,r.top+dy));
    if(r.kind.includes("s") || r.kind==="size") end=Math.min(bottom,Math.max(top+minH,r.top+r.height+dy));
    setBox({left,top,width:right-left,height:end-top});
  }
  function end(e: React.PointerEvent<HTMLElement>) { moving.current=null; if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId); }
  const { library, navigate } = useApp(),
    { session } = useOnlineSession();
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.getElementById("sidebar-chat")), []);
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
    else moving.current = null;
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
      {host && createPortal(<button
        className={`chat-sidebar-button ${open ? "active" : ""}`}
        aria-label="Open global chat"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle size={19} /><span>Chat</span>
      </button>, host)}
      {open && (
        <aside
          className="global-chat-panel"
          ref={panel}
          style={{...box,right:"auto",bottom:"auto",maxHeight:"none"}}
          aria-label="Global chat"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              e.stopPropagation();
            }
          }}
        >
          <div className="chat-dock-heading" role="group" aria-label="Move chat" tabIndex={0}
            onPointerDown={e=>begin(e,"move")} onPointerMove={motion} onPointerUp={end} onPointerCancel={end}
            onKeyDown={e=>{ if(e.target!==e.currentTarget || !["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return; e.preventDefault();e.stopPropagation();setBox(b=>fitChat({...b,left:b.left+(e.key==="ArrowRight"?20:e.key==="ArrowLeft"?-20:0),top:b.top+(e.key==="ArrowDown"?20:e.key==="ArrowUp"?-20:0)})); }}>
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
          {["n","e","s","w","ne","nw","sw"].map(edge => <div key={edge} className={`chat-edge chat-edge-${edge}`} aria-hidden="true"
            onPointerDown={e=>begin(e,edge)} onPointerMove={motion} onPointerUp={end} onPointerCancel={end} />)}
          <div className="chat-resize-handle" role="slider" aria-label="Resize chat" aria-valuemin={Math.min(320,innerHeight-92)} aria-valuemax={innerHeight} aria-valuenow={Math.round(box.height)} aria-valuetext={`${Math.round(box.width)} by ${Math.round(box.height)} pixels`} tabIndex={0}
            onPointerDown={e=>begin(e,"size")} onPointerMove={motion} onPointerUp={end} onPointerCancel={end}
            onKeyDown={e=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;e.preventDefault();e.stopPropagation();setBox(b=>fitChat({...b,width:b.width+(e.key==="ArrowRight"?20:e.key==="ArrowLeft"?-20:0),height:b.height+(e.key==="ArrowDown"?20:e.key==="ArrowUp"?-20:0)}));}}><ArrowDownRight size={17}/></div>
        </aside>
      )}
    </>
  );
}
