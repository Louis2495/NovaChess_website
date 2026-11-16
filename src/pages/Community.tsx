import { usePremoves } from "../lib/usePremoves";
import PremoveQueue from "../components/PremoveQueue";
import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import {
  Crown,
  Users,
  Vote,
  ArrowRight,
  Copy,
  Send,
  Flag,
  Handshake,
  MessageCircle,
  Snowflake,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
import { online, onlineAction, useOnlineSession } from "../lib/online";
import { useApp } from "../lib/context";
import { copyText } from "../lib/store";
import { specialLegal, type SpecialState } from "../lib/specialRules";
import { Board, type BoardMark } from "../components/Board";
import OnlineAccount from "../components/OnlineAccount";
import GameResult from "../components/GameResult";
import { Button, Card, Field, PageTitle } from "../components/UI";
type Member = { id: string; team: "w" | "b" | null };
type Room = {
  id: string;
  name: string;
  mode: string;
  variant: string;
  state: SpecialState & { lastWinner?: string; lastResult?: string };
  members: Member[];
  queue: string[];
  status: string;
  deadline: string | null;
  revision: number;
  marks: BoardMark[];
  settings: { bot: boolean };
};
type Profile = { id: string; username: string };
type Message = {
  id: number;
  user_id: string;
  body: string;
  created_at: string;
};
export default function Community() {
  const { session } = useOnlineSession(),
    { detail, navigate, notify, appearance } = useApp();
  const [rooms, setRooms] = useState<Room[]>([]),
    [room, setRoom] = useState<Room | null>(null),
    [profiles, setProfiles] = useState<Profile[]>([]),
    [mode, setMode] = useState("standard"),
    [name, setName] = useState(""),
    [variant, setVariant] = useState("chess"),
    [bot, setBot] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [chat, setChat] = useState(""),
    [votes, setVotes] = useState<
      { move: string; user_id: string; created_at: string }[]
    >([]),
    [armed, setArmed] = useState<"" | "freeze" | "swap">(""),
    [first, setFirst] = useState("");
  const uid = session?.user.id;
  const username = (id: string) =>
    profiles.find((p) => p.id === id)?.username || "Player";
  async function load() {
    if (!online || !uid) return;
    const [{ data: r, error }, { data: p }, { data: m }] = await Promise.all([
      online
        .from("rooms")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(40),
      online.from("profiles").select("id,username").limit(1000),
      online
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80),
    ]);
    if (error) {
      setError(error.message);
      return;
    }
    setRooms(r || []);
    setProfiles(p || []);
    setMessages((m || []).reverse());
    if (detail) {
      const found = (r || []).find((x) => x.id === detail);
      if (found) setRoom(found);
      else {
        const { data } = await online
          .from("rooms")
          .select("*")
          .eq("id", detail)
          .single();
        if (data) setRoom(data);
      }
    } else setRoom(null);
  }
  useEffect(() => {
    void load();
    if (!online || !uid) return;
    const channel = online
      .channel("novachess-lobby")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void online?.removeChannel(channel);
    };
  }, [uid, detail]);
  useEffect(() => {
    if (!online || !room || room.mode !== "vote") return;
    const fetchVotes = async () => {
      const { data } = await online!
        .from("votes")
        .select("move,user_id,created_at")
        .eq("room_id", room.id)
        .eq("revision", room.state.moves.length);
      setVotes(data || []);
    };
    void fetchVotes();
    const ch = online
      .channel("votes-" + room.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `room_id=eq.${room.id}`,
        },
        () => void fetchVotes(),
      )
      .subscribe();
    return () => {
      void online?.removeChannel(ch);
    };
  }, [room?.id, room?.revision]);
  async function act(
    action: string,
    extra: Record<string, unknown> = {},
    rethrow = false,
  ) {
    setBusy(true);
    setError("");
    try {
      const result = await onlineAction({
        action,
        room: room?.id,
        revision: room?.revision,
        ...extra,
      });
      if (result.id) {
        setRoom(result);
        if (!detail) navigate("community", result.id);
      }
      await load();
      setArmed("");
      setFirst("");
    } catch (e) {
      setError((e as Error).message);
      if (rethrow) throw e;
    } finally {
      setBusy(false);
    }
  }
  const me = room?.members.find((m) => m.id === uid),
    turn = room?.state.fen.split(" ")[1],
    canMove = room?.status === "playing" && me?.team === turn;
  let legal: string[] = [];
  if (room && room.state.result === "*")
    try {
      legal =
        room.variant === "chess"
          ? new Chess(room.state.fen)
              .moves({ verbose: true })
              .map((m) => m.from + m.to + (m.promotion || ""))
          : specialLegal(room.state);
    } catch {}
  const premove = usePremoves({
    fen: room?.state.fen || "8/8/8/8/8/8/8/8 w - - 0 1",
    side: me?.team || "w",
    legal,
    enabled: !!me?.team,
    active: room?.status === "playing" && room.state.result === "*",
    identity: room?.id,
    execute: (move) =>
      act(room?.mode === "vote" ? "vote" : "move", { move }, true),
    chaos: room?.variant === "chaos",
    blocked: room?.state.blocked || [],
  });
  const totals = Object.entries(
    votes.reduce(
      (acc, v) => ({ ...acc, [v.move]: (acc[v.move] || 0) + 1 }),
      {} as Record<string, number>,
    ),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <PageTitle title="Multiplayer">
        {room && (
          <Button className="secondary" onClick={() => navigate("community")}>
            Lobby
          </Button>
        )}
      </PageTitle>
      {!online || !uid ? (
        <OnlineAccount />
      ) : (
        <>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {room ? (
            <div className="chess-layout">
              <div className="board-column">
                <div className="card-heading">
                  <h2>{room.name}</h2>
                  <span className="pill">
                    {room.mode === "throne"
                      ? "Throne"
                      : room.mode === "vote"
                        ? "Vote Chess"
                        : room.mode === "team"
                          ? "Team chess"
                          : "Chess"}
                  </span>
                </div>
                <GameResult result={room.state.result} />
                {room.state.lastWinner && (
                  <p className="pill">
                    {username(room.state.lastWinner)} holds the throne
                  </p>
                )}
                <Board
                  fen={premove.preview}
                  materialFen={room.state.fen}
                  onCancelPremoves={premove.cancelOnRightClick}
                  flipped={me?.team === "b"}
                  disabled={
                    busy ||
                    room.status !== "playing" ||
                    !me?.team ||
                    (!canMove && !appearance.premoves)
                  }
                  legalMoves={canMove ? legal : premove.options}
                  blocked={room.state.blocked || []}
                  marks={room.mode === "team" ? room.marks : undefined}
                  onMarksChange={
                    room.mode === "team" && me?.team
                      ? (marks) => void act("marks", { marks })
                      : undefined
                  }
                  onMove={(from, to, promotion) =>
                    !canMove
                      ? premove.enqueue(from + to + (promotion || ""))
                      : void act(room.mode === "vote" ? "vote" : "move", {
                          move: from + to + (promotion || ""),
                        })
                  }
                  onSquare={
                    armed
                      ? (square) => {
                          if (armed === "freeze")
                            void act("move", {
                              specialAction: { type: "freeze", square },
                            });
                          else if (!first) setFirst(square);
                          else
                            void act("move", {
                              specialAction: {
                                type: "swap",
                                from: first,
                                to: square,
                              },
                            });
                        }
                      : undefined
                  }
                  selected={first || room.state.randomFrom || undefined}
                  onCancel={
                    armed
                      ? () => {
                          setArmed("");
                          setFirst("");
                        }
                      : undefined
                  }
                />
                <div className="button-row">
                  {room.variant === "chaos" && canMove && (
                    <>
                      <Button
                        className="secondary"
                        disabled={room.state.freezeUsed.includes(me!.team!)}
                        onClick={() => {
                          setArmed("freeze");
                          setFirst("");
                        }}
                      >
                        <Snowflake size={16} />
                        Freeze
                      </Button>
                      <Button
                        className="secondary"
                        disabled={room.state.swapUsed.includes(me!.team!)}
                        onClick={() => {
                          setArmed("swap");
                          setFirst("");
                        }}
                      >
                        <ArrowLeftRight size={16} />
                        Switch
                      </Button>
                    </>
                  )}
                  <PremoveQueue
                    moves={premove.queue}
                    undo={() => premove.setQueue((q) => q.slice(0, -1))}
                    clear={premove.clear}
                  />
                  {me?.team && room.settings.bot && (
                    <Button
                      className="draw-button"
                      disabled={busy || room.state.result !== "*"}
                      onClick={() => void act("draw")}
                    >
                      <Handshake size={16} />
                      Draw
                    </Button>
                  )}
                  {me?.team && room.mode !== "vote" && (
                    <Button
                      className="resign-button"
                      disabled={busy || room.state.result !== "*"}
                      onClick={() => void act("resign")}
                    >
                      <Flag size={16} />
                      Resign
                    </Button>
                  )}
                  <Button
                    className="secondary"
                    onClick={async () => {
                      const ok = await copyText(location.href);
                      notify(ok ? "Invite link copied." : location.href);
                    }}
                  >
                    <Copy size={16} />
                    Invite friends
                  </Button>
                </div>
              </div>
              <div className="side-panels">
                <Card>
                  <h2>
                    {room.status === "waiting"
                      ? "Waiting for players"
                      : room.state.result !== "*"
                        ? "Game finished"
                        : `${turn === "w" ? "White" : "Black"} to ${room.mode === "vote" ? "vote" : "move"}`}
                  </h2>
                  <div className="team-rosters">
                    {["w", "b"].map((team) => (
                      <div key={team}>
                        <b>{team === "w" ? "White" : "Black"}</b>
                        {room.members
                          .filter((m) => m.team === team)
                          .map((m) => (
                            <span key={m.id}>
                              {username(m.id)}
                              {m.id === uid ? " · you" : ""}
                            </span>
                          ))}
                        {team === "b" && room.settings.bot && (
                          <span>Computer</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {!me && (
                    <Button disabled={busy} onClick={() => void act("join")}>
                      Join{room.mode === "throne" ? " the queue" : ""}
                      <ArrowRight size={16} />
                    </Button>
                  )}
                  {room.mode === "throne" && (
                    <>
                      <h3>Queue</h3>
                      {room.queue.length ? (
                        room.queue.map((id, i) => (
                          <p key={id}>
                            {i + 1}. {username(id)}
                          </p>
                        ))
                      ) : (
                        <p className="caption">Queue is open.</p>
                      )}
                      {me && !me.team && !room.queue.includes(uid!) && (
                        <Button
                          disabled={busy}
                          onClick={() => void act("join")}
                        >
                          Join queue
                        </Button>
                      )}
                      {me && (
                        <Button
                          className="secondary"
                          disabled={busy}
                          onClick={() => void act("finish")}
                        >
                          <LogOut size={16} />
                          Finish
                        </Button>
                      )}
                    </>
                  )}
                  {room.mode === "vote" && (
                    <>
                      <p className="caption">
                        24-hour ballot · earliest vote breaks ties.
                      </p>
                      {room.deadline && (
                        <p>Closes {new Date(room.deadline).toLocaleString()}</p>
                      )}
                      <div className="vote-results">
                        {totals.map(([move, n]) => (
                          <div key={move}>
                            <b>{move}</b>
                            <span>
                              {n} vote{n !== 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                      {votes.some((v) => v.user_id === uid) && (
                        <p className="pill">Your vote is recorded</p>
                      )}
                    </>
                  )}
                </Card>
                <Card>
                  <div className="move-chips">
                    {room.state.notation.map((m, i) => (
                      <span key={i}>
                        {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}
                        {m}
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="online-lobby">
              <Card>
                <h2>New room</h2>
                <div className="multiplayer-modes">
                  {[
                    ["standard", "Chess", Users],
                    ["throne", "Throne", Crown],
                    ["vote", "Vote Chess", Vote],
                    ["team", "Team chess", Users],
                  ].map(([id, title, Icon]) => {
                    const I = Icon as typeof Users;
                    return (
                      <button
                        key={id as string}
                        aria-pressed={mode === id}
                        onClick={() => setMode(id as string)}
                      >
                        <I size={24} />
                        {title as string}
                      </button>
                    );
                  })}
                </div>
                <Field label="Room name">
                  <input
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Chess room"
                  />
                </Field>
                {mode !== "vote" && (
                  <Field label="Variant">
                    <select
                      value={variant}
                      onChange={(e) => setVariant(e.target.value)}
                    >
                      <option value="chess">Standard</option>
                      <option value="dropping">Dropping Squares</option>
                      <option value="chaos">Chaos chess</option>
                      <option value="random">Random</option>
                    </select>
                  </Field>
                )}
                {mode === "team" && (
                  <Field label="Opponent">
                    <select
                      value={bot ? "bot" : "friends"}
                      onChange={(e) => setBot(e.target.value === "bot")}
                    >
                      <option value="friends">Another team</option>
                      <option value="bot">Computer · standard</option>
                    </select>
                  </Field>
                )}
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act("create", {
                      mode,
                      name,
                      variant: mode === "team" && bot ? "chess" : variant,
                      bot,
                    })
                  }
                >
                  Create room
                  <ArrowRight size={16} />
                </Button>
              </Card>
              <Card>
                <h2>Open rooms</h2>
                <div className="room-list">
                  {rooms
                    .filter((r) => r.status !== "finished")
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => navigate("community", r.id)}
                      >
                        <span>
                          <b>{r.name}</b>
                          <small>
                            {r.mode === "throne"
                              ? "Throne"
                              : r.mode === "vote"
                                ? "Vote Chess"
                                : r.mode === "team"
                                  ? "Team chess"
                                  : "Chess"}{" "}
                            · {r.members.length} players
                          </small>
                        </span>
                        <Chevron />
                      </button>
                    ))}
                  {!rooms.length && <p className="caption">No rooms yet.</p>}
                </div>
              </Card>
            </div>
          )}
          <Card className="global-chat">
            <div className="card-heading">
              <h2>Global chat</h2>
              <MessageCircle size={21} />
            </div>
            <div
              className="chat-messages"
              role="log"
              aria-label="Global chat messages"
            >
              {messages.map((m) => (
                <div key={m.id}>
                  <b>{username(m.user_id)}</b>
                  <p>{m.body}</p>
                  <small>
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                  {m.user_id === uid ? (
                    <button
                      aria-label="Delete message"
                      onClick={async () => {
                        await online!.from("messages").delete().eq("id", m.id);
                        void load();
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      aria-label="Report message"
                      onClick={async () => {
                        const { error } = await online!
                          .from("reports")
                          .insert({ reporter: uid, message_id: m.id });
                        notify(
                          error ? "Report already recorded." : "Reported.",
                        );
                      }}
                    >
                      Report
                    </button>
                  )}
                </div>
              ))}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!chat.trim()) return;
                const { error } = await online!.rpc("post_message", {
                  p_body: chat.trim(),
                });
                if (error) notify(error.message);
                else setChat("");
              }}
            >
              <input
                aria-label="Message global chat"
                maxLength={600}
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                placeholder="Message"
              />
              <Button
                type="submit"
                disabled={!chat.trim()}
                aria-label="Send message"
              >
                <Send size={18} />
              </Button>
            </form>
          </Card>
        </>
      )}
    </>
  );
}
function Chevron() {
  return <ArrowRight size={17} />;
}
