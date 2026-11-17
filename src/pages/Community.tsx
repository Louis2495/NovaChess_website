import { usePremoves } from "../lib/usePremoves";
import PremoveQueue from "../components/PremoveQueue";
import { useEffect, useState, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import {
  ArrowRight,
  Copy,
  Flag,
  Handshake,
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
import { ChoiceSelect, Button, Card, Field, PageTitle } from "../components/UI";
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
export default function Community({presetMode = "standard", presetVariant = "chess"}: {presetMode?: string; presetVariant?: string}) {
  const { session } = useOnlineSession(),
    { tab, detail, navigate, notify, appearance } = useApp();
  const [room, setRoom] = useState<Room | null>(null),
    [profiles, setProfiles] = useState<Profile[]>([]),
    [mode] = useState(presetMode),
    [name] = useState(presetMode === "standard" ? ({chess:"Standard",dropping:"Dropping Squares",chaos:"Chaos chess",random:"Random"}[presetVariant] || "Standard") : presetMode === "vote" ? "Vote Chess" : presetMode === "team" ? "Team Chess" : "Throne"),
    [variant] = useState(presetVariant),
    [bot, setBot] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [votes, setVotes] = useState<
      { move: string; user_id: string; created_at: string }[]
    >([]),
    [armed, setArmed] = useState<"" | "freeze" | "swap">(""),
    [first, setFirst] = useState("");
  const uid = session?.user.id;
  const [roomId, inviteQuery = ""] = detail.replace(/^online\//, "").split("?");
  const inviteTeam = new URLSearchParams(inviteQuery).get("team");
  const username = (id: string) =>
    profiles.find((p) => p.id === id)?.username || "Player";
  const routeRef=useRef(roomId);routeRef.current=roomId;
  const profileCache=useRef(new Map<string,Profile>());
  const loadProfiles=useCallback(async(ids:string[])=>{
    if(!online)return;const missing=[...new Set(ids)].filter(id=>!profileCache.current.has(id));
    if(!missing.length)return;
    const {data}=await online.from("profiles").select("id,username").in("id",missing);
    for(const p of data||[])profileCache.current.set(p.id,p);
    setProfiles([...profileCache.current.values()]);
  },[]);
  const load=useCallback(async()=>{
    if(!online || !uid)return;
    if(roomId){
      const {data,error}=await online.from("rooms").select("*").eq("id",roomId).single();
      if(routeRef.current!==roomId)return;
      if(error){setError(error.message);return;}
      if(data){setRoom(current=>current && current.id===data.id && current.revision>data.revision?current:data);void loadProfiles(data.members.map((m:Member)=>m.id));}
    }else{
      setRoom(null);
    }
  },[uid,roomId,loadProfiles]);
  useEffect(()=>{
    void load();if(!online || !uid)return;
    const refresh=()=>{if(document.visibilityState!=="hidden")void load();};
    window.addEventListener("online",refresh);window.addEventListener("focus",refresh);
    // Only an opened game subscribes to live updates; matchmaking reads on demand.
    const channel=roomId?online.channel("room-"+roomId).on("postgres_changes",{event:"UPDATE",schema:"public",table:"rooms",filter:`id=eq.${roomId}`},payload=>{
      const next=payload.new as Room;
      setRoom(current=>current && current.id===next.id && current.revision>=next.revision?current:next);
      void loadProfiles(next.members.map(m=>m.id));
    }).subscribe(status=>{if(status==="SUBSCRIBED")void load();}):null;
    return()=>{if(channel)void online!.removeChannel(channel);window.removeEventListener("online",refresh);window.removeEventListener("focus",refresh);};
  },[uid,roomId,load,loadProfiles]);
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
    const filters={schema:"public",table:"votes",filter:`room_id=eq.${room.id}`};
    const ch=online.channel("votes-"+room.id)
      .on("postgres_changes",{...filters,event:"INSERT"},()=>void fetchVotes())
      .on("postgres_changes",{...filters,event:"UPDATE"},()=>void fetchVotes())
      .subscribe();
    return () => {
      void online?.removeChannel(ch);
    };
  }, [room?.id, room?.state.moves.length]);
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
        if (!roomId) navigate(result.mode === "standard" && result.variant === "chess" ? "play" : "variants", "online/"+result.id);
      }
      if(result.id)void loadProfiles(result.members?.map((m:Member)=>m.id)||[]);
      else await load();
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
      {!room && tab === "community" && <PageTitle title="Play" />}
      {room && <PageTitle title={room.mode === "standard" && room.variant === "chess" ? "Play" : "Variants"}><Button className="secondary" onClick={() => navigate(room.mode === "standard" && room.variant === "chess" ? "play" : "variants")}>Back</Button></PageTitle>}
      {!online || !uid ? (
        <>
          <Card className="quick-online-play"><Button className="new-game-primary" disabled>{mode === "throne" ? "Join queue" : mode === "vote" ? "Join Vote Chess" : mode === "team" ? "Start Team Chess" : "Play online"}</Button></Card>
          <OnlineAccount />
        </>
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
                          ? "Team Chess"
                          : "Chess"}
                  </span>
                </div>
                {room.state.lastWinner && (
                  <p className="pill">
                    {username(room.state.lastWinner)} holds the throne
                  </p>
                )}
                <Board
                  fen={premove.preview}
                  overlay={<GameResult result={room.state.result} human={me?.team}/>}
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
                      const invite = new URL(location.href);
                      invite.hash = (room.mode === "standard" && room.variant === "chess" ? "play/online/" : "variants/online/")+room.id+(room.mode === "team" && me?.team ? "?team="+me.team : "");
                      const ok = await copyText(invite.href);
                      notify(ok ? "Invite link copied." : invite.href);
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
                        : room.mode === "vote" ? "Voting open" : "Playing"}
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
                    <Button disabled={busy} onClick={() => void act("join", room?.mode === "team" ? { team: inviteTeam } : {})}>
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
                          onClick={() => void act("join", room?.mode === "team" ? { team: inviteTeam } : {})}
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
            <Card className="quick-online-play">
              {mode === "team" && <Field label="Opponent"><ChoiceSelect value={bot?"bot":"friends"} onChange={e=>setBot(e.target.value==="bot")}><option value="friends">Another team</option><option value="bot">Computer</option></ChoiceSelect></Field>}
              <Button className="new-game-primary" disabled={busy} onClick={async()=>{
                setBusy(true);setError("");
                try {
                  const {data,error}=await online!.from("room_lobby").select("id,name,mode,variant,status,member_count,updated_at").eq("mode",mode).eq("variant",variant).order("updated_at",{ascending:true}).limit(40);
                  if(error)throw error;
                  const available=(data||[]).find(r=>mode === "throne" || mode === "vote" || (mode === "standard" && r.status === "waiting" && r.member_count === 1));
                  if(available && !(mode === "team" && bot)) await act("join",{room:available.id});
                  else await act("create",{mode,name,variant:mode === "vote" || mode === "team" && bot ? "chess" : variant,bot:mode === "team" && bot});
                }catch(e){setError((e as Error).message);}finally{setBusy(false);}
              }}>{busy ? "Connecting…" : mode === "throne" ? "Join queue" : mode === "vote" ? "Join Vote Chess" : mode === "team" ? "Start Team Chess" : "Play online"}</Button>
              <p className="caption">{mode === "standard" ? "Join an opponent, or wait for the next player." : mode === "throne" ? "Winner stays. Queue to challenge." : mode === "vote" ? "One day per move. Earliest vote breaks a tie." : "Invite friends to your side. Share moves and arrows."}</p>
            </Card>
          )}

        </>
      )}
    </>
  );
}
